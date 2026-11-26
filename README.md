# The Healing Modalities Mandala

A teaching map of the healing modalities from Module 12, Resolving and Healing: what each one is, who it serves, when in life it fits, what a person can explore on their own, and when to refer to a trained practitioner.

Created by Erin Singleton, a student in APPPAH's Prenatal & Perinatal Educator certification. An educational map, not medical advice.

## The wheel

- **The center:** the Seed of Life, holding the person or family seeking support.
- **The petals:** the twenty modalities, one to a petal, grouped and colored by type, with the name written along the long edge. Tap a petal to open its card.
- **When it fits:** six thin rings around the petals, one for each stage of life, from the inside out: preconception, pregnancy, birth, fourth trimester, early childhood, and adulthood. Each stage has its own shade, in a soft rainbow, from rose at preconception to lavender at adulthood, the same in light and dark mode, set as `--when-0` to `--when-5` in `index.html`. The stage names are written on the rings at the four diagonals.
- **Type:** the outer band names the seven types. Tapping one shows only its modalities.
- **The braid** (set aside for now): three strands, the self, the educator, and the practitioner. Set `SHOW_BRAID` to `true` in `index.html` to bring it back.

Each card follows the path an educator walks with a family, ending in three steps: explore it yourself, go deeper with a practitioner, and reach out if.

Filters under the wheel find modalities by who they are for, type, when they fit, and evidence level.

## The data

The spreadsheet is the source of truth. Its text is never retyped in the code.

1. Export the spreadsheet as `.xlsx` (or the Modalities tab as `.csv`) and save it in `data/`.
2. Run `python3 build.py`, or `python3 build.py "data/your file.xlsx"` for another file name.
3. That writes `modalities.json` and `modalities.js`. The page loads `modalities.js`.

The build checks that every type and evidence level is one it knows and reports anything it could not place.

**Who it is for.** The card always shows the spreadsheet's own words. The filter sorts them into eight groups (prenate, newborn, baby, child, mother, partner, family, adult) by the words listed in `WHO` near the top of `build.py`.

**Type descriptions.** Hovering over a type on the outer band shows what that type means. The descriptions live in `data/types.csv` (columns "Type" and "Description"). A tab named "Types" with the same columns in the spreadsheet takes their place if you add one. Rebuild after editing either.

**Reach out if.** The spreadsheet has no "Reach out if" column yet, so each card shows a marked placeholder. Add a column with that exact name and rebuild to fill it in.

## Files

- `index.html`: the page and the wheel.
- `modality-card.js`: the card for one modality, with its own styles. It is kept apart so other mandalas can load it with `modalities.js` and show the same cards.
- `build.py`: spreadsheet to data. Uses only the Python standard library.
- `favicon.svg`

Settings saved in the browser use the `hm-` prefix (`hm-theme`).
