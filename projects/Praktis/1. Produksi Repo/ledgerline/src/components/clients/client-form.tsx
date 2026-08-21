"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ClientFormData = {
  id: string;
  name: string;
  industry: "RETAIL" | "SERVICES" | "FNB";
  taxId: string | null;
};

import { INDUSTRY_LIST, INDUSTRY_LABELS } from "@/lib/industries";

const INDUSTRY_OPTIONS = INDUSTRY_LIST.map((v) => ({ value: v, label: INDUSTRY_LABELS[v] }));

export function ClientForm({
  mode,
  initial,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: ClientFormData;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [industry, setIndustry] = useState<string>(initial?.industry ?? "RETAIL");
  const [taxId, setTaxId] = useState(initial?.taxId ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    const url =
      mode === "create" ? "/api/clients" : `/api/clients/${initial?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, industry, taxId: taxId || null }),
    });

    if (res.ok) {
      onDone();
      router.refresh();
    } else if (res.status === 400) {
      const body = (await res.json()) as { errors?: Record<string, string> };
      setFieldErrors(body.errors ?? {});
    } else if (res.status === 401 || res.status === 403) {
      setFormError("Sesi berakhir atau Anda tidak memiliki akses.");
      router.refresh();
    } else {
      setFormError("Terjadi kesalahan. Coba lagi.");
    }
    setSubmitting(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-line bg-card p-5"
      noValidate={false}
    >
      <h3 className="text-sm font-semibold">
        {mode === "create" ? "Tambah Klien" : `Edit: ${initial?.name}`}
      </h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="client-name" className="text-sm font-medium text-slate-700">
            Nama Klien <span className="text-red-600">*</span>
          </label>
          <input
            id="client-name"
            type="text"
            required
            maxLength={120}
            placeholder="PT Contoh Sejahtera"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!fieldErrors.name}
            className="rounded-lg border border-line bg-background px-3.5 py-2.5 text-sm placeholder:text-slate-700 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          {fieldErrors.name ? (
            <p className="text-xs text-red-600">{fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="client-industry" className="text-sm font-medium text-slate-700">
            Industri <span className="text-red-600">*</span>
          </label>
          <select
            id="client-industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            aria-invalid={!!fieldErrors.industry}
            className="rounded-lg border border-line bg-background px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {fieldErrors.industry ? (
            <p className="text-xs text-red-600">{fieldErrors.industry}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="client-taxid" className="text-sm font-medium text-slate-700">
            NPWP <span className="text-slate-700">(opsional)</span>
          </label>
          <input
            id="client-taxid"
            type="text"
            maxLength={30}
            placeholder="01.234.567.8-901.000"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            aria-invalid={!!fieldErrors.taxId}
            className="rounded-lg border border-line bg-background px-3.5 py-2.5 text-sm placeholder:text-slate-700 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          {fieldErrors.taxId ? (
            <p className="text-xs text-red-600">{fieldErrors.taxId}</p>
          ) : null}
        </div>
      </div>

      {formError ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600"
        >
          {formError}
        </p>
      ) : null}

      <div className="mt-5 flex gap-2">
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#ffffff] transition hover:bg-[#1f49ce] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Menyimpan..." : mode === "create" ? "Tambah" : "Simpan"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-line px-4 py-2 text-sm text-slate-700 transition hover:bg-black/5"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
