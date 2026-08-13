/**
 * Gap #6 — Rounding engine untuk laporan keuangan.
 *
 * Masalah klasik kertas kerja: bila tiap baris dibulatkan ke ribuan/jutaan,
 * total bisa selisih 1 (mis. Σ baris 999.500 → 1.000 vs total asli 1.000.400 → 1.000).
 * Solusi: bulatkan baris akun, lalu HITUNG ULANG semua baris total dari
 * baris yang sudah dibulatkan (bukan membulatkan total asli). Dengan begitu
 * total selalu = Σ baris, dan LABA = TOTAL PENDAPATAN − TOTAL BEBAN konsisten.
 */

export type RoundingMode = "none" | "ribu" | "juta";

export type RoundableLine = { label: string; amount: number; indent?: number; bold?: boolean };

export const ROUNDING_DIVISOR: Record<RoundingMode, number> = {
  none: 1,
  ribu: 1_000,
  juta: 1_000_000,
};

export const ROUNDING_LABELS: { value: RoundingMode; label: string }[] = [
  { value: "none", label: "Rupiah penuh" },
  { value: "ribu", label: "Ribuan (Rp'000)" },
  { value: "juta", label: "Jutaan (Rp'000.000)" },
];

/** Pembulatan ke kelipatan precision (half-up, sesuai praktik akuntan). */
export function roundTo(value: number, precision: number): number {
  if (precision <= 1) return Math.round(value);
  return Math.round(value / precision) * precision;
}

/** Bulatkan nilai ke satuan penyajian (÷ divisor lalu half-up). */
export function roundAmount(value: number, divisor: number): number {
  if (divisor <= 1) return Math.round(value);
  return Math.round(value / divisor);
}

/**
 * Terapkan pembulatan pada laporan: baris akun dibulatkan; baris total dihitung
 * ulang dari baris akun yang sudah dibulatkan agar selalu konsisten.
 */
export function applyRounding(lines: RoundableLine[], mode: RoundingMode): RoundableLine[] {
  const div = ROUNDING_DIVISOR[mode];
  if (mode === "none") return lines.map((l) => ({ ...l, amount: Math.round(l.amount) }));

  const out: RoundableLine[] = [];
  let segmenAcc = 0; // Σ akun rounded pada segmen aktif
  let pendingSaldoAwalIdx = -1; // baris "SALDO AWAL EKUITAS" menunggu akun setelahnya
  let pendapatanTotal = 0;
  let bebanTotal = 0;
  let liabilitasTotal = 0;
  let ekuitasTotal = 0;
  let labaPeriode = 0; // laba rounded (LR / neraca priorLaba)

  const push = (label: string, amount: number, indent = 0, bold = false) => {
    out.push({ label, amount, indent, bold });
  };

  for (const line of lines) {
    const label = line.label.trim();
    const isSectionHeader = line.indent === 0 && !isTotalLabel(label);

    // Tutup segmen berjalan saat baris total/section berikutnya tiba.
    if (pendingSaldoAwalIdx >= 0 && line.indent === 0) {
      out[pendingSaldoAwalIdx]!.amount = segmenAcc;
      pendingSaldoAwalIdx = -1;
      segmenAcc = 0;
    }

    if (isSectionHeader) {
      // Segmen baru: reset akumulator.
      segmenAcc = 0;
      push(label, 0, 0, !!line.bold);
      continue;
    }

    if (line.indent !== undefined && line.indent >= 1) {
      const r = roundAmount(line.amount, div);
      segmenAcc += r;
      push(line.label, r, line.indent, !!line.bold);
      continue;
    }

    // Baris total (indent 0, bukan section header).
    const key = totalKey(label);
    switch (key) {
      case "TOTAL_PENDAPATAN":
        pendapatanTotal = segmenAcc;
        push(label, pendapatanTotal, 0, true);
        break;
      case "TOTAL_BEBAN":
        bebanTotal = segmenAcc;
        push(label, bebanTotal, 0, true);
        break;
      case "LABA_RUGI": {
        const computed = pendapatanTotal - bebanTotal;
        // LR: dihitung dari total rounded; EQ: nilai tunggal (fallback ke rounded asli).
        labaPeriode = pendapatanTotal === 0 && bebanTotal === 0 ? roundAmount(line.amount, div) : computed;
        push(label, labaPeriode, 0, true);
        break;
      }
      case "TOTAL_ASET":
        push(label, segmenAcc, 0, true);
        break;
      case "TOTAL_LIABILITAS":
        liabilitasTotal = segmenAcc;
        push(label, liabilitasTotal, 0, true);
        break;
      case "TOTAL_EKUITAS":
        ekuitasTotal = segmenAcc + labaPeriode; // ekuitas neraca termasuk laba periode
        push(label, ekuitasTotal, 0, true);
        break;
      case "TOTAL_LIAB_EKUITAS":
        push(label, liabilitasTotal + ekuitasTotal, 0, true);
        break;
      case "SALDO_AWAL_EKUITAS":
        // Nilai = Σ akun SETELAH baris ini; diisi saat segmen ditutup.
        pendingSaldoAwalIdx = out.length;
        push(label, 0, 0, false);
        break;
      case "SETORAN_MODAL":
      case "PRIVE_DIVIDEN":
        push(label, roundAmount(line.amount, div), 0, false);
        break;
      case "SALDO_AKHIR_EKUITAS": {
        // Awal + Setoran + Laba − Prive (semua rounded, dari baris sebelumnya)
        const awal = valueOf(out, "SALDO AWAL EKUITAS");
        const setoran = valueOf(out, "SETORAN MODAL");
        const prive = valueOf(out, "PRIVE / DIVIDEN");
        const laba = valueOf(out, "LABA (RUGI) PERIODE BERJALAN");
        push(label, awal + setoran + laba - prive, 0, true);
        break;
      }
      case "ARUS_KAS_BERSIH":
      case "KENAIKAN_KAS":
        push(label, segmenAcc, 0, true);
        break;
      case "SALDO_KAS_AKHIR": {
        // Saldo kas akhir = penerimaan − pengeluaran (rounded) bila tanpa data awal
        const masuk = valueOf(out, "Penerimaan kas");
        const keluar = valueOf(out, "Pengeluaran kas");
        push(label, masuk - keluar, 0, true);
        break;
      }
      default:
        // Fallback: total = Σ akun segmen (untuk baris lain yang belum dikenali)
        push(label, segmenAcc, 0, !!line.bold);
    }
    segmenAcc = 0;
  }

  // Tutup segmen saldo awal bila belum tertutup (tidak ada baris setelahnya).
  if (pendingSaldoAwalIdx >= 0) {
    out[pendingSaldoAwalIdx]!.amount = segmenAcc;
  }

  return out;
}

function isTotalLabel(label: string): boolean {
  return totalKey(label) !== "OTHER";
}

function totalKey(label: string): string {
  const l = label.toUpperCase();
  if (l.includes("TOTAL PENDAPATAN")) return "TOTAL_PENDAPATAN";
  if (l.includes("TOTAL BEBAN")) return "TOTAL_BEBAN";
  if (l.includes("LABA (RUGI) PERIODE BERJALAN")) return "LABA_RUGI";
  if (l.includes("TOTAL ASET")) return "TOTAL_ASET";
  if (l.includes("TOTAL LIABILITAS & EKUITAS")) return "TOTAL_LIAB_EKUITAS";
  if (l.includes("TOTAL LIABILITAS")) return "TOTAL_LIABILITAS";
  if (l.includes("TOTAL EKUITAS")) return "TOTAL_EKUITAS";
  if (l.includes("SALDO AWAL EKUITAS")) return "SALDO_AWAL_EKUITAS";
  if (l.includes("SETORAN MODAL")) return "SETORAN_MODAL";
  if (l.includes("PRIVE / DIVIDEN")) return "PRIVE_DIVIDEN";
  if (l.includes("SALDO AKHIR EKUITAS")) return "SALDO_AKHIR_EKUITAS";
  if (l.includes("ARUS KAS BERSIH")) return "ARUS_KAS_BERSIH";
  if (l.includes("KENAIKAN (PENURUNAN) KAS")) return "KENAIKAN_KAS";
  if (l.includes("SALDO KAS AKHIR")) return "SALDO_KAS_AKHIR";
  return "OTHER";
}

function valueOf(lines: RoundableLine[], label: string): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i]!.label.includes(label)) return lines[i]!.amount;
  }
  return 0;
}
