"use client";

import { useState } from "react";
import { ClientForm, type ClientFormData } from "@/components/clients/client-form";
import { ClientStatusAction } from "@/components/clients/client-status-action";
import { StatusBadge } from "@/components/ui/status-badge";

type ClientRow = {
  id: string;
  name: string;
  industry: string;
  taxId: string | null;
  status: "ACTIVE" | "INACTIVE";
  documentCount: number;
  journalCount: number;
};

/** Halaman daftar klien: tombol tambah, form inline, tabel list, aksi edit/status. */
export function ClientsManager({
  clients,
  industryLabels,
}: {
  clients: ClientRow[];
  industryLabels: Record<string, string>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(client: ClientRow) {
    setEditing(client);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      {showForm ? (
        <ClientForm
          mode={editing ? "edit" : "create"}
          initial={
            editing
              ? {
                  id: editing.id,
                  name: editing.name,
                  industry: editing.industry as ClientFormData["industry"],
                  taxId: editing.taxId,
                }
              : undefined
          }
          onDone={closeForm}
          onCancel={closeForm}
        />
      ) : (
        <div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#0b1120] transition hover:bg-yellow-300"
          >
            + Tambah Klien
          </button>
        </div>
      )}

      {clients.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Industri</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Dokumen</th>
                <th className="px-4 py-3 text-right font-medium">Jurnal</th>
                <th className="px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-line/60 last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{client.name}</p>
                    {client.taxId ? (
                      <p className="text-xs text-slate-500">NPWP: {client.taxId}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {industryLabels[client.industry] ?? client.industry}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={client.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                      tone={client.status === "ACTIVE" ? "positive" : "neutral"}
                    />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                    {client.documentCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                    {client.journalCount}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(client)}
                        className="rounded-lg border border-line px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/5"
                      >
                        Edit
                      </button>
                      <ClientStatusAction
                        clientId={client.id}
                        clientName={client.name}
                        currentStatus={client.status}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
