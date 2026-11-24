// Runs before everything else: pick the language synchronously, so shared
// modules (categories, labels) are built in the right language.
import * as Localization from "expo-localization";
import * as SecureStore from "expo-secure-store";
import { reloadAppAsync } from "expo";

type Lang = "nl" | "en";
const KEY = "sm.lang";

function pick(): Lang {
  try {
    const saved = SecureStore.getItem(KEY);
    if (saved === "nl" || saved === "en") return saved;
  } catch {}
  const code = Localization.getLocales()[0]?.languageCode ?? "nl";
  return code === "nl" ? "nl" : "en";
}

const host = globalThis as { __SM_LANG__?: Lang; __SM_SET_LANG__?: (l: Lang) => void };
host.__SM_LANG__ = pick();
host.__SM_SET_LANG__ = (l: Lang) => {
  try {
    SecureStore.setItem(KEY, l);
  } catch {}
  void reloadAppAsync();
};
