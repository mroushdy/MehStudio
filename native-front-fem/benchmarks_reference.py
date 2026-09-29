"""Independent analytic references for the MEH spatial-acoustics prototype.

DEPENDENCY: NumPy only; no FEM, mesher or SciPy. All arguments use SI units.
Run this file for analytic self-tests; --spec prints this benchmark specification.
These references do not certify a real loudspeaker or estimate thermoviscous loss.

CONVENTIONS
  Time dependence exp(+j*omega*t). p is complex acoustic pressure [Pa].
  U_i [m^3/s] is volume velocity INTO the modeled acoustic domain at port i.
  p_i is the area-average pressure, power-conjugate to a uniform port velocity.
  p = Z U, Z [Pa s/m^3]. For RMS phasors input power = Re(U^H p), with no 1/2.
  Peak phasors instead require 1/2. Spatial velocity is grad(p)/(-j*omega*rho).
  In the straight duct Q(x) is positive along +x: U_0=Q(0), U_1=-Q(L).

BENCHMARKS / PROPOSED PROTOTYPE ACCEPTANCE (not universal standards)
  1. Uniform rigid-wall rectangular duct, L=0.30 m, section 0.02 x 0.03 m,
     rho=1.204 kg/m^3, c=343 m/s. Use 80, 150, 250, 400 Hz (below first
     transverse cutoff and away from sin(kL)=0). Excite each uniform port in
     turn. Compare the complex two-port Z matrix, not only its magnitude.
     Target <=1% relative Frobenius error and <=0.5% final refinement change.
     Volume/port-area error <=0.1%; refine until these targets are demonstrated.
  2. Terminate that duct with Z_L/Z_c = 1, 0.5+0.3j, 2-0.4j, 0 (release),
     and None (rigid). Use matched load to test p(x)=Z_c Q_0 exp(-jkx),
     correct propagation phase and positive absorbed power. Target <=1% complex
     field error, <=0.5 degrees phase error away from nulls, <=0.1% normalized
     input-versus-load power difference. For lossless reactive loads compare
     absolute power residual against Z_c |Q_0|^2, not zero actual power.
  3. Rectangular closed cavity Lx,Ly,Lz=(0.31,0.23,0.17) m, rigid walls.
     k_n^2=pi^2 sum((n_i/L_i)^2), f_n=c/(2pi)*sqrt(k_n^2). Include the zero
     constant mode explicitly and preserve degeneracies. Compare first six
     nonzero eigenfrequencies and pressure mode shapes. Target <=0.5% frequency
     error, with refinement; a driven sweep peak is not an eigenvalue solve.
  4. Ideal compact Helmholtz system: cavity compliance V/(rho*c^2) and neck
     inertance rho*(L+delta_L)/S. delta_L is supplied explicitly, not inferred
     from an unrelated flanged/unflanged formula. V excludes the physical neck
     under this lumped partition. V=1e-3 m^3, L=.04 m, radius=.005 m is a useful
     compact ideal-compliance test. Compare the exact distributed-neck /
     ideal-compliance resonance with its lumped limit; reduce S/V to test
     asymptotic convergence. For a fully meshed neck/cavity/exterior, do NOT
     add delta_L again: spreading/radiation mass is already resolved. The
     lumped f_H is then an asymptotic trend check, not an exact FEM target.

MATRIX AND CONVERGENCE AUDIT
  Normalize Z with D=diag(1/sqrt(Z_ref_i)): Zbar=D Z D. Positive real Z_ref_i
  keep ports power-normalized. Reciprocal media require Zbar=Zbar^T (ordinary
  transpose, NOT conjugate transpose). Passivity at each frequency requires
  H=(Zbar+Zbar^H)/2 positive semidefinite. Proposed numerical tests:
     ||Zbar-Zbar^T||_F / max(1,||Zbar||_F) <= 1e-7;
     lambda_min(H) >= -1e-8*max(1,||Zbar||_2);
     for a closed lossless multiport, ||H||_F/max(1,||Zbar||_F) <= 1e-7.
  These tests can catch sign/coupling mistakes but do not prove mesh accuracy.
  Use >=3 independently refined meshes and tighten algebraic residuals below
  the discretization error. Track complex quantities at identical frequencies,
  port normalization, geometry and boundaries. No convergence order is promised
  for a single comparison. Refine gaps and edges separately from wavelength;
  convergence near a pole needs pole/frequency error assessment, not a pointwise
  percentage. Phase errors at near-zero pressure must be omitted, not set to 0.

DOLFINX WEAK-FORM AUDIT (constant rho, exp(+j omega t))
  PDE: laplacian(p)+k^2*p=0. Outward fluid velocity vn obeys
  dp/dn=-j*omega*rho*vn. For inward uniform source U/S, vn=-U/S:
     L(q) = +j*omega*rho*(U/S)*integral_source(conj(q)) ds.
  For local outgoing specific impedance z_s=p/vn [Pa s/m],
     a(p,q) = integral(grad(p).grad(conj(q))-k^2*p*conj(q)) dx
              + j*omega*rho/z_s*integral_boundary(p*conj(q)) ds.
  A lumped load Z_L=pbar/Uout [Pa s/m^3] maps to z_s=S*Z_L ONLY for a
  uniform local port relation. General modal/nonlocal radiation loads need a
  port operator, not this pointwise Robin shortcut. Put test functions second
  in ufl.inner; assert PETSc complex scalars. Never conjugate the impedance
  inadvertently by placing it inside the second argument of ufl.inner.
  The cited tutorial's RHS is negative because its vn is OUTWARD; the positive
  inward-port RHS above is the same convention, not a disagreement.

PRIMARY SOURCES (read 2026-09-28; formulas above also derived independently)
  https://docs.fenicsproject.org/dolfinx/main/python/demos/demo_helmholtz.html
  https://jsdokken.com/dolfinx-tutorial/chapter2/helmholtz_code.html
  https://jsdokken.com/dolfinx-tutorial/chapter2/helmholtz.html
  https://doc.comsol.com/6.3/doc/com.comsol.help.models.aco.helmholtz_resonator_solvers/helmholtz_resonator_solvers.html
"""

from __future__ import annotations

import argparse
import cmath
import itertools
import json
import math
from typing import Sequence

import numpy as np

RHO = 1.204
SOUND_SPEED = 343.0
SINGULAR_TOL = 1e-12


class ResonanceError(ValueError):
    """Undamped reference is at/too near a singular frequency; do not clip it."""


def _positive(**values):
    for name, value in values.items():
        if not math.isfinite(value) or value <= 0:
            raise ValueError(f"{name} must be positive and finite")


def _finite_complex(value, name):
    value = complex(value)
    if not (math.isfinite(value.real) and math.isfinite(value.imag)):
        raise ValueError(f"{name} must be finite")
    return value


def _duct(frequency_hz, length_m, area_m2, density, sound_speed):
    _positive(frequency_hz=frequency_hz, length_m=length_m, area_m2=area_m2,
              density=density, sound_speed=sound_speed)
    theta = 2 * math.pi * frequency_hz * length_m / sound_speed
    return theta, density * sound_speed / area_m2


def uniform_duct_transfer(frequency_hz, length_m, area_m2,
                          density=RHO, sound_speed=SOUND_SPEED):
    """[p(0),Q(0)] = T @ [p(L),Q(L)], Q positive along +x everywhere.

    Plane-mode exact; rigid straight uniform duct with uniform port forcing.
    T[0,1] is impedance, T[1,0] admittance; other entries dimensionless.
    """
    theta, zc = _duct(frequency_hz, length_m, area_m2, density, sound_speed)
    cs, sn = math.cos(theta), math.sin(theta)
    return np.array([[cs, 1j * zc * sn], [1j * sn / zc, cs]], complex)


def uniform_duct_impedance(frequency_hz, length_m, area_m2,
                           density=RHO, sound_speed=SOUND_SPEED):
    """Return p=Z U with BOTH flows directed into the acoustic domain."""
    theta, zc = _duct(frequency_hz, length_m, area_m2, density, sound_speed)
    sn = math.sin(theta)
    if abs(sn) <= SINGULAR_TOL:
        raise ResonanceError("Neumann duct impedance pole at sin(k L)=0")
    return -1j * zc / sn * np.array([[math.cos(theta), 1.0],
                                     [1.0, math.cos(theta)]], complex)


def impedance_terminated_duct(frequency_hz, length_m, area_m2,
                             load_impedance, input_flow=1.0,
                             positions_m=None, density=RHO,
                             sound_speed=SOUND_SPEED):
    """Reference for specified inlet flow and load p(L)=Z_L Q(L).

    Z_L uses outgoing (+x) outlet flow, hence it is -p_1/U_1. None means
    rigid termination, zero means pressure release. Passive loads have Re Z_L>=0.
    Returned pressure/flow phasors inherit the caller's RMS or peak convention.
    """
    theta, zc = _duct(frequency_hz, length_m, area_m2, density, sound_speed)
    q0 = _finite_complex(input_flow, "input_flow")
    if abs(q0) == 0:
        raise ValueError("input_flow must be nonzero for impedance extraction")
    t = uniform_duct_transfer(frequency_hz, length_m, area_m2, density, sound_speed)
    if load_impedance is None:
        if abs(math.sin(theta)) <= SINGULAR_TOL:
            raise ResonanceError("Rigid-ended duct at an undamped resonance")
        ql, pl = 0j, q0 / t[1, 0]
    else:
        zl = _finite_complex(load_impedance, "load_impedance")
        denominator = t[1, 0] * zl + t[1, 1]
        scale = max(1.0, abs(t[1, 0] * zl), abs(t[1, 1]))
        if abs(denominator) <= SINGULAR_TOL * scale:
            raise ResonanceError("Terminated duct at an undamped resonance")
        ql = q0 / denominator
        pl = zl * ql
    p0 = t[0, 0] * pl + t[0, 1] * ql
    x = np.asarray([0.0, length_m] if positions_m is None else positions_m, float)
    if not np.all(np.isfinite(x)) or np.any(x < 0) or np.any(x > length_m):
        raise ValueError("positions_m must be finite and within the duct")
    phase = theta * (1 - x / length_m)
    pressure = np.cos(phase) * pl + 1j * zc * np.sin(phase) * ql
    flow = 1j / zc * np.sin(phase) * pl + np.cos(phase) * ql
    return {"input_impedance": p0 / q0, "pressure_in": p0, "pressure_out": pl,
            "flow_in": q0, "flow_out": ql, "positions_m": x,
            "pressure": pressure, "flow_positive_x": flow,
            "port_flows_inward": np.array([q0, -ql]),
            "port_pressures": np.array([p0, pl]),
            "input_power_rms_w": float((p0 * q0.conjugate()).real),
            "load_power_rms_w": float((pl * ql.conjugate()).real)}


def rectangular_cavity_modes(lengths_m: Sequence[float], max_indices=(3, 3, 3),
                             sound_speed=SOUND_SPEED, include_zero=True):
    """All Neumann rectangular-box modes within index bounds; no deduplication.

    Mode shape = product_i cos(n_i*pi*x_i/L_i); mode amplitude is arbitrary.
    k_squared_m2 is the stiffness/mass generalized eigenvalue, NOT omega^2.
    """
    if len(lengths_m) != 3 or len(max_indices) != 3:
        raise ValueError("Three lengths and three index bounds are required")
    _positive(sound_speed=sound_speed, **{f"length_{i}": x for i, x in enumerate(lengths_m)})
    if any(not isinstance(i, (int, np.integer)) or i < 0 for i in max_indices):
        raise ValueError("max_indices must be nonnegative integers")
    modes = []
    for indices in itertools.product(*(range(n + 1) for n in max_indices)):
        if not include_zero and indices == (0, 0, 0):
            continue
        k2 = math.pi ** 2 * sum((n / length) ** 2 for n, length in zip(indices, lengths_m))
        modes.append({"indices": indices, "k_squared_m2": k2,
                      "frequency_hz": sound_speed * math.sqrt(k2) / (2 * math.pi)})
    return sorted(modes, key=lambda mode: (mode["frequency_hz"], mode["indices"]))


def helmholtz_lumped(volume_m3, neck_area_m2, neck_length_m,
                     end_correction_m=0.0, density=RHO, sound_speed=SOUND_SPEED):
    """Ideal compliance + series neck mass; explicit total end allowance.

    No radiation/loss model is inferred. delta_L is not added to a meshed neck.
    """
    _positive(volume_m3=volume_m3, neck_area_m2=neck_area_m2,
              neck_length_m=neck_length_m, density=density, sound_speed=sound_speed)
    if not math.isfinite(end_correction_m) or end_correction_m < 0:
        raise ValueError("end_correction_m must be nonnegative and finite")
    compliance = volume_m3 / (density * sound_speed ** 2)
    inertance = density * (neck_length_m + end_correction_m) / neck_area_m2
    f0 = 1 / (2 * math.pi * math.sqrt(inertance * compliance))
    return {"compliance_m3_pa": compliance, "inertance_kg_m4": inertance,
            "frequency_hz": f0, "effective_neck_length_m": neck_length_m + end_correction_m,
            "k_length": 2 * math.pi * f0 * neck_length_m / sound_speed}


def helmholtz_series_impedance(frequency_hz, compliance_m3_pa,
                               inertance_kg_m4, resistance_pa_s_m3=0.0):
    """Input p/U = R+j omega M+1/(j omega C), from outside through neck."""
    _positive(frequency_hz=frequency_hz, compliance_m3_pa=compliance_m3_pa,
              inertance_kg_m4=inertance_kg_m4)
    if not math.isfinite(resistance_pa_s_m3) or resistance_pa_s_m3 < 0:
        raise ValueError("resistance must be finite and nonnegative")
    omega = 2 * math.pi * frequency_hz
    return resistance_pa_s_m3 + 1j * (omega * inertance_kg_m4 - 1 / (omega * compliance_m3_pa))


def helmholtz_end_sensitivity(volume_m3, neck_area_m2, neck_length_m,
                              end_lengths_m, density=RHO, sound_speed=SOUND_SPEED):
    """Selected end assumptions only; this is NOT a statistical/physical bound."""
    values = list(end_lengths_m)
    if not values:
        raise ValueError("Supply at least one explicit end-length assumption")
    cases = [helmholtz_lumped(volume_m3, neck_area_m2, neck_length_m, value,
                             density, sound_speed) for value in values]
    return {"assumptions_m": values, "cases": cases,
            "minimum_hz": min(x["frequency_hz"] for x in cases),
            "maximum_hz": max(x["frequency_hz"] for x in cases),
            "meaning": "spread over supplied assumptions; not an uncertainty interval"}


def distributed_neck_compliance_resonance(volume_m3, neck_area_m2, neck_length_m,
                                         density=RHO, sound_speed=SOUND_SPEED):
    """First ZERO of input reactance: exact 1D neck + ideal lumped compliance.

    No end correction. Root omega*C*Zc*tan(kL)=1 in 0<kL<pi/2.
    This isolates distributed neck compressibility from 3D end effects.
    """
    model = helmholtz_lumped(volume_m3, neck_area_m2, neck_length_m,
                             density=density, sound_speed=sound_speed)
    compliance = model["compliance_m3_pa"]
    zc = density * sound_speed / neck_area_m2
    lower, upper = 0.0, sound_speed / (4 * neck_length_m) * (1 - 1e-12)
    for _ in range(90):
        mid = (lower + upper) / 2
        omega = 2 * math.pi * mid
        value = omega * compliance * zc * math.tan(omega * neck_length_m / sound_speed) - 1
        if value > 0:
            upper = mid
        else:
            lower = mid
    return (lower + upper) / 2


def complex_relative_error(actual, reference, absolute_scale=0.0):
    """Norm error with an explicit physical floor; no per-entry zero division."""
    a, b = np.asarray(actual, complex), np.asarray(reference, complex)
    if a.shape != b.shape or not np.all(np.isfinite(a)) or not np.all(np.isfinite(b)):
        raise ValueError("Inputs must have identical shapes and finite entries")
    if not math.isfinite(absolute_scale) or absolute_scale < 0:
        raise ValueError("absolute_scale must be nonnegative and finite")
    denominator = max(float(np.linalg.norm(b.ravel())), absolute_scale)
    if denominator == 0:
        raise ValueError("Zero reference needs a positive absolute_scale")
    return float(np.linalg.norm((a - b).ravel()) / denominator)


def phase_error_degrees(actual, reference, threshold=0.0):
    """Wrapped candidate/reference phase; None at a null or below threshold."""
    a, b = _finite_complex(actual, "actual"), _finite_complex(reference, "reference")
    if not math.isfinite(threshold) or threshold < 0:
        raise ValueError("threshold must be nonnegative and finite")
    if min(abs(a), abs(b)) <= threshold:
        return None
    return math.degrees(cmath.phase(a * b.conjugate()))


def impedance_matrix_metrics(impedance, reference_impedance=1.0):
    """Dimensionless reciprocity/passivity audit for inward, conjugate ports.

    frequency-by-frequency PSD is a necessary passivity check, not a proof of
    global causality or the accuracy of the spatial discretization.
    """
    z = np.asarray(impedance, complex)
    if z.ndim != 2 or z.shape[0] != z.shape[1] or not len(z) or not np.all(np.isfinite(z)):
        raise ValueError("impedance must be a finite nonempty square matrix")
    reference = np.asarray(reference_impedance, float)
    if reference.ndim == 0:
        reference = np.full(len(z), float(reference))
    if reference.shape != (len(z),) or not np.all(np.isfinite(reference)) or np.any(reference <= 0):
        raise ValueError("reference_impedance must be positive, scalar or one per port")
    zn = z / np.sqrt(reference[:, None] * reference[None, :])
    h = (zn + zn.conjugate().T) / 2
    eigenvalues = np.linalg.eigvalsh(h)
    fro_scale = max(1.0, float(np.linalg.norm(zn, "fro")))
    spectral_scale = max(1.0, float(np.linalg.norm(zn, 2)))
    reciprocity = float(np.linalg.norm(zn - zn.T, "fro") / fro_scale)
    lossless_residual = float(np.linalg.norm(h, "fro") / fro_scale)
    return {"reciprocity_relative": reciprocity,
            "hermitian_eigenvalues_normalized": eigenvalues.tolist(),
            "minimum_hermitian_eigenvalue": float(eigenvalues[0]),
            "passivity_tolerance": 1e-8 * spectral_scale,
            "passive_within_tolerance": bool(eigenvalues[0] >= -1e-8 * spectral_scale),
            "reciprocal_within_tolerance": reciprocity <= 1e-7,
            "lossless_relative": lossless_residual,
            "lossless_within_tolerance": lossless_residual <= 1e-7}


def mesh_convergence(mesh_sizes_m, values, reference=None, absolute_scale=0.0,
                     relative_target=0.005):
    """Report >=3 coarse-to-fine complex results, without assuming FEM order.

    observed_order is returned only for equally refined three latest levels
    with nonzero decreasing differences. It is a diagnostic, not certification.
    """
    hs = np.asarray(mesh_sizes_m, float)
    data = [np.asarray(value, complex) for value in values]
    if (hs.ndim != 1 or len(hs) < 3 or len(data) != len(hs)
            or not np.all(np.isfinite(hs)) or np.any(hs <= 0) or np.any(np.diff(hs) >= 0)):
        raise ValueError("Supply >=3 positive decreasing mesh sizes and matching values")
    _positive(relative_target=relative_target)
    fine = data[-1]
    changes = [complex_relative_error(data[i] - data[i - 1], np.zeros_like(fine),
               max(float(np.linalg.norm(fine.ravel())), absolute_scale)) for i in range(1, len(data))]
    ratio0, ratio1 = hs[-3] / hs[-2], hs[-2] / hs[-1]
    order = None
    if math.isclose(ratio0, ratio1, rel_tol=1e-8) and changes[-2] > changes[-1] > 0:
        order = math.log(changes[-2] / changes[-1]) / math.log(ratio1)
    exact_error = None if reference is None else complex_relative_error(fine, reference, absolute_scale)
    return {"successive_relative_changes": changes, "observed_order": order,
            "last_change_within_target": changes[-1] <= relative_target,
            "changes_decrease": all(b < a for a, b in zip(changes, changes[1:])),
            "finest_reference_relative_error": exact_error,
            "warning": "small successive change alone does not validate the model or mesh"}


def run_self_tests():
    """Independent physical identities, limiting cases and deliberate failures."""
    length, area = 0.30, 0.02 * 0.03
    zc, frequencies = RHO * SOUND_SPEED / area, (80, 150, 250, 400)
    checks = 0
    for frequency in frequencies:
        k = 2 * math.pi * frequency / SOUND_SPEED
        t = uniform_duct_transfer(frequency, length, area)
        z = uniform_duct_impedance(frequency, length, area)
        assert np.allclose(np.linalg.det(t), 1, rtol=1e-12, atol=1e-12)
        metrics = impedance_matrix_metrics(z, zc)
        assert metrics["passive_within_tolerance"] and metrics["reciprocal_within_tolerance"]
        assert metrics["lossless_within_tolerance"]
        checks += 2
        for ratio in (1, 0.5 + 0.3j, 2 - 0.4j, 0, None):
            result = impedance_terminated_duct(frequency, length, area,
                     None if ratio is None else zc * ratio, input_flow=1e-5*(1+.2j),
                     positions_m=np.linspace(0, length, 13))
            assert np.allclose(z @ result["port_flows_inward"], result["port_pressures"], rtol=1e-12, atol=1e-12)
            scale = zc * abs(result["flow_in"]) ** 2
            assert abs(result["input_power_rms_w"] - result["load_power_rms_w"]) < 1e-12 * scale
            assert result["load_power_rms_w"] >= -1e-12 * scale
            if ratio == 1:
                travelling = result["flow_in"] * np.exp(-1j * k * result["positions_m"])
                assert np.allclose(result["flow_positive_x"], travelling, rtol=1e-12, atol=1e-15)
                assert np.allclose(result["pressure"], zc * travelling, rtol=1e-12)
                assert abs(result["input_impedance"] / zc - 1) < 1e-12
            checks += 1
    low = uniform_duct_impedance(.01, length, area)
    omega = 2 * math.pi * .01
    compliance = area * length / (RHO * SOUND_SPEED ** 2)
    assert abs(low[0, 0] / (1 / (1j * omega * compliance)) - 1) < 1e-8
    assert abs((low[0, 0] - low[0, 1]) / (1j * omega * RHO * length / (2 * area)) - 1) < 1e-6
    checks += 2
    modes = rectangular_cavity_modes((.2, .2, .2), (1, 1, 1))
    assert modes[0]["frequency_hz"] == 0
    assert sum(math.isclose(mode["frequency_hz"], SOUND_SPEED/.4) for mode in modes) == 3
    checks += 1
    volume, neck_length, neck_area = 1e-3, .04, math.pi*.005**2
    relative_errors = []
    for scale in (1, .25, .0625):
        model = helmholtz_lumped(volume, neck_area*scale, neck_length)
        f = distributed_neck_compliance_resonance(volume, neck_area*scale, neck_length)
        cavity = 1 / (1j * 2 * math.pi * f * model["compliance_m3_pa"])
        zin = impedance_terminated_duct(f, neck_length, neck_area*scale, cavity)["input_impedance"]
        assert abs(zin) / (RHO*SOUND_SPEED/(neck_area*scale)) < 1e-12
        assert abs(helmholtz_series_impedance(model["frequency_hz"], model["compliance_m3_pa"], model["inertance_kg_m4"])) < 1e-6
        relative_errors.append(abs(f / model["frequency_hz"] - 1))
        checks += 1
    assert relative_errors[-1] < relative_errors[0]/10
    h = helmholtz_end_sensitivity(volume, neck_area, neck_length, [0, .005, .01])
    assert all(a["frequency_hz"] > b["frequency_hz"] for a, b in zip(h["cases"], h["cases"][1:]))
    checks += 2
    assert not impedance_matrix_metrics(np.diag([-1, 1]))["passive_within_tolerance"]
    assert not impedance_matrix_metrics([[1, 1j], [0, 1]])["reciprocal_within_tolerance"]
    assert impedance_matrix_metrics([[2, 1], [1, 2]], [2, 10])["passive_within_tolerance"]
    checks += 3
    assert phase_error_degrees(0, 1) is None
    assert math.isclose(phase_error_degrees(cmath.exp(-179j*math.pi/180), cmath.exp(179j*math.pi/180)), 2)
    hs = [.04, .02, .01]
    convergence = mesh_convergence(hs, [np.array([1+1j, 2]) + h*h for h in hs], np.array([1+1j, 2]))
    assert math.isclose(convergence["observed_order"], 2, rel_tol=1e-9)
    checks += 3
    for callback in (lambda: uniform_duct_impedance(SOUND_SPEED/(2*length), length, area),
                     lambda: impedance_terminated_duct(SOUND_SPEED/(4*length), length, area, 0)):
        try:
            callback()
        except ResonanceError:
            pass
        else:
            raise AssertionError("An undamped resonance must not return a clipped result")
        checks += 1
    return {"passed": True, "check_groups": checks, "phasor": "exp(+j omega t)",
            "ports": "pressure / inward volume flow", "dependency": "numpy",
            "helmholtz_lumped_hz": helmholtz_lumped(volume, neck_area, neck_length)["frequency_hz"],
            "helmholtz_distributed_neck_hz": distributed_neck_compliance_resonance(volume, neck_area, neck_length),
            "does_not_validate": "FEM installation, mesh, losses or a physical loudspeaker"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analytic acoustics references and self-tests")
    parser.add_argument("--spec", action="store_true", help="Print the benchmark specification")
    args = parser.parse_args()
    if args.spec:
        print(__doc__)
    else:
        print(json.dumps(run_self_tests(), indent=2, allow_nan=False))
