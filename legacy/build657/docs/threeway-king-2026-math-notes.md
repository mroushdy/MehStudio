# King 2026 three-way MEH mathematical notes

## Purpose and status

This note is an implementation-oriented transcription and audit of four locally
cached Martin J. King documents. It separates:

- equations and claims stated by the author;
- source-consistent interpretation needed to make the notation executable;
- independent checks and proposed software assertions; and
- unresolved items that must not be promoted as validated physics.

The documents describe a one-dimensional, linear, complex-frequency model. They
do not report a built three-way prototype or measured acoustic validation. The
Hornresp comparison is a model-to-model comparison that the author calls partial
validation. A production implementation must therefore identify this method as
an experimental author model.

### Audited files

| Short name | Local file | Source date | Pages | SHA-256 |
|---|---|---:|---:|---|
| `ALG` | `research/threeway-sources/author/MEH-Three-Drivers-Algorithm-2026-05-18.pdf` | 2026-05-18 | 6 | `471e543f8d862284ac4be8cabbb8e42139165d6808a429578eecfc107386aa5f` |
| `MOD` | `research/threeway-sources/author/MEH-Modeling-Methods-2026.pdf` | 2026-06-16 | 31 | `a1b8165be58fa3f68553ec8a8285ff566830b673a99ac428ed3a6527416349cf` |
| `HR` | `research/threeway-sources/author/Hornresp-and-MathCad-Correlation-2026.pdf` | 2026-06-17 | 12 | `35e09f99294cb236375430638c449153b56c300281700d9574579bc70adef8ae` |
| `XOV` | `research/threeway-sources/author/MEH-Crossover-Design-2026.pdf` | 2026-06-23 | 19 | `317300b9bb3f4e018761c809876e00a90fef3c00043e50083424bc9baa518c6b` |

Page references below use the printed/PDF page number, which is the same in
these files.

## 1. Conventions that must be fixed before coding

Use one canonical band order:

\[
\mathbf U =
\begin{bmatrix}
U_h & U_m & U_l
\end{bmatrix}^{T},
\qquad
\mathbf p =
\begin{bmatrix}
p_h & p_m & p_l
\end{bmatrix}^{T}.
\]

This matches the impedance plot order in `MOD` pp. 22 and 24: HF is the top
row, MF the middle row, and LF the bottom row. The KVL slides list the equations
in the opposite reading order, LF/MF/HF (`MOD` pp. 16 and 18; `XOV` pp. 7 and
18). Mixing those two presentation orders is an obvious index-swap risk.

The King state vector order is also nonstandard and must be preserved:

\[
\mathbf x_k =
\begin{bmatrix}
U_k\\
p_k
\end{bmatrix},
\]

not \([p,U]^T\). Here \(U\) is volume velocity and \(p\) is acoustic pressure
(`MOD` pp. 6 and 8; `ALG` p. 1).

Recommended internal SI units are:

| Quantity | Unit |
|---|---|
| \(f,\omega\) | Hz, rad/s with \(\omega=2\pi f\) |
| \(p\) | Pa |
| \(U\) | m3/s |
| acoustic impedance \(p/U\) | Pa s/m3 |
| area | m2 |
| axial length | m |
| electrical impedance | ohm |

All states, impedances, transfer coefficients, crossover gains, and source
terms are complex phasors and functions of frequency. The papers do not state
whether every plotted source amplitude is RMS or peak. That convention must be
made explicit before absolute SPL or power is claimed.

For a transfer matrix written in the source's \([U,p]^T\) order,

\[
\mathbf T =
\begin{bmatrix}
A & B\\
C & D
\end{bmatrix},
\]

\(A,D\) are dimensionless, \(B\) has acoustic-admittance units, and \(C\) has
acoustic-impedance units. A dimensionless generic matrix type would therefore
be unsafe unless its state normalization is also stored.

## 2. Axial geometry and network topology

### 2.1 Four axial points

The source defines four points along the horn axis (`ALG` p. 1; `MOD` p. 6):

| Point | Axial coordinate | Meaning |
|---:|---:|---|
| 0 | \(z_0=0\) | HF driver exit / horn throat |
| 1 | \(z_1=z_m\) | MF entry throat center |
| 2 | \(z_2=z_l\) | LF entry throat center; omitted in the two-driver case |
| 3 | \(z_3=L_{\mathrm horn}\) | open end / mouth |

The corresponding three-way topology is:

```text
HF branch at point 0 -- horn 0:1 -- MF branch at point 1
                                      |
                                   horn 1:2
                                      |
                                LF branch at point 2
                                      |
                                   horn 2:3
                                      |
                                    mouth
```

The side branches may contain a driver-facing coupling volume and a passage
that King calls a throat. A branch transfer matrix connects its cone plane to
the horn-axis node. A driver may instead be flush-mounted to the inside wall,
removing that volume and passage (`MOD` pp. 7, 21, and 24-25).

### 2.2 Horn and branch transfer relations

For a horn segment:

\[
\mathbf x_i =
\mathbf H_{i\leftarrow j}\mathbf x_j,
\qquad
\mathbf x_j =
\mathbf H_{i\leftarrow j}^{-1}\mathbf x_i.
\]

The mouth-to-throat chain is (`ALG` p. 1; `MOD` p. 9):

\[
\mathbf x_0 =
\mathbf H_{0\leftarrow1}
\mathbf H_{1\leftarrow2}
\mathbf H_{2\leftarrow3}
\mathbf x_3.
\]

Define branch matrices using the direction printed in the source:

\[
\begin{aligned}
\mathbf x_l &= \mathbf B_l\mathbf x_2,\\
\mathbf x_m &= \mathbf B_m\mathbf x_1,\\
\mathbf x_h &= \mathbf B_h\mathbf x_0.
\end{aligned}
\]

The four PDFs do **not** provide the \(A,B,C,D\) coefficient formulas for either
the horn segments or the branch volume/passage. `MOD` p. 9 points to a separate
transfer-matrix derivation. The present source set therefore specifies network
assembly, but not a numerically complete transfer provider. Do not invent a
conical, exponential, lossy, or chamber matrix and label it "King 2026" without
auditing that separate derivation.

### 2.3 Branch continuity

At a side entry, pressure is common to all connected paths while signed volume
velocity is conserved. Traversing from mouth toward throat, King defines:

- \(U\): volume velocity arriving from the open-end direction;
- \(U'\): volume velocity diverted through the side passage toward the driver;
- \(U''\): volume velocity continuing toward the closed/throat end.

Thus (`ALG` p. 1; `MOD` p. 11):

\[
p'=p''=p,
\qquad
U''=U-U',
\qquad
U=U'+U''.
\]

Those signs follow the source's traversal convention. If code uses outward
volume velocity at every port, branch signs must be transformed once at the
port boundary rather than changed ad hoc inside the solve.

### 2.4 Mouth boundary condition

Every source-column calculation begins with (`ALG` pp. 2, 3, and 5; `MOD`
p. 10):

\[
U_3=U_{\mathrm mouth}=1,
\qquad
p_3=Z_{\mathrm mouth}U_3.
\]

The unit mouth volume velocity is only a linear normalization. `MOD` p. 10
describes \(Z_{\mathrm mouth}\) as the radiation impedance of a circular piston
in an infinite baffle, but none of the four PDFs supplies its equation or says
how a square or rectangular mouth is reduced to that piston. That radiation
load is a separate unresolved dependency.

## 3. Constructing the 3 x 3 horn impedance matrix

### 3.1 Matrix meaning and orientation

The shared horn is reduced to:

\[
\mathbf p=\mathbf Z_H\mathbf U,
\]

\[
\mathbf Z_H =
\begin{bmatrix}
Z_{hh} & Z_{hm} & Z_{hl}\\
Z_{mh} & Z_{mm} & Z_{ml}\\
Z_{lh} & Z_{lm} & Z_{ll}
\end{bmatrix}.
\]

The first subscript is the cone at which pressure is observed; the second is
the cone whose volume velocity drives the network. For example:

\[
Z_{lm}=\left.\frac{p_l}{U_m}\right|_{U_h=0,\ U_l=0}.
\]

This orientation follows the output definitions throughout `ALG` pp. 3-6 and
the labels in `MOD` p. 22. Each column is found by driving one cone while
constraining the other two cone volume velocities to zero.

King calls the matrix symmetric (`MOD` pp. 22 and 24). The reciprocity check is
complex symmetry,

\[
Z_{ij}=Z_{ji},
\]

not Hermitian symmetry \(Z_{ij}=Z_{ji}^{*}\). An implementation should measure
the complex residual and report it. It must not hide a transfer/sign error by
averaging the two entries.

The matrix in `MOD` p. 22 is derived only from horn and branch geometry; it
does not contain driver T/S properties.

### 3.2 Stationary-branch impedance primitive

For a branch whose cone is held stationary, choose the arbitrary cone state
\([0,1]^T\). For a branch matrix \(\mathbf B\):

\[
\widetilde{\mathbf x}_{\mathrm node}
=
\mathbf B^{-1}
\begin{bmatrix}
0\\
1
\end{bmatrix},
\qquad
Z_{\mathrm branch@node}
=
\frac{\widetilde p_{\mathrm node}}
{\widetilde U_{\mathrm node}}.
\]

The arbitrary pressure normalization cancels in the ratio. At the actual node
pressure \(p\):

\[
U'=\frac{p}{Z_{\mathrm branch@node}},
\qquad
U''=U-U'.
\]

Back-propagating \([U',p]^T\) through \(\mathbf B\) should recover a cone
volume velocity numerically equal to zero. This residual is an important
assertion in all three source-column calculations.

Near a branch pole or zero, the explicit \(p/Z\) sequence can be ill-conditioned.
A production numerical method may solve the equivalent nodal system directly,
but it must reproduce the same boundary conditions and matrix orientation.

### 3.3 HF-driven column

The following is the source-consistent reading of `ALG` pp. 2-3:

1. Form \(\mathbf x_3=[1,Z_{\mathrm mouth}]^T\) and propagate to point 2:
   \(\mathbf x_2=\mathbf H_{2\leftarrow3}\mathbf x_3\).
2. Compute the stationary LF branch impedance with
   \(\mathbf B_l^{-1}[0,1]^T\). Split \(U_2\), retain \(p_2\), and evaluate
   \(\mathbf x_l=\mathbf B_l[U'_2,p_2]^T\). Assert \(U_l\approx0\).
3. Propagate the remainder:
   \(\mathbf x_1=\mathbf H_{1\leftarrow2}[U''_2,p_2]^T\).
4. Compute the stationary MF branch impedance with
   \(\mathbf B_m^{-1}[0,1]^T\). Split \(U_1\), retain \(p_1\), and evaluate
   \(\mathbf x_m=\mathbf B_m[U'_1,p_1]^T\). Assert \(U_m\approx0\).
5. Evaluate the driven HF cone:
   \[
   \mathbf x_h=
   \mathbf B_h\mathbf H_{0\leftarrow1}
   \begin{bmatrix}
   U''_1\\p_1
   \end{bmatrix}.
   \]
6. Normalize by \(U_h\):
   \[
   \mathbf Z_H[:,h]
   =
   \frac{1}{U_h}
   \begin{bmatrix}
   p_h\\p_m\\p_l
   \end{bmatrix}.
   \]

`ALG` pp. 2-3 contains a probable matrix-direction transcription error in the
MF part of this specific workflow: it first uses \(\mathbf B_m\), rather than
\(\mathbf B_m^{-1}\), to move from the stationary cone to the node, then uses
\(\mathbf B_m^{-1}\), rather than \(\mathbf B_m\), to return to the cone. That
contradicts the global branch definition on `ALG` p. 2, the LF calculation
immediately above it, and the MF treatment in the other two source-column
algorithms. The corrected reading above must remain a documented hypothesis
until it passes a published-sample regression or an author clarification.

### 3.4 MF-driven column

The `ALG` pp. 3-5 sequence is:

1. Propagate the normalized mouth state to point 2.
2. Terminate the LF branch with \(U_l=0\), split at point 2, recover \(p_l\),
   and propagate the remainder to point 1.
3. Treat the HF path, as seen from point 1, as the composite matrix
   \(\mathbf B_h\mathbf H_{0\leftarrow1}\):
   \[
   \widetilde{\mathbf x}_1=
   \left(\mathbf B_h\mathbf H_{0\leftarrow1}\right)^{-1}
   \begin{bmatrix}0\\1\end{bmatrix},
   \qquad
   Z_{\mathrm h@1}=\widetilde p_1/\widetilde U_1.
   \]
4. Set \(U''_1=p_1/Z_{\mathrm h@1}\) and recover the stationary HF cone with
   the forward composite matrix. Assert \(U_h\approx0\).
5. The driven MF branch receives \(U'_1=U_1-U''_1\):
   \[
   \mathbf x_m=\mathbf B_m[U'_1,p_1]^T.
   \]
6. Normalize:
   \[
   \mathbf Z_H[:,m]
   =
   \frac{1}{U_m}
   \begin{bmatrix}
   p_h\\p_m\\p_l
   \end{bmatrix}.
   \]

### 3.5 LF-driven column

For the outer LF source, `ALG` pp. 5-6 first constructs the impedance of the
entire stationary upstream HF/MF subnetwork:

1. At point 1, obtain the stationary HF-path impedance from
   \((\mathbf B_h\mathbf H_{0\leftarrow1})^{-1}[0,1]^T\).
2. Obtain the stationary MF-branch impedance from
   \(\mathbf B_m^{-1}[0,1]^T\).
3. At a common \(p_1\), form
   \[
   U''_1=\frac{p_1}{Z_{\mathrm h@1}},
   \qquad
   U'_1=\frac{p_1}{Z_{\mathrm m@1}},
   \qquad
   U_1=U'_1+U''_1.
   \]
4. Move that equivalent termination outward:
   \[
   \widehat{\mathbf x}_2=
   \mathbf H_{1\leftarrow2}^{-1}
   \begin{bmatrix}U_1\\p_1\end{bmatrix},
   \qquad
   Z_{\mathrm upstream@2}=\widehat p_2/\widehat U_2.
   \]
5. At the actual mouth-derived point-2 state:
   \[
   U''_2=p_2/Z_{\mathrm upstream@2},
   \qquad
   U'_2=U_2-U''_2.
   \]
   The driven LF cone is
   \(\mathbf x_l=\mathbf B_l[U'_2,p_2]^T\).
6. Back-propagate \([U''_2,p_2]^T\) to point 1, re-split it with the stored
   stationary MF impedance, and recover the MF and HF cone pressures. Assert
   \(U_m\approx0\) and \(U_h\approx0\).
7. Normalize:
   \[
   \mathbf Z_H[:,l]
   =
   \frac{1}{U_l}
   \begin{bmatrix}
   p_h\\p_m\\p_l
   \end{bmatrix}.
   \]

`ALG` p. 5 names the MF stationary ratio \(Z_{\mathrm mid}\), but one subsequent
line uses the generic symbol \(Z\) in \(U'_1=p_1/Z\). `ALG` p. 6 returns to
\(Z_{\mathrm mid}\). This should be treated as a notation typo, not a second
impedance.

### 3.6 Mouth-to-cone velocity ratio

For each driven column the source reports:

\[
\epsilon_i =
\frac{S_{d,i}}{S_{\mathrm mouth}}\frac{1}{U_i}
\quad\text{when }U_{\mathrm mouth}=1
\qquad
(\text{`ALG` pp. 3, 5, and 6}).
\]

More generally:

\[
\epsilon_i =
\frac{U_{\mathrm mouth}/S_{\mathrm mouth}}
{U_i/S_{d,i}}
=
\frac{S_{d,i}}{S_{\mathrm mouth}}
\frac{U_{\mathrm mouth}}{U_i}.
\]

It is a complex average-air-velocity ratio, not a scalar efficiency.

## 4. Driver and crossover coupled solve

### 4.1 Acoustic driver terms

For each band \(i\), define:

\[
Z_{\mathrm mech,a},i =
j\omega M_{\mathrm ad,i}
+R_{\mathrm ad,i}
+\frac{1}{j\omega C_{\mathrm ad,i}}.
\]

The standard transformer interpretation, not re-derived in these PDFs, is:

\[
M_{\mathrm ad}=M_{\mathrm md}/S_d^2,\qquad
R_{\mathrm ad}=R_{\mathrm md}/S_d^2,\qquad
C_{\mathrm ad}=C_{\mathrm md}S_d^2.
\]

This should be verified against the author's separate base driver model before
being used as a provenance-bearing King implementation. The four documents
also do not state how \(S_d,BL,M,R,C\) are aggregated for arbitrary series and
parallel groups. Hornresp's `2P` setting is not a substitute for defining the
custom solver's group equations.

The source's reduced circuit uses:

\[
Z_{\mathrm comb},i=Z_{\mathrm horn},i+Z_{\mathrm rear},i
\quad\text{(`MOD` pp. 15 and 17; `XOV` pp. 4, 6, 8, and 17)}.
\]

In the 3 x 3 notation, the source-consistent interpretation is:

\[
Z_{\mathrm comb},i=Z_{ii}+Z_{\mathrm rear},i.
\]

Only the shared horn produces the off-diagonal \(Z_{ij}\) terms. This assumes
the rear chambers are independent. Shared rear cavities would require another
coupling matrix and are not covered.

### 4.2 Active crossover KVL

For band \(i\):

\[
Z_{\mathrm e,i}
=R_{\mathrm g,i}+R_{\mathrm add,i}+R_{\mathrm e,i}
+j\omega L_{\mathrm vc,i}.
\]

Let \(D_i(\omega)\) be the complex active crossover/DSP multiplier and
\(e_{\mathrm g,i}\) its voltage source. The acoustic source pressure is:

\[
g_i^{(\mathrm active)}
=
\frac{D_i e_{\mathrm g,i}BL_i}
{Z_{\mathrm e,i}S_{d,i}}.
\]

Define:

\[
A_{ii}^{(\mathrm active)}
=
\frac{BL_i^2}{S_{d,i}^2Z_{\mathrm e,i}}
+Z_{\mathrm mech,a},i
+Z_{\mathrm rear},i
+Z_{ii},
\]

\[
A_{ij}^{(\mathrm active)}=Z_{ij},\qquad i\ne j.
\]

Then solve at every frequency:

\[
\mathbf A^{(\mathrm active)}\mathbf U
=
\mathbf g^{(\mathrm active)}.
\]

Expanded for LF, the source equation is:

\[
\frac{D_l e_{\mathrm g,l}BL_l}{Z_{\mathrm e,l}S_{d,l}}
-
\left[
\frac{BL_l^2}{S_{d,l}^2Z_{\mathrm e,l}}
+Z_{\mathrm mech,a},l
+Z_{\mathrm rear},l
+Z_{ll}
\right]U_l
-Z_{lh}U_h
-Z_{lm}U_m
=0,
\]

with analogous MF and HF equations (`MOD` p. 16; `XOV` p. 7).

The sign of a deliberately reversed band, such as the sample's reversed MF
polarity noted on `MOD` p. 29, belongs in its source/crossover transfer
function. It should not be hidden by changing a horn coupling sign.

### 4.3 Passive crossover KVL

For a scalar Thevenin equivalent at each driver's electrical port, use the
complex open-circuit voltage \(e_{\mathrm th,i}\) and driving-point electrical
impedance \(Z_{\mathrm th,i}\):

\[
g_i^{(\mathrm passive)}
=
\frac{e_{\mathrm th,i}BL_i}
{Z_{\mathrm th,i}S_{d,i}},
\]

\[
A_{ii}^{(\mathrm passive)}
=
\frac{BL_i^2}{S_{d,i}^2Z_{\mathrm th,i}}
+Z_{\mathrm mech,a},i
+Z_{\mathrm rear},i
+Z_{ii},
\]

\[
A_{ij}^{(\mathrm passive)}=Z_{ij},\qquad i\ne j.
\]

Then:

\[
\mathbf A^{(\mathrm passive)}\mathbf U
=
\mathbf g^{(\mathrm passive)}.
\]

These are the equations printed on `MOD` p. 18 and `XOV` p. 18.

The Thevenin pair must be defined on the **electrical voice-coil port before
the \(BL\) transformation** for the reduced equation above to be dimensionally
consistent. `XOV` p. 14 draws test terminals after the \(BL:1\) transformer and
writes \(V_{\mathrm oc}=u_d=e/BL\) and \(I_{\mathrm sc}=f_d=BL\,i\), but pp.
15-18 subsequently use \(Z_{\mathrm th}\) as the electrical impedance
\(R_e+j\omega L_{\mathrm vc}+\cdots\) and \(e_{\mathrm th}\) as an electrical
voltage. This port-label inconsistency must not leak into implementation units.

### 4.4 Passive ladder transcribed from the source

Use:

\[
Z_C=\frac{1}{j\omega C},
\qquad
Z_L=j\omega L,
\qquad
Z_a\parallel Z_b =
\left(Z_a^{-1}+Z_b^{-1}\right)^{-1}.
\]

From the optional compensation topology on `XOV` p. 12:

\[
Z_{\mathrm trap}
=R_{\mathrm trap}+j\omega L_{\mathrm trap}
+\frac{1}{j\omega C_{\mathrm trap}},
\]

\[
Z_{\mathrm zobel}
=R_{\mathrm zobel}+\frac{1}{j\omega C_{\mathrm zobel}}.
\]

Let:

\[
P=R_{\mathrm parallel}\parallel Z_{\mathrm trap}
\parallel Z_{\mathrm zobel},
\qquad
Z_0=R_g+R_{\mathrm add}.
\]

The nested looking-back calculation printed on `XOV` p. 15 can be made
unambiguous for the MF band as:

\[
\begin{aligned}
q_1 &= Z_{C1}+Z_0,\\
q_2 &= Z_{L1}\parallel q_1,\\
q_3 &= Z_{C2}+q_2,\\
q_4 &= Z_{L2}\parallel q_3,\\
q_5 &= Z_{L3}+q_4,\\
q_6 &= Z_{C3}\parallel q_5,\\
q_7 &= Z_{L4}+q_6,\\
q_8 &= Z_{C4}\parallel q_7,\\
Q_m &= R_{\mathrm series}+q_8,\\
Z_{\mathrm th,m} &=
R_e+j\omega L_{\mathrm vc}+(P\parallel Q_m).
\end{aligned}
\]

Removing the first high-pass section gives the LF form on `XOV` p. 16:

\[
\begin{aligned}
q_1 &= Z_{L3}+Z_0,\\
q_2 &= Z_{C3}\parallel q_1,\\
q_3 &= Z_{L4}+q_2,\\
q_4 &= Z_{C4}\parallel q_3,\\
Q_l &= R_{\mathrm series}+q_4,\\
Z_{\mathrm th,l} &=
R_e+j\omega L_{\mathrm vc}+(P\parallel Q_l).
\end{aligned}
\]

Removing the low-pass section gives the HF form:

\[
\begin{aligned}
q_1 &= Z_{C1}+Z_0,\\
q_2 &= Z_{L1}\parallel q_1,\\
q_3 &= Z_{C2}+q_2,\\
q_4 &= Z_{L2}\parallel q_3,\\
Q_h &= R_{\mathrm series}+q_4,\\
Z_{\mathrm th,h} &=
R_e+j\omega L_{\mathrm vc}+(P\parallel Q_h).
\end{aligned}
\]

`XOV` p. 11 says lower-order networks are represented by opening or shorting
unused components. Those limiting operations should be explicit graph edits
or exact zero/infinite-impedance elements, not huge magic values.

The source's printed open-circuit voltage-divider products are:

\[
\begin{aligned}
e_{\mathrm th,m}=e_g&
\frac{Z_{L1}}{Z_0+Z_{C1}+Z_{L1}}
\frac{Z_{L2}}{Z_{C2}+Z_{L2}}
\frac{Z_{C3}}{Z_{L3}+Z_{C3}}
\frac{Z_{C4}}{Z_{L4}+Z_{C4}}
\frac{R_{\mathrm parallel}}
{R_{\mathrm series}+R_{\mathrm parallel}},\\
e_{\mathrm th,l}=e_g&
\frac{Z_{C3}}{Z_0+Z_{L3}+Z_{C3}}
\frac{Z_{C4}}{Z_{L4}+Z_{C4}}
\frac{R_{\mathrm parallel}}
{R_{\mathrm series}+R_{\mathrm parallel}},\\
e_{\mathrm th,h}=e_g&
\frac{Z_{L1}}{Z_0+Z_{C1}+Z_{L1}}
\frac{Z_{L2}}{Z_{C2}+Z_{L2}}
\frac{R_{\mathrm parallel}}
{R_{\mathrm series}+R_{\mathrm parallel}}.
\end{aligned}
\]

In each line the adjacent fractions are multiplied, not added (`XOV` pp.
15-16).

These products should be treated as source transcription, not as a trusted
general circuit solver:

- the diagram places \(Z_{\mathrm trap}\) and \(Z_{\mathrm zobel}\) across the
  same node as \(R_{\mathrm parallel}\), but the printed open-circuit voltage
  products omit their loading;
- the simple product of local dividers does not visibly include loading of one
  ladder stage by the following stages;
- all three passive branches share the amplifier in `XOV` p. 11, while the
  derivation reduces each branch separately and includes \(R_g\) in each
  scalar branch. A nonzero common source impedance can electrically couple the
  branches.

The robust implementation contract is therefore:

1. compute \(e_{\mathrm th}\) as the open-circuit complex voltage at the actual
   coil port;
2. suppress independent sources and compute \(Z_{\mathrm th}=V_{\mathrm
   test}/I_{\mathrm test}\), or solve the equivalent short-circuit current;
3. use modified nodal analysis for the full passive graph; and
4. reduce to independent scalar Thevenin pairs only after proving that the
   network is separable. Otherwise, retain an electrical multiport matrix and
   solve it with the acoustic matrix.

`XOV` p. 17 reports that the author's Thevenin method matched an older explicit
three-way transmission-line worksheet for several crossover orders. No
machine-readable fixture, component set, or independent SPICE comparison is
included, so that claim is an internal model check, not enough to close the
issues above.

## 5. Published sample and Hornresp mapping

### 5.1 Sample design

`MOD` p. 21 specifies:

| Band | Driver group | \(f_s\) | \(Q_{ts}\) |
|---|---|---:|---:|
| HF | 1 x Fostex FF85WK | 115 Hz | 0.57 |
| MF | 2 x Fostex FF125WK | 67 Hz | 0.43 |
| LF | 2 x Fostex FF225WK | 44 Hz | 0.35 |

The horn is:

- 3.25 in x 3.25 in throat;
- 24 in x 24 in mouth;
- nominal 18 in axial length;
- single expansion;
- 60 degree horizontal and 60 degree vertical exit angles.

For the first active sample, the MF and LF coupling volumes approximate the
concave volume in front of each cone. Passage area is approximately \(S_d/5\);
passage length is the wall thickness. The HF unit is flush at the horn throat.
The initial sample ignores rear radiation (`MOD` pp. 20-21).

Active crossover frequencies are 400 Hz and 800 Hz (`MOD` pp. 23 and 25).
The passive sample uses the same drivers/horn, flush MF/LF mounting, 400/800 Hz
crossovers, and a trap on the MF electrical impedance resonance (`MOD` p. 26).
`MOD` p. 29 states that the MF band is connected with reversed polarity in the
phase example.

### 5.2 Exact horn fixture from the Hornresp screenshots

The correlation record is conical and runs from throat \(S_1\) to mouth
\(S_4\), not mouth to throat (`HR` pp. 4 and 7):

| Segment | Start area | End area | Length |
|---|---:|---:|---:|
| 0 -> 1 | \(S_1=68.15\) cm2 | \(S_2=182.94\) cm2 | \(L_{12}=4.56\) cm |
| 1 -> 2 | \(S_2=182.94\) cm2 | \(S_3=459.30\) cm2 | \(L_{23}=6.85\) cm |
| 2 -> 3 | \(S_3=459.30\) cm2 | \(S_4=3716.10\) cm2 | \(L_{34}=34.23\) cm |

Therefore the screenshot fixture has:

\[
z_0=0,\quad
z_1=4.56\ {\rm cm},\quad
z_2=11.41\ {\rm cm},\quad
z_3=45.64\ {\rm cm}.
\]

The nominal 18 in length on `MOD` p. 21 converts to 45.72 cm. Preserve the
45.64 cm Hornresp screenshot value in the regression fixture; do not silently
"correct" the 0.08 cm difference.

### 5.3 Decisive band-to-record map

The audited record map is:

| Band | Hornresp role | Screenshot evidence |
|---|---|---|
| LF | `ME2`, `2P`, record 2 | `HR` p. 5; `Power 3` / `ME2` on p. 9 |
| MF | `ME1`, `2P`, record 3 | `HR` p. 6; `Power 2` / `ME1` on p. 10 |
| HF + horn | `Nd`, `1`, record 4 | `HR` p. 7; `Power 1` / `Nd` on p. 11 |

The Hornresp wizard header on `HR` pp. 4 and 8-11 explicitly says `ME1 record
3` and `ME2 record 2`. This is not an inference from band names.

### 5.4 Raw driver/branch fixture values

The following values are transcribed from the screenshots. Area and horn-length
units are confirmed by the inch-to-centimeter geometry. The GUI does not print
units beside every driver field, so the common Hornresp interpretation in the
last column remains an interpretation to verify against the actual program
format.

| Field | HF / `Nd` p. 7 | MF / `ME1 2P` p. 6 | LF / `ME2 2P` p. 5 | Interpreted unit |
|---|---:|---:|---:|---|
| `Ang` | `2.0 x Pi` | `0.0 x Pi` | `0.0 x Pi` | radiation multiple of pi |
| `Eg` | 2.83 | 2.83 | 2.83 | V, convention not stated |
| `Rg` | 0.00 | 0.00 | 0.00 | ohm |
| `Fta` / `Cir` | `Fta=33.09` | `Cir=0.00` | `Cir=0.00` | undefined in these PDFs |
| `Sd` | 28.30 | 66.50 | 221.70 | cm2 |
| `Cms` | `9.11E-04` | `1.15E-03` | `8.26E-04` | likely m/N |
| `Mmd` | 2.02 | 4.59 | 13.94 | likely g |
| `Re` | 7.20 | 6.70 | 6.00 | ohm |
| `Bl` | 4.01 | 5.49 | 8.01 | T m |
| `Rms` | 0.46 | 0.41 | 1.90 | likely N s/m |
| `Le` | 0.03 | 0.04 | 0.07 | likely mH |
| count flag | `Nd=1` | `ME1=2P` | `ME2=2P` | one HF; two parallel MF/LF |
| `Vrc` | 0.14 | 0.68 | 4.50 | L |
| `Lrc` | 2.54 | 5.08 | 10.16 | cm |
| `Vtc` | 0.00 | 44.54 | 221.67 | cm3 |
| `Atc` | 68.15 | 66.48 | 221.70 | cm2 |
| entry passage | `Ap1=68.15`, `Lp=0.00` | `Ap1=Ap2=13.30`, `Con=1.27` | `Ap1=Ap2=44.33`, `Con=1.27` | cm2, cm |
| displayed record volume | 65.367 | 0.742 | 4.778 | L |

The horn record shows `F12=F23=F34=0.00`; its unused fourth segment is zero.
The MF/LF entry records show their unused horn-section fields as zero, and the
visible auxiliary rear-port fields are zero. A byte/field-level fixture should
preserve those zeros rather than rely on Hornresp defaults.

The overall wizard volume on `HR` p. 4 is 70.887 L, exactly the displayed sum
\(65.367+0.742+4.778\). This, the physical cone volumes, and the sample
description make a liters interpretation of `Vtc=221.67` impossible. The MF
and LF passage areas also reproduce \(S_d/5\), and 1.27 cm is the stated wall
thickness.

The individual displayed volumes provide a stronger unit cross-check:

\[
4.50\ {\rm L}
+221.67\ {\rm cm^3}
+44.33\ {\rm cm^2}(1.27\ {\rm cm})
=4.778\ {\rm L}
\]

for LF, and:

\[
0.68\ {\rm L}
+44.54\ {\rm cm^3}
+13.30\ {\rm cm^2}(1.27\ {\rm cm})
\approx0.742\ {\rm L}
\]

for MF. Thus `Vtc` is represented in cm3, the entry passage contributes
`Ap x Con`, and `Lrc` is not the unit used to construct the displayed `Vrc`
volume.

The rear chambers were added because Hornresp required them to calculate and
plot sound power; they were not in the original Mathcad comparison model
(`HR` p. 3). No crossover was used in the Hornresp/Mathcad comparison. The
rear volumes must not be presented as a chosen enclosure alignment, and the
correlation plots must not be mistaken for the separate 400/800 Hz crossover
sample.

### 5.5 Legacy exporter mismatches and fail-closed requirement

The legacy `hornrespME()` assumptions are not a safe starting point for the
rebuild:

| Contract item | King screenshot truth | Legacy assumption | Status |
|---|---|---|---|
| Record map | LF -> `ME2`; MF -> `ME1`; HF -> `Nd` (`HR` pp. 5-7, 9-11) | woofer -> `ME1`; mid -> `ME2` | blocked |
| Section direction | \(S_1\) throat -> \(S_4\) mouth (`HR` pp. 4, 7) | mouth -> throat | blocked |
| Entry station | Algorithm plus fixture imply MF point 1 / \(S_2\), LF point 2 / \(S_3\); Hornresp binding still needs round-trip confirmation | woofer at \(S_2\); mid at \(S_3\) | blocked |
| HF record | real FF85WK, `Nd=1`, `Eg=2.83` (`HR` p. 7) | dummy `Nd` driver | blocked |
| `Vtc` | 44.54 and 221.67 cm3 (`HR` pp. 5-6) | liters, with division by 1000 | blocked |
| `Lrc` | 2.54/5.08/10.16 cm (`HR` pp. 5-7) | millimeters | blocked |
| Entry fields | side-entry `Ap1/Ap2`; `Atc` approximately cone area (`HR` pp. 5-6) | `Ap=0`; aperture area placed in `Atc` | blocked |
| Multiplicity | MF and LF are `2P` (`HR` pp. 5-6) | each record emitted as `1` | blocked |
| Unexplained raw fields | `Fta=33.09`, HF data shown on `HR` p. 7 | unrelated generated dummy values | blocked |

Do not patch this mapping piecemeal. Keep legacy three-way Hornresp export
disabled until a topology-dispatched record map passes a round-trip fixture:

1. Store the `HR` pp. 4-7 values above as an immutable provenance fixture.
2. Serialize three typed roles (`lfEntry`, `mfEntry`, `hfHornCarrier`) through
   an explicit role-to-record map.
3. Parse the serialized records back and require exact role, area, length,
   chamber, driver, and multiplicity equality after unit conversion.
4. Confirm in Hornresp that the wizard reports `ME1 record 3`, `ME2 record 2`,
   the correct schematic direction, and the expected total system volume.
5. Compare the total and three masked power responses against digitized
   landmarks from `HR` pp. 8-11. Tolerances must be declared before the
   comparison; visual similarity alone is not a regression.

## 6. Coupling-volume and offset observations

King describes each coupling volume plus passage as a second resonant system,
similar to a relatively high-tuned bass-reflex system as seen from the driver,
and as an acoustic trap as seen by waves traveling in the horn (`MOD` pp. 7
and 23).

For the published sample:

- the MF/LF volume-passage features produce peaks and dips between roughly
  2 and 3 kHz (`MOD` pp. 22-23);
- the MF/LF axial offsets produce nulls above roughly 3 kHz (`MOD` p. 22);
- removing the volumes/passages while retaining the same axial stations
  removes the 2-3 kHz secondary resonances, but not the offset null series
  (`MOD` pp. 24-25);
- crossover frequencies and slopes can keep those nulls out of the summed
  passbands in this sample (`MOD` pp. 25 and 27);
- a smaller passage permits an entry closer to the horn throat, while a flush
  cone requires enough local horn-wall area for the whole driver (`MOD` p.
  25).

These frequencies are sample outcomes, not universal design rules.

As an independent sanity check only, the ideal no-end-correction Helmholtz
estimate:

\[
f_H\approx\frac{c}{2\pi}
\sqrt{\frac{A_p}{V_{\mathrm tc}L_p}}
\]

gives approximately 2.17 kHz for the LF screenshot values and 2.65 kHz for
the MF values with \(c=343\) m/s. This equation is not supplied in the four
PDFs, ignores passage end correction, multiplicity, chamber shape, and horn
loading, and must not replace the branch transfer matrix. It only explains why
the published 2-3 kHz observation is dimensionally plausible.

## 7. Validation claims and their limits

| Claim in the documents | Evidence actually shown | Limit |
|---|---|---|
| The horn impedance matrix is symmetric | Mathcad curves and stated reciprocity (`MOD` pp. 22, 24) | No independent numeric table or measurement |
| Active and passive samples can be made nearly identical | Two Mathcad SPL plots (`MOD` p. 28) | Same author model and geometry; not hardware validation |
| The Thevenin crossover method checks | Agreement with an older explicit TL worksheet (`XOV` p. 17) | No fixture values or independent circuit simulation |
| Hornresp and Mathcad capture similar behavior | Similar total/individual curve shapes, chamber resonances in the same range, and offset nulls at approximately the same frequencies (`HR` pp. 8-12) | Qualitative plots; no error norm, digitized data, or absolute calibration criterion |
| Mathcad is partially validated | Author conclusion on `HR` p. 12 | Model-to-model only; author says he is not a Hornresp expert and asks for corrections |
| Phase resembles a single source after time removal | Estimated propagation distance produces a nearly linear unwrapped phase and low group delay (`MOD` pp. 29-30) | Estimate is fitted by a "few cm"; one sample, no measured impulse response |

Additional explicit development limits:

- The correlation sample is a proof of concept, not a finished design (`HR`
  p. 3).
- The author identifies building and measuring an MEH as future work (`HR`
  p. 12).
- Rear chamber modeling is described as mostly complete, not complete (`MOD`
  p. 31).
- Flat versus curved wavefront modeling remains under study (`MOD` p. 31).
- The sample HF device is a small direct radiator, and compression-driver
  measurement/modeling is identified as future work (`MOD` pp. 19 and 31).
- Uniform \(p\) and \(U\) over each axial cross-section is a one-dimensional
  assumption (`MOD` p. 6). The four PDFs do not validate higher modes,
  diffraction, arbitrary side-entry azimuth, nonlinear compression, thermal
  behavior, or real polar response.

## 8. Source ambiguities and required disposition

| Issue | Provenance | Disposition |
|---|---|---|
| HF-column MF branch uses the branch matrix and inverse in the wrong directions | `ALG` pp. 2-3 | Preserve as a documented erratum candidate; test the source-consistent correction |
| LF-column line uses \(Z\) after naming \(Z_{\mathrm mid}\) | `ALG` pp. 5-6 | Treat as notation typo and assert stationary MF residual |
| Segment and branch transfer coefficients are absent | `ALG`/`MOD`; external reference on `MOD` p. 9 | No production solver until the referenced derivation is audited |
| Mouth radiation equation and square/rectangular mapping are absent | `MOD` p. 10 | Dependency remains unimplemented/experimental |
| Matrix order differs from KVL slide order | `MOD` pp. 16, 18, 22 | Typed band indices; never positional arrays without labels |
| \(Z_{\mathrm comb}\) does not explicitly name \(Z_{ii}\) | `MOD` pp. 15, 17 | Use self horn term only as source-consistent interpretation and test it |
| Passive Thevenin test-port labels conflict with later electrical units | `XOV` pp. 14-18 | Define Thevenin pair at the electrical coil port |
| Printed \(e_{\mathrm th}\) dividers omit visible loads and stage interaction | `XOV` pp. 12, 15-16 | Use graph/MNA solution; keep printed products as comparison only |
| Common passive source impedance may couple bands electrically | `XOV` pp. 11, 14-16 | Use a multiport solve unless scalar separation is proven |
| Grouped-driver series/parallel reduction is not derived | `MOD` p. 31; `HR` pp. 5-6 | Audit group equations separately; do not infer from `2P` text |
| `Fta`, `Cir`, and several Hornresp field semantics are not defined | `HR` pp. 5-7 | Preserve raw fixture values and verify with Hornresp documentation/software |
| Hornresp nominal and screenshot lengths differ by 0.08 cm | `MOD` p. 21; `HR` pp. 4, 7 | Keep both provenance values; use screenshot values for the round trip |

## 9. What may be implemented now, and what must wait

Safe scaffolding and tests:

- complex phasor/state types with explicit \([U,p]^T\) ordering and units;
- labeled points 0-3 and typed HF/MF/LF branch roles;
- generic two-port composition and inverse operations;
- pressure-continuity and signed-volume-conservation residuals;
- a labeled complex 3 x 3 solve interface;
- provenance-bearing raw fixtures for all values in Section 5;
- experimental reciprocity, passive-cone, and KVL residual reports; and
- a disabled topology-dispatched Hornresp serializer exercised only by
  round-trip tests.

Keep unimplemented or behind an explicit experimental gate until validated:

- the legacy three-way Hornresp exporter and every legacy mapping in Section
  5.5;
- a production King transfer-matrix solver until horn, branch, and mouth-load
  equations are independently audited;
- silent correction of the `ALG` matrix-direction error;
- passive crossover results based only on the printed voltage-divider
  products;
- scalar per-band Thevenin reduction for a network with shared electrical
  impedance unless separability is demonstrated;
- arbitrary grouped-driver aggregation;
- rear-chamber, curved-wavefront, or compression-driver claims presented as
  complete;
- absolute SPL/power calibration and polar prediction from the qualitative
  Hornresp plots; and
- optimizer decisions that treat the sample's 2-3 kHz resonances or 400/800 Hz
  crossovers as universal constraints.

The minimum acceptance evidence for an experimental solver is:

1. exact sample-geometry and Hornresp-record round trip;
2. passive-cone residuals for all three impedance columns;
3. branch pressure and volume-conservation residuals at points 1 and 2;
4. complex reciprocity residuals for all three off-diagonal pairs;
5. direct KVL residuals after solving active and passive systems;
6. independently generated Thevenin values for a set of explicit crossover
   graphs, preferably checked against SPICE or symbolic/nodal results;
7. frequency-landmark agreement with digitized `HR` pp. 8-11 using declared
   tolerances; and
8. eventual impedance, near-field, on-axis, and polar measurements from a
   dimensioned physical prototype before the model loses its experimental
   label.
