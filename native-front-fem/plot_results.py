"""Plot stored FEM results; never solve, interpolate across solids, or infer SPL.

Run with the task-local Python. Missing field/qualified data are reported and
skipped so the benchmark figure can be made before the longer solves finish.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORKSPACE = HERE.parent.parent
os.environ.setdefault("MPLCONFIGDIR", str(HERE / "cache" / "matplotlib"))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection
from matplotlib.colors import Normalize, TwoSlopeNorm
from matplotlib.ticker import FixedLocator, FuncFormatter, NullFormatter
import numpy as np


plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 11, "figure.facecolor": "white",
    "axes.facecolor": "white", "axes.edgecolor": "#53606e", "axes.labelcolor": "#263340",
    "text.color": "#192938", "xtick.color": "#53606e", "ytick.color": "#53606e",
    "axes.spines.top": False, "axes.spines.right": False,
    "savefig.facecolor": "white", "savefig.dpi": 200,
})


def read_json(path):
    return json.loads(Path(path).read_text())


def finish(fig, target):
    target = Path(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(target, bbox_inches="tight", pad_inches=.20)
    plt.close(fig)
    print(json.dumps({"plot": str(target), "status": "written"}))


def plot_benchmarks(path, target):
    data = read_json(path)
    rows = data["results"]
    duct = [r for r in rows if r["type"] == "uniform_duct"]
    cavity = [r for r in rows if r["type"] == "closed_cavity"]
    if not duct or not cavity:
        raise ValueError("Benchmark data must contain duct and closed-cavity results.")
    fig, axes = plt.subplots(1, 2, figsize=(12, 5.3))
    fig.subplots_adjust(top=.76, bottom=.27, left=.08, right=.97, wspace=.30)
    fig.suptitle("FEM checks against analytic solutions", x=.08, ha="left",
                 y=.97, fontsize=19, fontweight="bold")
    fig.text(.08, .87, "Uniform duct and rigid rectangular cavity · errors decrease as the mesh is refined",
             fontsize=11, color="#53606e")
    for degree, color, marker in [(1, "#126c9c", "o"), (2, "#d67621", "D")]:
        group = sorted((r for r in duct if r["degree"] == degree), key=lambda r: r["dofs"])
        if group:
            axes[0].loglog([r["dofs"] for r in group],
                           [100 * max(r["matrix_complex_errors"]) for r in group],
                           color=color, marker=marker, lw=2, markersize=6,
                           label=f"Degree {degree}")
    cavity.sort(key=lambda r: r["dofs"])
    axes[1].loglog([r["dofs"] for r in cavity],
                   [100 * max(r["frequency_errors"]) for r in cavity],
                   color="#126c9c", marker="o", lw=2, markersize=6, label="Degree 2")
    for ax, limit, title, ylabel in zip(axes, [1., .5],
            ["Duct impedance matrix", "First six cavity resonances"],
            ["Maximum complex relative error (%)", "Maximum frequency error (%)"]):
        ax.axhline(limit, color="#84919e", ls="--", lw=1.1, label=f"Target: {limit:g}%")
        ax.set_title(title, loc="left", fontweight="bold", pad=14)
        ax.set_xlabel("Pressure degrees of freedom")
        ax.set_ylabel(ylabel)
        ax.grid(True, which="major", color="#e5e9ed", lw=.8)
        ax.grid(True, which="minor", color="#f0f3f5", lw=.5)
        ax.legend(frameon=False, fontsize=9, loc="best")
    for ax, group in zip(axes, [duct, cavity]):
        ax.xaxis.set_major_locator(FixedLocator(sorted({r["dofs"] for r in group})))
        ax.xaxis.set_major_formatter(FuncFormatter(lambda value, pos: f"{value:,.0f}"))
        ax.xaxis.set_minor_formatter(NullFormatter())
    frequencies = data.get("frequency_hz", [])
    note = (f"Duct: maximum over {len(frequencies)} test frequencies, {min(frequencies):g}–{max(frequencies):g} Hz. "
            "Cavity: maximum over six nonzero modes.\n"
            f"Recorded benchmark status: {data.get('status', 'not supplied')}. "
            "These checks validate the numerical method on simple geometries, not the loudspeaker design.")
    fig.text(.08, .07, note, fontsize=9, linespacing=1.7, color="#53606e")
    finish(fig, target)


def surface_sections(data):
    """Actual triangle intersections with the sampled plane, grouped by tag.

    Return no overlay when provenance cannot be verified. The field mask itself
    always comes from mesh cell containment in the stored slice.
    """
    source = data.get("mesh", {}).get("source")
    if not source:
        return {}
    expected = data.get("airSurfaceSha256")
    if not expected:
        return {}
    source_path = Path(source)
    candidates = [source_path if source_path.is_absolute() else HERE / source_path,
                  HERE / "geometry" / source_path.name]
    if not source_path.is_absolute():
        candidates.append(WORKSPACE / source_path)  # Original task-directory exports.
    raw = None
    for path in dict.fromkeys(candidates):
        if path.is_file():
            candidate = path.read_bytes()
            if hashlib.sha256(candidate).hexdigest() == expected:
                raw = candidate
                break
    if raw is None:
        return {}
    surface = json.loads(raw)
    vertices = np.asarray(surface["vertices_m"], dtype=float)
    result = {}
    # The solver samples at y=1e-10 m to avoid exact mesh-edge ambiguity.
    plane_y = 1e-10
    for face, tag in zip(surface["faces"], surface["face_tags"]):
        triangle = vertices[face]
        distances = triangle[:, 1] - plane_y
        if np.all(distances > 0) or np.all(distances < 0):
            continue
        hits = []
        for i, j in [(0, 1), (1, 2), (2, 0)]:
            di, dj = distances[i], distances[j]
            if di * dj < 0:
                point = triangle[i] + di / (di - dj) * (triangle[j] - triangle[i])
                hits.append(point[[0, 2]] * 1000)
            elif di == 0:
                hits.append(triangle[i, [0, 2]] * 1000)
        if len(hits) >= 2 and np.linalg.norm(hits[0] - hits[1]) > 1e-10:
            result.setdefault(int(tag), []).append([hits[0], hits[1]])
    return result


def pressure_grid(slice_data):
    x, z = np.asarray(slice_data["xM"]) * 1000, np.asarray(slice_data["zM"]) * 1000
    indices = np.asarray(slice_data["validFlatIndices"], dtype=int)
    values = np.asarray(slice_data["pressureRealPa"]) + 1j * np.asarray(slice_data["pressureImagPa"])
    if values.size != indices.size or np.any(indices < 0) or np.any(indices >= x.size * z.size):
        raise ValueError("Slice values and valid cell-containment indices do not match.")
    if len(np.unique(indices)) != len(indices) or not np.isfinite(values).all():
        raise ValueError("Slice data contain duplicate indices or nonfinite pressure.")
    grid = np.full(x.size * z.size, np.nan + 1j * np.nan, dtype=complex)
    grid[indices] = values
    return x, z, grid.reshape(z.size, x.size)


def plot_pressure(sample_path, target):
    data = read_json(sample_path)
    slice_path = Path(str(sample_path) + ".slice.json")
    if data.get("pressureSliceFile"):
        slice_path = Path(sample_path).parent / data["pressureSliceFile"]
    sl = read_json(slice_path)
    frequency = float(sl["frequencyHz"])
    if not np.isclose(frequency, 700., rtol=0, atol=1e-8):
        raise ValueError("The named 700 Hz figure requires an actual 700 Hz solution.")
    x, z, pressure = pressure_grid(sl)
    field = [np.ma.masked_invalid(pressure.real), np.ma.masked_invalid(np.abs(pressure))]
    scale_real = max(float(np.nanmax(np.abs(pressure.real))), 1e-12)
    scale_mag = max(float(np.nanmax(np.abs(pressure))), 1e-12)
    norms = [TwoSlopeNorm(vmin=-scale_real, vcenter=0, vmax=scale_real), Normalize(0, scale_mag)]
    cmaps = [plt.get_cmap("RdBu_r").copy(), plt.get_cmap("viridis").copy()]
    for cmap in cmaps:
        cmap.set_bad("white", alpha=0)
    fig, axes = plt.subplots(1, 2, figsize=(13.4, 6.3))
    fig.subplots_adjust(top=.74, bottom=.25, left=.06, right=.97, wspace=.18)
    fig.suptitle("Lossless assumed-cone field", x=.06, ha="left", y=.97,
                 fontsize=21, fontweight="bold")
    q = float(sl["coneFlowRmsM3S"])
    load = float(sl["loadResistancePaSM3"])
    fig.text(.06, .885,
             f"700 Hz · cone flow {q:.1e} m³/s RMS · reference outlet resistance {load:,.0f} Pa·s/m³",
             fontsize=11)
    fig.text(.06, .839, "Local centre section (v = 0) · white regions lie outside the sampled air volume",
             fontsize=10, color="#53606e")
    sections = surface_sections(data)
    palette = {1: "#617383", 2: "#0e6b79", 3: "#db7025"}
    for ax, values, norm, cmap, title, label in zip(axes, field, norms, cmaps,
            ["Real pressure component", "Pressure magnitude"], ["Re(p), Pa", "|p|, Pa RMS"]):
        artist = ax.pcolormesh(x, z, values, cmap=cmap, norm=norm, shading="nearest", rasterized=True)
        for tag, segments in sections.items():
            ax.add_collection(LineCollection(segments, colors=palette.get(tag, "#617383"),
                                             linewidths=1.05 if tag == 1 else 1.8))
        ax.set_aspect("equal")
        ax.set_xlim(x.min(), x.max())
        ax.set_ylim(z.min(), z.max())
        ax.set_xlabel("u (mm)")
        ax.set_ylabel("z (mm)")
        ax.set_title(title, loc="left", fontsize=13, fontweight="bold", pad=12)
        colorbar = fig.colorbar(artist, ax=ax, orientation="horizontal", shrink=.88, pad=.27, aspect=35)
        colorbar.set_label(label, fontsize=10)
        colorbar.ax.tick_params(labelsize=9)
    # Labels only use verified surface tags. No invented cone/insert outlines.
    if sections.get(2):
        points = np.asarray(sections[2]).reshape(-1, 2)
        cone_tip = points[np.argmax(points[:, 1])]
        axes[0].annotate("Assumed cone", xy=cone_tip, xytext=(33, 16),
                         textcoords="data", color=palette[2], fontsize=9,
                         arrowprops={"arrowstyle": "-", "color": palette[2], "lw": .8})
    if sections.get(3):
        points = np.asarray(sections[3]).reshape(-1, 2)
        outlet = points[np.argmin(np.abs(points[:, 0]))]
        axes[1].annotate("Reference outlet", xy=outlet, xytext=(30, -23),
                         textcoords="data", color=palette[3], fontsize=9,
                         arrowprops={"arrowstyle": "-", "color": palette[3], "lw": .8})
    state = data.get("inputState", {})
    clearance = state.get("fillerClearance")
    caption = (f"Insert: {state.get('frontFiller', data.get('case', 'unspecified'))}"
               + (f"; entered clearance {clearance:g} mm" if isinstance(clearance, (int, float)) else "")
               + f". Mesh: {data.get('fem', {}).get('dofs', 0):,} pressure DOFs. ")
    qualification = data
    qualification_file = Path(sample_path).parent / "inserted-qualified.json"
    if qualification_file.exists():
        candidate = read_json(qualification_file)
        if all(candidate.get(key) == data.get(key) and data.get(key)
               for key in ["airSurfaceSha256", "meshSha256"]):
            qualification = candidate
    frequency_rows = [row for row in qualification.get("rows", [])
                      if np.isclose(row.get("frequencyHz", np.nan), frequency, rtol=0, atol=1e-8)]
    port_qualified = len(frequency_rows) == 1 and row_is_qualified(frequency_rows[0])
    status = ("700 Hz port response passes mesh-change checks." if port_qualified else
              "700 Hz port response is not qualified.")
    fig.text(.06, .16, caption, fontsize=9, color="#53606e")
    fig.text(.06, .12, status + " Field convergence not assessed.", fontsize=9, color="#53606e")
    fig.text(.06, .047,
             "RMS phasors, exp(+jωt). Unmeasured cone; rigid walls; no viscothermal gap loss.\n"
             "Local pressure under a declared reference load. No driver motor, full horn, crossover, or far-field SPL is included.",
             fontsize=9, color="#53606e", linespacing=1.6)
    finish(fig, target)


def as_complex(value):
    return complex(value["r"], value["i"])


def row_is_qualified(row):
    """Dataset availability only means some row passed; require this row."""
    return row.get("available") is True and row.get("qualification", {}).get("qualified") is True


def plot_inserted_diagnostics(path, target):
    """Stored, qualified port samples under the declared reference resistance."""
    data = read_json(path)
    rows = sorted((row for row in data.get("rows", []) if row_is_qualified(row)),
                  key=lambda row: row["frequencyHz"])
    if not rows:
        print(json.dumps({"inserted_diagnostics": "skipped", "reason": "No qualified frequencies."}))
        return
    frequency = np.array([row["frequencyHz"] for row in rows])
    transfer = np.array([as_complex(row["referenceLoad"]["outflowOverConeFlow"]) for row in rows])
    impedance = np.array([as_complex(row["referenceLoad"]["inputImpedance"]) for row in rows])
    load = np.array([row["referenceLoad"]["resistancePaSM3"] for row in rows])
    if not np.isfinite(transfer).all() or not np.isfinite(impedance).all() or not np.isfinite(load).all():
        raise ValueError("Qualified diagnostics contain nonfinite data.")
    if not np.allclose(load, load[0], rtol=1e-12):
        raise ValueError("Diagnostic figure requires the stated fixed reference resistance.")
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    fig.subplots_adjust(top=.81, bottom=.20, left=.09, right=.97, hspace=.52, wspace=.28)
    fig.suptitle("Inserted front chamber: computed samples", x=.09, ha="left", y=.97,
                 fontsize=19, fontweight="bold")
    fig.text(.09, .902, f"{len(rows)} qualified frequencies · lossless assumed-cone model · local port response",
             color="#53606e")
    series = [abs(transfer), np.angle(transfer, deg=True), impedance.real / 1e6, impedance.imag / 1e6]
    titles = ["Outlet flow / cone flow", "Outlet flow phase", "Input resistance", "Input reactance"]
    labels = ["Magnitude ratio", "Phase (degrees, wrapped)", "Re(Zin), MPa·s/m³", "Im(Zin), MPa·s/m³"]
    for ax, values, title, label in zip(axes.flat, series, titles, labels):
        ax.plot(frequency, values, marker="o", markersize=7, linestyle="none", color="#146a92")
        ax.set_title(title, loc="left", fontsize=12, fontweight="bold")
        ax.set_xlabel("Frequency (Hz)")
        ax.set_ylabel(label)
        if len(frequency) <= 8:
            ax.set_xticks(frequency)
        ax.grid(True, color="#e5e9ed", lw=.8)
    fig.text(.09, .065,
             f"Reference outlet resistance: {load[0]:,.0f} Pa·s/m³; this is not the actual horn load.\n"
             "Markers show computed, qualified frequencies; no response between samples is inferred.\n"
             "No measured cone, viscothermal losses, driver motor, full horn, crossover, or far-field SPL is included.",
             fontsize=9, color="#53606e", linespacing=1.7)
    finish(fig, target)


def plot_qualified_comparison(inserted_path, open_path, target):
    datasets = [read_json(open_path), read_json(inserted_path)]
    qualified_rows = [{row["frequencyHz"]: row for row in data.get("rows", []) if row_is_qualified(row)}
                      for data in datasets]
    shared_frequencies = sorted(set(qualified_rows[0]) & set(qualified_rows[1]))
    if not shared_frequencies:
        print(json.dumps({"comparison": "skipped", "reason": "No frequencies qualified in both cases."}))
        return
    if datasets[0].get("geometrySourceSha256") != datasets[1].get("geometrySourceSha256"):
        raise ValueError("Qualified comparison has differing geometry implementation provenance.")
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    fig.subplots_adjust(top=.82, bottom=.23, left=.09, right=.97, hspace=.48, wspace=.28)
    fig.suptitle("Insert effect under a reference outlet load", x=.09, ha="left", y=.97,
                 fontsize=19, fontweight="bold")
    fig.text(.09, .902, "Lossless assumed-cone model · unit cone flow · shared qualified samples only", color="#53606e")
    loads = []
    for available_rows, color, marker, label in zip(qualified_rows, ["#84919e", "#146a92"],
            ["o", "D"], ["Open front chamber", "With insert"]):
        rows = [available_rows[frequency] for frequency in shared_frequencies]
        frequencies = np.array([r["frequencyHz"] for r in rows])
        transfer = np.array([as_complex(r["referenceLoad"]["outflowOverConeFlow"]) for r in rows])
        zin = np.array([as_complex(r["referenceLoad"]["inputImpedance"]) for r in rows])
        if not np.isfinite(transfer).all() or not np.isfinite(zin).all():
            raise ValueError("Qualified curves contain nonfinite data.")
        load = np.array([r["referenceLoad"]["resistancePaSM3"] for r in rows])
        if not np.allclose(load, load[0], rtol=1e-12):
            raise ValueError("Comparison figure requires the declared fixed resistance per case.")
        loads.append(load[0])
        series = [abs(transfer), np.angle(transfer, deg=True), zin.real / 1e6, zin.imag / 1e6]
        for ax, values in zip(axes.flat, series):
            # Five samples do not establish a response between frequencies.
            # Keep all qualified exports discrete, even if later runs add rows.
            ax.plot(frequencies, values, color=color, marker=marker, markersize=6,
                    linestyle="none", label=label)
    titles = ["Outlet flow / cone flow", "Outlet flow phase", "Input resistance", "Input reactance"]
    ylabels = ["Magnitude ratio", "Phase (degrees, wrapped)", "Re(Zin), MPa·s/m³", "Im(Zin), MPa·s/m³"]
    for ax, title, ylabel in zip(axes.flat, titles, ylabels):
        ax.set_title(title, loc="left", fontsize=12, fontweight="bold")
        ax.set_xlabel("Frequency (Hz)")
        ax.set_ylabel(ylabel)
        ax.grid(True, color="#e5e9ed", lw=.8)
    axes[0, 0].legend(frameon=False, fontsize=9)
    same_load = np.isclose(loads[0], loads[1], rtol=1e-8)
    load_note = (f"Both cases use R = {loads[0]:,.0f} Pa·s/m³." if same_load else
                 f"Reference resistances differ: open {loads[0]:,.0f}; inserted {loads[1]:,.0f} Pa·s/m³.")
    fig.text(.09, .057, load_note + "\nMarkers show computed, qualified frequencies; no response between samples is inferred.\n"
             "No measured cone, viscothermal losses, motor, full horn, crossover, or far-field SPL.",
             fontsize=9, color="#53606e", linespacing=1.7)
    finish(fig, target)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--results-dir", type=Path, default=HERE / "results")
    parser.add_argument("--outputs-dir", type=Path, default=WORKSPACE / "outputs")
    parser.add_argument("--sample", default="inserted-1_4mm-sample.json")
    parser.add_argument("--benchmarks-only", action="store_true")
    args = parser.parse_args()
    benchmark = args.results_dir / "benchmarks.json"
    if benchmark.exists():
        plot_benchmarks(benchmark, args.outputs_dir / "MEH_Insert_FEM_Benchmarks.png")
    if args.benchmarks_only:
        return
    sample = args.results_dir / args.sample
    if sample.exists():
        plot_pressure(sample, args.outputs_dir / "MEH_Insert_FEM_Pressure_700Hz.png")
    else:
        print(json.dumps({"field": "skipped", "reason": f"Waiting for {sample.name}"}))
    inserted, opened = args.results_dir / "inserted-qualified.json", args.results_dir / "open-qualified.json"
    if inserted.exists():
        plot_inserted_diagnostics(inserted, args.outputs_dir / "MEH_Insert_FEM_Diagnostics.png")
    if inserted.exists() and opened.exists():
        plot_qualified_comparison(inserted, opened, args.outputs_dir / "MEH_Insert_FEM_Comparison.png")


if __name__ == "__main__":
    main()
