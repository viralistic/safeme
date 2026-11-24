// First-pass moderation for report notes. Notes are never public, but they must
// not describe people (golden rule 2) and abusive ones point to a bad report.
// Rules always run. An AI model runs too when configured; a person decides.

export type Verdict = "ok" | "strip_note" | "review";

export interface ModerationResult {
  verdict: Verdict;
  reasons: string[];
  by: "rules" | "rules+ai";
}

export interface AiConfig {
  /** OpenAI-compatible base URL, for example http://localhost:11434/v1 (Ollama) or https://api.mistral.ai/v1. */
  url: string;
  model: string;
  key?: string;
  timeoutMs?: number;
}

// Descriptions of who someone is. These are stripped from the note, the report stays.
const PERSON: [RegExp, string][] = [
  [/\b(man|vrouw|jongen|meisje|jongens|mannen|vrouwen|kerel|gast)\s+(met|in|van|uit)\b/i, "beschrijft een persoon"],
  [/\b(zwart|zwarte|blank|blanke|donker|donkere|getint|getinte|bruin|bruine)\b/i, "huidskleur"],
  [/\b(marokka|turk|turks|surinam|antilli|pool|poolse|roeme|bulga|afrika|arabi|aziat|chin|oost-europ|allochto|buitenlander)\w*/i, "afkomst"],
  [/\b(dakloze|daklozen|junk|junkie|junks|verslaafde|zwerver|asielzoeker|illegaal|illegalen|zigeuner)\w*/i, "label voor een persoon"],
  [/\b(hoofddoek|baard|tattoo|tatoeage|capuchon|trainingspak)\b/i, "uiterlijk"],
  [/\b\d{3}\s?(cm|centimeter)\b|\b1[,.]\d{2}\s?m\b/i, "lengte"],
  [/\b(lang|kort|blond|rood|krullend)\s+haar\b/i, "uiterlijk"],
];

// Content that makes the whole report suspect. These go to the human queue.
const ABUSE: [RegExp, string][] = [
  [/\b0\d{9}\b|\+31\s?\d{9}/, "telefoonnummer"],
  [/[\w.+-]+@[\w-]+\.[\w.]+/, "e-mailadres"],
  [/\b[A-Z0-9]{1,3}-[A-Z0-9]{2,3}-[A-Z0-9]{1,3}\b/, "kenteken"],
  [/\b(kanker|tyfus|flikker|nikker|hoer|mongool)\w*/i, "scheldwoord"],
  [/\b(dood|vermoord|afmaken|kapotmaken)\b.*\b(hem|haar|ze|die)\b/i, "dreiging"],
  [/https?:\/\//i, "link"],
  [/\b(huisnummer|woont op|woont in nummer)\b/i, "adres van een persoon"],
];

export function ruleCheck(note: string): ModerationResult {
  const reasons: string[] = [];
  let verdict: Verdict = "ok";
  for (const [re, why] of ABUSE) if (re.test(note)) reasons.push(why), (verdict = "review");
  for (const [re, why] of PERSON) if (re.test(note)) reasons.push(why), verdict === "ok" && (verdict = "strip_note");
  return { verdict, reasons: [...new Set(reasons)], by: "rules" };
}

const PROMPT = `Je controleert notities bij meldingen in een Nederlandse veiligheidsapp.
De app beschrijft gedrag en plekken, nooit wie iemand is.
Antwoord alleen met JSON: {"verdict":"ok"|"strip_note"|"review","reasons":["kort"]}.
- "strip_note": de notitie beschrijft uiterlijk, afkomst, huidskleur, geloof, gender of een label (zoals dakloos of verslaafd) van een persoon.
- "review": scheldwoorden, bedreiging, namen, adressen, telefoonnummers, kentekens, spam, of de melding lijkt verzonnen of wraak.
- "ok": alleen gedrag, plek en tijd.`;

const RANK: Record<Verdict, number> = { ok: 0, strip_note: 1, review: 2 };

export async function moderateNote(note: string, ai?: AiConfig, fetchImpl: typeof fetch = fetch): Promise<ModerationResult> {
  const rules = ruleCheck(note);
  if (!ai) return rules;
  try {
    const res = await fetchImpl(`${ai.url.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(ai.key ? { authorization: `Bearer ${ai.key}` } : {}) },
      body: JSON.stringify({
        model: ai.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: note.slice(0, 280) },
        ],
      }),
      signal: AbortSignal.timeout(ai.timeoutMs ?? 8000),
    });
    if (!res.ok) return rules;
    const data = await res.json();
    const text = String(data.choices?.[0]?.message?.content ?? "");
    const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    const verdict: Verdict = parsed.verdict in RANK ? parsed.verdict : "ok";
    // The stricter of the two wins.
    return {
      verdict: RANK[verdict] > RANK[rules.verdict] ? verdict : rules.verdict,
      reasons: [...new Set([...rules.reasons, ...(Array.isArray(parsed.reasons) ? parsed.reasons.map(String).slice(0, 5) : [])])],
      by: "rules+ai",
    };
  } catch {
    return rules;
  }
}
