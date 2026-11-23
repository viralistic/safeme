# Safety Map — Topographic HUD Style

Visual language for the landing page and hero imagery. A dark sci-fi command
center: glowing blue contour terrain, red hotspots, a rotating globe. Pairs with
the app brand (Geist, poppy red) but adds the topographic map world.

## Mood

Dark, premium, high-tech, calm until a hotspot lights up. Think a mission
control map of a city at night. Depth, glow, fine linework, lots of black.

## Color

| Token | Hex | Use |
| --- | --- | --- |
| Base | `#070b12` | Near-black navy background |
| Contour blue | `#1f9cff` | Main glowing contour lines |
| Contour cyan | `#38d2ff` | Bright line highlights, nodes, rings |
| Hotspot red | `#ed3a2c` | Danger markers, alerts (sparingly) |
| Amber accent | `#f59a2a` | Optional secondary data points |
| Text | `#eaf1f8` | Cool near-white |
| Muted | `#8c9cb1` | Secondary text |

Rule: blue is the resting state, red means danger. Red is rare and always glows.
Never flood a scene with red.

## Contour topography

- Thin glowing isoline contours forming hills and valleys, like an elevation map.
- Lines brighten toward ridge tops, fade into the dark base in the valleys.
- A faint perspective grid underneath for depth.
- A few red target rings mark hotspots, with a soft outer glow.

## The rotating globe

- A sphere surfaced with the wide contour texture (`globe-tex.jpg`), scrolling
  horizontally for a slow turn (about 30s per rotation).
- Sphere shading: light from upper-left (`rgba(90,175,255,.22)`), dark terminator
  lower-right, a 1px cyan rim, and a wide outer blue glow.
- Two concentric orbit rings around it, one dashed and slowly rotating with a
  single cyan node.
- Red hotspots sit on the surface as pulsing dots.

## Imagery (Higgsfield)

Generate with gpt_image_2_6. Keep prompts text-free (no labels, they come out as
gibberish). Core prompt skeleton:

> Futuristic topographic HUD map. Thin glowing cyan and electric-blue contour
> lines forming 3D terrain on a near-black midnight navy background, faint grid,
> a few glowing red hotspot markers, cinematic depth, sci-fi command-center
> aesthetic. No text, no labels.

Variants: perspective terrain (hero), circular radar disc, flat equirectangular
texture (for the globe), single red flare hotspot among blue hills.

Assets in this set: `terrain.jpg`, `radar.jpg`, `globe-tex.jpg`, `hotspot.jpg`.

## Typography

- Geist, light. Body 300, headings 500. Tight tracking on display (`-.03em`).
- Small uppercase eyebrow labels in cyan with wide tracking are allowed here (a
  HUD convention), unlike the app screens.

## Motion

- Globe turns slowly and continuously. Orbit ring drifts.
- Hotspots pulse (a soft expanding ring, about 2.4s).
- Everything else is still. Motion marks the live data, nothing decorative.

## Do / Don't

- Do keep the background near-black so the glow reads.
- Do let one hotspot be the focal point.
- Don't use green or yellow heat; the scale is blue (calm) to red (danger).
- Don't add readable text inside generated images.
- Don't use em dashes or emoji in copy.
