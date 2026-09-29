# Eight added 8-inch and 10-inch cone drivers

Reviewed 2026-09-29. All eight additions use their exact **8-ohm** manufacturer variant. Existing B&C 8NDL51 and 10NDL64 are not included in this count.

| Model | Catalogue purpose | Fs / Qts | Nominal or AES power | Published Xmax | Maximum frame / total depth / installed rear projection |
|---|---|---:|---:|---:|---|
| B&C 8NDL64 | High-force, low-Qts neodymium midbass | 80 Hz / 0.25 | 350 W | 4.5 mm | 225 / **98** / 88 mm |
| B&C 8CL51 | Compact, light neodymium alternative | 69 Hz / 0.41 | 200 W | 6.5 mm | 209 / 96 / 87 mm |
| B&C 10CL51 | Lightweight 1.3 kg neodymium woofer | 58 Hz / 0.38 | 150 W | 5.5 mm | 257 / 108 / 101 mm |
| B&C 10NW64 | Higher-force, both-side waterproof woofer | 59 Hz / 0.26 | 300 W | 6 mm | 261 / 113 / 100 mm |
| FaitalPRO 8PR200 | Longer published excursion, aluminum demodulation ring | 58 Hz / 0.37 | 200 W | 8.15 mm | 223.75 / 116.7 / 106 mm |
| FaitalPRO 10PR300 | Lower moving mass, low-Qts midbass | 60 Hz / 0.28 | 300 W | 4.92 mm | 261 / 115.3 / 103.1 mm |
| FaitalPRO 8FE200 | Shallow ferrite/steel alternative; high Qts preserved | 80 Hz / 0.63 | 130 W | 4.67 mm | 209.2 / 89 / 81 mm |
| FaitalPRO 10FE400 | Ferrite/steel alternative with larger piston area | 60 Hz / 0.47 | 200 W | 5.42 mm | 260 / 111 / 104 mm |

These are catalogue choices for screening, not eight automatic MEH recommendations. The selected horn, front/rear loading, excursion, thermal limits and measured crossover behavior still determine suitability. High-Qts options must not bypass the existing loading checks. Power figures are nominal/AES rather than the 3 dB-higher maximum/program claims. Published Xmax values retain each manufacturer's convention.

## Source archive and inspection

The local deliverable `outputs/manufacturer-sources/manifest-new.json` records original URLs, preserved filenames, model/impedance, access date, SHA-256 and license status. Sources are organized by manufacturer and model. It contains 18 downloaded PDF originals (eight datasheets, four Faital drawing sheets and six B&C original drawing URLs), eight saved product pages, four Faital information-pack ZIPs, and four response-curve PDFs extracted unchanged from those packs. Two pairs of B&C drawing URLs have identical content hashes. The ZIP member hashes are recorded as well.

Every manufacturer's mechanical drawing was rendered with Poppler and inspected visually. Both B&C datasheet page 5 and the separate original drawing PDFs were checked. Exact electrical parameters come from B&C page 2 or Faital page 1, independently cross-checked against the exact-variant English product pages. Faital direct PDF endpoints returned different display languages; values and exact 8-ohm part identities match the English pages. The downloaded originals are preserved unchanged.

Faital information packs contain only the datasheet, curves and mechanical drawing PDFs. The inspected official product-page downloads did not provide STEP, DXF or IGES. No reconstruction is described as manufacturer CAD. Manufacturer originals and source-page contact sheets are **local reference only**: redistribution permission has not been established, so do not commit them to the public website or repository.

The source records use `localArchivePath` relative to the deliverable output folder. Public code may retain the manufacturer URL, hash, facts and audit notes. It must not assume the private reference archive will be served by the app.

## Mechanical distinctions retained

- **8NDL64 depth conflict:** its manufacturer specification table says 95 mm; both the original mechanical drawing and the drawing embedded in the same current datasheet say 98 mm. The model keeps both values and uses the larger 98 mm bound pending manufacturer confirmation.
- **10FE400 depth datum:** the drawing's 104 mm begins at the underside mounting face. Adding the 7 mm flange/gasket stack gives the published 111 mm total. It must not become a 104 mm total-depth driver.
- **Slots are not round holes:** 8CL51 has eight 5.5 mm-wide slots but no dimensioned length. Faital 8FE200 has eight 9.4 by 5.5 mm radial slots; 10FE400 has eight 8 by 6 mm slots; 10PR300 has four 8 by 6 mm slots at a 45-degree phase. Round-hole fields are not populated from these widths. Slot guide surfaces are dimensioned where both axes are provided; they are not subtracted from the appearance flange.
- **B&C minimum openings:** 10CL51 and 10NW64 publish diameter 5.5 minimum and 7 minimum respectively while depicting slightly elongated openings. Only minimum-clearance guides are shown. Full opening shape, slot length and upper tolerance remain unresolved.
- **Cutout versus neck:** Faital's recommended cutouts (183, 232, 178 and 233 mm respectively) differ from the smaller dimensioned basket necks (181, 230, 176 and 231 mm). B&C 8CL51 similarly specifies 186 mm cutout around a 185 mm neck. Both are retained under distinct field names.
- **Rear basket versus magnet:** Faital 8PR200's 152 mm and 10PR300's 120 mm rear diameters describe the outer rear basket/body envelope. They are not relabelled as magnet diameter. Their partly hidden motor outlines remain unresolved.
- **Motor stack bounds:** 8FE200 explicitly dimensions a 115.3 mm external motor diameter and 34.7 mm axial stack; 10FE400 specifies 135 mm and 34 mm. Their motor starts are derived from the installed rear endpoint, not guessed. B&C motor diameters/transitions are explicitly approximate, scaled from side drawings.
- **Consistent coordinate convention:** underside mounting face is z=0; positive z points rearward. The flange/gasket occupies negative z. Individual metal thickness, gasket compression, terminal/cable clearance and manufacturing tolerances are not invented.
- **Appearance versus fit:** each model includes a redundant conservative full-frame/full-depth cylinder marked `displayRole: clearance-only`. Exterior basket/motor surfaces simplify the drawing silhouette, omit open windows and ribs, and carry `approximate` status. The octagonal frames simplify rounded corners. Only the conservative envelope supports broad screening; appearance surfaces are not verified collision solids or machining models.
- **Acoustic geometry:** cone, surround and dustcap sections are absent when undimensioned. No `coneDepth` is inferred from Sd. Published occupied-air volume is stored separately and is never calculated from the visible surface or clearance cylinder.

## Motor completeness and verification

`new-motors.json` supplies all required published fields for each exact model: Sd, Fs, Qts, Vas, Re, Le, Mms, Bl, Qms, Qes and Xmax, with nominal/AES power and explicit driver displacement. Units are recorded; N/A equals T m and dm3 equals L. No motor value is borrowed, fitted to a sibling driver or silently derived.

`node tests/new-drivers.cjs` checks complete positive motor sets, variant identity, approximate T/S identity closure within manufacturer rounding, mechanical datum conversion, slot-versus-hole provenance, finite primitive meshes, valid vertex indices, and known conflict cases. Run with the absolute output-folder argument to also verify every source file against its recorded SHA-256. All checks passed, including source hashes.

Local preview deliverables are `outputs/new-driver-model-contact-sheet.png` and `outputs/new-driver-source-contact-sheet.png`; both were visually inspected. The model sheet deliberately hides the redundant clearance cylinders and shows the omitted/approximate geometry plainly.

## Integration

1. Add the eight new record JSON files under `driver-research/records/`.
2. Merge all eight keyed entries from `new-motors.json` into the catalogue motor table and regenerate the existing catalogue asset through the repository's normal generator. Do not substitute any existing motor set.
3. Preserve `localArchivePath` as an offline reference, and preserve all `approximate`, `envelope`, `unresolved`, slot and datum metadata in the app.
4. Use published `driverDisplacement` for acoustic volume. Do not use the geometric cylinder's volume where an exact published value exists.
5. Ensure renderer visibility hides only redundant `displayRole: clearance-only` cylinders; retain appearance and necessary envelope parts. Do not generate round machining holes from a slot width or a minimum-diameter guide.
6. Run the dedicated new-driver checks and the parent catalogue/runtime integration tests. Recheck 8NDL64's depth warning and 10FE400's total/rear-depth distinction in the user interface.
