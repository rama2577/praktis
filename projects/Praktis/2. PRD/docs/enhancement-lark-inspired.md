# Praktis Enhancement — Riset Produk Lark & Usulan Tim

**Dokumen**: Enhancement usulan berbasis riset produk Lark (larksuite.com)
**Tanggal**: 2026-08-15
**Tim**: dipimpin CTO, dengan Senior Full-Stack Engineer, Backend Engineer, UI Engineer, UX Engineer, Product Designer, Product Manager

---

## 1. Ringkasan Eksekutif (CTO)

Lark unggul bukan karena satu fitur AI besar, melainkan karena **AI terdistribusi merata ke setiap permukaan produk** — tabel (Base), dokumen, chat, meeting, dan otomasi. Prinsip intinya: **AI ada di tempat data berada, dan hasil AI langsung jadi data terstruktur yang bisa difilter/sortir/digabung**.

Bagi Praktis (AI bookkeeping untuk firma akuntansi), pelajaran terpentingnya satu kalimat:

> **AI tidak boleh berhenti di "draft jurnal". AI harus masuk ke setiap baris, setiap tabel, dan setiap laporan — memperkaya (enrich) data akuntansi di tempat kerjanya.**

Ini selaras dengan arah yang sudah kita bangun (OCR hybrid, rule engine, drafting), dan menjadi lompatan nilai berikutnya: dari *"AI membantu mencatat"* menjadi *"AI membantu memahami & bertindak"*.

**Keputusan prioritas (CTO)** — fokus ke 3 tema yang paling tinggi ROI & paling dekat dengan posisi produk kita:

| Prioritas | Tema | Alasan |
|---|---|---|
| **P0** | AI Field untuk baris jurnal & transaksi (enrich tabel) | Persis yang diminta user: AI sampai ke level tabel/deskripsi. Langsung dirasakan akuntan. |
| **P0** | AI Summary & Prioritization (inbox cerdas) | Mengubah antrian review dari "tumpukan" jadi "prioritas". Menghemat waktu akuntan paling banyak. |
| **P1** | AI Assistant menyeluruh (command bar) | Fondasi UX satu pintu untuk semua kemampuan AI. |
| **P1** | Auto-translation + enrich master data | Nilai langsung untuk dokumen bahasa asing & data supplier/customer. |
| **P2** | AI agent proaktif (pemindaian periodik) | Diferensiasi jangka panjang, butuh infrastruktur matur. |

---

## 2. Temuan Riset Lark (dipetakan ke Praktis)

| Fitur Lark | Cara Kerja Lark | Analogi untuk Praktis |
|---|---|---|
| **Base AI Fields** | Kolom AI di tabel: translate, klasifikasi, enrich, generate opsi field dalam batch | Kolom AI di tabel transaksi/jurnal: auto-deskripsi, auto-kategori COA, auto-enrich supplier |
| **AI Enrich data** | Lengkapi data lead (ukuran perusahaan, industri), generate pertanyaan | Enrich master supplier/customer (NPWP, industri, alamat) + generate pertanyaan konfirmasi ke klien |
| **AI di Docs/Wiki/Messenger** | Draft, ringkas, terjemah langsung tanpa add-on | AI di laporan/nota/CALK: draft management letter, ringkas bulan berjalan |
| **AI summarize & route issue** | Ringkas laporan masalah, prioritas, rute ke tim yang tepat | Ringkas exception + prioritaskan antrian review akuntan |
| **Lark CLI / agent** | AI memindai email, kategorikan prioritas, push ringkasan ke grup | Agent proaktif: pindai dokumen masuk → ringkas → push ke inbox akuntan |
| **OCR/AI gambar** | Deskripsikan gambar, baca tulisan tangan, barcode, terjemah | Parse barcode/QR faktur, OCR tulisan tangan, terjemah dokumen asing |
| **Base automation** | Otomasi tugas + dashboard, import spreadsheet 1-klik | Jurnal otomatis rutin + dashboard analitik real-time |

---

## 3. Usulan Enhancement (detail per tema)

### 🅰️ P0 — "AI Field" pada Baris Jurnal & Transaksi (Enrich Tabel)

**Konteks user**: "AI melakukan enrich sampai ke sisi tabel, dalam jurnal salah satunya membuat deskripsi."

**Usulan**: Setiap baris jurnal & transaksi mendapat **kolom AI** yang bisa di-generate massal — bukan hanya deskripsi default, tapi konten yang bisa dikustomisasi per firma.

| Sub-fitur | Detail | Nilai |
|---|---|---|
| **Auto-deskripsi jurnal** | Generate narasi deskripsi per baris dari dokumen + akun + lawan transaksi. Contoh: `"Pembayaran Faktur FP-010.000-22.98765432 — PT Mitra Niaga (jatuh tempo 5 Sep)"` | Konsistensi & keterbacaan; siap ekspor ke sistem klien |
| **Auto-kategori COA** | Klasifikasi transaksi ke akun (sudah ada rule engine) → tambah AI untuk kasus outlier + confidence score | Kurangi salah klasifikasi, percepat review |
| **Enrich dimensi/proyek** | Auto-isi dimensi (cost center, project, department) dari teks dokumen | Laporan per proyek/cabang otomatis |
| **Enrich lawan transaksi** | Lengkapi supplier/customer: NPWP, industri, alamat dari dokumen | Data master lengkap tanpa input manual |
| **Batch generate field** | Generate deskripsi/kategori untuk ratusan baris sekaligus | Pekerjaan massal jadi 1 klik |

**Perspektif peran**:
- **PM**: Fitur ini = "AI Columns" (seperti di Lark Base). MVP: 3 kolom (deskripsi, kategori, dimensi). Success metric: % baris tanpa edit manual turun 30%+.
- **UX**: Kolom AI harus terlihat sebagai "saran" (bisa diterima massal / diedit), bukan hasil final — akuntan harus tetap memegang kendali & audit trail.
- **UI**: Tabel jurnal kini punya badge "AI" di kolom yang di-enrich, hover menampilkan sumber & confidence.
- **FE**: Reuse tabel jurnal existing (`journal-manager.tsx`); tambah komponen `<AiFieldCell>` + bulk-apply.
- **BE**: Endpoint `POST /api/journals/enrich` (batch), reuse `drafting.ts` + `rule-engine.ts`, tambah kolom `descriptionSource` & `enrichedAt` di schema.

---

### 🅱️ P0 — AI Summary & Prioritization (Inbox Cerdas Akuntan)

**Usulan**: Dashboard "Hari Ini" yang mirip inbox — AI merangkum & memprioritaskan pekerjaan akuntan.

| Sub-fitur | Detail |
|---|---|
| **Ringkasan harian** | "3 dokumen baru menunggu review · 2 exception material · aging PT X naik 15%" — push ke dashboard, bukan ke chat |
| **Prioritas antrian review** | Urutkan task review berdasarkan materialitas + confidence + SLA terdekat |
| **Alert cerdas** | Deteksi anomali (selisih recon, lonjakan akun, deadline SPT) → ringkas ke satu kalimat aksi |
| **Ringkas exception** | Kumpulkan exception serupa → satu kartu ringkas dengan aksi |

**Perspektif peran**:
- **PM**: Ini "command center" akuntan. Metric: waktu ke review pertama turun, exception ter-resolve lebih cepat.
- **UX**: Format ringkas (bullet, bukan paragraf), setiap ringkasan punya deep-link ke objek.
- **UI**: Panel "Today" di dashboard dockable (sudah ada `dockable-dashboard`).
- **BE**: Reuse `metrics.ts` + `sla.ts`; LLM hanya merangkum agregat (murah), bukan per transaksi.
- **FE**: Komponen `<DailyBrief>` + `<PriorityQueue>`.

---

### 🅲 P1 — AI Assistant Menyeluruh (Command Bar ⌘K)

**Usulan**: Satu command bar AI di seluruh app (Lark punya AI di tiap dokumen/chat). Praktis: ⌘K sudah ada (global search) → perluas jadi "tanya AI".

| Sub-fitur | Detail |
|---|---|
| **Ask data** | "Berapa saldo kas PT X akhir bulan lalu?" → jawab dari data |
| **Ask draft** | "Buat jurnal penyesuaian untuk depresiasi aset tetap" → generate |
| **Ask explain** | "Jelaskan kenapa selisih rekonsiliasi Rp 2.1jt" → analisis |
| **Ask draft dokumen** | "Draft management letter untuk PT Y" → generate |

**Perspektif peran**:
- **UX**: Natural language → aksi, bukan hanya jawab teks. Setiap jawaban punya tombol "Terapkan".
- **UI**: Command bar (reuse ⌘K), panel hasil dengan action chips.
- **BE**: Router intent → query DB / call LLM; batasi aksi tulis dengan konfirmasi.
- **FE**: Komponen `<AiCommandPalette>`.
- **PM**: Ini fondasi — semua fitur AI lain bisa diakses dari sini. Phase 2 setelah P0.

---

### 🅳 P1 — Auto-translation & Enrich Master Data

**Usulan**: Dokumen asing & data master otomatis diperkaya.

| Sub-fitur | Detail |
|---|---|
| **Terjemah dokumen** | Dokumen bahasa Inggris/asing → terjemah ke Indonesia sebelum ekstraksi jurnal |
| **Parse barcode/QR** | Faktur elektronik dgn QR (e-Faktur) → parse NPWP/FP otomatis |
| **Enrich master** | Lengkapi supplier/customer (NPWP, industri) dari dokumen & AI |

**Perspektif peran**:
- **BE**: Reuse OCR pipeline + tambah langkah translate (murah, model Air) & QR decoder.
- **UX**: Hasil translate/enrich tampil sebagai "saran" untuk disetujui.
- **PM**: Nilai tinggi untuk firma yang menangani klien multinasional.

---

### 🅴 P2 — AI Agent Proaktif (Pemindaian Periodik)

**Usulan**: Agent AI yang bekerja di latar belakang (analog Lark CLI).

| Sub-fitur | Detail |
|---|---|
| **Pindai dokumen masuk** | Periodik kategorikan & push ringkasan ke inbox |
| **Jurnal rutin otomatis** | Sewa/gaji/depresiasi auto-generate + auto-post bila confidence tinggi |
| **Pengingat deadline** | Pindai deadline SPT/rekonsiliasi → ringkas & jadwalkan |

**Perspektif peran**:
- **BE**: Infrastruktur cron + worker (sudah ada BullMQ) + agent loop.
- **PM**: Butuh maturity & trust — phase terakhir.
- **CTO**: Waspadai biaya LLM per-job; tetap pakai model routing (Air default, strong fallback).

---

## 4. Roadmap Rekomendasi

| Fase | Isi | Target |
|---|---|---|
| **Fase 1 (P0)** | AI Field baris jurnal + Inbox cerdas | 2–3 minggu |
| **Fase 2 (P1)** | Command bar AI + translate/enrich | 3–4 minggu |
| **Fase 3 (P2)** | Agent proaktif | setelah validasi Fase 1–2 |

## 5. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Biaya LLM naik (banyak enrich) | Model routing (Air default, strong fallback) + caching + batch (1 call utk banyak baris) + OCR lokal tetap gratis |
| Akurasi kategori/deskripsi salah | Tampil sebagai "saran" + confidence + audit trail + tetap butuh review akuntan |
| Terlalu banyak fitur AI = kompleks UX | Satu command bar + prinsip "saran, bukan final"; AI tidak menggantikan otorisasi akuntan |
| Regulasi (PSAK/DJP) | AI tidak menandatangani; akuntan tetap reviewer akhir; semua hasil tersimpan dengan sumber |

## 6. Dampak pada Pricing (kuota)

Enrich & summary = **transaksi tambahan** yang bisa masuk hitungan kuota/over-quota (`Rp 350/tx`) atau jadi **fitur premium** (modul "AI Insight"). Ini memperkuat argumen paywall & ARPU — selaras pricing kuota-only yang sudah final.
