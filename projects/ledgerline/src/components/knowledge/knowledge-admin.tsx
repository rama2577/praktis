"use client";

/* Data-fetching di mount (async) — setState hanya setelah await.
   Rule set-state-in-effect = false positive untuk pola ini. */
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";

type KnowledgeItem = {
  id: string;
  category: string;
  name: string;
  title: string;
  version: number;
  status: "DRAFT" | "ACTIVE" | "SUPERSEDED" | "REJECTED";
  effectiveDate: string;
  changeNote?: string | null;
  approvedAt?: string | null;
};

const STATUS_TONE: Record<KnowledgeItem["status"], "positive" | "accent" | "neutral" | "danger"> = {
  ACTIVE: "positive",
  DRAFT: "accent",
  SUPERSEDED: "neutral",
  REJECTED: "danger",
};

const STATUS_LABELS: Record<KnowledgeItem["status"], string> = {
  ACTIVE: "Aktif",
  DRAFT: "Draf",
  SUPERSEDED: "Digantikan",
  REJECTED: "Ditolak",
};

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function KnowledgeAdmin({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form draft baru
  const [fCategory, setFCategory] = useState("Peraturan Pajak");
  const [fName, setFName] = useState("");
  const [fTitle, setFTitle] = useState("");
  const [fContent, setFContent] = useState("");
  const [fEffective, setFEffective] = useState("");
  const [fNote, setFNote] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge");
      if (!res.ok) throw new Error("Gagal memuat knowledge base");
      const data = (await res.json()) as { items: KnowledgeItem[] };
      setItems(data.items);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, action: "approve" | "reject") {
    setBusy(id);
    try {
      if (action === "approve") {
        const res = await fetch(`/api/knowledge/${id}/approve`, { method: "POST" });
        if (!res.ok) throw new Error("Gagal menyetujui");
      } else {
        const res = await fetch(`/api/knowledge/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reject" }),
        });
        if (!res.ok) throw new Error("Gagal menolak");
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function createDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!fName || !fTitle || !fContent || !fEffective) {
      setError("Semua kolom wajib diisi");
      return;
    }
    setBusy("new");
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: fCategory,
          name: fName.trim(),
          title: fTitle.trim(),
          content: fContent,
          effectiveDate: new Date(fEffective).toISOString(),
          changeNote: fNote.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Gagal membuat draf");
      setShowForm(false);
      setFName("");
      setFTitle("");
      setFContent("");
      setFEffective("");
      setFNote("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const drafts = items.filter((i) => i.status === "DRAFT");
  const actives = items.filter((i) => i.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Versi Knowledge (terkelola)</h2>
          <p className="mt-0.5 text-xs text-slate-700">
            {actives.length} aturan aktif · {drafts.length} draf menunggu persetujuan
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1f49ce]"
          >
            {showForm ? "Tutup Form" : "+ Versi Baru"}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {showForm && canEdit && (
        <form
          onSubmit={createDraft}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="mb-1 block text-slate-700">Kategori</span>
              <select
                value={fCategory}
                onChange={(e) => setFCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-accent/50 focus:outline-none"
              >
                <option>Peraturan Pajak</option>
                <option>Chart of Accounts (COA)</option>
                <option>Template Jurnal</option>
                <option>Referensi PSAK</option>
                <option>Validasi & Materialitas</option>
                <option>Business Events</option>
                <option>Prosedur Closing</option>
                <option>Referensi Industri</option>
                <option>Lainnya</option>
              </select>
            </label>
            <label className="block text-xs">
              <span className="mb-1 block text-slate-700">
                Nama (slug, tanpa ekstensi — mis. tax-rules-ppn)
              </span>
              <input
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                placeholder="tax-rules-ppn"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-accent/50 focus:outline-none"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="mb-1 block text-slate-700">Judul</span>
              <input
                value={fTitle}
                onChange={(e) => setFTitle(e.target.value)}
                placeholder="Aturan PPN v2"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-accent/50 focus:outline-none"
              />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block text-slate-700">Tanggal efektif</span>
              <input
                type="date"
                value={fEffective}
                onChange={(e) => setFEffective(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-accent/50 focus:outline-none"
              />
            </label>
          </div>
          <label className="block text-xs">
            <span className="mb-1 block text-slate-700">Isi aturan</span>
            <textarea
              value={fContent}
              onChange={(e) => setFContent(e.target.value)}
              rows={6}
              placeholder="Tulis konten aturan baru…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800 focus:border-accent/50 focus:outline-none"
            />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block text-slate-700">Catatan perubahan (audit trail)</span>
            <input
              value={fNote}
              onChange={(e) => setFNote(e.target.value)}
              placeholder="Alasan perubahan…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-accent/50 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={busy === "new"}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1f49ce] disabled:opacity-50"
          >
            {busy === "new" ? "Menyimpan…" : "Simpan Draf"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-700">Memuat versi knowledge…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-700">
          Belum ada knowledge terkelola — seed otomatis dari file referensi.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-700">
                <th className="px-4 py-3 font-medium">Aturan</th>
                <th className="px-4 py-3 font-medium">Versi</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Efektif</th>
                <th className="px-4 py-3 font-medium">Catatan</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-200/60 last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-slate-700">
                      {item.category} · {item.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">v{item.version}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={STATUS_LABELS[item.status]} tone={STATUS_TONE[item.status]} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">{fmtDate(item.effectiveDate)}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-xs text-slate-700">
                    {item.changeNote ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.status === "DRAFT" && canEdit ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={busy === item.id}
                          onClick={() => void act(item.id, "approve")}
                          className="rounded-md border border-emerald-500/40 px-2 py-1 text-xs text-emerald-600 transition hover:bg-emerald-500/10 disabled:opacity-50"
                        >
                          Setujui
                        </button>
                        <button
                          type="button"
                          disabled={busy === item.id}
                          onClick={() => void act(item.id, "reject")}
                          className="rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-600 transition hover:bg-red-500/10 disabled:opacity-50"
                        >
                          Tolak
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-700">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
