"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

const fmt = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
const rp = (n: number) => `Rp${fmt(n)}`;

type Line = { label: string; amount: number; indent?: number; bold?: boolean };
type Statement = { lines: Line[] };

type PortalFinancial = {
  clientName: string;
  period: string;
  availablePeriods: string[];
  worksheet: {
    lines: {
      no: number;
      accountCode: string;
      accountName: string;
      nsDebit: number;
      nsCredit: number;
      lrDebit: number;
      lrCredit: number;
      neracaDebit: number;
      neracaCredit: number;
    }[];
    totals: { nsDebit: number; nsCredit: number; lrDebit: number; lrCredit: number; neracaDebit: number; neracaCredit: number };
    labaBersih: number;
    balanced: boolean;
  };
  statements: { labaRugi: Statement; neraca: Statement; ekuitas: Statement; arusKas: Statement };
  analysis: {
    narrative: string[];
    ratios: { label: string; value: number | null; verdict: string; formula: string }[];
  };
  calk: { sections: { number: number; title: string; paragraphs: string[]; items?: { label: string; value: string }[] }[] };
  taxAnalysis: { taxRatio: { value: number | null }; narrative: string[]; breakdown: { label: string; value: number; note: string }[] };
};

function StmtBlock({ title, stmt }: { title: string; stmt: Statement }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <h4 className="mb-2 text-center text-sm font-bold text-slate-900">{title}</h4>
      <div className="space-y-0.5">
        {stmt.lines.map((l, i) => (
          <div
            key={i}
            className={`flex justify-between gap-3 text-xs ${
              l.bold ? "border-t border-slate-200 pt-1 font-semibold text-slate-900" : "text-slate-600"
            }`}
            style={{ paddingLeft: `${(l.indent ?? 0) * 14}px` }}
          >
            <span>{l.label}</span>
            <span className="font-mono">{rp(l.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PortalFinancial({ token }: { token: string }) {
  const [period, setPeriod] = useState("");
  const [data, setData] = useState<PortalFinancial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (p?: string) => {
      setLoading(true);
      setError(null);
      try {
        const q = p ? `?period=${p}` : "";
        const res = await fetch(`/api/portal/${token}/financial${q}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? "Gagal memuat laporan.");
        setData(j.data);
        setPeriod(j.data.period);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    async function start() {
      await load();
    }
    void start();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-display text-lg font-bold text-slate-900">Laporan Keuangan</h3>
        {data && (
          <select
            value={period}
            onChange={(e) => void load(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900"
          >
            {data.availablePeriods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
        {data && <Badge label="🔒 Periode terkunci" tone="accent" />}
      </div>
      <p className="text-xs text-slate-600">
        Laporan disusun dari jurnal yang telah disetujui & dikunci oleh akuntan — identik dengan yang dilihat sisi firma.
      </p>

      {error && <ErrorState message={error} />}
      {loading && <Skeleton className="h-48 w-full" />}

      {!loading && data && (
        <>
          {/* 4 laporan */}
          <div className="grid gap-4 lg:grid-cols-2">
            <StmtBlock title="LAPORAN LABA RUGI" stmt={data.statements.labaRugi} />
            <StmtBlock title="NERACA" stmt={data.statements.neraca} />
            <StmtBlock title="LAPORAN PERUBAHAN EKUITAS" stmt={data.statements.ekuitas} />
            <StmtBlock title="LAPORAN ARUS KAS" stmt={data.statements.arusKas} />
          </div>

          {/* Neraca lajur */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Neraca Lajur</h4>
              {data.worksheet.balanced ? (
                <Badge label="Seimbang ✓" tone="positive" />
              ) : (
                <Badge label="Tidak seimbang" tone="danger" />
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="px-2 py-1.5">No</th>
                    <th className="px-2 py-1.5">Akun</th>
                    <th className="px-2 py-1.5 text-right" colSpan={2}>Neraca Saldo</th>
                    <th className="px-2 py-1.5 text-right" colSpan={2}>Laba Rugi</th>
                    <th className="px-2 py-1.5 text-right" colSpan={2}>Neraca</th>
                  </tr>
                </thead>
                <tbody>
                  {data.worksheet.lines.map((l) => (
                    <tr key={l.no} className={`border-b border-slate-200/60 ${l.accountName.includes("LABA") ? "bg-yellow-400/10 font-semibold" : "text-slate-700"}`}>
                      <td className="px-2 py-1.5 text-slate-600">{l.no}</td>
                      <td className="px-2 py-1.5">{l.accountName}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{l.nsDebit ? rp(l.nsDebit) : ""}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{l.nsCredit ? rp(l.nsCredit) : ""}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{l.lrDebit ? rp(l.lrDebit) : ""}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{l.lrCredit ? rp(l.lrCredit) : ""}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{l.neracaDebit ? rp(l.neracaDebit) : ""}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{l.neracaCredit ? rp(l.neracaCredit) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Analisa */}
          <Card className="p-4">
            <h4 className="mb-2 text-sm font-bold text-slate-900">Analisa Laporan Keuangan</h4>
            <ul className="list-disc space-y-1.5 pl-5 text-xs text-slate-700">
              {data.analysis.narrative.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {data.analysis.ratios.map((r) => (
                <div key={r.label} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                  <span className="text-slate-600">{r.label}: </span>
                  <span className="font-mono text-slate-800">{r.value === null ? "N/A" : r.value.toFixed(2)}</span>
                  <span className="ml-1 text-slate-600">({r.verdict})</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Pajak */}
          <Card className="p-4">
            <h4 className="mb-2 text-sm font-bold text-slate-900">
              Analisa Pajak — Tax Ratio:{" "}
              <span className="font-mono text-amber-600">
                {data.taxAnalysis.taxRatio.value === null ? "N/A" : `${(data.taxAnalysis.taxRatio.value * 100).toFixed(1)}%`}
              </span>
            </h4>
            <ul className="list-disc space-y-1.5 pl-5 text-xs text-slate-700">
              {data.taxAnalysis.narrative.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </Card>

          {/* CALK */}
          <Card className="p-4">
            <h4 className="mb-3 text-sm font-bold text-slate-900">Catatan atas Laporan Keuangan</h4>
            <div className="space-y-4">
              {data.calk.sections.map((s) => (
                <div key={s.number}>
                  <h5 className="mb-1 text-xs font-semibold text-amber-600">
                    {s.number}. {s.title}
                  </h5>
                  {s.paragraphs.map((p, i) => (
                    <p key={i} className="text-xs leading-relaxed text-slate-600">
                      {p}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
