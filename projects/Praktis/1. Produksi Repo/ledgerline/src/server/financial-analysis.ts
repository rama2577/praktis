/**
 * Analisa Laporan Keuangan — rasio (likuiditas, solvabilitas, profitabilitas,
 * aktivitas), data grafik, dan narasi otomatis (rule-based, tanpa LLM eksternal).
 */

import type { TrialBalanceRow } from "./trial-balance";

export type Ratio = {
  key: string;
  label: string;
  value: number | null;
  formula: string;
  benchmark: string;
  verdict: "BAIK" | "WASPADA" | "KURANG" | "N/A";
  note: string;
};

export type ChartSeries = {
  label: string;
  value: number;
  color: string;
};

export type Analysis = {
  clientName: string;
  period: string;
  ratios: Ratio[];
  charts: {
    komposisiAset: ChartSeries[];
    pendapatanVsBeban: { pendapatan: number; beban: number };
    kontribusiPendapatan: ChartSeries[];
    kontribusiBeban: ChartSeries[];
  };
  narrative: string[];
};

const fmt = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 0 });

function pct(n: number | null): string {
  if (n === null || !isFinite(n)) return "N/A";
  return `${(n * 100).toFixed(1)}%`;
}

/** Bangun analisa dari trial balance satu periode. */
export function buildAnalysis(rows: TrialBalanceRow[], clientName: string, period: string): Analysis {
  const aset = rows.filter((r) => r.classification === "ASET");
  const liabilitas = rows.filter((r) => r.classification === "LIABILITAS");
  const ekuitas = rows.filter((r) => r.classification === "EKUITAS");
  const pendapatanRows = rows.filter((r) => r.classification === "PENDAPATAN");
  const bebanRows = rows.filter((r) => r.classification === "BEBAN");

  const sumBal = (rs: TrialBalanceRow[]) => rs.reduce((s, r) => s + r.balance, 0);
  const sumDebit = (rs: TrialBalanceRow[]) => rs.reduce((s, r) => s + r.debit, 0);
  const sumCredit = (rs: TrialBalanceRow[]) => rs.reduce((s, r) => s + r.credit, 0);

  const totalAset = sumBal(aset);
  const totalLiabilitas = sumBal(liabilitas);
  const totalEkuitas = sumBal(ekuitas);
  const totalPendapatan = sumBal(pendapatanRows);
  const totalBeban = sumBal(bebanRows);
  const laba = totalPendapatan - totalBeban;

  // Aset lancar: kas & setara, piutang, persediaan; liabilitas jangka pendek: 2-1xxx
  const asetLancar = aset
    .filter((r) => /1-1\d{3}|1-12\d{2}|1-13\d{2}|1-14\d{2}/.test(r.accountCode))
    .reduce((s, r) => s + r.balance, 0);
  const persediaan = aset.filter((r) => r.accountCode.startsWith("1-13")).reduce((s, r) => s + r.balance, 0);
  const piutang = aset.filter((r) => r.accountCode.startsWith("1-12")).reduce((s, r) => s + r.balance, 0);
  const liabilitasJangkaPendek = liabilitas
    .filter((r) => r.accountCode.startsWith("2-1"))
    .reduce((s, r) => s + r.balance, 0);

  const hppRows = bebanRows.filter(
    (r) => r.accountName.toLowerCase().includes("hpp") || r.accountName.toLowerCase().includes("pokok penjualan"),
  );
  const hpp = sumBal(hppRows);
  const labaKotor = totalPendapatan - hpp;

  const cash = aset.filter((r) => r.accountCode.startsWith("1-1000") || r.accountCode.startsWith("1-1100")).reduce((s, r) => s + r.balance, 0);
  const totalKasMasuk = sumDebit(aset.filter((r) => r.accountCode.startsWith("1-1000") || r.accountCode.startsWith("1-1100")));
  const totalKasKeluar = sumCredit(aset.filter((r) => r.accountCode.startsWith("1-1000") || r.accountCode.startsWith("1-1100")));

  const div = (a: number, b: number): number | null => (b === 0 ? null : a / b);
  const currentRatio = div(asetLancar, liabilitasJangkaPendek);
  const quickRatio = div(asetLancar - persediaan, liabilitasJangkaPendek);
  const cashRatio = div(cash, liabilitasJangkaPendek);
  const debtToAsset = div(totalLiabilitas, totalAset);
  const debtToEquity = div(totalLiabilitas, totalEkuitas);
  const npm = div(laba, totalPendapatan);
  const gpm = div(labaKotor, totalPendapatan);
  const roa = div(laba, totalAset);
  const roe = div(laba, totalEkuitas);
  const perputaranPiutang = div(totalPendapatan, piutang);
  const perputaranPersediaan = div(hpp, persediaan);
  const perputaranAset = div(totalPendapatan, totalAset);

  const ratios: Ratio[] = [
    {
      key: "current-ratio",
      label: "Rasio Lancar",
      value: currentRatio,
      formula: "Aset Lancar ÷ Liabilitas Jangka Pendek",
      benchmark: "≥ 1,5",
      verdict: currentRatio === null ? "N/A" : currentRatio >= 1.5 ? "BAIK" : currentRatio >= 1 ? "WASPADA" : "KURANG",
      note: currentRatio === null ? "Tidak ada liabilitas jangka pendek." : `Aset lancar ${fmt(asetLancar)} vs liabilitas jangka pendek ${fmt(liabilitasJangkaPendek)}.`,
    },
    {
      key: "quick-ratio",
      label: "Rasio Cepat (Acid Test)",
      value: quickRatio,
      formula: "(Aset Lancar − Persediaan) ÷ Liabilitas Jangka Pendek",
      benchmark: "≥ 1,0",
      verdict: quickRatio === null ? "N/A" : quickRatio >= 1 ? "BAIK" : quickRatio >= 0.7 ? "WASPADA" : "KURANG",
      note: quickRatio === null ? "—" : `Tanpa persediaan ${fmt(persediaan)}.`,
    },
    {
      key: "cash-ratio",
      label: "Rasio Kas",
      value: cashRatio,
      formula: "Kas & Setara ÷ Liabilitas Jangka Pendek",
      benchmark: "0,2 – 0,5",
      verdict: cashRatio === null ? "N/A" : cashRatio >= 0.2 ? "BAIK" : "WASPADA",
      note: `Kas & setara ${fmt(cash)}.`,
    },
    {
      key: "debt-to-asset",
      label: "Debt to Asset Ratio",
      value: debtToAsset,
      formula: "Total Liabilitas ÷ Total Aset",
      benchmark: "< 60%",
      verdict: debtToAsset === null ? "N/A" : debtToAsset < 0.6 ? "BAIK" : "WASPADA",
      note: `Liabilitas ${fmt(totalLiabilitas)} dari total aset ${fmt(totalAset)}.`,
    },
    {
      key: "debt-to-equity",
      label: "Debt to Equity Ratio",
      value: debtToEquity,
      formula: "Total Liabilitas ÷ Total Ekuitas",
      benchmark: "< 100%",
      verdict: debtToEquity === null ? "N/A" : debtToEquity < 1 ? "BAIK" : "WASPADA",
      note: debtToEquity === null ? "Ekuitas nol." : `Setiap Rp1 ekuitas didanai ${(debtToEquity * 100).toFixed(0)}% liabilitas.`,
    },
    {
      key: "gpm",
      label: "Gross Profit Margin",
      value: gpm,
      formula: "Laba Kotor ÷ Pendapatan",
      benchmark: "bervariasi per industri",
      verdict: gpm === null ? "N/A" : gpm >= 0.3 ? "BAIK" : gpm >= 0.15 ? "WASPADA" : "KURANG",
      note: hpp > 0 ? `HPP ${fmt(hpp)} → laba kotor ${fmt(labaKotor)}.` : "Akun HPP tidak ditemukan; margin dihitung tanpa HPP.",
    },
    {
      key: "npm",
      label: "Net Profit Margin",
      value: npm,
      formula: "Laba Bersih ÷ Pendapatan",
      benchmark: "≥ 10%",
      verdict: npm === null ? "N/A" : npm >= 0.1 ? "BAIK" : npm >= 0.03 ? "WASPADA" : "KURANG",
      note: `Laba bersih ${fmt(laba)} dari pendapatan ${fmt(totalPendapatan)}.`,
    },
    {
      key: "roa",
      label: "Return on Assets",
      value: roa,
      formula: "Laba Bersih ÷ Total Aset",
      benchmark: "≥ 5%",
      verdict: roa === null ? "N/A" : roa >= 0.05 ? "BAIK" : "WASPADA",
      note: `Efisiensi aset ${fmt(totalAset)} menghasilkan laba ${fmt(laba)}.`,
    },
    {
      key: "roe",
      label: "Return on Equity",
      value: roe,
      formula: "Laba Bersih ÷ Total Ekuitas",
      benchmark: "≥ 10%",
      verdict: roe === null ? "N/A" : roe >= 0.1 ? "BAIK" : "WASPADA",
      note: roe === null ? "Ekuitas nol." : `Imbal hasil bagi pemilik ${fmt(totalEkuitas)} ekuitas.`,
    },
    {
      key: "perputaran-piutang",
      label: "Perputaran Piutang",
      value: perputaranPiutang,
      formula: "Pendapatan ÷ Piutang Usaha",
      benchmark: "semakin tinggi semakin baik",
      verdict: perputaranPiutang === null ? "N/A" : perputaranPiutang >= 4 ? "BAIK" : "WASPADA",
      note: perputaranPiutang === null ? "Tidak ada piutang." : `Piutang ${fmt(piutang)} berputar ${perputaranPiutang.toFixed(1)}× per periode.`,
    },
    {
      key: "perputaran-persediaan",
      label: "Perputaran Persediaan",
      value: perputaranPersediaan,
      formula: "HPP ÷ Persediaan",
      benchmark: "semakin tinggi semakin baik",
      verdict: perputaranPersediaan === null ? "N/A" : perputaranPersediaan >= 2 ? "BAIK" : "WASPADA",
      note: perputaranPersediaan === null ? "Tidak ada persediaan/HPP." : `Persediaan ${fmt(persediaan)} berputar ${perputaranPersediaan.toFixed(1)}×.`,
    },
    {
      key: "perputaran-aset",
      label: "Perputaran Total Aset",
      value: perputaranAset,
      formula: "Pendapatan ÷ Total Aset",
      benchmark: "≥ 0,5",
      verdict: perputaranAset === null ? "N/A" : perputaranAset >= 0.5 ? "BAIK" : "WASPADA",
      note: `Setiap Rp1 aset menghasilkan ${perputaranAset === null ? "0" : (perputaranAset * 1).toFixed(2)} pendapatan.`,
    },
  ];

  const topAset = [...aset].sort((a, b) => b.balance - a.balance).slice(0, 5);
  const topPendapatan = [...pendapatanRows].sort((a, b) => b.balance - a.balance).slice(0, 5);
  const topBeban = [...bebanRows].sort((a, b) => b.balance - a.balance).slice(0, 5);

  const charts = {
    komposisiAset: topAset.map((r, i) => ({
      label: r.accountName,
      value: r.balance,
      color: ["#f5c518", "#38bdf8", "#34d399", "#a78bfa", "#fb7185"][i % 5] ?? "#f5c518",
    })),
    pendapatanVsBeban: { pendapatan: totalPendapatan, beban: totalBeban },
    kontribusiPendapatan: topPendapatan.map((r, i) => ({
      label: r.accountName,
      value: r.balance,
      color: ["#38bdf8", "#f5c518", "#34d399", "#a78bfa", "#fb7185"][i % 5] ?? "#38bdf8",
    })),
    kontribusiBeban: topBeban.map((r, i) => ({
      label: r.accountName,
      value: r.balance,
      color: ["#fb7185", "#f97316", "#f5c518", "#a78bfa", "#38bdf8"][i % 5] ?? "#fb7185",
    })),
  };

  const narrative: string[] = [];
  narrative.push(
    `Periode ${period}, entitas mencatat pendapatan ${fmt(totalPendapatan)} dengan total beban ${fmt(totalBeban)}, sehingga menghasilkan laba bersih ${fmt(laba)} (NPM ${pct(npm)}).`,
  );
  if (currentRatio !== null && currentRatio < 1) {
    narrative.push(
      `Likuiditas perlu perhatian: rasio lancar ${currentRatio.toFixed(2)} berada di bawah 1, artinya aset lancar belum sepenuhnya menutup liabilitas jangka pendek (${fmt(asetLancar)} vs ${fmt(liabilitasJangkaPendek)}).`,
    );
  } else if (currentRatio !== null) {
    narrative.push(`Likuiditas terjaga: rasio lancar ${currentRatio.toFixed(2)} (aset lancar ${fmt(asetLancar)} vs liabilitas jangka pendek ${fmt(liabilitasJangkaPendek)}).`);
  }
  if (debtToAsset !== null) {
    narrative.push(
      debtToAsset < 0.6
        ? `Struktur modal sehat: total liabilitas ${pct(debtToAsset)} dari total aset.`
        : `Struktur modal berbeban: total liabilitas ${pct(debtToAsset)} dari total aset — perhatikan kapasitas utang.`,
    );
  }
  const terbesar = topBeban[0];
  if (terbesar) {
    narrative.push(`Komponen beban terbesar adalah ${terbesar.accountName} sebesar ${fmt(terbesar.balance)} (${pct(div(terbesar.balance, totalBeban))} dari total beban).`);
  }
  narrative.push(
    `Perputaran kas periode ini: penerimaan ${fmt(totalKasMasuk)} dan pengeluaran ${fmt(totalKasKeluar)}, saldo kas akhir ${fmt(cash)}.`,
  );

  return { clientName, period, ratios, charts, narrative };
}
