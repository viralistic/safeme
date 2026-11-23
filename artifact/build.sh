#!/bin/sh
# Build the single-file demo and move <title> into the first bytes of the file.
set -e
cd "$(dirname "$0")/.."
npx vite build --config artifact/vite.config.ts
python3 - <<'PY'
import re
p = "artifact/dist/index.html"
s = open(p).read()
tags = re.findall(r"<title>.*?</title>\s*|<meta [^>]*>\s*", s)
for t in tags:
    s = s.replace(t, "", 1)
open(p, "w").write("".join(tags) + s)
PY
