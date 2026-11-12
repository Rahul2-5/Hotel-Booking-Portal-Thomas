# Frontend image and font credits

The five hotels are sample records. Stock photographs are illustrative, not verified
photographs of the named hotels. The interface labels them accordingly.

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

## Fonts

- [DM Sans](https://fonts.google.com/specimen/DM+Sans): body, controls and prices.
- [Lora](https://fonts.google.com/specimen/Lora): headings.

Both are served locally as Latin variable WOFF2 files from Google Fonts.
Their original SIL Open Font License files are included in `fonts/dmsans-OFL.txt`
and `fonts/lora-OFL.txt`. System fonts provide fallback for other characters.

Image choices and alternative text live in `src/data/hotelImages.js`. Replace those
entries with verified property photographs if this demo becomes a real booking service.
