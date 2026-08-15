# Rencana Kerja — Enhancement Praktis (Terinspirasi Lark)

**Status**: Rencana siap eksekusi · **Tanggal**: 2026-08-15
**Sumber**: `docs/enhancement-lark-inspired.md` (riset Lark + usulan tim)

## Prinsip Kerja (non-negosiable)
1. **AI = saran, bukan final** — semua output AI bisa diterima/diedit massal, akuntan tetap otorisasi akhir.
2. **Biaya terkontrol** — model routing (Air default → strong fallback), batch 1 call utk banyak baris, OCR lokal tetap gratis.
3. **Audit trail** — setiap enrich menyimpan `source` + `confidence` + `createdAt`.
4. **DoD wajib** (setiap task): `tsc --noEmit` 0 error · `vitest` hijau · `npm run build` OK · E2E Playwright utk logika baru · deploy Railway web+worker · screenshot.

---

## FASE 0 — Fondasi (Enabler)

### T0.1 — Schema & migrasi AI-enrich
- **Tujuan**: siapkan kolom penanda enrich di tabel jurnal & transaksi.
- **File/tabel**: `prisma/schema.prisma` → tambah di `JournalLine` & `Document`: `descriptionSource` (enum `manual|rule|ai`), `enrichConfidence` (Float?), `enrichedAt` (DateTime?), `aiDescription` (String?).
- **Deliverable**: migration `ai_enrich_fields` + generate client.
- **DoD**: migrate dev OK; seed tidak rusak; tsc 0.

### T0.2 — Batch-enrich service (backend core)
- **Tujuan**: satu fungsi `enrichJournalLines(lineIds)` yang memanggil LLM batch (banyak baris / 1 call) → return `{description, category, dimension, confidence}`.
- **File**: `src/server/ai-enrich.ts` (baru) — reuse `drafting.ts` + `rule-engine.ts` + `chatJsonWithFallback`.
- **Deliverable**: service + unit test (`tests/ai-enrich.test.ts`).
- **DoD**: vitest hijau (mock LLM); fallback ke rule-engine saat LLM gagal.

---

## FASE 1 — P0 (nilai tertinggi)

### T1.1 — AI Field: auto-deskripsi & kategori pada tabel jurnal
- **Tujuan**: kolom AI di `journal-manager.tsx` — generate deskripsi/kategori per baris + bulk-apply.
- **UI/FE**: komponen `<AiFieldCell>` + tombol "✨ Enrich baris terpilih"; badge "AI" + confidence; inline edit sebelum accept.
- **API**: `POST /api/journals/[id]/enrich` (batch) + `POST /api/journals/enrich/bulk`.
- **DoD**: E2E `e2e-ai-enrich.ts` PASS (pilih 3 baris → enrich → deskripsi terisi + `descriptionSource=ai`); screenshot.

### T1.2 — Enrich master data supplier/customer
- **Tujuan**: lengkapi NPWP/industri/alamat dari dokumen → master client/supplier.
- **API**: `POST /api/clients/[id]/profile/enrich` (reuse `client-profile.ts`).
- **DoD**: enrich NPWP dari faktur → tersimpan dengan confidence; E2E PASS.

### T1.3 — Inbox cerdas akuntan (Daily Brief + Priority Queue)
- **Tujuan**: panel "Today" di dashboard — ringkasan harian + antrian review terprioritas.
- **UI/FE**: `<DailyBrief>` + `<PriorityQueue>` di `dockable-dashboard.tsx`.
- **API**: `GET /api/dashboard/brief` (agregat + ringkasan LLM murah).
- **DoD**: dashboard menampilkan "3 dokumen baru · 2 exception material · aging naik"; deep-link ke objek; E2E + screenshot.

### T1.4 — Alert anomali & ringkas exception
- **Tujuan**: deteksi selisih recon / lonjakan akun / deadline SPT → satu kalimat aksi.
- **File**: `src/server/anomaly.ts` (baru) + reuse `metrics.ts`, `sla.ts`, `recon.ts`.
- **DoD**: anomali tampil di brief; unit test deteksi; E2E PASS.

> **Gate Fase 1**: demo internal ke Rama — AI Field & inbox terasa "saran, bukan final"; ukur % baris tanpa edit manual.

---

## FASE 2 — P1

### T2.1 — Command bar AI (⌘K → tanya AI)
- **Tujuan**: perluas global search jadi command palette AI: ask data / draft / explain / dokumen.
- **UI/FE**: `<AiCommandPalette>` (reuse ⌘K).
- **API**: `POST /api/ai/command` → router intent (query DB vs LLM) + action chips "Terapkan".
- **DoD**: tanya "saldo kas PT X" → jawab dari data + tombol aksi; E2E PASS.

### T2.2 — Auto-translation dokumen asing
- **Tujuan**: langkah translate (Air, murah) sebelum ekstraksi jurnal.
- **File**: `src/ai/parsers.ts` — tambah `translateIfForeign(text)` di pipeline.
- **DoD**: dokumen EN → jurnal dengan deskripsi ID; unit test + E2E PASS.

### T2.3 — Parse QR e-Faktur
- **Tujuan**: decode QR faktur elektronik → NPWP/FP otomatis.
- **File**: `src/ai/qr.ts` (baru, pakai `jsqr`/`zbar` wasm).
- **DoD**: QR faktur → data terisi; unit test + E2E PASS.

---

## FASE 3 — P2 (setelah validasi Fase 1–2)

### T3.1 — Agent proaktif: pindai dokumen masuk & ringkas
- **Tujuan**: cron job periodik → kategorikan dokumen baru → push ringkasan ke inbox.
- **Infra**: cron + BullMQ worker (sudah ada) + agent loop.
- **DoD**: dokumen masuk otomatis muncul di Daily Brief tanpa aksi manual; biaya per-job tercatat.

### T3.2 — Jurnal rutin otomatis (sewa/gaji/depresiasi)
- **Tujuan**: auto-generate + auto-post bila confidence tinggi (di atas threshold).
- **DoD**: jurnal rutin terbuat + berstatus posted; audit trail lengkap; rollback aman.

### T3.3 — Pengingat deadline (SPT/rekonsiliasi)
- **Tujuan**: pindai deadline → ringkas → jadwalkan + notifikasi.
- **DoD**: deadline SPT tampil di brief & ter-notifikasi.

---

## Estimasi & Dependensi

| Fase | Estimasi | Dependency |
|---|---|---|
| Fase 0 | 2–3 hari | — |
| Fase 1 | 1,5–2 minggu | Fase 0 |
| Fase 2 | 1,5–2 minggu | Fase 1 |
| Fase 3 | 2–3 minggu | validasi Fase 1–2 |

## Sukses metric (diukur pasca-rilis)
1. % baris jurnal tanpa edit manual (target: turun 30%+)
2. Waktu ke review pertama (target: turun)
3. Exception ter-resolve lebih cepat
4. Biaya AI per transaksi tetap ≤ Rp70 (floor GP 75%)
