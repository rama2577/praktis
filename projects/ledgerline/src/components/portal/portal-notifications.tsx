"use client";

import { useCallback, useEffect, useState } from "react";

type Notification = {
  id: string;
  type: string;
  typeLabel: string;
  message: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export function PortalNotifications({ token }: { token: string }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/${token}/notifications`);
      if (!res.ok) throw new Error("Gagal memuat notifikasi");
      const data = (await res.json()) as { data: Notification[]; unread: number };
      setItems(data.data);
      setUnread(data.unread);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    async function start() {
      await load();
    }
    void start();
  }, [load]);

  const markRead = async () => {
    if (unread === 0) return;
    await fetch(`/api/portal/${token}/notifications`, { method: "POST" });
    await load();
  };

  if (loading) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Notifikasi
          {unread > 0 && (
            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-white">
              {unread} baru
            </span>
          )}
        </h2>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => void markRead()}
            className="text-xs text-accent underline-offset-2 hover:underline"
          >
            Tandai semua dibaca
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-700">Belum ada notifikasi.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-lg border px-3 py-2 text-sm ${
                n.readAt ? "border-slate-200 bg-slate-50/40 text-slate-700" : "border-slate-200 bg-slate-50/70 text-slate-800"
              }`}
            >
              <span className="mr-2 text-xs text-accent">{n.typeLabel}</span>
              {n.message}
              <span className="ml-2 text-xs text-slate-700">
                {new Date(n.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
