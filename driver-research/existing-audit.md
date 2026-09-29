# Existing catalogue geometry audit — 2026-09-29

All 46 original driver records were checked for units, source identity, dimensional consistency, front/rear datum and renderable primitives. This is a mechanical screening audit, not acoustic certification. No generated representation is labelled exact manufacturer CAD.

## Main changes

- Corrected the BMS 4594HE mounting datum and exposed the real forward nose on 4595HE; fixed 4593HE flange transcription.
- Reconciled BMS ND package sizes and DCX354 depth; retained source conflicts and the DCM420 52-mm exit discrepancy.
- Added sourced exit guides, seven approximate noncircular frame appearances, missing screw/slot-center guides and drawing-scaled compression outer surfaces. No new cone or dustcap profile was invented.
- Downloaded original manufacturer documents/images with original server basenames and SHA-256 hashes in the local archive. Public redistribution rights are not established; only factual records/source links belong in the code patch.

## Evidence and limits

`outputs/manufacturer-sources/manifest-existing.json` records URLs, 2026-09-29 access date, hashes, sizes, download outcomes and whether this audit actually viewed a drawing. `outputs/existing-drawing-contact-sheets/` contains the inspected document contact sheets. Local paths in source objects are output-relative; they are not deployed assets.

For cones, z=0 is the flange underside for front mounting when that underside is established; total depth is flange/front stack plus rear projection. Celestion cone flange datums remain unknown. For compression drivers, z=0 is the planar horn-mounting face; a pointed nose can extend toward negative z. Dimension-guide ring/glyph thickness is graphical and must not be used as a physical extension.

Intermediate profiles marked `approximate` are drawing-scaled external appearances. Envelope primitives are clearance bounds, not basket material or displaced acoustic air. Neither mesh volume nor cone-seat approximations are driver displacement. Manufacturer-published displacement and acoustic piston displacement are separate quantities. All records still require terminal/wire/service clearance and production-tolerance allowance; exact fit certification is blocked where these are absent.

## Every existing entry

| Record | Fresh mechanical evidence | Result / remaining limitation |
|---|---|---|
| `18sound6nd410` | Drawing/PDF visually reviewed | 60 total =9.5 flange/front stack +50.5 rear.185 diagonal is maximum bound,162 across flats. Four-lobed frame appearance + M5 axis glyphs added. |
| `18sound6nmb420` | Drawing/PDF visually reviewed | 71-mm drawing versus73-mm table;10.5-mm drawing datum versus11-mm table preserved as revision conflict. Four-lobed frame appearance + M5 position glyphs added. |
| `18sound6nmb900` | Drawing/PDF visually reviewed | Current PDF embeds the rejected 6ND410/60-mm drawing while its table says 73 mm. Published cutout and bolt-circle guides now visible; maximum frame OD, hole count/bore and real body remain unresolved. |
| `18soundnd3st` | Published table / limits reviewed | Only product photograph available from linked image; it is not a drawing. Envelope/interface guide remain based on16-ohm published table. |
| `18soundnsd4015n` | Drawing/PDF visually reviewed | Reviewed 150 body,40 exit, two sets of4 × M6 on 102/114.7.56 drawing span versus57 table retained conservatively;8 count denotes both patterns. |
| `bc10ndl64` | Drawing/PDF visually reviewed | Existing detailed reconstruction reviewed. Drawing dimensions retained; full radial envelope now marked clearance-only. Cone/basket/magnet contour intermediates remain approximate. |
| `bc5ndl38` | Drawing/PDF visually reviewed | Existing detailed reconstruction reviewed. Drawing dimensions retained; full radial envelope now marked clearance-only. Cone/basket/magnet contour intermediates remain approximate. |
| `bc6mdn44` | Drawing/PDF visually reviewed | Drawing dimensions checked; noncircular frame appearance anchored to across-flats and maximum diagonal. Motor/body dimensions retained only where explicitly called out. |
| `bc6ndl38` | Drawing/PDF visually reviewed | Existing detailed reconstruction reviewed. Drawing dimensions retained; full radial envelope now marked clearance-only. Cone/basket/magnet contour intermediates remain approximate. |
| `bc8ndl51` | Drawing/PDF visually reviewed | Existing detailed reconstruction reviewed. Drawing dimensions retained; full radial envelope now marked clearance-only. Cone/basket/magnet contour intermediates remain approximate. |
| `bcdcm420` | Drawing/PDF visually reviewed | Critical: current drawing exit52 mm contradicts table 50 mm. Preserve nominal50 separately; exact horn-interface fit blocked pending confirmation. |
| `bcdcx354` | Drawing/PDF visually reviewed | Drawing75 mm retained consistently as depth / rearDepth; older73-mm table preserved separately. |
| `bcdcx462` | Drawing/PDF visually reviewed | Fresh exact-model PDF:152 OD,110 depth,102 PCD,4 × M6. Exit50 remains table-sourced (not dimensioned on this drawing). |
| `bcdcx464` | Drawing/PDF visually reviewed | Verified 152×78,36 exit,4 × M6 on 102 at 45°. Detailed outside contour remains approximate; whole-body bound explicitly clearance-only. |
| `bcde1090tn` | Drawing/PDF visually reviewed | Fresh drawing verifies package,36 exit,4 × M6 on 102 PCD. External appearance added; thread depth and front shoulder projections are not dimensioned. |
| `bcde880tn` | Drawing/PDF visually reviewed | Fresh drawing verifies package,36 exit,4 × M6 on 102 PCD. External appearance added; thread depth and front shoulder projections are not dimensioned. |
| `bcde991tn` | Drawing/PDF visually reviewed | Fresh drawing verifies package,36 exit,4 × M6 on 102 PCD. External appearance added; thread depth and front shoulder projections are not dimensioned. |
| `beyma5p200fe` | Drawing/PDF visually reviewed | PDF 80 total/72 rear versus product 79. Flange 8 derived; no dimensioned magnet depth. |
| `beyma5p200ndn` | Drawing/PDF visually reviewed | PDF 72.8 total/63.8 rear; flange 9 derived;94-mm motor diameter explicit but motor axial depth unavailable. |
| `beyma6p200fe` | Drawing/PDF visually reviewed | PDF 87 total/75.5 rear versus product 87.5. Drawing revision retained; motor contour remains unmeasured. |
| `beyma6p200nd` | Drawing/PDF visually reviewed | PDF 90 total/78 rear contradicts product 86; drawing revision retained and conflict visible. Magnet profile/terminals unmeasured. |
| `bms4590` | Drawing/PDF visually reviewed | Drawing 180 OD × 130.5 depth versus table182 × 129. Keep 182 max OD and130.5 depth; exact revision unconfirmed. |
| `bms4590p` | Drawing/PDF visually reviewed | Shared product-page drawing says 4590, not 4590P. P crossover/terminal envelope remains unverified; do not borrow 4590 geometry. |
| `bms4592nd` | Drawing/PDF visually reviewed | Reviewed 133 OD/113 depth and4 × M6 on 101.6; phase plug not externally projecting in this drawing. Conservative body and exit guide retained. |
| `bms4593he` | Drawing/PDF visually reviewed | Corrected flange127.2→124 mm.81.8 rear body;26.5 forward nose;84.7 total rear incl terminals. Requires compatible phase-plug throat. |
| `bms4593nd` | Drawing/PDF visually reviewed | Drawing 133 × 84 with 35.56 exit versus table 132 × 85/36. Keep 133 × 85 conservative envelope; preserve table values and drawing identity 4593. |
| `bms4594he` | Drawing/PDF visually reviewed | Critical datum repair: pointed nose z=-26.6, main body z=0..78.8, rear terminals to 94.2; total span 120.8. Removed false full-width26.6-mm rear neck. |
| `bms4594nd` | Drawing/PDF visually reviewed | Drawing 133 OD,95 max depth,79 body and35.56 exit versus132 × 94/36 table. Conservative envelope updated. |
| `bms4595he` | Drawing/PDF visually reviewed | Fresh drawing:38.1 exit,26.5 forward nose,78.9 rear body,94.4 rear incl terminals,120.9 total. Requires compatible throat. |
| `bms4595nd` | Drawing/PDF visually reviewed | Drawing 133 OD,95 max depth,79 body and38.1 exit versus132 × 94/38 table. Conservative envelope updated. |
| `celestionaxi2050` | Drawing/PDF visually reviewed | Official drawing verifies 198 envelope,111 total,50.8 exit,4 × M6 on 102 PCD and 6.35×0.8 tabs. Exit guide added. |
| `celestioncdx143045` | Published table / limits reviewed | Published 117 width/59 depth and35-mm exit; no fresh dimension drawing. Width-to-circle screening bound and datum remain provisional. |
| `celestioncdx143055` | Published table / limits reviewed | Published 120 width/55 depth and35-mm exit; no fresh dimension drawing. Width-to-circle screening bound and datum remain provisional. |
| `celestiontf0512he` | Published table / limits reviewed | Mounting table 151 OD/72 total,117 cutout,4 × 4.5 on 140. No flange/underside datum; rear placement remains envelope-only. |
| `celestiontf0615` | Published table / limits reviewed | Mounting table 178 OD/74 total,147 cutout,4 × 4.3 on 168.5. No flange/underside datum; rear placement remains envelope-only. |
| `faitalpro5fe120` | Drawing/PDF visually reviewed | Drawing dimensions checked; noncircular frame appearance anchored to across-flats and maximum diagonal. Motor/body dimensions retained only where explicitly called out. |
| `faitalpro5pr160` | Drawing/PDF visually reviewed | Drawing dimensions checked; noncircular frame appearance anchored to across-flats and maximum diagonal. Motor/body dimensions retained only where explicitly called out. |
| `faitalpro6fe200` | Drawing/PDF visually reviewed | Verified 167.4 OD/77 total/8 flange,115.3×34.7 motor,4 slots5.7×6.3 on 154. Added inscribed slot-center guides, not invented round holes. |
| `faitalpro6pr150` | Drawing/PDF visually reviewed | Drawing dimensions checked; noncircular frame appearance anchored to across-flats and maximum diagonal. Motor/body dimensions retained only where explicitly called out. |
| `faitalpro6pr160` | Drawing/PDF visually reviewed | Drawing dimensions checked; noncircular frame appearance anchored to across-flats and maximum diagonal. Motor/body dimensions retained only where explicitly called out. |
| `faitalprohf1440` | Drawing/PDF visually reviewed | Fresh exact 8-ohm drawing verifies package,4 × M6 on 102 PCD at 45°. Exit remains product-table value; intermediate external profile is scaled appearance. |
| `faitalprohf146r` | Drawing/PDF visually reviewed | Fresh exact 8-ohm drawing verifies package,4 × M6 on 102 PCD at 45°. Exit remains product-table value; intermediate external profile is scaled appearance. |
| `faitalprohf148c` | Drawing/PDF visually reviewed | Fresh exact 8-ohm drawing verifies package,4 × M6 on 102 PCD at 45°. Exit remains product-table value; intermediate external profile is scaled appearance. |
| `rcfnd85014` | Drawing/PDF visually reviewed | Reviewed PDF:52.3-mm mounting span differs from54-mm table. Conservative54 retained; face shoulder/terminal envelope remain incomplete. |
| `rcfnd95014` | Drawing/PDF visually reviewed | Official ZIP contains nd950.stp; retained locally. Prior CAD bounding extent146×62.6754 and provisional datum preserved; exact registered mesh still absent. |
| `sica6n25pl` | Drawing/PDF visually reviewed | Verified 166 OD/82.8 total/9.8 flange-stack,84 × 35 motor,4 slots5×6 on 155. Added slot-center guides; no exact slot contour claim. |

## Verification and integration

- JSON/part reference audit validates finite dimensions, millimetre geometry, positive primitive radii/depths, source references and dimension references for all 46 initial IDs.
- Parent integration must prefer explicit `rearDepth`/`mountingDepth` to total `depth` for rear clearance, exclude display-only glyphs from physical bounds and hide only parts explicitly marked `displayRole: clearance-only` when showing appearance.
- In particular,6NMB900 remains`unresolved`; two dimension guides do not make a physical mesh. BMS HE forward-nose records require compatible throat handling. DCM420 exact interface remains unresolved due conflicting exit sizes.
- RCF ND950 STEP archive is retained but prior provisional CAD datum still needs registered-solid inspection before exact-CAD eligibility.

## Final integration review

6NMB420 now has a separate 73 mm packaging envelope, preserving its 71 mm drawing depth and rear datum. Beyma 6P200Fe similarly uses 87.5 mm for packaging while retaining the 87 mm drawing. BMS 4590P is excluded from fit/recommendation eligibility because the exact crossover/terminal variant envelope is unresolved; its provisional preview remains inspectable. RCF STEP member provenance and native inch units were independently corrected; see the separate CAD inspection.
