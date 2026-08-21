/**
 * EN-05 (F1) — Event bus in-process bertipe.
 *
 * Fase 1: typed EventEmitter untuk event domain (APPROVED, EXCEPTION, SLA_BREACH).
 * Fase 2 (F2): outbox persisten (tabel DB) + consumer worker + webhook/email,
 * supaya event tidak hilang saat proses restart.
 */

export type PraktisEvents = {
  journalApproved: { journalId: string; firmId: string; clientId: string; description?: string | null };
  journalException: { journalId: string; firmId: string; clientId: string; flag?: string | null };
  slaBreach: { firmId: string; stage: string; journalId?: string | null; actualMinutes?: number | null };
};

type Handler<K extends keyof PraktisEvents> = (payload: PraktisEvents[K]) => void;

const listeners = new Map<keyof PraktisEvents, Set<Handler<never>>>();

/** Daftarkan listener; return fungsi untuk berhenti mendengarkan. */
export function on<K extends keyof PraktisEvents>(type: K, fn: Handler<K>): () => void {
  let set = listeners.get(type);
  if (!set) {
    set = new Set();
    listeners.set(type, set);
  }
  set.add(fn as Handler<never>);
  return () => {
    set!.delete(fn as Handler<never>);
  };
}

/** Terbitkan event — satu listener error tidak memblokir listener lain. */
export function emit<K extends keyof PraktisEvents>(type: K, payload: PraktisEvents[K]): void {
  const set = listeners.get(type);
  if (!set) return;
  for (const fn of set) {
    try {
      (fn as Handler<K>)(payload);
    } catch (err) {
      // Fase 1: log; fase 2 (outbox) akan memindahkan ke mekanisme retry.
      console.error(`[events] listener gagal untuk "${type}":`, err);
    }
  }
}

/** Jumlah listener aktif per tipe (untuk test & observability). */
export function listenerCount(type: keyof PraktisEvents): number {
  return listeners.get(type)?.size ?? 0;
}
