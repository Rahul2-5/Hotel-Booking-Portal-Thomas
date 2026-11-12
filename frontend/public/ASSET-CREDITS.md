# Frontend image and font credits

The current UI uses CSS city covers. Optional owner-supplied photos can be added
to `public/hotels/` as described in its README. Earlier stock assets listed below
are retained locally but are not used by the current UI.

## Photography

Downloaded from Pexels on 2026-11-13 under the [Pexels licence](https://www.pexels.com/license/).
The locally stored WebP files use two delivery widths, 800px and 1400px.

| Local image name | Source photograph |
| --- | --- |
| sea-breeze | [Pool and palm trees, photo 338504](https://www.pexels.com/photo/338504/) |
| fort-view | [Jaipur palace courtyard, photo 31089168](https://www.pexels.com/photo/intricate-architecture-of-jaipur-palace-courtyard-31089168/) |
| backwater | [Kerala backwaters by Mohit Khare, photo 33249971](https://www.pexels.com/photo/scenic-houseboat-on-kerala-s-backwaters-33249971/) |
| hilltop | [Hotel bedroom in Manali, photo 28347472](https://www.pexels.com/photo/svh-manali-28347472/) |
| city-central | [Bedroom by Pixabay, photo 164595](https://www.pexels.com/photo/black-and-grey-bedspread-on-bed-and-pillow-164595/) |

## Current fonts

- Plus Jakarta Sans for body text and controls (`fonts/plusjakartasans-OFL.txt`).
- Fraunces for page titles and hotel names (`fonts/fraunces-OFL.txt`).

Both are self-hosted variable WOFF2 fonts from Google Fonts under the included
SIL Open Font License. System fonts provide fallback for unsupported characters.

## Earlier fonts (retained, unused)

- [DM Sans](https://fonts.google.com/specimen/DM+Sans): body, controls and prices.
- [Lora](https://fonts.google.com/specimen/Lora): headings.

Both are served locally as Latin variable WOFF2 files from Google Fonts.
Their original SIL Open Font License files are included in `fonts/dmsans-OFL.txt`
and `fonts/lora-OFL.txt`. System fonts provide fallback for other characters.

Image choices and alternative text live in `src/data/hotelImages.js`. Replace those
entries with verified property photographs if this demo becomes a real booking service.
