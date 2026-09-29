"""Plot actual native references and candidate samples; no fabricated reference curves."""
from pathlib import Path
import csv
import os
import json
os.environ.setdefault("MPLCONFIGDIR", str(Path(__file__).resolve().parent / ".matplotlib"))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

folder = Path(__file__).resolve().parent / "results"
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 9, "axes.spines.top": False, "axes.spines.right": False})

def read(name):
    with (folder / name).open() as stream:
        rows = list(csv.DictReader(stream))
    data = {k: np.array([float(r[k]) for r in rows]) for k in rows[0]}
    band = (data["frequency_hz"] >= 20) & (data["frequency_hz"] <= 1000)
    return {key: values[band] for key, values in data.items()}

cases = [("kolbrek-exponential", "Exponential · Hornresp 54.10"), ("kolbrek-conical-exponential", "Conical + exponential · Hornresp 55.30")]
fig, axes = plt.subplots(4, 2, figsize=(12.6, 12), sharex=True, constrained_layout=True)
for col, (identifier, title) in enumerate(cases):
    native = read(identifier + "-native-normalized.csv")
    candidate = read(identifier + "-candidate.csv")
    f = native["frequency_hz"]
    for row, (key, label) in enumerate([("spl_db", "Power-equivalent SPL (dB re 20 µPa)"), ("ze_ohm", "Electrical impedance (Ω)"), ("excursion_peak_mm", "Peak diaphragm excursion (mm)")]):
        ax = axes[row, col]
        ax.semilogx(f, candidate[key], color="#126b80", linewidth=1.65, label="MEH axial network, 128 cells/segment")
        ax.semilogx(f, native[key], color="#bd5b33", linestyle="--", linewidth=1.15, label="Published native Hornresp export")
        ax.set_ylabel(label)
        ax.grid(True, which="both", alpha=.18)
    axes[0, col].set_title(title, fontweight="bold", pad=12)
    axes[0, col].legend(fontsize=7.5, loc="lower right")
    error = candidate["spl_db"] - native["spl_db"]
    axes[3, col].semilogx(f, error, color="#713e8c", linewidth=1.3)
    axes[3, col].axhline(0, color="#59636a", linewidth=.7)
    axes[3, col].set_ylabel("Candidate − native SPL (dB)")
    axes[3, col].set_xlabel("Frequency (Hz), exact native sample frequencies")
    axes[3, col].grid(True, which="both", alpha=.18)
    axes[3, col].set_xlim(20, 1000)
fig.suptitle("Two authentic Hornresp comparisons\n2.83 V RMS · 1 m power equivalent · 2π · explicit Mmd · no parameter fitting", fontsize=15, fontweight="bold")
fig.supxlabel("Published Kolbrek reference data, MIT license. Agreement applies to these idealized cases, not the four-port MEH or measured hardware.", fontsize=9)
for suffix in ("png", "svg"):
    fig.savefig(folder / ("hornresp-reference-comparison." + suffix), dpi=165)
plt.close(fig)

fig, axes = plt.subplots(2, 2, figsize=(12.6, 7.5), sharex=True, constrained_layout=True)
for col, (identifier, title) in enumerate(cases):
    n = read(identifier + "-native-normalized.csv")
    c = read(identifier + "-candidate.csv")
    f = n["frequency_hz"]
    axes[0, col].semilogx(f, c["za_real_normalized"], color="#126b80", label="Candidate resistance")
    axes[0, col].semilogx(f, c["za_imag_normalized"], color="#713e8c", label="Candidate reactance")
    axes[0, col].semilogx(f, n["za_real_normalized"], color="#bd5b33", ls="--", lw=1, label="Native resistance")
    axes[0, col].semilogx(f, n["za_imag_normalized"], color="#d99c30", ls="--", lw=1, label="Native reactance")
    axes[0, col].set_title(title, fontweight="bold")
    axes[0, col].set_ylabel("Throat acoustic impedance / (ρc/S₁)")
    error = (c["phase_deg"] - n["phase_deg"] + 180) % 360 - 180
    axes[1, col].semilogx(f, error, color="#713e8c")
    axes[1, col].set_ylabel("Wrapped raw phase error (degrees)")
    axes[1, col].set_xlabel("Frequency (Hz)")
    axes[0, col].legend(fontsize=7.5)
    for row in range(2):
        axes[row, col].set_xlim(20, 1000)
        axes[row, col].grid(True, which="both", alpha=.18)
fig.suptitle("Acoustic load and phase diagnostics\nPhase = arg(jUmouth); no fitted delay or phase offset", fontsize=14, fontweight="bold")
fig.supxlabel("Raw phase is diagnostic: the published export does not record the application’s Delay-tool state. No phase acceptance claim.", fontsize=9)
for suffix in ("png", "svg"):
    fig.savefig(folder / ("hornresp-load-phase-diagnostics." + suffix), dpi=165)
plt.close(fig)
print("Wrote two PNG/SVG scientific figures in benchmarks/results.")
