(function attachProfileLaws(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MEHProfileLaws = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createProfileLaws() {
  "use strict";

  /*
   * Stage-1 monotone acoustic-profile laws.
   *
   * This module deliberately knows nothing about mouth cross-sections, lips,
   * rollback surfaces, tap locations, driver plates, or meshes. Its sole job
   * is to return one deterministic axial meridian and its analytic
   * derivatives. Lengths are metres and angles are radians.
   */

  const API_VERSION = 1;
  const DEFAULT_SAMPLES = 257;
  const MIN_SAMPLES = 33;
  const MAX_SAMPLES = 4097;
  const MAX_AXIAL_LENGTH = 20;
  const MAX_MOUTH_RADIUS = 2;
  /* A profile segment may begin downstream of a large coax driver or another
     registered acoustic handoff.  The former 60 mm ceiling described only
     compression-driver throats and incorrectly rejected scale-equivalent
     post-handoff profiles.  The equations are homogeneous in length, so the
     honest bound is the same finite radial domain as the mouth, with the
     existing `mouthRadius > throatRadius` check retaining the ordering. */
  const MAX_THROAT_RADIUS = MAX_MOUTH_RADIUS;
  /* Pinned equation retained only as an explicitly named internal regression
     oracle. It is not a product law, default, alias, or migration path. */
  const REGRESSION_EASE_WEIGHT = 0.28;
  const REGRESSION_MINIMUM_AXIAL_LENGTH = 0.06;
  /* The exact R-OSSE body is retained only while x(t) is safely invertible.
     Stopping at a small positive normalized dx/dt avoids the singular normal
     at the native rollback apex while preserving the published body on every
     retained point. The existing flat printed baffle owns the termination. */
  const ROSSE_MONOTONE_DX_FLOOR = 0.04;
  const ROSSE_NATIVE_OUTER_LIMIT = 8;
  const DEG = Math.PI / 180;

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
    return value;
  }

  const PROFILE_LAW_SCHEMAS = deepFreeze({
    regressionEasedConical: {
      family: "regressionEasedConical",
      label: "Eased conical (internal regression oracle)",
      synthesis: "analytic",
      exactness: "internal-regression-axisymmetric",
      nativeDomain: "monotone-axial",
      nativeTermination: "none",
      terminationPolicy: "external-orthogonal-layer",
      coverageClaim: false,
      parameters: {
        throatRadius: { unit: "m", min: 0.002, max: MAX_THROAT_RADIUS },
        mouthRadius: { unit: "m", exclusiveMin: "throatRadius", max: MAX_MOUTH_RADIUS },
        nominalHalfAngle: { unit: "rad", min: 15 * DEG, max: 70 * DEG },
        minimumAxialLength: {
          unit: "m",
          min: 0,
          max: MAX_AXIAL_LENGTH,
          default: REGRESSION_MINIMUM_AXIAL_LENGTH
        }
      },
      fixedEquation: {
        linearWeight: 1 - REGRESSION_EASE_WEIGHT,
        smoothstepWeight: REGRESSION_EASE_WEIGHT
      }
    },
    conical: {
      family: "conical",
      label: "Straight conical",
      synthesis: "analytic",
      exactness: "exact-axisymmetric",
      nativeDomain: "monotone-axial",
      nativeTermination: "none",
      terminationPolicy: "external-orthogonal-layer",
      coverageClaim: false,
      parameters: {
        throatRadius: { unit: "m", min: 0.002, max: MAX_THROAT_RADIUS },
        nominalHalfAngle: { unit: "rad", min: 15 * DEG, max: 70 * DEG },
        axialLength: { unit: "m", exclusiveMin: 0, max: MAX_AXIAL_LENGTH },
        mouthRadius: { unit: "m", exclusiveMin: "throatRadius", max: MAX_MOUTH_RADIUS }
      }
    },
    classicOS: {
      family: "classicOS",
      label: "Classic oblate spheroidal (OS)",
      synthesis: "analytic",
      exactness: "exact-axisymmetric",
      nativeDomain: "monotone-axial",
      nativeTermination: "finite truncation",
      terminationPolicy: "large-baffle-or-separately-validated-termination",
      coverageClaim: false,
      parameters: {
        throatRadius: { unit: "m", min: 0.002, max: MAX_THROAT_RADIUS },
        nominalHalfAngle: { unit: "rad", min: 15 * DEG, max: 70 * DEG },
        axialLength: { unit: "m", exclusiveMin: 0, max: MAX_AXIAL_LENGTH },
        mouthRadius: { unit: "m", exclusiveMin: "throatRadius", max: MAX_MOUTH_RADIUS }
      }
    },
    osse: {
      family: "osse",
      label: "OS-SE (Batík 2020)",
      synthesis: "analytic",
      exactness: "exact-axisymmetric",
      nativeDomain: "monotone-axial",
      nativeTermination: "flat/large-baffle steepening",
      terminationPolicy: "native-profile-law",
      coverageClaim: false,
      parameters: {
        throatRadius: { unit: "m", min: 0.002, max: MAX_THROAT_RADIUS },
        nominalHalfAngle: { unit: "rad", min: 20 * DEG, max: 70 * DEG },
        throatHalfAngle: { unit: "rad", min: 0, max: 25 * DEG },
        k: { min: 0.5, max: 4 },
        s: { min: 0, max: 2 },
        terminationExponent: { min: 2, max: 8 },
        q: {
          min: 0.99,
          max: 0.999,
          note: "Bounded below one so endpoint derivatives remain finite."
        },
        axialLength: { unit: "m", exclusiveMin: 0, max: MAX_AXIAL_LENGTH },
        mouthRadius: { unit: "m", exclusiveMin: "throatRadius", max: MAX_MOUTH_RADIUS }
      }
    },
    rosse: {
      family: "rosse",
      label: "R-OSSE (Batík 2022) · monotone flat-baffle truncation",
      synthesis: "analytic-parametric-truncated",
      exactness: "exact-axisymmetric-retained-native-body",
      nativeDomain: "monotone-axial",
      nativeTermination: "flat-baffle truncation before native rollback",
      terminationPolicy: "retained-native-body-plus-existing-flat-baffle",
      coverageClaim: false,
      parameters: {
        throatRadius: { unit: "m", min: 0.002, max: MAX_THROAT_RADIUS },
        mouthRadius: {
          unit: "m",
          exclusiveMin: "throatRadius",
          max: MAX_MOUTH_RADIUS,
          note: "Requested flat-baffle radius; the native outer R is solved."
        },
        nominalHalfAngle: { unit: "rad", min: 20 * DEG, max: 60 * DEG },
        throatHalfAngle: { unit: "rad", min: 0, max: 20 * DEG },
        k: { min: 0.5, max: 4 },
        apexRadiusFactor: { min: 0.05, max: 1 },
        bending: { min: 0, max: 1 },
        apexShift: { min: 0.4, max: 0.98 },
        throatShape: {
          min: 2,
          max: 8,
          note: "q >= 2 keeps the retained throat curvature finite."
        }
      }
    }
  });

  const SUPPORTED_ALIASES = Object.freeze({
    /* Exact key only: this exists for pinned internal regression fixtures,
       not for migration, saved state, or user selection. */
    regressionEasedConical: "regressionEasedConical",
    conical: "conical",
    cone: "conical",
    classicOS: "classicOS",
    "classic-os": "classicOS",
    os: "classicOS",
    osse: "osse",
    "os-se": "osse",
    rosse: "rosse",
    "r-osse": "rosse",
    r_osse: "rosse"
  });

  const NATIVE_ROLLBACK_ALIASES = Object.freeze(new Set([
    "rollback-rosse"
  ]));

  function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function finite(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function inRange(value, minimum, maximum) {
    return finite(value) && value >= minimum && value <= maximum;
  }

  function failure(code, family, errors, extra) {
    const compatibility = extra && extra.compatibility
      ? extra.compatibility
      : {
          compatible: false,
          monotoneAxialConsumer: false,
          reason: errors[0] || "profile law was refused"
        };
    return deepFreeze({
      ok: false,
      version: API_VERSION,
      code,
      family: family || null,
      errors: [...errors],
      coverageClaim: false,
      compatibility,
      ...(extra || {})
    });
  }

  function normalizeFamily(name) {
    if (typeof name !== "string") return null;
    return SUPPORTED_ALIASES[name] || null;
  }

  function profileLawSchema(name) {
    const family = normalizeFamily(name);
    return family ? PROFILE_LAW_SCHEMAS[family] : null;
  }

  function normalizeSamples(value) {
    if (value === undefined) return DEFAULT_SAMPLES;
    if (!finite(value)) return null;
    let count = Math.max(MIN_SAMPLES, Math.min(MAX_SAMPLES, Math.round(value)));
    if (count % 2 === 0) count += count < MAX_SAMPLES ? 1 : -1;
    return count;
  }

  function validateThroatAndAngle(config, angleMinimum, angleMaximum, errors) {
    if (!inRange(config.throatRadius, 0.002, MAX_THROAT_RADIUS)) {
      errors.push(`throatRadius must be 0.002–${MAX_THROAT_RADIUS} m`);
    }
    if (!inRange(config.nominalHalfAngle, angleMinimum, angleMaximum)) {
      errors.push(
        `nominalHalfAngle must be ${angleMinimum / DEG}–${angleMaximum / DEG} degrees`
      );
    }
  }

  function validateOptionalExtent(config, errors) {
    const hasLength = hasOwn(config, "axialLength");
    const hasMouth = hasOwn(config, "mouthRadius");
    if (!hasLength && !hasMouth) {
      errors.push("select axialLength or mouthRadius as the finite extent");
      return;
    }
    if (hasLength && (!finite(config.axialLength) ||
      config.axialLength <= 0 || config.axialLength > MAX_AXIAL_LENGTH)) {
      errors.push(`axialLength must be greater than zero and at most ${MAX_AXIAL_LENGTH} m`);
    }
    if (hasMouth && (!finite(config.mouthRadius) ||
      config.mouthRadius <= config.throatRadius ||
      config.mouthRadius > MAX_MOUTH_RADIUS)) {
      errors.push(
        `mouthRadius must be greater than throatRadius and at most ${MAX_MOUTH_RADIUS} m`
      );
    }
  }

  function resolveAnalyticExtent(config, radiusAtLength, solveLengthFromMouth) {
    const hasLength = finite(config.axialLength);
    const hasMouth = finite(config.mouthRadius);
    let axialLength;
    let mouthRadius;
    let mode;

    if (hasLength) {
      axialLength = config.axialLength;
      mouthRadius = radiusAtLength(axialLength);
      mode = hasMouth ? "both" : "axialLength";
      if (!finite(mouthRadius) || mouthRadius <= config.throatRadius) {
        return {
          ok: false,
          error: "the selected axialLength does not produce a finite mouth above the throat"
        };
      }
      if (mouthRadius > MAX_MOUTH_RADIUS) {
        return {
          ok: false,
          error: `the selected axialLength produces a mouth above ${MAX_MOUTH_RADIUS} m`
        };
      }
      if (hasMouth) {
        const tolerance = Math.max(1e-10, 1e-8 * config.mouthRadius);
        if (Math.abs(mouthRadius - config.mouthRadius) > tolerance) {
          return {
            ok: false,
            error: "axialLength and mouthRadius specify inconsistent extents"
          };
        }
        mouthRadius = config.mouthRadius;
      }
    } else {
      axialLength = solveLengthFromMouth(config.mouthRadius);
      mouthRadius = config.mouthRadius;
      mode = "mouthRadius";
    }

    if (!finite(axialLength) || axialLength <= 0 || axialLength > MAX_AXIAL_LENGTH) {
      return {
        ok: false,
        error: `the finite extent solve must produce 0 < axialLength <= ${MAX_AXIAL_LENGTH} m`
      };
    }
    return { ok: true, axialLength, mouthRadius, mode };
  }

  function solveMonotoneLength(config, endpointRadiusAtLength) {
    const target = config.mouthRadius;
    let low = 0;
    let high = Math.max(0.01, 4 * config.throatRadius);
    let highRadius = endpointRadiusAtLength(high);

    for (let iteration = 0;
      iteration < 64 && (!finite(highRadius) || highRadius < target);
      iteration += 1) {
      high *= 2;
      if (high > MAX_AXIAL_LENGTH) {
        high = MAX_AXIAL_LENGTH;
        highRadius = endpointRadiusAtLength(high);
        break;
      }
      highRadius = endpointRadiusAtLength(high);
    }

    if (!finite(highRadius) || highRadius < target) return NaN;
    for (let iteration = 0; iteration < 100; iteration += 1) {
      const middle = (low + high) / 2;
      const middleRadius = endpointRadiusAtLength(middle);
      if (!finite(middleRadius)) return NaN;
      if (middleRadius < target) low = middle;
      else high = middle;
    }
    return (low + high) / 2;
  }

  function prepareRegressionOracle(config) {
    const errors = [];
    validateThroatAndAngle(config, 15 * DEG, 70 * DEG, errors);
    if (!finite(config.mouthRadius) ||
      config.mouthRadius <= config.throatRadius ||
      config.mouthRadius > MAX_MOUTH_RADIUS) {
      errors.push(
        `mouthRadius must be greater than throatRadius and at most ${MAX_MOUTH_RADIUS} m`
      );
    }
    const minimumAxialLength = config.minimumAxialLength === undefined
      ? REGRESSION_MINIMUM_AXIAL_LENGTH
      : config.minimumAxialLength;
    if (!inRange(minimumAxialLength, 0, MAX_AXIAL_LENGTH)) {
      errors.push(`minimumAxialLength must be 0–${MAX_AXIAL_LENGTH} m`);
    }
    if (errors.length) return failure(
      "PROFILE_INPUT_INVALID",
      "regressionEasedConical",
      errors
    );

    const geometricLength = (
      config.mouthRadius - config.throatRadius
    ) / Math.tan(config.nominalHalfAngle);
    const axialLength = Math.max(minimumAxialLength, geometricLength);
    if (hasOwn(config, "axialLength")) {
      if (!finite(config.axialLength) ||
        Math.abs(config.axialLength - axialLength) >
          Math.max(1e-10, 1e-8 * axialLength)) {
        return failure(
          "PROFILE_EXTENT_INVALID",
          "regressionEasedConical",
          ["axialLength is derived by the pinned regression equation and is inconsistent"]
        );
      }
    }

    return {
      ok: true,
      family: "regressionEasedConical",
      inputs: {
        throatRadius: config.throatRadius,
        mouthRadius: config.mouthRadius,
        nominalHalfAngle: config.nominalHalfAngle,
        minimumAxialLength
      },
      extent: {
        mode: "mouthRadius",
        axialLength,
        throatRadius: config.throatRadius,
        mouthRadius: config.mouthRadius
      }
    };
  }

  function prepareConical(config) {
    const errors = [];
    validateThroatAndAngle(config, 15 * DEG, 70 * DEG, errors);
    validateOptionalExtent(config, errors);
    if (errors.length) return failure("PROFILE_INPUT_INVALID", "conical", errors);
    const tangent = Math.tan(config.nominalHalfAngle);
    const extent = resolveAnalyticExtent(
      config,
      length => config.throatRadius + tangent * length,
      mouth => (mouth - config.throatRadius) / tangent
    );
    if (!extent.ok) return failure(
      "PROFILE_EXTENT_INVALID",
      "conical",
      [extent.error]
    );
    return {
      ok: true,
      family: "conical",
      inputs: {
        throatRadius: config.throatRadius,
        nominalHalfAngle: config.nominalHalfAngle
      },
      extent: {
        mode: extent.mode,
        axialLength: extent.axialLength,
        mouthRadius: extent.mouthRadius,
        throatRadius: config.throatRadius
      }
    };
  }

  function prepareClassicOS(config) {
    const errors = [];
    validateThroatAndAngle(config, 15 * DEG, 70 * DEG, errors);
    validateOptionalExtent(config, errors);
    if (errors.length) return failure("PROFILE_INPUT_INVALID", "classicOS", errors);
    const tangent = Math.tan(config.nominalHalfAngle);
    const extent = resolveAnalyticExtent(
      config,
      length => Math.sqrt(
        config.throatRadius ** 2 + (length * tangent) ** 2
      ),
      mouth => Math.sqrt(
        mouth ** 2 - config.throatRadius ** 2
      ) / tangent
    );
    if (!extent.ok) return failure(
      "PROFILE_EXTENT_INVALID",
      "classicOS",
      [extent.error]
    );
    return {
      ok: true,
      family: "classicOS",
      inputs: {
        throatRadius: config.throatRadius,
        nominalHalfAngle: config.nominalHalfAngle
      },
      extent: {
        mode: extent.mode,
        axialLength: extent.axialLength,
        mouthRadius: extent.mouthRadius,
        throatRadius: config.throatRadius
      }
    };
  }

  function osseAtX(inputs, axialLength, x) {
    const {
      throatRadius: r0,
      nominalHalfAngle,
      throatHalfAngle,
      k,
      s,
      terminationExponent: n,
      q
    } = inputs;
    const nominalTangent = Math.tan(nominalHalfAngle);
    const throatTangent = Math.tan(throatHalfAngle);
    const A = (
      k * k * r0 * r0 +
      2 * k * r0 * x * throatTangent +
      x * x * nominalTangent * nominalTangent
    );
    const sqrtA = Math.sqrt(A);
    const firstA = (
      2 * k * r0 * throatTangent +
      2 * x * nominalTangent * nominalTangent
    );
    const secondA = 2 * nominalTangent * nominalTangent;
    const baseRadius = sqrtA + r0 * (1 - k);
    const baseSlope = firstA / (2 * sqrtA);
    const baseSecond = (
      secondA / (2 * sqrtA) -
      firstA * firstA / (4 * A * sqrtA)
    );

    const w = q * x / axialLength;
    const h = Math.max(0, 1 - w ** n);
    const terminationRadius = (
      s * axialLength / q *
      (1 - h ** (1 / n))
    );
    const terminationSlope = (
      s * w ** (n - 1) * h ** (1 / n - 1)
    );
    const terminationSecond = (
      s * (q / axialLength) * (n - 1) *
      w ** (n - 2) * h ** (1 / n - 2)
    );

    return {
      r: baseRadius + terminationRadius,
      slope: baseSlope + terminationSlope,
      second: baseSecond + terminationSecond
    };
  }

  function prepareOSSE(config) {
    const errors = [];
    validateThroatAndAngle(config, 20 * DEG, 70 * DEG, errors);
    if (!inRange(config.throatHalfAngle, 0, 25 * DEG)) {
      errors.push("throatHalfAngle must be 0–25 degrees");
    }
    if (!inRange(config.k, 0.5, 4)) errors.push("k must be 0.5–4");
    if (!inRange(config.s, 0, 2)) errors.push("s must be 0–2");
    if (!inRange(config.terminationExponent, 2, 8)) {
      errors.push("terminationExponent must be 2–8");
    }
    if (!inRange(config.q, 0.99, 0.999)) {
      errors.push("q must be 0.990–0.999 so endpoint derivatives remain finite");
    }
    validateOptionalExtent(config, errors);
    if (errors.length) return failure("PROFILE_INPUT_INVALID", "osse", errors);

    const inputs = {
      throatRadius: config.throatRadius,
      nominalHalfAngle: config.nominalHalfAngle,
      throatHalfAngle: config.throatHalfAngle,
      k: config.k,
      s: config.s,
      terminationExponent: config.terminationExponent,
      q: config.q
    };
    const endpointRadius = length => osseAtX(inputs, length, length).r;
    const extent = resolveAnalyticExtent(
      config,
      endpointRadius,
      () => solveMonotoneLength(config, endpointRadius)
    );
    if (!extent.ok) return failure(
      "PROFILE_EXTENT_INVALID",
      "osse",
      [extent.error]
    );

    return {
      ok: true,
      family: "osse",
      inputs,
      extent: {
        mode: extent.mode,
        axialLength: extent.axialLength,
        mouthRadius: extent.mouthRadius,
        throatRadius: config.throatRadius
      }
    };
  }

  /* R-OSSE revision 7, page 4. This is the same published parametric body as
     engine.js::rosse(). It is repeated here because profile-laws.js is the
     browser/worker-safe canonical profile owner and must not depend on engine.

     Native R-OSSE normally continues through an axial apex and rolls backward.
     The current exact SDF consumes one single-valued x -> section meridian, so
     prepareROSSE() retains the exact forward branch only. It solves the native
     outer R such that the retained branch reaches the requested flat-baffle
     mouth radius; it never sorts, flattens, or reflects rollback points. */
  function rosseParameterDerivatives(inputs, t) {
    const { apexRadiusFactor: rr, bending: b, apexShift: m } = inputs;
    const A1 = Math.hypot(rr, m);
    const A2 = Math.hypot(rr, 1 - m);
    const deltaA = A2 - A1;
    const shifted = t - m;
    const root = Math.hypot(rr, shifted);
    return {
      firstNormalized: -shifted / root + 2 * b * deltaA * t,
      secondNormalized: -(rr * rr) / (root ** 3) + 2 * b * deltaA
    };
  }

  function rosseMonotoneParameterEnd(inputs) {
    const atZero = rosseParameterDerivatives(inputs, 0).firstNormalized;
    if (!(atZero > ROSSE_MONOTONE_DX_FLOOR)) return NaN;
    const atOne = rosseParameterDerivatives(inputs, 1).firstNormalized;
    if (atOne >= ROSSE_MONOTONE_DX_FLOOR) return 1;

    /* Find the first crossing, not merely an arbitrary later root. This keeps
       the entire retained interval above the exact-engine derivative floor. */
    let low = 0;
    let high = 1;
    let previousT = 0;
    let previousDerivative = atZero;
    for (let index = 1; index <= 1024; index += 1) {
      const t = index / 1024;
      const derivative = rosseParameterDerivatives(inputs, t).firstNormalized;
      if (previousDerivative > ROSSE_MONOTONE_DX_FLOOR &&
          derivative <= ROSSE_MONOTONE_DX_FLOOR) {
        low = previousT;
        high = t;
        break;
      }
      previousT = t;
      previousDerivative = derivative;
    }
    for (let iteration = 0; iteration < 100; iteration += 1) {
      const middle = (low + high) / 2;
      if (rosseParameterDerivatives(inputs, middle).firstNormalized >
          ROSSE_MONOTONE_DX_FLOOR) {
        low = middle;
      } else {
        high = middle;
      }
    }
    return (low + high) / 2;
  }

  function rosseNativeLength(inputs, nativeOuterRadius) {
    const {
      throatRadius: r0,
      nominalHalfAngle: a,
      throatHalfAngle: a0,
      k
    } = inputs;
    const c1 = (k * r0) ** 2;
    const c2 = 2 * k * r0 * Math.tan(a0);
    const c3 = Math.tan(a) ** 2;
    const shiftedOuter = nativeOuterRadius + r0 * (k - 1);
    const discriminant = c2 * c2 -
      4 * c3 * (c1 - shiftedOuter * shiftedOuter);
    if (!(discriminant > 0) || !(c3 > 0) ||
        !(nativeOuterRadius > r0)) return NaN;
    return (Math.sqrt(discriminant) - c2) / (2 * c3);
  }

  function rosseAtT(inputs, t) {
    const {
      throatRadius: r0,
      nominalHalfAngle: a,
      throatHalfAngle: a0,
      k,
      apexRadiusFactor: rr,
      bending: b,
      apexShift: m,
      throatShape: q,
      nativeOuterRadius: outer
    } = inputs;
    const L = rosseNativeLength(inputs, outer);
    const c1 = (k * r0) ** 2;
    const c2 = 2 * k * r0 * Math.tan(a0);
    const c3 = Math.tan(a) ** 2;
    const A1 = Math.hypot(rr, m);
    const A2 = Math.hypot(rr, 1 - m);
    const deltaA = A2 - A1;
    const shifted = t - m;
    const apexRoot = Math.hypot(rr, shifted);
    const axial = rosseParameterDerivatives(inputs, t);
    const x = L * (A1 - apexRoot) + b * L * deltaA * t * t;
    const dxdt = L * axial.firstNormalized;
    const d2xdt2 = L * axial.secondNormalized;

    const baseSquared = c1 + c2 * L * t + c3 * L * L * t * t;
    const baseRoot = Math.sqrt(baseSquared);
    const baseNumerator = c2 * L + 2 * c3 * L * L * t;
    const g = baseRoot + r0 * (1 - k);
    const dgdt = baseNumerator / (2 * baseRoot);
    const d2gdt2 = c3 * L * L / baseRoot -
      baseNumerator * baseNumerator / (4 * baseRoot ** 3);

    const terminalShift = t - 1;
    const terminalRoot = Math.sqrt(1 + c3 * terminalShift * terminalShift);
    const h = outer + L * (1 - terminalRoot);
    const dhdt = -L * c3 * terminalShift / terminalRoot;
    const d2hdt2 = -L * c3 / (terminalRoot ** 3);

    const blend = t === 0 ? 0 : t ** q;
    const firstBlend = t === 0 ? 0 : q * t ** (q - 1);
    const secondBlend = t === 0
      ? (q === 2 ? 2 : 0)
      : q * (q - 1) * t ** (q - 2);
    const r = g + blend * (h - g);
    const drdt = dgdt + firstBlend * (h - g) +
      blend * (dhdt - dgdt);
    const d2rdt2 = d2gdt2 + secondBlend * (h - g) +
      2 * firstBlend * (dhdt - dgdt) +
      blend * (d2hdt2 - d2gdt2);
    return { x, r, dxdt, drdt, d2xdt2, d2rdt2, nativeLength: L };
  }

  function prepareROSSE(config) {
    const errors = [];
    validateThroatAndAngle(config, 20 * DEG, 60 * DEG, errors);
    if (!inRange(config.throatHalfAngle, 0, 20 * DEG)) {
      errors.push("throatHalfAngle must be 0–20 degrees");
    }
    if (!inRange(config.k, 0.5, 4)) errors.push("k must be 0.5–4");
    if (!inRange(config.apexRadiusFactor, 0.05, 1)) {
      errors.push("apexRadiusFactor must be 0.05–1");
    }
    if (!inRange(config.bending, 0, 1)) errors.push("bending must be 0–1");
    if (!inRange(config.apexShift, 0.4, 0.98)) {
      errors.push("apexShift must be 0.4–0.98");
    }
    if (!inRange(config.throatShape, 2, 8)) {
      errors.push("throatShape must be 2–8 so throat curvature remains finite");
    }
    if (!finite(config.mouthRadius) ||
        config.mouthRadius <= config.throatRadius ||
        config.mouthRadius > MAX_MOUTH_RADIUS) {
      errors.push(
        `mouthRadius must be greater than throatRadius and at most ${MAX_MOUTH_RADIUS} m`
      );
    }
    if (hasOwn(config, "axialLength") &&
        (!finite(config.axialLength) || config.axialLength <= 0 ||
          config.axialLength > MAX_AXIAL_LENGTH)) {
      errors.push(`axialLength must be greater than zero and at most ${MAX_AXIAL_LENGTH} m`);
    }
    if (errors.length) return failure("PROFILE_INPUT_INVALID", "rosse", errors);

    const userInputs = {
      throatRadius: config.throatRadius,
      nominalHalfAngle: config.nominalHalfAngle,
      throatHalfAngle: config.throatHalfAngle,
      k: config.k,
      apexRadiusFactor: config.apexRadiusFactor,
      bending: config.bending,
      apexShift: config.apexShift,
      throatShape: config.throatShape
    };
    const parameterEnd = rosseMonotoneParameterEnd(userInputs);
    if (!(parameterEnd > 0 && parameterEnd <= 1)) {
      return failure(
        "PROFILE_MONOTONICITY_FAILED",
        "rosse",
        ["R-OSSE has no forward branch above the exact-engine axial derivative floor"]
      );
    }

    const radiusAt = nativeOuterRadius => rosseAtT({
      ...userInputs,
      nativeOuterRadius
    }, parameterEnd).r;
    let low = config.throatRadius * (1 + 1e-9);
    let high = Math.max(config.mouthRadius * 1.25, low * 2);
    let lowRadius = radiusAt(low);
    let highRadius = radiusAt(high);
    while (finite(highRadius) && highRadius < config.mouthRadius &&
        high < ROSSE_NATIVE_OUTER_LIMIT) {
      high = Math.min(ROSSE_NATIVE_OUTER_LIMIT, high * 2);
      highRadius = radiusAt(high);
    }
    if (!finite(lowRadius) || !finite(highRadius) ||
        lowRadius > config.mouthRadius || highRadius < config.mouthRadius) {
      return failure(
        "PROFILE_EXTENT_INVALID",
        "rosse",
        ["requested mouth radius cannot be reached by the bounded monotone R-OSSE branch"]
      );
    }
    for (let iteration = 0; iteration < 100; iteration += 1) {
      const middle = (low + high) / 2;
      if (radiusAt(middle) < config.mouthRadius) low = middle;
      else high = middle;
    }
    const nativeOuterRadius = (low + high) / 2;
    const inputs = {
      ...userInputs,
      nativeOuterRadius,
      monotoneParameterEnd: parameterEnd,
      axialDerivativeFloorRatio: ROSSE_MONOTONE_DX_FLOOR
    };
    const endpoint = rosseAtT(inputs, parameterEnd);
    if (!finite(endpoint.x) || !(endpoint.x > 0) ||
        endpoint.x > MAX_AXIAL_LENGTH) {
      return failure(
        "PROFILE_EXTENT_INVALID",
        "rosse",
        [`the retained R-OSSE branch must produce 0 < axialLength <= ${MAX_AXIAL_LENGTH} m`]
      );
    }
    if (hasOwn(config, "axialLength") &&
        Math.abs(config.axialLength - endpoint.x) >
          Math.max(1e-10, 1e-8 * endpoint.x)) {
      return failure(
        "PROFILE_EXTENT_INVALID",
        "rosse",
        ["axialLength is derived by the monotone R-OSSE truncation and is inconsistent"]
      );
    }
    return {
      ok: true,
      family: "rosse",
      inputs,
      extent: {
        mode: hasOwn(config, "axialLength") ? "both" : "mouthRadius",
        axialLength: endpoint.x,
        mouthRadius: config.mouthRadius,
        throatRadius: config.throatRadius
      },
      truncation: {
        active: parameterEnd < 1,
        mode: "monotone-forward-branch-flat-baffle",
        nativeParameterEnd: parameterEnd,
        nativeOuterRadius,
        nativeEndpointIncluded: parameterEnd === 1,
        nativeRollbackIncluded: false,
        axialDerivativeFloorRatio: ROSSE_MONOTONE_DX_FLOOR,
        reason: parameterEnd < 1
          ? "Stopped before the first axial rollback; the existing flat baffle terminates the retained exact body."
          : "Native endpoint remained forward-monotone; the existing flat baffle terminates the body."
      }
    };
  }

  function rawAt(normalized, u) {
    const { family, inputs, extent } = normalized;
    const axialLength = extent.axialLength;
    let x = axialLength * u;
    let r;
    let slope;
    let second;
    let dxdu = axialLength;
    let d2xdu2 = 0;
    let drdu;
    let d2rdu2;

    if (family === "regressionEasedConical") {
      const delta = extent.mouthRadius - inputs.throatRadius;
      /* Keep the operation order byte-for-byte aligned with the historical
         engine expression `u*u*(3-2*u)`, not merely algebraically equal. */
      const smoothstep = u * u * (3 - 2 * u);
      const blend = (
        (1 - REGRESSION_EASE_WEIGHT) * u +
        REGRESSION_EASE_WEIGHT * smoothstep
      );
      const firstBlend = (
        (1 - REGRESSION_EASE_WEIGHT) +
        6 * REGRESSION_EASE_WEIGHT * u * (1 - u)
      );
      const secondBlend = 6 * REGRESSION_EASE_WEIGHT * (1 - 2 * u);
      r = inputs.throatRadius + delta * blend;
      slope = delta * firstBlend / axialLength;
      second = delta * secondBlend / (axialLength * axialLength);
    } else if (family === "conical") {
      slope = Math.tan(inputs.nominalHalfAngle);
      second = 0;
      r = inputs.throatRadius + slope * x;
    } else if (family === "classicOS") {
      const tangent = Math.tan(inputs.nominalHalfAngle);
      const tangentSquared = tangent * tangent;
      r = Math.sqrt(
        inputs.throatRadius ** 2 + x * x * tangentSquared
      );
      slope = x * tangentSquared / r;
      second = (
        inputs.throatRadius ** 2 * tangentSquared / (r ** 3)
      );
    } else if (family === "osse") {
      ({ r, slope, second } = osseAtX(inputs, axialLength, x));
    } else if (family === "rosse") {
      const parameterEnd = inputs.monotoneParameterEnd;
      const point = rosseAtT(inputs, parameterEnd * u);
      x = point.x;
      r = point.r;
      dxdu = point.dxdt * parameterEnd;
      d2xdu2 = point.d2xdt2 * parameterEnd * parameterEnd;
      drdu = point.drdt * parameterEnd;
      d2rdu2 = point.d2rdt2 * parameterEnd * parameterEnd;
      slope = point.drdt / point.dxdt;
      second = (
        point.d2rdt2 * point.dxdt -
        point.drdt * point.d2xdt2
      ) / (point.dxdt ** 3);
    } else {
      throw new TypeError(`Unsupported normalized profile family "${family}".`);
    }

    if (drdu === undefined) drdu = slope * axialLength;
    if (d2rdu2 === undefined) d2rdu2 = second * axialLength * axialLength;
    const curvature = second / ((1 + slope * slope) ** 1.5);
    return {
      u,
      x,
      r,
      dxdu,
      drdu,
      d2xdu2,
      d2rdu2,
      slope,
      tangentAngle: Math.atan2(drdu, dxdu),
      curvature,
      speed: Math.hypot(dxdu, drdu)
    };
  }

  function canonicalNumber(value) {
    if (Object.is(value, -0)) return "0";
    if (!Number.isFinite(value)) return String(value);
    return Number(value).toPrecision(17);
  }

  function stableSerialize(value) {
    if (typeof value === "number") return canonicalNumber(value);
    if (typeof value === "string") return JSON.stringify(value);
    if (typeof value === "boolean" || value === null) return String(value);
    if (Array.isArray(value)) {
      return `[${value.map(stableSerialize).join(",")}]`;
    }
    if (typeof value === "object") {
      const keys = Object.keys(value).sort();
      return `{${keys.map(key =>
        `${JSON.stringify(key)}:${stableSerialize(value[key])}`
      ).join(",")}}`;
    }
    return JSON.stringify(String(value));
  }

  function fnv1a32(text) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function geometryHash(normalized) {
    const probes = [];
    for (let index = 0; index <= 64; index += 1) {
      const point = rawAt(normalized, index / 64);
      probes.push([
        point.x,
        point.r,
        point.dxdu,
        point.drdu,
        point.d2xdu2,
        point.d2rdu2
      ]);
    }
    return `pl${API_VERSION}-${fnv1a32(stableSerialize({
      version: API_VERSION,
      family: normalized.family,
      probes
    }))}`;
  }

  function buildStations(normalized, sampleCount) {
    const stations = [];
    let arcLength = 0;
    let previous = null;
    for (let index = 0; index < sampleCount; index += 1) {
      const u = index / (sampleCount - 1);
      const raw = rawAt(normalized, u);
      if (previous) {
        const middle = rawAt(normalized, (previous.u + u) / 2);
        const du = u - previous.u;
        arcLength += du * (
          previous.speed + 4 * middle.speed + raw.speed
        ) / 6;
      }
      stations.push({
        u: raw.u,
        x: raw.x,
        r: raw.r,
        dxdu: raw.dxdu,
        drdu: raw.drdu,
        d2xdu2: raw.d2xdu2,
        d2rdu2: raw.d2rdu2,
        slope: raw.slope,
        tangentAngle: raw.tangentAngle,
        curvature: raw.curvature,
        arcLength
      });
      previous = raw;
    }
    return stations;
  }

  function stationSampleHash(profileHash, stations) {
    return `pls${API_VERSION}-${fnv1a32(stableSerialize({
      profileHash,
      samples: stations.map(station => [
        station.u,
        station.x,
        station.r,
        station.dxdu,
        station.drdu,
        station.d2xdu2,
        station.d2rdu2
      ])
    }))}`;
  }

  function diagnosticsFor(normalized, stations) {
    const first = stations[0];
    const last = stations[stations.length - 1];
    const lengthScale = Math.max(1, normalized.extent.axialLength);
    const radiusScale = Math.max(1, normalized.extent.mouthRadius);
    const xTolerance = 1e-13 * lengthScale;
    const radiusTolerance = 1e-13 * radiusScale;
    let finiteValues = true;
    let radiusPositive = true;
    let axialMonotone = true;
    let radialMonotone = true;
    let minDxDu = Infinity;
    let maxDxDu = -Infinity;
    let minDrDu = Infinity;
    let maxDrDu = -Infinity;
    let minSlope = Infinity;
    let maxSlope = -Infinity;
    let minCurvature = Infinity;
    let maxCurvature = -Infinity;
    let maxAbsCurvature = 0;

    for (let index = 0; index < stations.length; index += 1) {
      const station = stations[index];
      const numericValues = [
        station.u,
        station.x,
        station.r,
        station.dxdu,
        station.drdu,
        station.d2xdu2,
        station.d2rdu2,
        station.slope,
        station.tangentAngle,
        station.curvature,
        station.arcLength
      ];
      if (!numericValues.every(Number.isFinite)) finiteValues = false;
      if (!(station.r > 0)) radiusPositive = false;
      minDxDu = Math.min(minDxDu, station.dxdu);
      maxDxDu = Math.max(maxDxDu, station.dxdu);
      minDrDu = Math.min(minDrDu, station.drdu);
      maxDrDu = Math.max(maxDrDu, station.drdu);
      minSlope = Math.min(minSlope, station.slope);
      maxSlope = Math.max(maxSlope, station.slope);
      minCurvature = Math.min(minCurvature, station.curvature);
      maxCurvature = Math.max(maxCurvature, station.curvature);
      maxAbsCurvature = Math.max(maxAbsCurvature, Math.abs(station.curvature));
      if (index > 0) {
        if (!(station.x > stations[index - 1].x + xTolerance)) {
          axialMonotone = false;
        }
        if (station.r < stations[index - 1].r - radiusTolerance) {
          radialMonotone = false;
        }
      }
    }
    if (minDxDu <= 0) axialMonotone = false;
    if (minDrDu < -radiusTolerance) radialMonotone = false;

    return {
      finite: finiteValues,
      radiusPositive,
      axialMonotone,
      radialMonotone,
      c2Finite: finiteValues,
      minDxDu,
      maxDxDu,
      minDrDu,
      maxDrDu,
      minSlope,
      maxSlope,
      minCurvature,
      maxCurvature,
      maxAbsCurvature,
      throatRadiusError: first.r - normalized.extent.throatRadius,
      mouthRadiusError: last.r - normalized.extent.mouthRadius,
      throatSlope: first.slope,
      mouthSlope: last.slope,
      throatCurvature: first.curvature,
      mouthCurvature: last.curvature,
      arcLength: last.arcLength
    };
  }

  function solveProfileLaw(config) {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      return failure(
        "PROFILE_INPUT_INVALID",
        null,
        ["profile-law input must be a plain object"]
      );
    }
    if (typeof config.family !== "string" || !config.family) {
      return failure(
        "PROFILE_LAW_REQUIRED",
        null,
        ["family must explicitly select a supported monotone profile law"]
      );
    }
    if (NATIVE_ROLLBACK_ALIASES.has(config.family)) {
      return failure(
        "PROFILE_NATIVE_ROLLBACK_UNSUPPORTED",
        "rosse",
        [
          "Native rollback R-OSSE may fold back in x; select rosse/r-osse for the exact retained forward body with an explicit flat-baffle truncation"
        ],
        {
          requiresParametricDomain: true,
          rejectedControls: ["nativeRollback"],
          compatibility: {
            compatible: false,
            monotoneAxialConsumer: false,
            requiresParametricDomain: true,
            reason: "Native R-OSSE rollback can make x(t) non-monotone."
          }
        }
      );
    }
    const family = normalizeFamily(config.family);
    if (!family) {
      return failure(
        "PROFILE_LAW_UNSUPPORTED",
        null,
        [`unknown profile law "${config.family}"; no fallback was selected`]
      );
    }
    const sampleCount = normalizeSamples(config.samples);
    if (sampleCount === null) {
      return failure(
        "PROFILE_INPUT_INVALID",
        family,
        [`samples must be a finite number (${MIN_SAMPLES}–${MAX_SAMPLES})`]
      );
    }

    let normalized;
    if (family === "regressionEasedConical") {
      normalized = prepareRegressionOracle(config);
    }
    else if (family === "conical") normalized = prepareConical(config);
    else if (family === "classicOS") normalized = prepareClassicOS(config);
    else if (family === "osse") normalized = prepareOSSE(config);
    else normalized = prepareROSSE(config);
    if (!normalized.ok) return normalized;

    const schema = PROFILE_LAW_SCHEMAS[family];
    const stations = buildStations(normalized, sampleCount);
    const diagnostics = diagnosticsFor(normalized, stations);
    if (!diagnostics.finite ||
      !diagnostics.radiusPositive ||
      !diagnostics.axialMonotone ||
      !diagnostics.radialMonotone) {
      return failure(
        "PROFILE_MONOTONICITY_FAILED",
        family,
        ["profile failed finite, positive-radius, or monotonicity diagnostics"],
        { diagnostics }
      );
    }

    const profileHash = geometryHash(normalized);
    const result = {
      ok: true,
      version: API_VERSION,
      family,
      lawId: family,
      label: schema.label,
      exactness: schema.exactness,
      synthesis: schema.synthesis,
      nativeDomain: schema.nativeDomain,
      nativeTermination: schema.nativeTermination,
      terminationPolicy: schema.terminationPolicy,
      coverageClaim: false,
      source: family === "regressionEasedConical"
        ? "Internal 72/28 linear/smoothstep regression oracle"
        : family === "conical"
          ? "Straight conical meridian"
          : family === "classicOS"
            ? "Classic oblate-spheroidal meridian"
            : family === "osse"
              ? "Batík 2020 OS-SE equation"
              : "Batík 2022 R-OSSE rev.7 exact forward body, truncated before axial rollback",
      inputs: normalized.inputs,
      extent: normalized.extent,
      sampleCount,
      profileHash,
      sampleHash: stationSampleHash(profileHash, stations),
      stations,
      diagnostics,
      endpoints: {
        throat: {
          x: stations[0].x,
          r: stations[0].r,
          slope: diagnostics.throatSlope,
          tangentAngle: stations[0].tangentAngle,
          curvature: diagnostics.throatCurvature
        },
        mouth: {
          x: stations[stations.length - 1].x,
          r: stations[stations.length - 1].r,
          slope: diagnostics.mouthSlope,
          tangentAngle: stations[stations.length - 1].tangentAngle,
          curvature: diagnostics.mouthCurvature
        }
      },
      monotonic: {
        axial: diagnostics.axialMonotone,
        radial: diagnostics.radialMonotone
      },
      compatibility: {
        compatible: true,
        monotoneAxialConsumer: true,
        requiresParametricDomain: false,
        crossSectionLayer: "orthogonal-not-applied",
        additionalMouthTreatment: family === "rosse"
          ? "existing-flat-baffle-at-monotone-truncation"
          : "orthogonal-not-applied",
        reason: family === "rosse"
          ? "The exact native body is retained only before axial rollback; no rollback surface is claimed."
          : null,
        ...(family === "rosse" ? { nativeRollbackIncluded: false } : {})
      },
      ...(normalized.truncation ? { truncation: normalized.truncation } : {})
    };
    return deepFreeze(result);
  }

  function evaluateProfileAt(profile, u) {
    if (!profile || profile.ok !== true || profile.version !== API_VERSION) {
      throw new TypeError("evaluateProfileAt requires a successful Stage-1 profile record.");
    }
    if (!finite(u) || u < 0 || u > 1) {
      throw new RangeError("u must be a finite normalized parameter in [0, 1].");
    }
    const normalized = {
      family: profile.family,
      inputs: profile.inputs,
      extent: profile.extent
    };
    const raw = rawAt(normalized, u);
    return deepFreeze({
      u: raw.u,
      x: raw.x,
      r: raw.r,
      dxdu: raw.dxdu,
      drdu: raw.drdu,
      d2xdu2: raw.d2xdu2,
      d2rdu2: raw.d2rdu2,
      slope: raw.slope,
      tangentAngle: raw.tangentAngle,
      curvature: raw.curvature
    });
  }

  return deepFreeze({
    API_VERSION,
    PROFILE_LAW_SCHEMAS,
    profileLawSchema,
    solveProfileLaw,
    evaluateProfileAt
  });
}));
