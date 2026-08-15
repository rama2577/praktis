"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrencyRp } from "@/lib/format";

type Client = { id: string; name: string };
type CoaAccount = { accountCode: string; accountName: string; note?: string };
type JournalLine = { accountCode: string; accountName: string; debit: string; credit: string; psakRef: string };
type JournalRow = {
  id: string;
  client: { id: string; name: string };
  description: string;
  journalType: "MANUAL" | "ADJUSTING";
  status: string;
  entryDate: string;
  lines: Array<{ accountCode: string; accountName: string; debit: string; credit: string; psakRef: string | null }>;
};

const TYPE_LABELS: Record<string, string> = { MANUAL: "Jurnal Manual", ADJUSTING: "Penyesuaian" };

function emptyLine(): JournalLine {
  return { accountCode: "", accountName: "", debit: "", credit: "", psakRef: "" };
}

export function JournalManager({ canWrite }: { canWrite: boolean }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [journals, setJournals] = useState<JournalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Form state
  const [clientId, setClientId] = useState("");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [journalType, setJournalType] = useState<"MANUAL" | "ADJUSTING">("MANUAL");
  const [descBusy, setDescBusy] = useState(false);
  const [descSource, setDescSource] = useState<"AI" | "RULE" | null>(null);
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()]);

  // COA klien terpilih (sumber kebenaran akun untuk jurnal manual)
  const [coaAccounts, setCoaAccounts] = useState<CoaAccount[]>([]);
  const [coaLoading, setCoaLoading] = useState(false);
  const [coaError, setCoaError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/journals/manual");
      if (!res.ok) throw new Error("Gagal memuat jurnal manual");
      const data = (await res.json()) as { data: JournalRow[] };
      setJournals(data.data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function start() {
      await load();
    }
    void start();
  }, [load]);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setClients(d?.data ?? []))
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    async function start() {
      setCoaLoading(true);
      setCoaError(null);
      try {
        const r = await fetch(`/api/clients/${clientId}/coa`);
        if (!r.ok) throw new Error("Gagal memuat COA klien");
        const d = (await r.json()) as { data: { accounts: CoaAccount[] } };
        if (!cancelled) setCoaAccounts(d.data.accounts);
      } catch (e) {
        if (!cancelled) {
          setCoaAccounts([]);
          setCoaError((e as Error).message);
        }
      } finally {
        if (!cancelled) setCoaLoading(false);
      }
    }
    void start();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  function handleClientChange(value: string) {
    setClientId(value);
    setCoaAccounts([]);
    setCoaError(null);
    setLines([emptyLine(), emptyLine()]);
  }

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const l of lines) {
      debit += Number(l.debit) || 0;
      credit += Number(l.credit) || 0;
    }
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.005 };
  }, [lines]);

  function updateLine(i: number, patch: Partial<JournalLine>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function selectAccount(i: number, accountCode: string) {
    const acc = coaAccounts.find((a) => a.accountCode === accountCode);
    updateLine(i, {
      accountCode: accountCode,
      accountName: acc ? acc.accountName : "",
    });
  }

  function hasForeignAccount(): boolean {
    if (coaAccounts.length === 0) return false;
    const codes = new Set(coaAccounts.map((a) => a.accountCode));
    return lines.some((l) => l.accountCode && !codes.has(l.accountCode));
  }

  async function generateDescription() {
    const valid = lines.filter((l) => Number(l.debit) > 0 || Number(l.credit) > 0);
    if (valid.length === 0) {
      setError("Isi dulu minimal satu baris debit/kredit agar AI bisa membuat deskripsi.");
      return;
    }
    setDescBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/journals/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: valid.map((l) => ({
            accountName: l.accountName,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Gagal generate deskripsi");
      setDescription(body.data.description);
      setDescSource(body.data.source);
      setFlash("Deskripsi AI terisi — periksa & edit bila perlu.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDescBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !description.trim()) {
      setError("Klien dan deskripsi wajib diisi.");
      return;
    }
    if (!totals.balanced || totals.debit === 0) {
      setError("Jurnal belum seimbang — total debit harus sama dengan total kredit.");
      return;
    }
    if (hasForeignAccount()) {
      setError("Ada akun di luar COA klien. Pilih akun dari daftar COA yang sudah dipetakan.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/journals/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          entryDate,
          description,
          journalType,
          lines: lines.map((l) => ({
            accountCode: l.accountCode.trim(),
            accountName: l.accountName.trim(),
            debit: l.debit ? Number(l.debit) : undefined,
            credit: l.credit ? Number(l.credit) : undefined,
            psakRef: l.psakRef.trim() || undefined,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan jurnal");
      setFlash(
        journalType === "ADJUSTING"
          ? "✅ Jurnal penyesuaian tersimpan & langsung tercatat."
          : "✅ Jurnal manual tersimpan & langsung tercatat.",
      );
      setClientId("");
      setDescription("");
      setLines([emptyLine(), emptyLine()]);
      setShowForm(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {flash && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
          {flash}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {canWrite && (
        <div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#ffffff] transition hover:bg-[#2b63f2]"
          >
            {showForm ? "Tutup Form" : "+ Jurnal Manual"}
          </button>

          {showForm && (
            <form
              onSubmit={submit}
              className="mt-4 rounded-xl border border-line bg-card/60 p-5"
              aria-label="Form jurnal manual"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-700">Klien *</span>
                  <select
                    value={clientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full rounded-lg border border-line bg-[#ffffff] px-3 py-2 text-sm text-slate-800 focus:border-accent/60 focus:outline-none"
                  >
                    <option value="">— Pilih klien —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-700">Tanggal transaksi *</span>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full rounded-lg border border-line bg-[#ffffff] px-3 py-2 text-sm text-slate-800 focus:border-accent/60 focus:outline-none"
                  />
                </label>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-700">Deskripsi *</span>
                  <div className="flex items-center gap-2">
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="mis. Jurnal penyesuaian penyusutan Agustus"
                      className="w-full rounded-lg border border-line bg-[#ffffff] px-3 py-2 text-sm text-slate-800 focus:border-accent/60 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={generateDescription}
                      disabled={descBusy}
                      title="Buat deskripsi otomatis dengan AI dari baris jurnal"
                      className="shrink-0 rounded-lg border border-ai/40 bg-ai/10 px-3 py-2 text-sm font-medium text-ai transition hover:bg-ai/20 disabled:opacity-50"
                    >
                      {descBusy ? "…" : "✨ AI"}
                    </button>
                  </div>
                  {descSource && (
                    <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${descSource === "AI" ? "bg-sky-500/15 text-sky-600" : "bg-slate-600/30 text-slate-700"}`}>
                      {descSource === "AI" ? "dibuat AI — periksa sebelum simpan" : "fallback rule — periksa sebelum simpan"}
                    </span>
                  )}
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-700">Jenis</span>
                  <select
                    value={journalType}
                    onChange={(e) => setJournalType(e.target.value as "MANUAL" | "ADJUSTING")}
                    className="w-full rounded-lg border border-line bg-[#ffffff] px-3 py-2 text-sm text-slate-800 focus:border-accent/60 focus:outline-none"
                  >
                    <option value="MANUAL">Jurnal Manual</option>
                    <option value="ADJUSTING">Jurnal Penyesuaian</option>
                  </select>
                </label>
              </div>
              <div className="mt-2 text-xs">
                {coaLoading ? (
                  <span className="text-slate-700">Memuat COA klien…</span>
                ) : coaAccounts.length > 0 ? (
                  <span className="text-slate-700">
                    COA klien terpetakan: <span className="font-semibold text-accent">{coaAccounts.length} akun</span> —
                    baris jurnal hanya bisa memilih akun dari daftar ini.
                  </span>
                ) : coaError ? (
                  <span className="text-red-600">{coaError}</span>
                ) : clientId ? (
                  <span className="text-amber-600/90">
                    COA klien belum dipetakan — akun bebas sementara. Petakan COA di profil klien
                    agar akun jurnal terkunci.
                  </span>
                ) : null}
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm text-slate-700">Baris jurnal (debit = kredit)</p>
                  <button
                    type="button"
                    onClick={() => setLines((p) => [...p, emptyLine()])}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-slate-700 transition hover:border-accent/50 hover:text-accent"
                  >
                    + Tambah Baris
                  </button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-line bg-white/[0.02] text-left text-xs uppercase tracking-wider text-slate-700">
                        <th className="px-3 py-2">Kode Akun</th>
                        <th className="px-3 py-2">Nama Akun</th>
                        <th className="px-3 py-2 text-right">Debit</th>
                        <th className="px-3 py-2 text-right">Kredit</th>
                        <th className="px-3 py-2">Ref. PSAK</th>
                        <th className="px-3 py-2" aria-label="Hapus baris" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, i) => (
                        <tr key={i} className="border-b border-line/50 last:border-0">
                    {coaAccounts.length > 0 ? (
                      <td colSpan={2} className="px-3 py-1.5">
                        <select
                          value={l.accountCode}
                          onChange={(e) => selectAccount(i, e.target.value)}
                          className="w-full min-w-[200px] rounded border border-line bg-[#ffffff] px-2 py-1.5 text-xs text-slate-800 focus:border-accent/60 focus:outline-none"
                          aria-label={`Akun baris ${i + 1}`}
                        >
                          <option value="">— Pilih akun COA —</option>
                          {coaAccounts.map((a) => (
                            <option key={a.accountCode} value={a.accountCode}>
                              {a.accountCode} — {a.accountName}
                            </option>
                          ))}
                        </select>
                      </td>
                    ) : (
                      <>
                        <td className="px-3 py-1.5">
                          <input
                            value={l.accountCode}
                            onChange={(e) => updateLine(i, { accountCode: e.target.value })}
                            placeholder="1-1100"
                            className="w-24 rounded border border-line bg-[#ffffff] px-2 py-1.5 font-mono text-xs text-slate-800 focus:border-accent/60 focus:outline-none"
                            aria-label={`Kode akun baris ${i + 1}`}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            value={l.accountName}
                            onChange={(e) => updateLine(i, { accountName: e.target.value })}
                            placeholder="Kas dan Setara Kas"
                            className="w-full min-w-[140px] rounded border border-line bg-[#ffffff] px-2 py-1.5 text-xs text-slate-800 focus:border-accent/60 focus:outline-none"
                            aria-label={`Nama akun baris ${i + 1}`}
                          />
                        </td>
                      </>
                    )}
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={l.debit}
                              onChange={(e) => updateLine(i, { debit: e.target.value, credit: "" })}
                              placeholder="0"
                              className="w-28 rounded border border-line bg-[#ffffff] px-2 py-1.5 text-right font-mono text-xs text-slate-800 focus:border-accent/60 focus:outline-none"
                              aria-label={`Debit baris ${i + 1}`}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={l.credit}
                              onChange={(e) => updateLine(i, { credit: e.target.value, debit: "" })}
                              placeholder="0"
                              className="w-28 rounded border border-line bg-[#ffffff] px-2 py-1.5 text-right font-mono text-xs text-slate-800 focus:border-accent/60 focus:outline-none"
                              aria-label={`Kredit baris ${i + 1}`}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              value={l.psakRef}
                              onChange={(e) => updateLine(i, { psakRef: e.target.value })}
                              placeholder="PSAK 115"
                              className="w-24 rounded border border-line bg-[#ffffff] px-2 py-1.5 font-mono text-xs text-slate-800 focus:border-accent/60 focus:outline-none"
                              aria-label={`Ref PSAK baris ${i + 1}`}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <button
                              type="button"
                              onClick={() => setLines((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p))}
                              disabled={lines.length <= 1}
                              className="rounded border border-line px-2 py-1 text-xs text-slate-700 transition hover:border-red-500/40 hover:text-red-600 disabled:opacity-40"
                              aria-label={`Hapus baris ${i + 1}`}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-line bg-white/[0.02]">
                        <td colSpan={2} className="px-3 py-2 text-xs font-semibold text-slate-700">
                          Total
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-slate-800">{formatCurrencyRp(totals.debit)}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-slate-800">{formatCurrencyRp(totals.credit)}</td>
                        <td colSpan={2} className="px-3 py-2">
                          {totals.debit > 0 && (
                            <span
                              className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                                totals.balanced ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"
                              }`}
                            >
                              {totals.balanced ? "✓ Seimbang" : "✗ Belum seimbang"}
                            </span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-[#ffffff] transition hover:bg-[#2b63f2] disabled:opacity-50"
                >
                  {busy ? "Menyimpan…" : "Simpan Jurnal"}
                </button>
                <p className="text-xs text-slate-700">
                  Jurnal langsung tercatat (status disetujui) + riwayat aktivitas.
                </p>
              </div>
            </form>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Daftar Jurnal Manual & Penyesuaian</h2>
        {loading ? (
          <div className="rounded-xl border border-line bg-card/40 p-8 text-center text-sm text-slate-700">
            Memuat jurnal…
          </div>
        ) : journals.length === 0 ? (
          <div className="rounded-xl border border-line bg-card/40 p-8 text-center text-sm text-slate-700">
            Belum ada jurnal manual. Gunakan tombol + Jurnal Manual untuk mencatat jurnal yang
            kurang atau jurnal penyesuaian.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-card/40">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line bg-white/[0.02] text-left text-xs uppercase tracking-wider text-slate-700">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Klien</th>
                  <th className="px-4 py-3">Deskripsi</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Baris</th>
                </tr>
              </thead>
              <tbody>
                {journals.map((j) => (
                  <tr key={j.id} className="border-b border-line/50 last:border-0 hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">
                      {new Date(j.entryDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-slate-800">{j.client.name}</td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-slate-700">{j.description}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={TYPE_LABELS[j.journalType] ?? j.journalType}
                        tone={j.journalType === "ADJUSTING" ? "warning" : "accent"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label="Disetujui" tone="positive" />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-700">{j.lines.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
