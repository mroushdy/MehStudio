# Three-way multiple-entry horn primary-source ledger

Audited: 2026-07-30
Scope: three-band multiple-entry, Unity, Synergy, and closely adjacent shared-horn systems.
Purpose: preserve the strongest available acoustic math, topology evidence, implementation consequences, and uncertainty boundaries for MEH Studio.

This is a systematic source audit, not a claim that every paper, private prototype, deleted forum attachment, or proprietary commercial drawing has been found. It complements:

- `threeway-research-manifest.md`, the broad reference and preset map;
- `threeway-build-visual-ledger.md`, the physical-build and image evidence map.

The core rule is simple: a citation can support only what it actually documents. A patent claim is not a measured prototype. An author model is not peer review. A product photograph is not an engineering drawing. A convincing render is not a connected acoustic volume.

## 1. Topology vocabulary

| Code | Topology | Distinguishing feature | Representative evidence |
|---|---|---|---|
| `T3` | Conventional three-station shared horn | HF enters at the throat; separate MF and LF sources enter at downstream stations | Unity Summation Aperture patent; Waslo CoSyne |
| `H3` | Hybrid three-band / two-station shared horn | A dual-diaphragm or coaxial compression driver supplies two electrical bands at one throat; cone LF enters through wall taps | Scott Hinson MEH; Sound Agency CUH |
| `C3` | Combiner or layered hybrid | One or more bands are combined through plenums, parallel passages, centerbodies, or a separate tapped-horn subsystem | Danley Jericho-class systems and combiner patents |
| `A2` | Adjacent two-way shared horn | Two bands share a horn or common throat, but it is not a complete three-band MEH | CoEntrant; dual-range acoustic-crossover horn; Yorkville Unity horn section |

These classes must not be collapsed into one preset family. They require different acoustic networks, geometry ownership, and validation rules.

## 2. Evidence and confidence scale

| Tier | Evidence type | What it may establish | What it does not establish |
|---|---|---|---|
| `A1` | Peer-reviewed paper or granted-claim text | Published equation, formal condition, or claimed topology | Product performance or freedom to operate |
| `A2` | Patent description with worked embodiments or measurements | Inventor-stated design method, example behavior, disclosed implementation | A universal physical law |
| `B1` | Author-origin technical model with equations and reproducible inputs | A traceable modeling method suitable for independent checking | Peer-reviewed correctness or hardware validation |
| `B2` | Author-origin calculator/build guide with measurements | Practical workflow and measured behavior for the documented build | Guaranteed behavior after driver or geometry substitution |
| `C` | Manufacturer page or specification | Product complement, coverage, package, and manufacturer-stated performance | Hidden ports, chambers, paths, or crossover implementation |
| `D1` | Builder report with physical build and measurements | A real implementation and its observed successes or failures | Controlled laboratory proof or general design law |
| `D2` | Builder photograph, CAD image, or anecdote | A topology lead, packaging idea, or failure-mode clue | Dimensions, connectivity, phase, loading, or acoustic validity |

Confidence labels used below:

- **High**: the cited source directly supports the statement.
- **Medium**: the statement is a reasonable engineering use of an author method or measured build, with stated limits.
- **Low**: useful as a search lead or failure-mode anecdote only.

## 3. Conclusions supported across the corpus

1. **A true three-band shared horn is one mutually coupled acoustic network.** The HF, MF, and LF sources do not see independent horns. Each source sees its own radiation impedance plus cross-impedances created by the other two source locations. A solver that calculates three independent curves and adds SPL magnitudes omits the defining interaction.
2. **Tap station is jointly constrained.** Useful bounds include the first reflection/cancellation notch, local horn expansion, local station area, passage inertance, chamber compliance, driver loading, crossover phase, aperture spacing, structural web, and package clearance. No source supports selecting a station from only one slider.
3. **The familiar quarter-wave rule is a first estimate, not a complete solution.** Both the Unity patent and author build methods use it as a starting phase or spacing bound, then require actual amplitude, phase, impedance, and often polarity-reversal measurement.
4. **Passage length and front volume are acoustic components.** Long or narrow ports add inertance, delay, resonances, loss, and stronger low-pass behavior. A tube that merely reaches a driver is not acoustically neutral.
5. **Geometry and crossover must be solved together.** A crossover changes the source velocities that excite the shared impedance matrix. The shared horn, in turn, changes the electrical load and phase presented to the crossover.
6. **One-dimensional models are useful but incomplete.** Transfer-matrix, Hornresp, and equivalent-circuit methods are appropriate for axial response, impedance, chamber/passage tuning, and initial station selection. They do not validate higher-order modes, aperture diffraction, or full polar behavior. BEM/FEM and physical measurement remain necessary.
7. **A printable assembly must implement the acoustic network literally.** The valid solid is a horn/mount body minus connected passage volumes. The same declared passage must cut the cone-side chamber, solid driver mount, horn wall, and inner acoustic surface. Separate cosmetic slots, open rings, or overlapping preview meshes do not represent the sourced topology.
8. **`T3` and `H3` are both legitimate three-band architectures.** A hybrid dual-diaphragm throat can reduce the number of wall-entry stations, but it adds its own internal acoustic coupling and termination sensitivity. It is not interchangeable with a conventional separate-MF station.

## 4. Equation and design-law ledger

### 4.1 Wavelength and quarter-wave estimates

For sound speed \(c\), frequency \(f\), and wavelength \(\lambda\):

\[
\lambda = \frac{c}{f}
\]

A common first estimate for a tap whose effective acoustic distance to a reflecting termination is \(d_\mathrm{eff}\) is:

\[
f_\mathrm{notch,estimate} \approx \frac{c}{4d_\mathrm{eff}}
\]

**Source basis:** Unity patent descriptions and the Waslo/Hinson design workflows.
**Status:** heuristic, not an exact horn law. The patent explicitly ties the actual cancellation dimension to the horn shape and acoustic path, not merely a straight ruler distance. A taper, chamber, port, and non-planar wavefront can shift the result.
**Implementation:** expose both geometric and effective acoustic path; label the result `estimated first cancellation`, then require coupled simulation or measurement.
**Confidence:** medium.

### 4.2 Later Unity station-area claim

[US 8,284,976 B2](https://patents.google.com/patent/US8284976B2/en) claims that a lower-frequency introduction station can be limited to an area no greater than the area of a circle whose circumference is one wavelength at that source's upper operating edge.

The equivalent area form below is a **derived restatement**, not text printed as this algebraic equation in the patent:

\[
C=\lambda_u,\qquad
r=\frac{\lambda_u}{2\pi},\qquad
A_\mathrm{station,max}=\frac{\lambda_u^2}{4\pi}
\]

where \(\lambda_u=c/f_u\).

**Status:** granted-claim condition in a specific patent family; not proof that every good design must sit exactly at this bound.
**Implementation:** retain as a provenance-tagged legal/acoustic bound, not as an automatic equality target.
**Confidence:** high for the claim; medium for use as a general design heuristic.

### 4.3 Local horn expansion law cited in the later patent

The later patent cites the Plach family:

\[
A(x)=A_t
\left[
\cosh\left(\frac{x}{x_0}\right)
+T\sinh\left(\frac{x}{x_0}\right)
\right]^2
\]

where \(A_t\) is throat area and \(T\) selects the expansion family described in the source. The patent discusses \(T=1\) as exponential, \(T<1\) as hyperbolic, and the conical limit as \(T\) grows.

**Primary equation citation available:** [US 8,284,976 B2](https://patents.google.com/patent/US8284976B2/en).
**Original cited work:** Daniel J. Plach, [“Design Factors in Horn-Type Speakers”](https://secure.aes.org/forum/pubs/journal/?elib=89), JAES 1(4), 276–281, October 1953. AES provides the bibliographic record and abstract; the original full paper was not recovered in this audit, so the equation was checked against the later patent reproduction instead.
**Implementation:** store the law with its source and parameter convention. Do not infer that a global profile dropdown alone guarantees valid local loading at every entry station.
**Confidence:** high for the patent reproduction; unresolved against the inaccessible original typesetting.

### 4.4 Transfer relation and branch continuity

Martin J. King's author-origin three-driver method represents each horn segment with a two-port transfer relation:

\[
\begin{bmatrix}
U_i\\
p_i
\end{bmatrix}
=
\mathbf T_{i\leftarrow j}
\begin{bmatrix}
U_j\\
p_j
\end{bmatrix}
\]

At a branch, pressure is continuous and signed volume velocity is conserved. With one consistent orientation:

\[
p^- = p^+ = p_b
\]

\[
U^+ = U^- - U_b
\]

The sign changes if the implementation reverses a port orientation; the physical conservation rule does not.

**Sources:**
[Algorithm for Modeling a Three Driver MEH Speaker System](http://www.quarter-wave.com/Horns/MEH_Three_Drivers_Algorithm_05_18_26.pdf) and [Multi Entry Horn Modeling Methods](http://www.quarter-wave.com/Horns/MEH_Modeling_Methods.pdf).
**Status:** author-origin 2026 modeling work; mathematically explicit, not peer reviewed or hardware validated.
**Implementation:** use one canonical port orientation and unit convention; test branch conservation numerically.
**Confidence:** high that this is the documented method; medium for physical accuracy until independent validation.

### 4.5 Three-band mutual acoustic impedance

The shared horn can be reduced at the three source planes to a \(3\times3\) acoustic impedance matrix:

\[
\begin{bmatrix}
p_h\\
p_m\\
p_l
\end{bmatrix}
=
\begin{bmatrix}
Z_{hh} & Z_{hm} & Z_{hl}\\
Z_{mh} & Z_{mm} & Z_{ml}\\
Z_{lh} & Z_{lm} & Z_{ll}
\end{bmatrix}
\begin{bmatrix}
U_h\\
U_m\\
U_l
\end{bmatrix}
\]

The diagonal terms are self-impedances at each source plane; the off-diagonal terms are cross-impedances. King's method obtains each column by driving one source while setting the other source velocities to zero and marching the transfer solution through the branch network.

A representative low-band driver equation from the author's formulation has the form:

\[
\frac{e_{\mathrm{g},l}BL_l}{Z_{\mathrm e,l}S_{\mathrm d,l}}
-
\left[
\frac{BL_l^2}{S_{\mathrm d,l}^2Z_{\mathrm e,l}}
+j\omega M_{\mathrm{ad},l}
+R_{\mathrm{ad},l}
+\frac{1}{j\omega C_{\mathrm{ad},l}}
+Z_{ll}
\right]U_l
-Z_{lh}U_h
-Z_{lm}U_m
=0
\]

with analogous equations for MF and HF. The exact symbol definitions and source orientation must remain attached to the implementation.

**Sources:** King's modeling and crossover documents above, plus [Passive Crossover Modeling Methods](http://www.quarter-wave.com/Horns/MEH_Crossover_Design.pdf).
**Implementation:** solve the complex three-equation system at each frequency; for passive mode, solve the Thevenin crossover network and acoustic coupling in the same system.
**Confidence:** high as a transcription of the author method; medium for physical prediction pending prototype validation.

### 4.6 Horn-axis versus wall-distance coordinates

Hornresp author David McBean clarified that ME entry locations are axial distances, not slant distances measured along the horn wall. For a straight conical wall of slant increment \(s\) and full included angle \(\theta\):

\[
\Delta x_\mathrm{axis}=s\cos\left(\frac{\theta}{2}\right)
\]

The author's posted example converts 3.75 in and 8.5 in wall increments on a 20° included geometry to approximately 9.38 cm and 21.26 cm axial increments.

**Source:** [Hornresp author post, DIYAudio Hornresp thread](https://www.diyaudio.com/community/threads/hornresp.119854/page-807).
**Implementation:** store station coordinates canonically on the horn axis; derive wall intersections from the surface. Never feed wall arc/slant distance directly into a Hornresp ME record.
**Confidence:** high for Hornresp input semantics.

### 4.7 Aperture spacing as one-radiator approximation

Waslo recommends keeping MF aperture center spacing within roughly one quarter wavelength at the relevant upper frequency so the openings behave more like one radiator. The guide gives examples near 3.4 in at 1 kHz and 1.7 in at 2 kHz.

**Source:** [Synergy Calc V5 guide](https://libinst.com/SynergyCalc/Synergy%20Calc%20V5.pdf).
**Status:** author rule of thumb, not a universal diffraction theorem. Geometry, aperture shape, baffle curvature, and observation angle still matter.
**Implementation:** use as a warning/initial bound, then validate with BEM/FEM and polar measurements.
**Confidence:** medium.

### 4.8 What the corpus does not provide

No reviewed source produced a universal closed-form equation for:

- the optimum number of MF or LF drivers from mouth width alone;
- the exact separation between two taps for every crossover and horn shape;
- the optimum driver-axis blend between wall-normal and throat-radial;
- a guaranteed passage shape for arbitrary cone depth and wall curvature;
- a crossover that remains valid after driver, chamber, port, or horn substitution;
- directivity from a one-dimensional transfer network;
- printability or watertight boolean geometry.

Those must remain solver outputs, bounded optimization variables, or measured properties—not source-branded constants.

## 5. Foundational patent record

### 5.1 Unity Summation Aperture — US 6,411,718 B1

- **Primary page:** [Google Patents](https://patents.google.com/patent/US6411718B1/en)
- **Inventors / filing:** Thomas Danley and Bradford Skuran; priority and filing shown as 1999-04-28; grant shown as 2002-06-25.
- **Topology:** `T3`.
- **Evidence tier:** `A1` for claims, `A2` for descriptions and examples.
- **Directly supported points:**
  - explicit HF throat plus downstream MF and LF introduction stations in one horn;
  - conical/quadratic local expansion reasoning;
  - entry area smaller than the source diaphragm;
  - an embodiment in which summed passage area is related to horn area at the station;
  - quarter-wave placement as an initial crossover/phase approximation;
  - short passages and corner-adjacent placements to limit acoustic reactance;
  - polarity-reversal tuning in which a deep notch near twice the intended crossover can identify a 90° relation at half that frequency;
  - final work depends on measured amplitude, phase, and impedance, not geometry alone.
- **MEH Studio consequence:** this is the strongest primary source for a generic three-station topology. Model station, chamber, passage, local flare, and crossover as a connected system. Do not convert an example area relationship into a global equality law without a provenance label.
- **Limitations:** a patent establishes disclosed and claimed subject matter, not independent performance validation.
- **Confidence:** high.
- **Status caveat:** Google Patents displayed `Expired - Fee Related` and an anticipated expiration in 2019 when checked. This is an informational database status, not a legal opinion or freedom-to-operate conclusion.

### 5.2 Sound reproduction with improved performance — US 8,284,976 B2

- **Primary page:** [Google Patents](https://patents.google.com/patent/US8284976B2/en)
- **Inventor / filing:** Thomas Danley; priority shown as 2005-06-07, filing 2006-06-06, grant 2012-10-09.
- **Topology:** `T3`, with conditions applicable to downstream lower-frequency introduction.
- **Evidence tier:** `A1` / `A2`.
- **Directly supported points:**
  - the lower band's upper edge lies below its first cancellation notch;
  - station area is bounded by a one-wavelength-circumference circle at the band's upper edge;
  - local horn expansion at the station is no faster than the lower edge permits;
  - the first notch depends on the wave traveling toward the closed end and returning with the relevant reflection phase;
  - a solid horn wall with drivers outside and ports through it is an intended implementation;
  - small horn-side area and short acoustic length reduce disturbance and reactance;
  - tapered or stepped passages can be larger near the diaphragm and smaller at the horn wall;
  - crossover design may require non-integer or nonconstant slopes based on measured amplitude and phase;
  - the horn-source system is mutually coupled.
- **Disclosed example, not law:** shortening an MF passage from roughly 3/4 in to roughly 1/16 in enabled fewer/smaller openings in the described prototype. The numbers must not become defaults for unrelated drivers.
- **MEH Studio consequence:** implement independent checks for first-notch margin, station-area bound, local expansion, and passage acoustic length. Report which bound controls a placement.
- **Confidence:** high.
- **Status caveat:** Google Patents displayed `Active` and an adjusted expiration date in 2029 when checked. Patent status and claim scope require professional jurisdiction-specific review before commercial use.

### 5.3 CoEntrant — US 5,526,456 A

- **Primary page:** [Google Patents](https://patents.google.com/patent/US5526456A/en)
- **Inventor:** Ralph Heinz.
- **Topology:** `A2`.
- **Evidence tier:** `A1` / `A2`.
- **Directly supported points:** adjacent frequency ranges join a common horn through passages intended to provide substantially equal acoustic path behavior.
- **Use:** historical equal-path/common-throat reference and possible subsystem inspiration.
- **Do not infer:** it is not a conventional three-station MEH law.
- **Confidence:** high for classification.
- **Status caveat:** Google Patents displayed an expired-lifetime status when checked; not a legal opinion.

### 5.4 Dual-range horn with acoustic crossover — US 7,392,880 B2

- **Primary page:** [Google Patents](https://patents.google.com/patent/US7392880B2/en)
- **Inventor:** Marshall D. Buck.
- **Topology:** `A2`.
- **Evidence tier:** `A1` / `A2`.
- **Directly supported points:** two ranges join near the horn entrance; an acoustic low-pass structure and effective-delay matching are part of the disclosed combiner.
- **Use:** possible MF/HF composite-throat research.
- **Do not infer:** this is not evidence for downstream LF and MF station placement in a `T3` horn.
- **Confidence:** high for classification.
- **Status caveat:** Google Patents displayed an expired/fee-related status and a 2025 adjusted-expiration value when checked; not a legal opinion.

### 5.5 Layered and parallel-path combiner families

Relevant patent pages include:

- [US 2009/0323997 A1](https://patents.google.com/patent/US20090323997A1/en), horn-loaded acoustic line source;
- [US 2012/0328140 A1](https://patents.google.com/patent/US20120328140A1/en), horn enclosure for combining output;
- [WO 2017/083708 A1](https://patents.google.com/patent/WO2017083708A1/en), coaxial/centerbody architecture.

These are `C3` or adjacent subsystem leads. Their claims were not exhaustively mapped in this pass. They should not be silently folded into the ordinary direct-tap solver. A layered combiner needs its own plenum, branch-equality, wavefront, and tolerance model.

## 6. Peer-reviewed and formal horn foundations

### 6.1 W. Marshall Leach Jr. — horn-loaded LF driver specification

- **Author copy:** [On the Specification of Moving-Coil Drivers for Low-Frequency Horn-Loaded Loudspeakers](https://leachlegacy.ece.gatech.edu/papers/HornPaper/HornPaper.pdf)
- **Publication record:** [Leach paper index](https://leachlegacy.ece.gatech.edu/papers.html)
- **Bibliography:** Journal of the Audio Engineering Society, 27(12), 950–959, December 1979.
- **Evidence tier:** `A1`.
- **Supported use:** rigorous driver, throat, rear cavity, electrical impedance, and sensitivity relationships for LF horn loading.
- **Boundary:** this paper does not describe multiple-entry station topology or a three-band coupling matrix.
- **MEH Studio consequence:** use it in the driver/rear-chamber/loading library, not as a source for tap placement.
- **Confidence:** high.

### 6.2 Earl Geddes — acoustic waveguide theory

- [Acoustic Waveguide Theory](https://secure.aes.org/forum/pubs/journal/?elib=6078), JAES 37(7/8), 554–569, 1989.
- [Acoustic Waveguide Theory Revisited](https://aes2.org/publications/elibrary-page/?id=6998), JAES 41(6), 452–461, 1993.
- **Evidence tier:** `A1`.
- **Supported use:** formal waveguide propagation, modal behavior, and the limitations of simplified plane-wave descriptions.
- **MEH Studio consequence:** a 1-D transfer model cannot certify polar uniformity or absence of higher-order modes. Escalate candidate geometry to BEM/FEM and physical angular measurement.
- **Boundary:** these papers are not three-way MEH construction instructions.
- **Confidence:** high.

### 6.3 Don Keele — modified conical / constant-directivity foundation

- [What's So Sacred About Exponential Horns?](https://secure.aes.org/forum/pubs/conventions/?ID=912), AES paper 1038, 1975.
- **Evidence tier:** `A1`.
- **Supported use:** modified conical and throat/termination thinking that underlies later constant-directivity horn practice.
- **MEH Studio consequence:** horn coverage/profile and ME station physics are related but separate modules. A valid profile law does not automatically validate entries cut into it.
- **Confidence:** high for adjacent theory.

### 6.4 Numerical horn optimization and validation workflow

- Smolen and Halley, “A Method for Three-Dimensional Horn Geometry Optimization,” AES 147 paper 10312 (2019); event summary in the [AES 147 wrap-up](https://www.aes.org/events/147/147thWrapUp.pdf).
- Dario Cinanni, [Hybrid Constant Directivity Horn](https://secure.aes.org/forum/pubs/conventions/?ID=1030), AES 148 paper 10336 (2020).
- **Evidence tier:** `A1` for the published methods.
- **Supported use:** parameterized CAD, FEM/BEM evaluation, scientific optimization, prototype construction, and measurement form a defensible workflow for 3-D horn geometry.
- **Boundary:** neither source supplies a ready-made three-way MEH station solver.
- **MEH Studio consequence:** use the coupled 1-D network to generate feasible candidates, then run targeted 3-D field optimization instead of brute-forcing every UI frame.
- **Confidence:** high.

## 7. Author-origin coupled modeling corpus

### 7.1 Martin J. King — 2026 MEH modeling series

- **Author index:** [Horn Theory](http://www.quarter-wave.com/Horns/Horn_Theory.html)
- **Documents:**
  - [Multi Entry Horn Modeling Methods](http://www.quarter-wave.com/Horns/MEH_Modeling_Methods.pdf), dated 2026-06-16 on the author index;
  - [Algorithm for Modeling a Three Driver MEH Speaker System](http://www.quarter-wave.com/Horns/MEH_Three_Drivers_Algorithm_05_18_26.pdf), dated 2026-05-18;
  - [Hornresp and MathCad Correlation](http://www.quarter-wave.com/Horns/Hornresp_and_MathCad_Correlation.pdf), dated 2026-06-17;
  - [Passive Crossover Modeling Methods](http://www.quarter-wave.com/Horns/MEH_Crossover_Design.pdf), dated 2026-06-23.
- **Topology:** `T3`.
- **Evidence tier:** `B1`.
- **Directly documented capabilities:**
  - two- and three-band systems;
  - multiple drivers in series or parallel;
  - arbitrary axial source offsets;
  - one or two horn expansion regions and common profile families;
  - square or rectangular mouths and independent H/V angles;
  - coupling volumes/passages or flush wall mounting;
  - active or passive crossovers and rear chambers;
  - a \(3\times3\) coupled horn impedance matrix.
- **Representative sample:** paired Fostex FF85WK / FF125WK / FF225WK bands in a 3.25-in square throat, 24-in square mouth, 18-in-long, 60° × 60° horn. The author models coupling volumes approximately from cone concavity, throat area near one fifth of \(S_d\), and passage length near wall thickness.
- **Reported model behavior:**
  - coupling-volume/passage resonances around 2–3 kHz in the sample;
  - offset-induced nulls above roughly 3 kHz;
  - flush mounting removes the modeled chamber/passage resonances but requires enough horn-wall area for the cone;
  - selected 400/800 Hz crossover regions suppress the remaining sample nulls.
- **Hornresp correlation sample:** \(S_1=68.15\), \(S_2=182.94\), \(S_3=459.30\), \(S_4=3716.10\) cm²; \(L_{12}=4.56\), \(L_{23}=6.85\), \(L_{34}=34.23\) cm. The author reports broadly matching response shapes, resonances, and offset nulls.
- **Critical limitation:** the author explicitly identifies physical design, construction, and measurement as future work. The correlation is a model-to-model check, not experimental validation.
- **MEH Studio consequence:** this is the best current open equation set for a genuinely coupled three-band network. Implement behind an `experimental / author model` provenance flag and construct regression records from the published samples.
- **Confidence:** high for source fidelity; medium for predictive physical accuracy.

### 7.2 Hornresp's three-way ME semantics

- **Author source:** [David McBean in the Hornresp thread](https://www.diyaudio.com/community/threads/hornresp.119854/page-807).
- **Evidence tier:** `B1`.
- **Directly supported point:** with `Nd`, `ME1`, and `ME2` active, Hornresp treats the system as three-way; ME positions are horn-axis distances. The program assumes an axisymmetric abstraction of side entries and does not model arbitrary angular offsets.
- **MEH Studio consequence:** Hornresp export is a reduced validation record, not a proof that the 3-D driver/mount layout is symmetric, collision-free, or polar-correct.
- **Confidence:** high for program behavior.

## 8. Author calculators and measured DIY references

### 8.1 Bill Waslo — Synergy Calc V5 / CoSyne

- **Author index:** [Synergy Calc](https://libinst.com/SynergyCalc/)
- **Guide:** [Synergy Calc V5 PDF](https://libinst.com/SynergyCalc/Synergy%20Calc%20V5.pdf)
- **Workbook:** [Synergy Calc V5 XLS](https://libinst.com/SynergyCalc/Synergy%20Calc%20v5.xls)
- **Topology:** `T3`; documented CoSyne is nominally `1 HF + 4 MF + 4 LF`, 90° H × 60° V.
- **Evidence tier:** `B2`.
- **Directly supported points:**
  - coverage, minimum horizontal pattern-control frequency, throat, Keele constant, and final flare ratio drive initial horn size;
  - port position is measured on the horn axis;
  - port and chamber values are iterated in Hornresp, at least twice for a three-way design;
  - Hornresp `Ap` and `V` values represent totals over the relevant driver group, while lengths are per driver;
  - coupling volume and average cone area are approximations;
  - MF openings should be compact and closely spaced at the band's top end;
  - the first build will probably need revision;
  - driver substitutions require new passage, chamber, and crossover work.
- **Explicit uncertainty worth preserving:** the author's half-passage-length treatment for beveled ports improved correlation in his example but is not presented as a settled universal model.
- **MEH Studio consequence:** use the guide as a documented workflow and regression source. Preserve the original CoSyne record separately from any current-driver adaptation.
- **Confidence:** medium-high for the documented build/workflow; low for untested substitutions.

### 8.2 Scott Hinson — dual-diaphragm throat plus tapped LF

- **Public author-document mirror:** [Multiple Entry Horns / MEH guide](https://device.report/m/303b9e618394104d6a72e34bc18bfe61e7e118d97ecfd6db8b563819530e533b.pdf)
- **Topology:** `H3`: B&C DCX464 dual-diaphragm compression driver supplies MF/HF at the throat; two B&C 10NW76 cone drivers feed LF through wall slots.
- **Evidence tier:** `B2`.
- **Directly supported points:**
  - conical/quadratic local-flare checks and quarter-wave station reasoning;
  - front volume and port reactance create an acoustic low-pass;
  - shortening or resizing ports/chambers shifts their upper-band behavior;
  - undersized apertures can produce high cone pressure and risk;
  - corner-biased/racetrack openings can reduce intrusion and passage length;
  - a roughly 45 L reflex chamber with two approximately 3-in × 7.25-in vents is documented for this build;
  - modeled and measured behavior are compared;
  - the two diaphragms inside the coaxial compression driver acoustically interact, and changing the unused diaphragm's electrical termination changes measured behavior.
- **Author uncertainty to preserve:** the guide suggests that more mid apertures might improve output but explicitly does not establish it.
- **MEH Studio consequence:** model the coaxial throat termination and inter-diaphragm coupling as part of the driver record. Do not treat the handoff throat as a single inert diameter or transplant the LF tap geometry to another driver without redesign.
- **Confidence:** medium-high for this documented build; low for generalized replacements.

### 8.3 JHS Audio historical Unity build

- **Author page:** [Unity loudspeaker history](https://www.jhsaudio.com/unity2.html)
- **Topology:** historical `T3` experiment.
- **Evidence tier:** `D1`.
- **Directly supported points:** Radian HF, two MCM mids through small/long openings, and two EVM12L lower-band drivers shared a horn; the raw response was highly non-flat and active EQ made the system usable. The author identifies the long mid entries as non-ideal.
- **MEH Studio consequence:** this is strong negative evidence against treating a long narrow passage as a harmless connector. Warn on inertance, resonance, delay, and loss even if the mesh is connected.
- **Confidence:** medium as an author report; not controlled laboratory evidence.

### 8.4 DIYAudio measured/build corpus

These sources are valuable for failure modes and packaging, but none should create an acoustic law by itself:

| Project | URL | Evidence | Safe lesson | Confidence |
|---|---|---|---|---|
| Dreadnoughts | [Build thread](https://www.diyaudio.com/community/threads/synergy-horn-build-thread-the-dreadnoughts.280761/) | Physical development thread | Closer, smaller, shorter MF entries improved the builder's usable range relative to earlier attempts | Medium-low |
| DIY SH50-style prototype | [Build and measurement thread](https://www.diyaudio.com/community/threads/diy-3-way-sh-50-synergy-horn-clone-tuning-phase-pics-and-vid-included.383973/) | Tri-amped prototype, photos, phase/group-delay work | Active alignment can make an experimental geometry usable; it does not prove proprietary dimensions | Medium-low |
| Hornresp MEH discussion | [Thread](https://www.diyaudio.com/community/threads/synergy-horn-with-hornresp.404748/) | Community discussion pointing to program records | Use official Hornresp semantics for the model; do not infer arbitrary 3-D offsets | Low except author posts |
| Compact 3-way | [60-degree compact thread](https://www.diyaudio.com/community/threads/60-degree-quite-compact-3-way-synergy-horn.412222/) | Build-development imagery and discussion | Package feasibility lead only | Low |
| Three-way design questions | [Synergy horn questions](https://www.diyaudio.com/community/threads/synergy-horn-questions.407369/) | Mixed community and expert comments | Mine attributed expert posts, not thread consensus | Low to medium |
| Hinson derivative | [Lightweight Hinson-based MEH](https://www.diyaudio.com/community/threads/lightweight-meh-based-on-scott-hinson-diyrm-design.398649/) | Driver-substitution build | Substitution can create a lower-band integration gap; redesign is mandatory | Medium-low |
| Low-budget project | [Thread](https://www.diyaudio.com/community/threads/low-budget-pa-synergy-project.345197/) | Build anecdotes | Search lead only | Low |
| Broad debate | [Synergy horns: drawbacks/issues](https://www.diyaudio.com/community/threads/synergy-horns-no-drawbacks-no-issues.241976/post-3629797) | Opinion and experience | Failure-mode vocabulary, not a design source | Low |

### 8.5 Independent polar-measurement example

- **Source:** [Red Spade Audio, Synergy horn measurements](https://redspade-audio.blogspot.com/2011/11/synergy-horn-measurements.html)
- **Evidence tier:** `D1`.
- **Observed report:** a Yorkville Unity device and prototypes were measured on a polar rig. The Yorkville pattern reportedly narrowed around 2–3 kHz then widened around a transition, while a larger prototype maintained control lower in frequency.
- **Use:** supports treating crossover/station regions as polar-transition risks, not merely axial-response events.
- **Boundary:** independent blog setup, not a peer-reviewed laboratory report.
- **Confidence:** medium-low.

## 9. Manufacturer topology and envelope evidence

Manufacturer pages are appropriate for complement and envelope regression tests only.

| Product | Direct URL | Publicly supported classification | Safe use | Confidence |
|---|---|---|---|---|
| Danley SH50 | [Product page](https://www.danleysoundlabs.com/products/sh50/), [2022 spec PDF](https://www.danleysoundlabs.com/wp-content/uploads/2022/10/SH50-Spec-Sheet-Rev.-202209301629.pdf) | `T3`, common 50° × 50° horn, two LF drivers, grouped small MF drivers, one HF driver | Compact square envelope and performance comparison | High for public complement; none for hidden geometry |
| Danley SH69 | [Product page](https://www.danleysoundlabs.com/products/sh69/) | `T3`, 60° × 90° product with two LF, six MF, one HF in manufacturer description | Broad asymmetric envelope | High for public complement |
| Yorkville U215 | [Legacy product page](https://www.yorkville.com/legacy/product/u215/) | Hybrid complete three-way; Unity horn covers MF/HF and LF implementation is not a conventional full `T3` shared horn | Adjacent hybrid classification | High |
| Danley Jericho family | [Danley product/about pages](https://www.danleysoundlabs.com/about/) | `C3`, combines Synergy concepts with tapped LF and/or layered HF architecture | Advanced separate research mode only | Medium-high |
| Penrose Audio design | [Design page](https://penroseaudio.be/designs) | Maker-stated three-way entry horn with multiple LF/MF sources and printed throat adapter | Image/topology lead only | Low |

Revision warning: the current SH50 web page and an older official PDF have differed on the nominal MF diameter. Preserve URL, document date, and revision instead of silently choosing one value. Product marketing must never seed hidden station coordinates.

## 10. Implementation contract for MEH Studio

### 10.1 Source-owned math modules

Recommended library boundaries:

| Module | Responsibility | Required provenance |
|---|---|---|
| `localExpansionLaw` | Plach/conical/exponential/hyperbolic section area and local rate | Source, equation convention, units |
| `stationAreaLimit` | One-wavelength-circumference station bound | US 8,284,976 claim reference; mark algebraic restatement |
| `firstReflectionNotch` | Quarter-wave initial estimate using effective acoustic path | Patent/author heuristic label |
| `coupledThreeBandNetwork` | Transfer segments, branch continuity, \(3\times3\) impedance solve | King 2026 author model; experimental status |
| `axisToWallProjection` | Axis coordinate ↔ straight-wall slant conversion | Hornresp author semantics; profile-specific generalization |
| `chamberPassageFilter` | Front-volume compliance, passage inertance/loss, taper/step | Patent descriptions plus author models |
| `driverRearLoading` | Driver, rear cavity, vent, and electrical source model | Leach plus driver data |
| `crossoverCoupledSolve` | Active/passive source network solved against acoustic matrix | King 2026 author model |
| `directivityValidation` | BEM/FEM and polar test orchestration | Geddes / numerical horn literature |

Every displayed result should carry one of:

- `documented`;
- `calculated`;
- `heuristic estimate`;
- `measured`;
- `inferred`;
- `unknown`.

### 10.2 Geometry invariants

For every driver and every passage:

1. one source plane and acoustic datum;
2. one canonical centerline and signed axis;
3. one connected negative passage volume;
4. passage intersects the declared cone-side chamber;
5. passage cuts through every intervening mount and horn layer;
6. horn-side opening terminates flush with the inner acoustic surface;
7. remaining mount is a closed solid with minimum structural web;
8. aperture area and hydraulic/acoustic length are computed from the final negative volume, not from the preview decal;
9. all same-band paths report length spread;
10. exports fail closed on disconnected volumes, open edges, reversed faces, or trapped membranes.

This contract is an implementation conclusion, not a statement copied from any one source. It is the minimal geometry needed to realize the documented acoustic network.

### 10.3 Candidate and validation sequence

1. Select topology (`T3`, `H3`, or `C3`) before selecting a visual preset.
2. Solve driver/rear-chamber feasibility and target band edges.
3. Compute legal station intervals from first-notch, local expansion, station area, and package constraints.
4. Optimize chamber, passage area/shape/length, and driver count.
5. Solve the coupled three-band network and crossover together.
6. Generate an exact connected solid and run topology checks.
7. Run a reduced Hornresp or equivalent record for axial comparison.
8. Run BEM/FEM on selected candidates for modes and polars.
9. Print a modular prototype and measure impedance, nearfield/axial response, phase, distortion, and angular response.
10. Promote a preset only with its driver revision, source record, simulation inputs, and measurement evidence.

## 11. IP, copyright, naming, and provenance

- Patent publication is not freedom to operate. Google Patents status fields are useful search metadata, not a legal opinion. Continuations, adjusted terms, maintenance, claim scope, jurisdiction, and ownership require professional review.
- US 8,284,976 B2 appeared active in the checked database and is especially important to audit before commercial distribution.
- `Synergy Horn`, `Unity`, `CoEntrant`, Danley names, and product model names may be protected marks. Use them in citations and historical reference cards, not as generic family names or claims of affiliation.
- Copyright protects source text, drawings, photographs, spreadsheets, and CAD independently of patent status.
- Link to Hinson, Waslo, King, manufacturer, and builder materials. Do not bundle, trace, rehost, or regenerate their drawings/photos without permission.
- Store source URLs, bibliographic metadata, local hashes, equation provenance, and independently derived results. Avoid redistributing copyrighted PDFs unless the license is known.
- A public product photograph supports only visible arrangement and public complement. It does not authorize reconstruction or an `exact clone` label.

## 12. Locally archived source integrity

The following SHA-256 values identify the copies audited in this repository:

| Source | SHA-256 |
|---|---|
| US 6,411,718 B1 PDF | `25a1ed153d5720f7a8ec47ece7dddf854bc3a6f0bcfbcf8aa6f6f12459c8cd38` |
| US 8,284,976 B2 PDF | `bafe2104a2b32f9a0a3bc330c76613097511b97e5b470757b51b0c6e3a141488` |
| US 5,526,456 A PDF | `5dac5322e02dd47d26067c594e55bbf183d0e29c02ffdaf53b50eebe7bf0ba93` |
| King three-driver algorithm | `471e543f8d862284ac4be8cabbb8e42139165d6808a429578eecfc107386aa5f` |
| King modeling methods | `a1b8165be58fa3f68553ec8a8285ff566830b673a99ac428ed3a6527416349cf` |
| King passive crossover methods | `317300b9bb3f4e018761c809876e00a90fef3c00043e50083424bc9baa518c6b` |
| King Hornresp/MathCad correlation | `35e09f99294cb236375430638c449153b56c300281700d9574579bc70adef8ae` |
| Waslo Synergy Calc V5 guide | `fb949700ee1384edc47c77cd314d6d180372f250e09d72b72c5ec44d68338b67` |
| Waslo Synergy Calc V5 workbook | `273450ac86ad5e298418650e4570d018a793df21a6a896ec0ddd269e40e99be5` |
| Leach horn-driver paper | `2d4109c3683c92ccdc0b147d22b580f7f931d3a6ef80bf802442a4a2b9531c39` |
| Scott Hinson MEH reference | `303b9e618394104d6a72e34bc18bfe61e7e118d97ecfd6db8b563819530e533b` |

Hashes verify file identity only. They do not grant redistribution rights.

## 13. Search method and known gaps

Search families used in this audit included:

- `"three way synergy horn"`, `"3-way Unity horn"`, `"multiple entry horn"`;
- `"Unity Summation Aperture patent"`, `"sound reproduction improved performance Danley patent"`;
- `site:aes.org horn waveguide three dimensional optimization`;
- `site:diyaudio.com synergy horn three way build`;
- `site:diyaudio.com Hornresp ME1 ME2 Nd`;
- manufacturer product names and driver complements;
- Scott Hinson, Bill Waslo, Martin J. King, David McBean, CoSyne, SH50, CoEntrant, and related terms.

Known gaps:

1. no exhaustive index of private, removed, or unindexed forum attachments;
2. AES paywalls and missing historical scans limited full-text access for some papers;
3. the original Plach paper PDF was not recovered, so the later patent reproduction remains the checked equation source;
4. no independent, dimensioned SH50 internal teardown with permission and reliable provenance was located;
5. no controlled physical validation of King's 2026 three-driver model was available;
6. no universal research result was found for optimum driver count, tap-pair rotation, driver-axis blend, or arbitrary curved-wall mounting;
7. JMOD/Solana-like images may show valuable construction ideas, but photographs alone do not disclose chamber and passage math;
8. commercial products and patents may have continuations or jurisdiction-specific rights not captured by a general web search;
9. online status, product pages, and forum links may change; access date and local hash should remain with each record.

## 14. Research decisions

- Treat the **Unity patents** as the primary topology and station-bound record.
- Treat the **Leach and AES horn papers** as foundational driver/waveguide theory, not MEH-specific construction recipes.
- Treat the **King 2026 series** as the strongest open coupled-network implementation candidate, clearly marked experimental until hardware-validated.
- Treat **Waslo and Hinson** as documented build/calculator families whose driver substitutions require a new solve.
- Treat **manufacturer sources** as envelope benchmarks only.
- Treat **forum builds and images** as measurement/failure-mode evidence and search leads, never as unlabeled math.
- Do not promote a three-way preset until its exact geometry is connected, its coupled network is solved, and its source/measurement status is visible to the user.
