import { requireRole } from "@/lib/rbac";
import { OPERATIONAL_ROLES } from "@/lib/roles";
import { getClerkMetrics, getFirmMetrics, getQualityMetrics, getCorrectionInsights, correctionFieldLabel, pct, getOcrMetrics } from "@/server/metrics";
import { getRuleFixes } from "@/server/feedback";
import type { StatusConfidence, StageBreachRate } from "@/server/metrics";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { usdToIdr } from "@/lib/ocr-cost";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  APPROVED: "bg-emerald-500",
  EXCEPTION: "bg-red-500",
  REJECTED: "bg-red-500",
  DRAFT: "bg-slate-500",
  JUNIOR_REVIEW: "bg-amber-400",
  SENIOR_REVIEW: "bg-accent",
  TAX_REVIEW: "bg-sky-500",
  PARTNER_APPROVAL: "bg-purple-500",
};

const STATUS_LABEL: Record<string, string> = {
  APPROVED: "Disetujui",
  EXCEPTION: "Exception",
  REJECTED: "Ditolak",
  DRAFT: "Draft",
  JUNIOR_REVIEW: "Review Junior",
  SENIOR_REVIEW: "Review Senior",
  TAX_REVIEW: "Review Pajak",
  PARTNER_APPROVAL: "Persetujuan Partner",
};

function StatusConfidenceBars({ rows }: { rows: StatusConfidence[] }) {
  return (
    <div className="space-y-2.5">
      {rows.map((r) => {
        const pctVal = r.avgConfidence === null ? 0 : Math.round(r.avgConfidence * 100);
        return (
          <div key={r.status} className="flex items-center gap-3 text-sm">
            <span className="w-40 shrink-0 text-slate-700">{STATUS_LABEL[r.status] ?? r.status}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${STATUS_TONE[r.status] ?? "bg-slate-500"}`} style={{ width: `${pctVal}%` }} />
            </div>
            <span className="w-24 shrink-0 text-right tabular-nums text-xs text-slate-700">
              {r.avgConfidence === null ? "—" : `${pctVal}%`} · {r.count} jurnal
            </span>
          </div>
        );
      })}
    </div>
  );
}

function BreachBars({ rows }: { rows: StageBreachRate[] }) {
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.stage} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 text-slate-700">
            {r.stage === "JUNIOR" ? "Junior" : r.stage === "SENIOR" ? "Senior" : r.stage === "TAX" ? "Pajak" : "Partner"}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${r.rate > 0 ? "bg-red-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(100, r.rate)}%` }}
            />
          </div>
          <span className="w-28 shrink-0 text-right tabular-nums text-xs text-slate-700">
            {r.breached}/{r.total} breach · {r.rate.toLocaleString("id-ID")}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function QualityPage() {
  const session = await requireRole(OPERATIONAL_ROLES);
  const m = await getQualityMetrics(session.user.firmId);
  const clerks = await getClerkMetrics(session.user.firmId);
  const firm = await getFirmMetrics(session.user.firmId);
  const corrections = await getCorrectionInsights(session.user.firmId);
  const fixes = await getRuleFixes(session.user.firmId);

  const cards = [
    { label: "Jurnal Total", value: String(m.totalJournals), hint: `${m.approvedCount} disetujui · ${m.rejectedCount} ditolak`, tone: "text-slate-900" },
    { label: "Lolos Tanpa Revisi", value: `${m.firstPassRate.toLocaleString("id-ID")}%`, hint: "task review tanpa reject", tone: "text-emerald-600" },
    { label: "Exception Rate", value: `${m.exceptionRate.toLocaleString("id-ID")}%`, hint: `${m.exceptionCount} jurnal ber-exception`, tone: m.exceptionRate > 0 ? "text-accent" : "text-emerald-600" },
    { label: "Rata-rata Confidence", value: m.avgConfidenceAll === null ? "—" : `${pct(m.avgConfidenceAll * 100, 100)}%`, hint: "skor keyakinan AI", tone: "text-sky-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Metrik Kualitas</h1>
        <p className="mt-1 text-sm text-slate-700">
          Akurasi AI vs hasil review manusia, korelasi confidence, dan breach rate per stage.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-line bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-700">{c.label}</p>
            <p className={`mt-2 text-3xl font-semibold tabular-nums ${c.tone}`}>{c.value}</p>
            <p className="mt-1 text-xs text-slate-700">{c.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Confidence vs Status"
            description="Rata-rata skor keyakinan AI per status — exception & penolakan seharusnya berkorelasi dengan confidence rendah."
          />
          <StatusConfidenceBars rows={m.statusConfidence} />
        </Card>
        <Card>
          <CardHeader
            title="SLA Breach Rate per Stage"
            description="Proporsi task yang melewati tenggat dari seluruh event SLA tercatat."
          />
          <BreachBars rows={m.stageBreachRates} />
        </Card>
      </div>

      {/* EN-10: Performa Tim — metrik per clerk & firma */}
      <Card className="border-trust/20">
        <CardHeader
          title="Performa Tim"
          description="Metrik per clerk & ringkasan firma — basis untuk evaluasi beban kerja dan kualitas review."
        />

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-line bg-white px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-700">Task Selesai</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{firm.totalTasks}</p>
          </div>
          <div className="rounded-lg border border-line bg-white px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-700">Rata-rata Review</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
              {firm.avgReviewMinutes === null ? "—" : `${firm.avgReviewMinutes} mnt`}
            </p>
          </div>
          <div className="rounded-lg border border-line bg-white px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-700">SLA Met</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-600">
              {firm.avgSlaRate === null ? "—" : `${firm.avgSlaRate.toLocaleString("id-ID")}%`}
            </p>
          </div>
          <div className="rounded-lg border border-line bg-white px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-700">Disetujui</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{firm.totalApproved}</p>
          </div>
        </div>

        {clerks.length === 0 ? (
          <p className="text-sm text-slate-700">Belum ada data review per clerk.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line">
            <Table>
              <THead>
                <TH>Clerk</TH>
                <TH>Role</TH>
                <TH className="text-right">Review</TH>
                <TH className="text-right">Approve</TH>
                <TH className="text-right">Tolak</TH>
                <TH className="text-right">Rata-rata</TH>
                <TH className="text-right">SLA Met</TH>
              </THead>
              <TBody>
                {clerks.map((c) => (
                  <TR key={c.userId}>
                    <TD className="font-medium text-slate-800">{c.name}</TD>
                    <TD className="text-xs text-slate-700">{c.role}</TD>
                    <TD numeric className="text-right text-slate-700">{c.totalReviews}</TD>
                    <TD numeric className="text-right text-emerald-600">{c.approved}</TD>
                    <TD numeric className="text-right text-red-600">{c.rejected}</TD>
                    <TD numeric className="text-right text-slate-700">
                      {c.avgMinutes === null ? "—" : `${c.avgMinutes} mnt`}
                    </TD>
                    <TD numeric className={`text-right ${c.slaRate >= 80 ? "text-emerald-600" : c.slaRate >= 50 ? "text-accent" : "text-red-600"}`}>
                      {c.slaRate}%
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Jurnal Exception"
          action={
            <Link href="/dashboard/exceptions" className="text-xs text-accent hover:underline">
              Kelola exception →
            </Link>
          }
        />
        {m.exceptions.length === 0 ? (
          <p className="text-sm text-slate-700">Tidak ada jurnal berstatus exception.</p>
        ) : (
          <ul className="divide-y divide-line">
            {m.exceptions.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm text-slate-800">
                    <span className="font-medium">{e.clientName}</span> — {e.description ?? "tanpa deskripsi"}
                  </p>
                  <p className="mt-0.5 text-xs text-red-600/80">🚩 {e.exceptionFlag}</p>
                </div>
                <span className="text-xs tabular-nums text-slate-700">
                  confidence {e.confidence === null ? "—" : `${pct(e.confidence * 100, 100)}%`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* F2.5B/A6: Akun paling sering dikoreksi — feedback loop KB */}
      <Card className="border-sky-500/20">
        <CardHeader
          title="Akun Paling Sering Dikoreksi"
          description={`Feedback loop KB — ${corrections.totalCorrections} koreksi dari ${corrections.totalEditedJournals} jurnal tercatat sebagai data belajar (EN-03).`}
        />
        {corrections.totalCorrections === 0 ? (
          <p className="text-sm text-slate-700">
            Belum ada koreksi. Saat reviewer mengubah baris jurnal di panel review, koreksi otomatis tercatat di sini.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-700">Berdasarkan Akun</p>
              <div className="space-y-2">
                {corrections.topAccounts.map((a) => (
                  <div key={a.accountCode} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 font-mono text-xs text-sky-600">{a.accountCode}</span>
                    <span className="flex-1 truncate text-slate-800">{a.accountName}</span>
                    <span className="w-16 shrink-0 text-right tabular-nums text-xs text-slate-700">{a.count}×</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-700">Berdasarkan Field</p>
                <div className="flex flex-wrap gap-2">
                  {corrections.byField.map((f) => (
                    <span key={f.field} className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                      {correctionFieldLabel(f.field)} · <span className="tabular-nums text-slate-900">{f.count}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-700">Reviewer Aktif Mengoreksi</p>
                <div className="space-y-1.5">
                  {corrections.byUser.map((u) => (
                    <div key={u.userId} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{u.name}</span>
                      <span className="tabular-nums text-xs text-slate-700">{u.count} koreksi</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* EN-03: saran perbaikan aturan dari pola koreksi akun */}
      <Card className="border-accent/30">
        <CardHeader
          title="Saran Perbaikan Aturan (AI)"
          description="Pola koreksi akun yang berulang diubah menjadi saran update aturan/template. Ambang minimal: 2 koreksi yang sama."
        />
        {fixes.length === 0 ? (
          <p className="text-sm text-slate-700">
            Belum ada pola koreksi yang cukup kuat. Saat reviewer berulang kali mengoreksi akun yang sama ke akun yang sama, saran otomatis muncul di sini.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {fixes.map((f) => (
              <li key={`${f.before}-${f.after}`} className="flex flex-wrap items-center gap-2 py-3">
                <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                  {f.count}×
                </span>
                <span className="font-mono text-xs text-slate-500">{f.before}</span>
                <span className="text-slate-400">→</span>
                <span className="font-mono text-xs text-sky-600">{f.after}</span>
                <span className="text-sm text-slate-700">
                  pertimbangkan update aturan/template agar draft memakai <span className="font-mono text-xs">{f.after}</span>.
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Observability: metrik OCR hybrid (lokal → vision fallback) */}
      <OcrMetricsPanel firmId={session.user.firmId} />
    </div>
  );
}

async function OcrMetricsPanel({ firmId }: { firmId: string }) {
  const ocr = await getOcrMetrics(firmId, 30);
  const idr = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
  const ocrCards = [
    { label: "Dokumen Diproses (30 hr)", value: String(ocr.totalDocuments), hint: `${ocr.localCount} OCR lokal · ${ocr.pdfTextCount} PDF digital · ${ocr.xlsxCount} XLSX`, tone: "text-slate-900" },
    { label: "Fallback Vision", value: `${ocr.visionFallbackRate.toLocaleString("id-ID")}%`, hint: `${ocr.visionCount} dokumen ke vision LLM`, tone: ocr.visionFallbackRate > 30 ? "text-accent" : "text-emerald-600" },
    { label: "Strong Model", value: `${ocr.strongRate.toLocaleString("id-ID")}%`, hint: "retry glm-4.6 utk hasil jelek", tone: "text-sky-600" },
    { label: "Est. Biaya OCR", value: ocr.totalEstCostUsd === 0 ? "Rp 0" : `Rp ${idr.format(ocr.totalEstCostIdr)}`, hint: `$${ocr.totalEstCostUsd.toFixed(4)} · ${idr.format(ocr.totalEstTokens)} token`, tone: "text-violet-600" },
  ];

  return (
    <Card className="border-trust/20">
      <CardHeader
        title="Metrik OCR Hybrid"
        description="Pipeline OCR internal (tesseract.js, gratis) dulu — vision LLM hanya fallback. Ukur fallback rate, latency, dan estimasi biaya per dokumen."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ocrCards.map((c) => (
          <div key={c.label} className="rounded-xl border border-line bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-700">{c.label}</p>
            <p className={`mt-2 text-3xl font-semibold tabular-nums ${c.tone}`}>{c.value}</p>
            <p className="mt-1 text-xs text-slate-700">{c.hint}</p>
          </div>
        ))}
      </div>

      {ocr.totalDocuments === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-700">
          Belum ada dokumen diproses — metrik muncul otomatis setelah dokumen pertama melalui pipeline (upload → OCR → draft).
        </p>
      ) : (
        <div className="mt-5 overflow-hidden rounded-lg border border-line">
          <Table>
            <THead>
              <TH>Tanggal</TH>
              <TH className="text-right">Dokumen</TH>
              <TH className="text-right">Vision</TH>
              <TH className="text-right">Est. Biaya</TH>
            </THead>
            <TBody>
              {ocr.perDay.slice(-14).reverse().map((d) => (
                <TR key={d.date}>
                  <TD className="tabular-nums text-slate-700">{d.date}</TD>
                  <TD className="text-right tabular-nums">{d.total}</TD>
                  <TD className="text-right tabular-nums">{d.vision}</TD>
                  <TD className="text-right tabular-nums">Rp {idr.format(usdToIdr(d.costUsd))}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
