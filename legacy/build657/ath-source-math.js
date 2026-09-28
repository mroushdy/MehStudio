(function attachATHSourceMath(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MEHATHSourceMath = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createATHSourceMath() {
  "use strict";

  /*
   * Source-faithful ATH/OS-SE/R-OSSE equations.
   *
   * This module is deliberately independent of the DOM, meshes, drivers,
   * baffles, and application state. Angles are radians. Length-bearing
   * arguments must use one consistent unit; MEH Studio callers use metres.
   * Published equations are kept separate from derived construction helpers.
   */

  const API_VERSION = 1;
  const HALF_PI = Math.PI / 2;

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
    return value;
  }

  const SOURCE_PROVENANCE = deepFreeze({
    osse2020: {
      id: "osse2020",
      title: "OS-SE Waveguide",
      author: "Marcel Batík",
      date: "October 2020",
      file: "research-sources/ATH/OS-SE Waveguide.pdf",
      sha256: "f0792aa18c75bf272bff4b011eace815dc6da9c8ba401efa647f7745d5b48126",
      locators: {
        notation: "PDF page 2",
        generalizedOS: "PDF pages 2-4, equations (1)-(3)",
        termination: "PDF pages 5-7, equations (4)-(5)",
        examples: "PDF pages 2-9, figures 1-7",
        morph: "PDF page 10, section 5 Morphing",
        limitations: "PDF pages 1 and 11"
      }
    },
    athAp1_2021: {
      id: "athAp1_2021",
      title: "ATH Application Note 1: Spherical Wave Forming",
      author: "Marcel Batík",
      date: "December 2021",
      file: "research-sources/ATH/Ath-AP1.pdf",
      sha256: "01f4a578a3b81f8ec519adc3e19538c36773dcbf6622c28c75fea5c7906141d3",
      locators: {
        workedScript: "PDF page 3, ESP design example",
        construction: "PDF pages 4-8, Basic/Detailed ESP construction",
        meander: "PDF page 6, meander function",
        simulation: "PDF page 9",
        export: "PDF page 10"
      }
    },
    rosse2022Rev7: {
      id: "rosse2022Rev7",
      title: "R-OSSE Acoustic Waveguide, revision 7",
      author: "Marcel Batík",
      date: "December 2022",
      file: "research-sources/R-OSSE Waveguide rev7.pdf",
      sha256: "9d960e9a6ab4b19d566379eb9f5de34d45ab704d178cf7ec8d70607377691c28",
      locators: {
        nativeDomain: "PDF pages 2-3",
        equations: "PDF page 4, R-OSSE design/parametric formulae",
        workedExample: "PDF page 7, Practical design example (ST260 approximation)",
        throatMismatch: "PDF pages 21-23",
        workedScript: "PDF page 28, Ath script code"
      }
    },
    athExtendedThroat2023: {
      id: "athExtendedThroat2023",
      title: "ATH - Extended-Throat Waveguides",
      author: "Marcel Batík",
      date: "December 2023",
      file: "research-sources/ATH/ATH - Advanced-Transition Horns.html",
      sha256: "759b92c0c645dc5eeb89f77e0686066372f401a90438a4d1607948b55738e427",
      locators: {
        earlyAttempts: "HTML section Introduction - The early attempts",
        experiment: "HTML section A way forward - The curious experiment",
        throatPlug: "HTML section #throat-plug",
        limitations: "paragraphs immediately before #throat-plug"
      }
    },
    athSegmentizing2024: {
      id: "athSegmentizing2024",
      title: "ATH - Segmentizing a horn",
      author: "Marcel Batík",
      date: "February 2024",
      file: "research-sources/ATH/ATH - Segmentizing a horn.html",
      sha256: "0962e1631b50df8a086c3ca4a515443c41f19cd904a8f47e40468309b93f68f1",
      locators: {
        setup: "HTML introduction through Fig. 2",
        chordTarget: "HTML equation (1)",
        weighting: "HTML equation (2) and paragraph following Fig. 3",
        transform: "HTML equation (3)",
        radiusChoices: "HTML paragraphs accompanying Figs. 5-6",
        alternativeTarget: "HTML section Alternative transformations, equation (4)",
        limitations: "HTML section Conclusion"
      }
    }
  });

  const PARAMETER_CATALOG = deepFreeze({
    osse: {
      z: {
        definition: "Axial distance from the throat plane.",
        unit: "length",
        sourceDomain: "0 <= z <= L",
        libraryGuard: "[0, axialLength]"
      },
      phi: {
        definition: "Azimuth around the horn axis; zero points along +x.",
        unit: "rad",
        sourceDomain: "0 <= phi < 2*pi",
        libraryGuard: "Consumed by callers; scalar morph helper receives radii already evaluated at phi."
      },
      r0: {
        definition: "Throat radius.",
        unit: "length",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "> 0"
      },
      a: {
        definition: "Nominal coverage angle, half the beamwidth.",
        unit: "rad",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "0 <= a < pi/2 for OS coordinates; 0 < a < pi/2 where L divides by tan(a)^2."
      },
      a0: {
        definition: "Throat opening angle, half the included angle.",
        unit: "rad",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "0 <= a0 < pi/2"
      },
      k: {
        definition: "Throat expansion factor.",
        unit: "dimensionless",
        sourceDomain: "k=1 is shifted OS; the published k=0 limit is conical. Figure 3 plots 0.1, 1, 2, 4, and 8.",
        libraryGuard: ">= 0"
      },
      L: {
        definition: "Finite waveguide axial length.",
        unit: "length",
        sourceDomain: "> 0 implied by the finite construction.",
        libraryGuard: "> 0"
      },
      s: {
        definition: "Superellipse aspect ratio / amount of termination flare; zero preserves the base profile.",
        unit: "dimensionless",
        sourceDomain: "No maximum stated. Figure 6 plots 0.25, 0.5, 0.75, 1, and 1.5.",
        libraryGuard: ">= 0"
      },
      n: {
        definition: "Superellipse termination exponent.",
        unit: "dimensionless",
        sourceDomain: "n >= 2. Figure 7 plots 2, 3, 5, and 10.",
        libraryGuard: ">= 2"
      },
      q: {
        definition: "Termination truncation coefficient.",
        unit: "dimensionless",
        sourceDomain: "Typical value 0.99-1.00.",
        libraryGuard: "0 < q <= 1 for coordinate evaluation; the production finite-C2 profile contract separately requires q < 1."
      },
      zf: {
        definition: "End of the fixed, unmorphed axial region.",
        unit: "length",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "0 <= zf < L"
      },
      rM: {
        definition: "Target mouth-outline radius rM(phi).",
        unit: "length",
        sourceDomain: "May be arbitrary and need not have an analytic expression.",
        libraryGuard: "> 0 at the evaluated azimuth"
      },
      gamma: {
        definition: "Morph rate.",
        unit: "dimensionless",
        sourceDomain: "gamma >= 1; gamma=1 has an abrupt slope change at z=zf.",
        libraryGuard: ">= 1"
      }
    },
    rosse: {
      R: {
        definition: "Waveguide outer radius.",
        unit: "length",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "> r0"
      },
      a: {
        definition: "Nominal coverage half-angle.",
        unit: "rad",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "0 < a < pi/2"
      },
      r0: {
        definition: "Throat radius.",
        unit: "length",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "> 0"
      },
      a0: {
        definition: "Throat opening half-angle.",
        unit: "rad",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "0 <= a0 < pi/2"
      },
      k: {
        definition: "Throat expansion factor.",
        unit: "dimensionless",
        sourceDomain: "k=1 gives the exact OS throat; k>1 corresponds to a k-times larger OS throat.",
        libraryGuard: ">= 0 for coordinates; > 0 for throat-derivative invariants"
      },
      r: {
        definition: "Apex radius factor (named apexRadiusFactor in this API).",
        unit: "dimensionless",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "> 0 to avoid an apex derivative singularity"
      },
      m: {
        definition: "Apex shift factor.",
        unit: "dimensionless",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "0 < m < 1"
      },
      b: {
        definition: "Bending factor.",
        unit: "dimensionless",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "finite; product UI bounds are a separate construction choice"
      },
      q: {
        definition: "Throat shape factor.",
        unit: "dimensionless",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "> 0 for coordinates; > 1 for the recorded throat first-derivative invariant"
      },
      t: {
        definition: "Native R-OSSE curve parameter.",
        unit: "dimensionless",
        sourceDomain: "0 <= t <= 1",
        libraryGuard: "[0, 1]"
      }
    },
    esp: {
      Dt: {
        definition: "ESP input diameter.",
        unit: "mm",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "Not synthesized by this equation-only module."
      },
      At: {
        definition: "ESP input angle.",
        unit: "deg",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "Not synthesized by this equation-only module."
      },
      Ae: {
        definition: "ESP exit angle, independent of the waveguide throat angle.",
        unit: "deg",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "Not synthesized by this equation-only module."
      },
      L: {
        definition: "Axial distance of the outermost ESP exit point.",
        unit: "mm",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "Not synthesized by this equation-only module."
      },
      Pos0: {
        definition: "Normalized input vane positions; array length sets vane count.",
        unit: "dimensionless",
        sourceDomain: "0 is on-axis and 1 is full throat radius.",
        libraryGuard: "Not synthesized by this equation-only module."
      },
      Pos1: {
        definition: "Optional normalized output vane positions overriding equal channel-area ratios.",
        unit: "dimensionless",
        sourceDomain: "Must contain the same number of values as Pos0.",
        libraryGuard: "Not synthesized by this equation-only module."
      },
      CP1: {
        definition: "Normalized shift of the first internal cubic-Bézier control point.",
        unit: "dimensionless",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "No complete Bézier layout solver is claimed."
      },
      CP2: {
        definition: "Normalized shift of the second internal cubic-Bézier control point.",
        unit: "dimensionless",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "No complete Bézier layout solver is claimed."
      },
      x: {
        definition: "Normalized distance along an ESP channel centerline.",
        unit: "dimensionless",
        sourceDomain: "0 <= x <= 1",
        libraryGuard: "[0, 1]"
      },
      AM: {
        definition: "Meander amplitude, solved iteratively for equal path length.",
        unit: "mm",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "Any finite scalar in the equation evaluator"
      },
      Sk: {
        definition: "Meander skew.",
        unit: "dimensionless",
        sourceDomain: "Typically 0.5-1.",
        libraryGuard: "> 0"
      },
      Sh: {
        definition: "Meander sharpness.",
        unit: "dimensionless",
        sourceDomain: "Typically 2-4.",
        libraryGuard: "> 0"
      },
      EndAngle: {
        definition: "Minimum vane-tip angle.",
        unit: "deg",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "Not synthesized by this equation-only module."
      },
      WT: {
        definition: "Minimum/exported vane tip wall thickness.",
        unit: "mm",
        sourceDomain: "No numeric range stated.",
        libraryGuard: "Not synthesized by this equation-only module."
      }
    },
    segmentizing: {
      t: {
        definition: "Native parameter of the original axisymmetric profile.",
        unit: "dimensionless",
        sourceDomain: "0 <= t <= 1 for the R-OSSE example.",
        libraryGuard: "[0, 1]"
      },
      theta: {
        definition: "Azimuth within one selected horn sector.",
        unit: "rad",
        sourceDomain: "0 <= theta <= thetaS in the derivation.",
        libraryGuard: "[0, sectorAngle]"
      },
      thetaS: {
        definition: "Angular span of one segment.",
        unit: "rad",
        sourceDomain: "Arbitrary segment angles are claimed; the worked example uses 60 degrees.",
        libraryGuard: "0 < thetaS < pi for a finite single-valued radial chord"
      },
      rS: {
        definition: "Chosen target radius at both sector edges.",
        unit: "length",
        sourceDomain: "Independent of r(tm).",
        libraryGuard: "> 0"
      },
      t0: {
        definition: "Start of the optional transformation window.",
        unit: "dimensionless",
        sourceDomain: "No numeric range stated beyond the native t interval.",
        libraryGuard: "0 <= t0 < t1 <= 1"
      },
      t1: {
        definition: "End of the optional transformation window.",
        unit: "dimensionless",
        sourceDomain: "No numeric range stated beyond the native t interval.",
        libraryGuard: "0 <= t0 < t1 <= 1"
      },
      zeta: {
        definition: "Skew of the axial weighting function.",
        unit: "dimensionless",
        sourceDomain: "User-defined; figures show 0.5, 1, 2, and 4.",
        libraryGuard: "> 0"
      },
      kappa: {
        definition: "Sharpness of the axial weighting function.",
        unit: "dimensionless",
        sourceDomain: "User-defined; figures show 4 and 10.",
        libraryGuard: "> 0"
      },
      tm: {
        definition: "Parameter where the axial weighting reaches one and the target cross-section is exact.",
        unit: "dimensionless",
        sourceDomain: "tm=t0+(t1-t0)/2^(1/zeta).",
        libraryGuard: "Derived from a valid t0/t1/zeta window"
      },
      delta: {
        definition: "Amplitude of the alternative azimuthal target function.",
        unit: "length",
        sourceDomain: "May be negative; Fig. 7 uses -20 mm.",
        libraryGuard: "finite, with final radius required positive"
      },
      mu: {
        definition: "Skew of the alternative azimuthal target.",
        unit: "dimensionless",
        sourceDomain: "No numeric range stated; Fig. 7 uses 1.",
        libraryGuard: "> 0"
      },
      nu: {
        definition: "Sharpness of the alternative azimuthal target.",
        unit: "dimensionless",
        sourceDomain: "No numeric range stated; Fig. 7 uses 1.",
        libraryGuard: "> 0"
      }
    }
  });

  const PUBLISHED_FIXTURES = deepFreeze({
    osseFigures: {
      figure1: {
        locator: "OS-SE PDF page 2, Fig. 1",
        throatRadiusMm: 12.7,
        nominalHalfAngleDeg: 45
      },
      figure2: {
        locator: "OS-SE PDF page 3, Fig. 2",
        throatRadiusMm: 12.7,
        nominalHalfAngleDeg: 45,
        throatHalfAngleDeg: 15,
        includedThroatAngleDeg: 30
      },
      figure3: {
        locator: "OS-SE PDF page 4, Fig. 3",
        throatRadiusMm: 12.7,
        nominalHalfAngleDeg: 45,
        throatHalfAngleDeg: 0,
        kValues: [0.1, 1, 2, 4, 8]
      },
      figure4: {
        locator: "OS-SE PDF page 5, Fig. 4",
        axialLengthMm: 120,
        note: "The caption prints length only."
      },
      figure5: {
        locator: "OS-SE PDF page 7, Fig. 5",
        throatRadiusMm: 12.7,
        throatRadiusBasis: "Not repeated in the title; inferred from the preceding figure sequence and plotted throat intercept.",
        nominalHalfAngleDeg: 45,
        throatHalfAngleDeg: 0,
        k: 1,
        axialLengthMm: 120,
        q: 0.998,
        s: 0.8,
        n: 5
      },
      figure6: {
        locator: "OS-SE PDF page 8, Fig. 6",
        nominalHalfAngleDeg: 45,
        throatHalfAngleDeg: 0,
        k: 1,
        axialLengthMm: 120,
        q: 0.998,
        n: 5,
        sValues: [0.25, 0.5, 0.75, 1, 1.5]
      },
      figure7: {
        locator: "OS-SE PDF page 9, Fig. 7",
        nominalHalfAngleDeg: 45,
        throatHalfAngleDeg: 0,
        k: 1,
        axialLengthMm: 120,
        q: 0.998,
        s: 0.8,
        nValues: [2, 3, 5, 10]
      }
    },
    espDemo: {
      locator: "ATH AP1 PDF page 3",
      waveguide: {
        throatDiameterMm: 64,
        throatProfile: 1,
        throatAngleDeg: 35,
        coverageAngleDeg: 45,
        osK: 4,
        lengthMm: 67.8,
        termS: 1,
        termN: 3,
        termQ: 0.996,
        rollback: 1,
        rollbackStartAt: 0.4,
        rollbackAngleDeg: 180,
        rollbackExponent: 1.5
      },
      esp: {
        DtMm: 25.4,
        AtDeg: 0,
        AeDeg: 33,
        lengthMm: 75,
        inputVanePositions: [0.4, 0.76],
        skew: 0.65,
        cp1: [0, 0.4, 0.4],
        cp2: [0, 0.4, 0.4],
        minimumTipAngleDeg: 1,
        minimumWallThicknessMm: 0.5
      },
      mesh: {
        angularSegments: 8,
        lengthSegments: 60,
        wallThicknessMm: 4
      },
      limitation: "The page does not publish the iterative equal-length amplitude or complete non-overlap channel-boundary equations."
    },
    rosseST260: {
      locator: "R-OSSE PDF pages 7 and 28",
      outerRadiusMm: 130,
      throatRadiusMm: 12.7,
      nominalHalfAngleDeg: 39,
      throatHalfAngleDeg: 7.5,
      k: 1.8,
      apexRadiusFactor: 0.3,
      bending: 0.3,
      apexShift: 0.8,
      throatShape: 3.7,
      statedOverallDiameterMm: 260,
      statedMaximumDepth: "slightly less than 80 mm",
      simulation: {
        wallThicknessMm: 5,
        frequencyStartHz: 200,
        frequencyEndHz: 20000,
        frequencyPoints: 100,
        meshFrequencyHz: 43000,
        meshLengthSegments: 60,
        meshAngularSegments: 8
      },
      comparisons: {
        throatHalfAngleDeg: [0, 7.5, 15],
        outerRadiusMm: [130, 260],
        k: [0.5, 1, 2, 4],
        throatRadiusMmAtOuterRadius260: [12.7, 18, 25],
        conicalDriverDuctLengthMm: [0, 10, 20, 40],
        ringInsert: "Concept shown on pages 23 and 27; no insert geometry equation is published."
      }
    },
    segmentizingExample: {
      locator: "Segmentizing HTML setup and Figs. 3-7",
      rosse: {
        outerRadiusMm: 200,
        throatRadiusMm: 12.7,
        nominalHalfAngleDeg: 35,
        throatHalfAngleDeg: 5,
        k: 1.5,
        apexRadiusFactor: 0.35,
        apexShift: 0.75,
        throatShape: 3.8,
        bending: 0
      },
      sectorAngleDeg: 60,
      approximateReferenceRadiusMm: 64,
      weightingFigures: {
        skewValues: [0.5, 1, 2, 4],
        sharpnessValues: [4, 10]
      },
      figure4: {
        printed: { t0: 0.8, sharpness: 4, skew: 0.75, claimedPeak: 0.32 },
        equationConsistentInputs: { t0: 0, t1: 0.8, sharpness: 4, skew: 0.75 },
        status: "publication-conflict-preserved"
      },
      figure7: {
        alternativeTargetSkew: 1,
        alternativeTargetSharpness: 1,
        amplitudeMm: -20
      }
    },
    extendedThroatObservations: {
      locator: "Extended-Throat HTML section A way forward",
      waveguide: "ATHEX 460-36",
      waveguideInputAngleDeg: 6,
      driver: "Peerless DFM-2535R00-08",
      adapter: "1 inch exit to 1.4 inch throat, roughly 100 mm",
      status: "observational-only; no general design law or controlled cylindrical/narrowing comparison is published"
    }
  });

  const EQUATION_CATALOG = deepFreeze({
    osPure: {
      symbol: "pureOSRadius",
      equation: "r_OS(z)=sqrt(r0^2+z^2*tan(a)^2)",
      kind: "published-equation",
      sourceId: "osse2020",
      locator: "PDF page 2, equation (1)"
    },
    osShifted: {
      symbol: "shiftedOSRadius",
      equation: "r_OS(z)=sqrt(r0^2+2*r0*z*tan(a0)+z^2*tan(a)^2)",
      kind: "published-equation",
      sourceId: "osse2020",
      locator: "PDF page 3, equation (2)"
    },
    osGeneralized: {
      symbol: "generalizedOSRadius",
      equation: "r_GOS(z)=sqrt(k^2*r0^2+2*k*r0*z*tan(a0)+z^2*tan(a)^2)+r0*(1-k)",
      kind: "published-equation",
      sourceId: "osse2020",
      locator: "PDF page 4, equation (3)"
    },
    osConicalLimit: {
      symbol: "generalizedOSRadius",
      equation: "r_GOS(z)|k=0=r0+z*tan(a)",
      kind: "published-invariant",
      sourceId: "osse2020",
      locator: "PDF page 4, text following equation (3)"
    },
    superellipseImplicit: {
      symbol: "superellipseQuadrantOffset",
      equation: "(z/a)^n+(r/b)^n=1; z,r>=0; n>=2",
      kind: "published-equation",
      sourceId: "osse2020",
      locator: "PDF page 6"
    },
    superellipseSolved: {
      symbol: "superellipseQuadrantOffset",
      equation: "r_SE(z)=b*[1-(1-(z/a)^n)^(1/n)]",
      kind: "published-equation",
      sourceId: "osse2020",
      locator: "PDF page 6"
    },
    osseTermination: {
      symbol: "osseTerminationOffset",
      equation: "r_TERM(z)=(s*L/q)*[1-(1-(q*z/L)^n)^(1/n)]",
      kind: "published-equation",
      sourceId: "osse2020",
      locator: "PDF page 6, equation (4)"
    },
    osse: {
      symbol: "osseRadius",
      equation: "r_OSSE(z)=r_GOS(z)+r_TERM(z)",
      kind: "published-equation",
      sourceId: "osse2020",
      locator: "PDF page 7, equation (5)"
    },
    osseMorph: {
      symbol: "morphRadius",
      equation: "r_m=r for z<zf; r_m=r+((z-zf)/(L-zf))^gamma*(r_M-r(L,phi)) for z>=zf",
      kind: "published-equation",
      sourceId: "osse2020",
      locator: "PDF page 10, section 5 Morphing"
    },
    rosseConstants: {
      symbol: "rosseConstants",
      equation: "c1=(k*r0)^2; c2=2*k*r0*tan(a0); c3=tan(a)^2; L=[sqrt(c2^2-4*c3*(c1-(R+r0*(k-1))^2))-c2]/(2*c3)",
      kind: "published-equation",
      sourceId: "rosse2022Rev7",
      locator: "PDF page 4"
    },
    rosseParametric: {
      symbol: "rossePoint",
      equation: "[x(t),y(t)] per R-OSSE revision 7, 0<=t<=1",
      kind: "published-equation",
      sourceId: "rosse2022Rev7",
      locator: "PDF page 4"
    },
    rosseThroatDerivatives: {
      symbol: "rosseThroatInvariants",
      equation: "dx/dt=L*m/sqrt(r^2+m^2); dy/dt=L*tan(a0); dy/dx=tan(a0)*sqrt(r^2+m^2)/m at t=0",
      kind: "analytic-derivation-from-published-equation",
      sourceId: "rosse2022Rev7",
      locator: "Derived from PDF page 4; interface concern on PDF pages 21-23"
    },
    espMeander: {
      symbol: "meanderValue",
      equation: "M(x)=A_M*sin(pi*x^Sk)^Sh, 0<=x<=1",
      kind: "published-equation",
      sourceId: "athAp1_2021",
      locator: "PDF page 6"
    },
    espEqualLength: {
      symbol: null,
      equation: null,
      kind: "statement-only",
      sourceId: "athAp1_2021",
      locator: "PDF pages 5-7; cubic Bézier centerlines and iterative equal-length meander amplitude, no complete solve equation published"
    },
    espExponentialArea: {
      symbol: "exponentialAreaAt",
      equation: "A(u)=A0*exp(u*ln(A1/A0))",
      kind: "standard-construction-derived-from-source-statement",
      sourceId: "athAp1_2021",
      locator: "PDF page 7 states exponential channel-area growth but does not print an interpolation equation"
    },
    segmentChordTarget: {
      symbol: "segmentChordRadius",
      equation: "r'(theta)=rS*sin(thetaS)/[sin(thetaS)*cos(theta)+(1-cos(thetaS))*sin(theta)]",
      kind: "published-equation",
      sourceId: "athSegmentizing2024",
      locator: "HTML equation (1)"
    },
    segmentWeight: {
      symbol: "segmentWeight",
      equation: "m(t)=sin(pi*((t-t0)/(t1-t0))^zeta)^kappa for t0<t<t1; 0 otherwise",
      kind: "published-equation",
      sourceId: "athSegmentizing2024",
      locator: "HTML equation (2)"
    },
    segmentPeak: {
      symbol: "segmentWeightPeak",
      equation: "tm=t0+(t1-t0)/2^(1/zeta)",
      kind: "published-equation",
      sourceId: "athSegmentizing2024",
      locator: "HTML paragraph following Fig. 3"
    },
    segmentTransform: {
      symbol: "segmentizedRadius",
      equation: "r'(t,theta)=r(t)+m(t)*(r'(theta)-r(tm))",
      kind: "published-equation",
      sourceId: "athSegmentizing2024",
      locator: "HTML equation (3)"
    },
    segmentReferenceRadii: {
      symbol: "segmentReferenceRadius",
      equation: "rS=r(tm); rS=r(tm)/cos(thetaS/2); rS=r(tm)*sqrt(1/cos(thetaS/2))",
      kind: "published-construction-options",
      sourceId: "athSegmentizing2024",
      locator: "HTML paragraphs accompanying Figs. 5-6"
    },
    segmentAlternativeTarget: {
      symbol: "segmentAlternativeTarget",
      equation: "r'(theta)=rS+delta*sin(pi*(theta/thetaS)^mu)^nu",
      kind: "published-equation",
      sourceId: "athSegmentizing2024",
      locator: "HTML equation (4)"
    },
    extendedThroat: {
      symbol: null,
      equation: null,
      kind: "observational-source-no-general-equation",
      sourceId: "athExtendedThroat2023",
      locator: "HTML sections A way forward and #throat-plug"
    }
  });

  const SOURCE_LIMITATIONS = deepFreeze([
    {
      sourceId: "osse2020",
      locator: "PDF pages 1 and 11",
      statement: "Classic OS is infinite. OS-SE is intended for a flat baffle; a free-standing device requires a separately solved rollback."
    },
    {
      sourceId: "osse2020",
      locator: "PDF page 10",
      statement: "Morph rate gamma=1 introduces an abrupt slope change at z=zf."
    },
    {
      sourceId: "rosse2022Rev7",
      locator: "PDF page 2",
      statement: "R-OSSE must remain parametric because its profile can fold back and cannot generally be represented as y(x)."
    },
    {
      sourceId: "rosse2022Rev7",
      locator: "PDF pages 21-23",
      statement: "Matching conical wall slope alone does not remove the documented throat wavefront/curvature mismatch."
    },
    {
      sourceId: "athAp1_2021",
      locator: "PDF pages 5-8",
      statement: "Equal-path meander amplitudes and non-overlapping channel expansion are obtained iteratively; the complete solver is not published."
    },
    {
      sourceId: "athExtendedThroat2023",
      locator: "paragraphs immediately before #throat-plug",
      statement: "The extension interaction is explicitly described as not yet clear, and cylindrical or narrowing extensions were not tested."
    },
    {
      sourceId: "athSegmentizing2024",
      locator: "Fig. 4A paragraph",
      statement: "The printed t0=0.8, zeta=0.75, tm≈0.32 example contradicts the published peak equation; tm≈0.32 follows from t0=0 and t1=0.8."
    }
  ]);

  function domainError(code, message) {
    const error = new RangeError(message);
    error.name = "ATHMathDomainError";
    error.code = code;
    throw error;
  }

  function requireObject(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      domainError("ATH_INPUT_OBJECT_REQUIRED", `${label} must be a plain object.`);
    }
    return value;
  }

  function requireFinite(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      domainError("ATH_INPUT_NOT_FINITE", `${label} must be a finite number.`);
    }
    return value;
  }

  function requirePositive(value, label) {
    requireFinite(value, label);
    if (!(value > 0)) domainError("ATH_INPUT_NOT_POSITIVE", `${label} must be greater than zero.`);
    return value;
  }

  function requireNonNegative(value, label) {
    requireFinite(value, label);
    if (value < 0) domainError("ATH_INPUT_NEGATIVE", `${label} must be non-negative.`);
    return value;
  }

  function requireUnitInterval(value, label) {
    requireFinite(value, label);
    if (value < 0 || value > 1) {
      domainError("ATH_INPUT_OUTSIDE_UNIT_INTERVAL", `${label} must be in [0, 1].`);
    }
    return value;
  }

  function requireHalfAngle(value, label, allowZero) {
    requireFinite(value, label);
    if ((allowZero ? value < 0 : value <= 0) || value >= HALF_PI) {
      domainError(
        "ATH_ANGLE_OUT_OF_DOMAIN",
        `${label} must be ${allowZero ? "in [0, pi/2)" : "in (0, pi/2)"}.`
      );
    }
    return value;
  }

  function requireFiniteResult(value, code, message) {
    if (!Number.isFinite(value)) domainError(code, message);
    return value;
  }

  function pureOSRadius(input) {
    const {
      throatRadius,
      axial,
      nominalHalfAngle
    } = requireObject(input, "pureOSRadius input");
    requirePositive(throatRadius, "throatRadius");
    requireNonNegative(axial, "axial");
    requireHalfAngle(nominalHalfAngle, "nominalHalfAngle", true);
    return requireFiniteResult(
      Math.hypot(throatRadius, axial * Math.tan(nominalHalfAngle)),
      "ATH_OS_RADIUS_INVALID",
      "pure OS radius must remain finite."
    );
  }

  function shiftedOSRadius(input) {
    const {
      throatRadius,
      axial,
      nominalHalfAngle,
      throatHalfAngle
    } = requireObject(input, "shiftedOSRadius input");
    requirePositive(throatRadius, "throatRadius");
    requireNonNegative(axial, "axial");
    requireHalfAngle(nominalHalfAngle, "nominalHalfAngle", true);
    requireHalfAngle(throatHalfAngle, "throatHalfAngle", true);
    const radicand = throatRadius * throatRadius +
      2 * throatRadius * axial * Math.tan(throatHalfAngle) +
      axial * axial * Math.tan(nominalHalfAngle) ** 2;
    if (!(radicand >= 0) || !Number.isFinite(radicand)) {
      domainError("ATH_OS_RADICAND_INVALID", "shifted OS radicand must be finite and non-negative.");
    }
    return Math.sqrt(radicand);
  }

  function generalizedOSRadius(input) {
    const {
      throatRadius,
      axial,
      nominalHalfAngle,
      throatHalfAngle,
      k
    } = requireObject(input, "generalizedOSRadius input");
    requirePositive(throatRadius, "throatRadius");
    requireNonNegative(axial, "axial");
    requireHalfAngle(nominalHalfAngle, "nominalHalfAngle", true);
    requireHalfAngle(throatHalfAngle, "throatHalfAngle", true);
    requireNonNegative(k, "k");
    const radicand = (k * throatRadius) ** 2 +
      2 * k * throatRadius * axial * Math.tan(throatHalfAngle) +
      axial * axial * Math.tan(nominalHalfAngle) ** 2;
    if (!(radicand >= 0) || !Number.isFinite(radicand)) {
      domainError("ATH_GOS_RADICAND_INVALID", "generalized OS radicand must be finite and non-negative.");
    }
    const radius = Math.sqrt(radicand) + throatRadius * (1 - k);
    if (!(radius > 0) || !Number.isFinite(radius)) {
      domainError("ATH_GOS_RADIUS_INVALID", "generalized OS radius must remain finite and positive.");
    }
    return radius;
  }

  function superellipseQuadrantOffset(input) {
    const {
      axial,
      semiMajor,
      semiMinor,
      exponent
    } = requireObject(input, "superellipseQuadrantOffset input");
    requireNonNegative(axial, "axial");
    requirePositive(semiMajor, "semiMajor");
    requireNonNegative(semiMinor, "semiMinor");
    requireFinite(exponent, "exponent");
    if (exponent < 2) {
      domainError("ATH_SUPERELLIPSE_EXPONENT_INVALID", "exponent must be at least 2.");
    }
    if (axial > semiMajor) {
      domainError("ATH_SUPERELLIPSE_AXIAL_OUT_OF_DOMAIN", "axial must be in [0, semiMajor].");
    }
    const ratioPower = (axial / semiMajor) ** exponent;
    const inner = 1 - ratioPower;
    if (inner < 0 || !Number.isFinite(inner)) {
      domainError("ATH_SUPERELLIPSE_RADICAND_INVALID", "superellipse root must be finite and non-negative.");
    }
    return semiMinor * (1 - inner ** (1 / exponent));
  }

  function osseTerminationOffset(input) {
    const {
      axial,
      axialLength,
      aspectRatio,
      exponent,
      q
    } = requireObject(input, "osseTerminationOffset input");
    requireNonNegative(axial, "axial");
    requirePositive(axialLength, "axialLength");
    requireNonNegative(aspectRatio, "aspectRatio");
    requireFinite(exponent, "exponent");
    requireFinite(q, "q");
    if (axial > axialLength) {
      domainError("ATH_OSSE_AXIAL_OUT_OF_DOMAIN", "axial must be in [0, axialLength].");
    }
    if (exponent < 2) {
      domainError("ATH_OSSE_EXPONENT_INVALID", "exponent must be at least 2.");
    }
    if (!(q > 0 && q <= 1)) {
      domainError("ATH_OSSE_Q_INVALID", "q must be in (0, 1] for the published truncated quadrant.");
    }
    return requireFiniteResult(
      (aspectRatio * axialLength / q) * (
        1 - (1 - (q * axial / axialLength) ** exponent) ** (1 / exponent)
      ),
      "ATH_OSSE_TERMINATION_INVALID",
      "OS-SE termination offset must remain finite."
    );
  }

  function osseRadius(input) {
    const values = requireObject(input, "osseRadius input");
    const base = generalizedOSRadius(values);
    const termination = osseTerminationOffset(values);
    const radius = base + termination;
    if (!(radius > 0) || !Number.isFinite(radius)) {
      domainError("ATH_OSSE_RADIUS_INVALID", "OS-SE radius must remain finite and positive.");
    }
    return radius;
  }

  function morphRadius(input) {
    const {
      axial,
      axialLength,
      fixedAxial,
      morphRate,
      sourceRadius,
      sourceMouthRadius,
      targetMouthRadius
    } = requireObject(input, "morphRadius input");
    requireNonNegative(axial, "axial");
    requirePositive(axialLength, "axialLength");
    requireNonNegative(fixedAxial, "fixedAxial");
    requireFinite(morphRate, "morphRate");
    requirePositive(sourceRadius, "sourceRadius");
    requirePositive(sourceMouthRadius, "sourceMouthRadius");
    requirePositive(targetMouthRadius, "targetMouthRadius");
    if (axial > axialLength) {
      domainError("ATH_MORPH_AXIAL_OUT_OF_DOMAIN", "axial must be in [0, axialLength].");
    }
    if (!(fixedAxial < axialLength)) {
      domainError("ATH_MORPH_FIXED_RANGE_INVALID", "fixedAxial must be less than axialLength.");
    }
    if (morphRate < 1) {
      domainError("ATH_MORPH_RATE_INVALID", "morphRate must be at least 1.");
    }
    if (axial < fixedAxial) return sourceRadius;
    const weight = ((axial - fixedAxial) / (axialLength - fixedAxial)) ** morphRate;
    const radius = sourceRadius + weight * (targetMouthRadius - sourceMouthRadius);
    if (!(radius > 0) || !Number.isFinite(radius)) {
      domainError("ATH_MORPH_RADIUS_INVALID", "morphed radius must remain finite and positive.");
    }
    return radius;
  }

  function rosseConstants(input) {
    const {
      outerRadius,
      throatRadius,
      nominalHalfAngle,
      throatHalfAngle,
      k
    } = requireObject(input, "rosseConstants input");
    requirePositive(outerRadius, "outerRadius");
    requirePositive(throatRadius, "throatRadius");
    requireHalfAngle(nominalHalfAngle, "nominalHalfAngle", false);
    requireHalfAngle(throatHalfAngle, "throatHalfAngle", true);
    requireNonNegative(k, "k");
    if (!(outerRadius > throatRadius)) {
      domainError("ATH_ROSSE_RADIUS_ORDER_INVALID", "outerRadius must be greater than throatRadius.");
    }
    const c1 = (k * throatRadius) ** 2;
    const c2 = 2 * k * throatRadius * Math.tan(throatHalfAngle);
    const c3 = Math.tan(nominalHalfAngle) ** 2;
    const shiftedOuter = outerRadius + throatRadius * (k - 1);
    const discriminant = c2 * c2 -
      4 * c3 * (c1 - shiftedOuter * shiftedOuter);
    if (!(discriminant > 0) || !Number.isFinite(discriminant)) {
      domainError("ATH_ROSSE_DISCRIMINANT_INVALID", "R-OSSE discriminant must be finite and positive.");
    }
    const nativeLength = (Math.sqrt(discriminant) - c2) / (2 * c3);
    if (!(nativeLength > 0) || !Number.isFinite(nativeLength)) {
      domainError("ATH_ROSSE_LENGTH_INVALID", "R-OSSE auxiliary length L must be finite and positive.");
    }
    return deepFreeze({ c1, c2, c3, discriminant, nativeLength });
  }

  function validateROSSEShape(input) {
    const {
      apexRadiusFactor,
      apexShift,
      bending,
      throatShape,
      t
    } = input;
    requirePositive(apexRadiusFactor, "apexRadiusFactor");
    requireFinite(apexShift, "apexShift");
    requireFinite(bending, "bending");
    requirePositive(throatShape, "throatShape");
    requireUnitInterval(t, "t");
    if (!(apexShift > 0 && apexShift < 1)) {
      domainError("ATH_ROSSE_APEX_SHIFT_INVALID", "apexShift must be in (0, 1).");
    }
  }

  function rossePoint(input) {
    const values = requireObject(input, "rossePoint input");
    validateROSSEShape(values);
    const {
      outerRadius: R,
      throatRadius: r0,
      k,
      apexRadiusFactor: r,
      apexShift: m,
      bending: b,
      throatShape: q,
      t
    } = values;
    const constants = rosseConstants(values);
    const { c1, c2, c3, nativeLength: L } = constants;
    const x = L * (Math.hypot(r, m) - Math.hypot(r, t - m)) +
      b * L * (Math.hypot(r, 1 - m) - Math.hypot(r, m)) * t * t;
    const y = (1 - t ** q) * (
      Math.sqrt(c1 + c2 * L * t + c3 * L * L * t * t) + r0 * (1 - k)
    ) + t ** q * (
      R + L * (1 - Math.sqrt(1 + c3 * (t - 1) ** 2))
    );
    if (!Number.isFinite(x) || !Number.isFinite(y) || !(y > 0)) {
      domainError("ATH_ROSSE_POINT_INVALID", "R-OSSE point must have finite x and finite positive y.");
    }
    return deepFreeze({ t, x, y, constants });
  }

  function rosseThroatInvariants(input) {
    const values = requireObject(input, "rosseThroatInvariants input");
    validateROSSEShape({ ...values, t: 0 });
    requirePositive(values.k, "k");
    if (!(values.throatShape > 1)) {
      domainError(
        "ATH_ROSSE_THROAT_SHAPE_DERIVATIVE_INVALID",
        "throatShape must be greater than 1 for the published throat derivative invariant."
      );
    }
    const constants = rosseConstants(values);
    const root = Math.hypot(values.apexRadiusFactor, values.apexShift);
    const dxdt = constants.nativeLength * values.apexShift / root;
    const dydt = constants.nativeLength * Math.tan(values.throatHalfAngle);
    const dydx = dydt / dxdt;
    return deepFreeze({ dxdt, dydt, dydx });
  }

  function meanderValue(input) {
    const {
      normalizedDistance,
      amplitude,
      skew,
      sharpness
    } = requireObject(input, "meanderValue input");
    requireUnitInterval(normalizedDistance, "normalizedDistance");
    requireFinite(amplitude, "amplitude");
    requirePositive(skew, "skew");
    requirePositive(sharpness, "sharpness");
    return amplitude * Math.sin(Math.PI * normalizedDistance ** skew) ** sharpness;
  }

  function exponentialAreaAt(input) {
    const {
      normalizedDistance,
      inputArea,
      outputArea
    } = requireObject(input, "exponentialAreaAt input");
    requireUnitInterval(normalizedDistance, "normalizedDistance");
    requirePositive(inputArea, "inputArea");
    requirePositive(outputArea, "outputArea");
    return requireFiniteResult(
      inputArea * Math.exp(
        normalizedDistance * Math.log(outputArea / inputArea)
      ),
      "ATH_EXPONENTIAL_AREA_INVALID",
      "exponential area must remain finite."
    );
  }

  function validateSegmentWindow(t0, t1, skew) {
    requireUnitInterval(t0, "t0");
    requireUnitInterval(t1, "t1");
    requirePositive(skew, "skew");
    if (!(t0 < t1)) {
      domainError("ATH_SEGMENT_WINDOW_INVALID", "segment window must satisfy t0 < t1.");
    }
  }

  function segmentChordRadius(input) {
    const {
      edgeRadius,
      sectorAngle,
      azimuth
    } = requireObject(input, "segmentChordRadius input");
    requirePositive(edgeRadius, "edgeRadius");
    requireFinite(sectorAngle, "sectorAngle");
    requireFinite(azimuth, "azimuth");
    if (!(sectorAngle > 0 && sectorAngle < Math.PI)) {
      domainError(
        "ATH_SEGMENT_ANGLE_INVALID",
        "sectorAngle must be in (0, pi) for a finite single-valued chord radius."
      );
    }
    if (azimuth < 0 || azimuth > sectorAngle) {
      domainError("ATH_SEGMENT_AZIMUTH_INVALID", "azimuth must be in [0, sectorAngle].");
    }
    const denominator = Math.sin(sectorAngle) * Math.cos(azimuth) +
      (1 - Math.cos(sectorAngle)) * Math.sin(azimuth);
    if (!(denominator > 0) || !Number.isFinite(denominator)) {
      domainError("ATH_SEGMENT_CHORD_SINGULAR", "segment chord denominator must be finite and positive.");
    }
    return requireFiniteResult(
      edgeRadius * Math.sin(sectorAngle) / denominator,
      "ATH_SEGMENT_CHORD_INVALID",
      "segment chord radius must remain finite."
    );
  }

  function segmentWeight(input) {
    const {
      t,
      t0,
      t1,
      skew,
      sharpness
    } = requireObject(input, "segmentWeight input");
    requireUnitInterval(t, "t");
    validateSegmentWindow(t0, t1, skew);
    requirePositive(sharpness, "sharpness");
    if (!(t > t0 && t < t1)) return 0;
    const normalized = (t - t0) / (t1 - t0);
    return Math.sin(Math.PI * normalized ** skew) ** sharpness;
  }

  function segmentWeightPeak(input) {
    const {
      t0,
      t1,
      skew
    } = requireObject(input, "segmentWeightPeak input");
    validateSegmentWindow(t0, t1, skew);
    return t0 + (t1 - t0) / (2 ** (1 / skew));
  }

  function segmentizedRadius(input) {
    const {
      baseRadius,
      weight,
      targetRadius,
      referenceRadius
    } = requireObject(input, "segmentizedRadius input");
    requirePositive(baseRadius, "baseRadius");
    requireUnitInterval(weight, "weight");
    requirePositive(targetRadius, "targetRadius");
    requirePositive(referenceRadius, "referenceRadius");
    const radius = baseRadius + weight * (targetRadius - referenceRadius);
    if (!(radius > 0) || !Number.isFinite(radius)) {
      domainError("ATH_SEGMENT_RADIUS_INVALID", "segmentized radius must remain finite and positive.");
    }
    return radius;
  }

  function segmentReferenceRadius(input) {
    const {
      referenceRadius,
      sectorAngle,
      mode
    } = requireObject(input, "segmentReferenceRadius input");
    requirePositive(referenceRadius, "referenceRadius");
    requireFinite(sectorAngle, "sectorAngle");
    if (!(sectorAngle > 0 && sectorAngle < Math.PI)) {
      domainError("ATH_SEGMENT_ANGLE_INVALID", "sectorAngle must be in (0, pi).");
    }
    const cosine = Math.cos(sectorAngle / 2);
    if (!(cosine > 0)) {
      domainError("ATH_SEGMENT_REFERENCE_SINGULAR", "cos(sectorAngle/2) must be positive.");
    }
    if (mode === "edge-preserving") return referenceRadius;
    if (mode === "center-preserving") {
      return requireFiniteResult(
        referenceRadius / cosine,
        "ATH_SEGMENT_REFERENCE_INVALID",
        "center-preserving reference radius must remain finite."
      );
    }
    if (mode === "geometric-mean") {
      return requireFiniteResult(
        referenceRadius * Math.sqrt(1 / cosine),
        "ATH_SEGMENT_REFERENCE_INVALID",
        "geometric-mean reference radius must remain finite."
      );
    }
    domainError(
      "ATH_SEGMENT_REFERENCE_MODE_INVALID",
      "mode must be edge-preserving, center-preserving, or geometric-mean."
    );
  }

  function segmentAlternativeTarget(input) {
    const {
      edgeRadius,
      amplitude,
      sectorAngle,
      azimuth,
      skew,
      sharpness
    } = requireObject(input, "segmentAlternativeTarget input");
    requirePositive(edgeRadius, "edgeRadius");
    requireFinite(amplitude, "amplitude");
    requireFinite(sectorAngle, "sectorAngle");
    requireFinite(azimuth, "azimuth");
    requirePositive(skew, "skew");
    requirePositive(sharpness, "sharpness");
    if (!(sectorAngle > 0 && sectorAngle < Math.PI)) {
      domainError("ATH_SEGMENT_ANGLE_INVALID", "sectorAngle must be in (0, pi).");
    }
    if (azimuth < 0 || azimuth > sectorAngle) {
      domainError("ATH_SEGMENT_AZIMUTH_INVALID", "azimuth must be in [0, sectorAngle].");
    }
    const radius = edgeRadius + amplitude *
      Math.sin(Math.PI * (azimuth / sectorAngle) ** skew) ** sharpness;
    if (!(radius > 0) || !Number.isFinite(radius)) {
      domainError("ATH_SEGMENT_TARGET_INVALID", "alternative target radius must remain finite and positive.");
    }
    return radius;
  }

  return deepFreeze({
    API_VERSION,
    SOURCE_PROVENANCE,
    PARAMETER_CATALOG,
    PUBLISHED_FIXTURES,
    EQUATION_CATALOG,
    SOURCE_LIMITATIONS,
    pureOSRadius,
    shiftedOSRadius,
    generalizedOSRadius,
    superellipseQuadrantOffset,
    osseTerminationOffset,
    osseRadius,
    morphRadius,
    rosseConstants,
    rossePoint,
    rosseThroatInvariants,
    meanderValue,
    exponentialAreaAt,
    segmentChordRadius,
    segmentWeight,
    segmentWeightPeak,
    segmentizedRadius,
    segmentReferenceRadius,
    segmentAlternativeTarget
  });
}));
