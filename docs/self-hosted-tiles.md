# Self-hosted map tiles

With `PUBLIC_MAP_STYLE=self` the map loads everything from your own server:
vector tiles, fonts and icons. No map request leaves your server.

You download the data once. After that it runs offline from the internet.

1. Install the `pmtiles` command line tool from
   https://github.com/protomaps/go-pmtiles/releases.
2. Pick a recent planet build at https://maps.protomaps.com/builds and cut out
   the Netherlands (about 1 GB):

   ```bash
   pmtiles extract https://build.protomaps.com/<build>.pmtiles tiles/netherlands.pmtiles --bbox=3.2,50.7,7.3,53.7
   ```

3. Add fonts and sprites from the Protomaps assets:

   ```bash
   git clone --depth 1 https://github.com/protomaps/basemaps-assets /tmp/assets && cp -r /tmp/assets/fonts /tmp/assets/sprites tiles/
   ```

4. Start the server with `TILES_DIR=./tiles` and build the site with
   `PUBLIC_MAP_STYLE=self`.

The server answers `/tiles/...` with range requests, which is how PMTiles reads
only the parts of the file it needs.
