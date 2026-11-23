# Single-file demo

Builds the app in demo mode as one HTML file, with OpenFreeMap vector tiles for
Amsterdam Oost embedded, so it runs in sandboxes without network access.

1. Put the tiles and style in `artifact/data/` (gitignored, about 4 MB):
   `tiles.json` maps `z/x/y` and `glyphs/0-255` to gzip+base64 data,
   `style.json` is the OpenFreeMap dark style pointing at `embedded://{z}/{x}/{y}`
   and `embedded://glyphs/{fontstack}/{range}`.
2. `sh artifact/build.sh`
3. Result: `artifact/dist/index.html`.
