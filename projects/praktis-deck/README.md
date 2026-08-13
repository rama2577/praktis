# Praktis — Digital Imaging untuk Deck

10 layar mockup (dark navy, konsisten dengan produk) yang menggambarkan app bekerja
di tiap tahap proses. Siap di-embed ke deck.

## Deck selesai ✅

**`V6 Praktis Deck.html`** (aktif) — 18 slide 16:9 (1920×1080), **hybrid** (cover & CTA dark, isi light),
Bahasa Indonesia. Upgrade dari V4: **+5 slide modul baru** (10–14) memakai 10 screenshot retina
`images-modul/` — Migrasi Kertas Kerja (Import Wizard), Subledger & Aging, COA Template 17 Industri,
Matrix 12 Bulan & Rounding, SPT 1771 & Perubahan Ekuitas; slide analisa memakai ikhtisar bulanan.
V5 (13 slide) tetap tersedia di `archive/`.

### Enhancement V6 (autoclaw-design-capability)
- Emoji diganti **SVG linear icons** (stroke 1.7, currentColor, gold) — anti AI-slop
- **Speaker notes** lengkap 18/18 (`<aside class="notes">`, siap untuk presenter mode / PPTX)
- Keterbacaan: h2 52→56, h4 20→22, tabel 15→16, caption 12.5→15, pill 13→15; kontras `--text-3` dinaikkan (#64748b)
- `<meta auto-designer-preview-device=slide>` + `data-slide`/`data-screen-label` per halaman
- Arsitektur versi: V1–V5 di `archive/`, aktif = V6

**Navigasi:** `→`/`Space` maju · `←` mundur · `Home`/`End` lompat · klik kanan/tepi kiri layar juga berpindah.  
**Print/PDF:** `Cmd/Ctrl+P` → ukuran sudah di-set landscape 1920×1080 per slide (format deck).  
**Scale-to-fit:** otomatis menyesuaikan layar (body di-scale, tidak ada scrollbar).

### Peta slide (V5)

| # | Slide | Embed |
|---|---|---|
| 1 | Cover — 5× lebih banyak klien · 25–30 klien/junior | — |
| 2 | Masalah — 85% waktu entry & cleaning | bar alokasi waktu |
| 3 | Solusi — pipeline upload→draft→review→laporan | 03-pipeline, 04-draft-generated |
| 4 | Angka kunci — tabel manual vs Praktis (v4) | — (tabel + metric) |
| 5 | Cycle days — 12–20 → 3–6 hari | 10-report |
| 6 | Kapasitas per head — 26–30 klien/junior (v4) | 02-upload |
| 7 | Simulasi 1 klien — 1.850 → 298 mnt (−84%) | bar manual vs Praktis+portal |
| 8 | Bottleneck senior → confidence scoring | 09-exception, 05-review-junior |
| 9 | Fitur kunci — traceability, SLA, RBAC | 01-dashboard, 07-tax-review |
| 10 | **Migrasi kertas kerja** — Import Wizard Excel | mod-01, mod-02 |
| 11 | **Subledger & Aging** — 4 bucket, buku besar pembantu | mod-03, mod-04 |
| 12 | **COA Template** — 17 industri, auto-provision | mod-05, mod-06 |
| 13 | **Matrix 12 Bulan & Rounding** — pola 1-12, ribuan/jutaan | mod-07, mod-10 |
| 14 | **SPT 1771 & Perubahan Ekuitas** — koreksi fiskal | mod-08, mod-09 |
| 15 | **Portal klien** — upload sendiri, status real-time | 12-beranda-klien, 13-upload-klien |
| 16 | **Analisa & Wawasan AI** — ikhtisar Tahunan⇄Bulanan, komentar AI | mod-11, 16-wawasan-ai |
| 17 | Kepercayaan & adopsi — enkripsi, akses terisolasi | 08-partner-approval |
| 18 | CTA — pilot 1 klien 30 hari | — |

Screenshot tiap slide: `shots-v5/slide-01.png … slide-18.png` (regenerasi via `scripts/screenshot-deck.js`).
Versi terdahulu diarsipkan: `archive/` berisi V1 (dark), V2 (light), V3 (hybrid 11 slide).

**Navigasi:** `→`/`Space` maju · `←` mundur · `Home`/`End` lompat · klik kanan/tepi kiri layar juga berpindah.  
**Print/PDF:** `Cmd/Ctrl+P` → ukuran sudah di-set landscape 1920×1080 per slide (format deck).  
**Scale-to-fit:** otomatis menyesuaikan layar (body di-scale, tidak ada scrollbar).

### Peta slide

| # | Slide | Embed |
|---|---|---|
| 1 | Cover — 5× lebih banyak klien | — |
| 2 | Masalah — 85% waktu entry & cleaning | bar alokasi waktu |
| 3 | Solusi — pipeline upload→draft→review→laporan | 03-pipeline, 04-draft-generated |
| 4 | Angka kunci — tabel manual vs Praktis | — (tabel + metric) |
| 5 | Cycle days — 12–20 → 3–6 hari | 10-report |
| 6 | Kapasitas per head — 20–30 klien/junior | 02-upload |
| 7 | Simulasi 1 klien — 1.850 → 398 mnt | bar manual vs Praktis |
| 8 | Bottleneck senior → confidence scoring | 09-exception, 05-review-junior |
| 9 | Fitur kunci — traceability, SLA, RBAC | 01-dashboard, 07-tax-review |
| 10 | Kepercayaan & adopsi — enkripsi, audit trail | 08-partner-approval |
| 11 | CTA — pilot 1 klien 30 hari | — |

Screenshot tiap slide: `shots/slide-01.png … slide-11.png` (regenerasi via `scripts/screenshot-deck.js`).
Versi terdahulu diarsipkan ke `archive/`.

---

## Daftar gambar

### Portal klien (baru — 2026-08-09)

| File | Isi | Slide deck yang disarankan |
|---|---|---|
| `images/11-login-klien.png` | Login portal klien (email/kata sandi, branding firma) | Portal klien |
| `images/12-beranda-klien.png` | Beranda klien: KPI, status dokumen, laporan terbaru, siklus H+3 | Portal klien |
| `images/13-upload-klien.png` | Upload drag-drop oleh klien + riwayat status dokumen | Portal klien / alur |
| `images/14-laporan-klien.png` | Laporan standar: laba rugi Juli 2026, unduh PDF/XLSX | Nilai klien |
| `images/15-analisa-klien.png` | Analisa: chart tren 6 bulan, margin, beban per kategori, 4 rasio | Analisa & wawasan |
| `images/16-wawasan-ai.png` | Komentar AI: ringkasan + 4 insight + rekomendasi + disclaimer | Analisa & wawasan |

Generator: `generate_client_mockups.py` (output `mockups/11-*.html … 16-*.html`).
Angka analisa ulang dengan portal: `analysis.md` §11 (v4) — klien/junior 25–30 (s.d. 35), overhead −77%,
total beban klien kecil 1.850 → 298 mnt (−84%). Deck belum direvisi (menunggu perintah Rama).

### Layar internal (v1–v10)

| File | Isi | Slide deck yang disarankan |
|---|---|---|
| `images/01-dashboard.png` | Dashboard operasional: 5 KPI, pipeline produksi 5 stage, SLA bars, distribusi confidence AI, activity feed | Solusi / overview |
| `images/02-upload.png` | Halaman klien: upload drag-drop, daftar dokumen, jurnal hasil AI | Alur adopsi |
| `images/03-pipeline.png` | AI pipeline berjalan: validasi → ekstraksi → deteksi event → draft → scoring (spinner) | Cara kerja AI |
| `images/04-draft-generated.png` | Draft jurnal hasil AI: garis jurnal (Piutang/Pendapatan/PPN 11%), ref PSAK 72, confidence 94%, saldo seimbang | Cara kerja AI / kualitas |
| `images/05-review-junior.png` | Antrian review junior: kartu task + badge urgent + panel approve/kembalikan/tolak | Alur review 4 lapis |
| `images/06-review-senior.png` | Review senior: jejak "lulus junior" + verifikasi balance/traceability | Alur review 4 lapis |
| `images/07-tax-review.png` | Review pajak: pemeriksaan PPN 11%, rekap PPN masa, jatuh tempo SPT | Alur review 4 lapis |
| `images/08-partner-approval.png` | Persetujuan partner: audit trail 4 reviewer, kunci final APPROVED | Alur review 4 lapis |
| `images/09-exception.png` | Manajemen exception: flag "Faktur PPN tidak ditemukan" (confidence 55%) + form resolusi | Kepercayaan / human-in-loop |
| `images/10-report.png` | Laporan final: laba rugi, neraca, pengiriman ke klien (H+3, SLA H+5) | Hasil akhir / nilai klien |

## Data demo konsisten (cerita di semua layar)

- Firma **Praktis** · user demo: Budi Santoso (Junior), Rina Hartono (Senior), Sari Wulandari (Pajak)
- Klien **PT Sentosa Raya** (ritel) · dokumen `invoice-penjualan.pdf`, `rekening-koran-bca-juli.xlsx`
- Jurnal contoh: **Penjualan kredit INV-2026-0812** — Piutang Rp 9.435.000 / Pendapatan Rp 8.500.000 / PPN Keluaran Rp 935.000 (11%), ref PSAK 72, confidence 94%

## Regenerasi

Mockup adalah HTML statis — ubah `generate_mockups.py`, lalu:
```bash
cd projects/ledgerline && npx tsx scripts/screenshot-mockups.ts
```
(Playwright + Chrome; output 1440×900 @2x ke `images/`)

## Catatan

- Angka di mockup (28 klien, 1.847 transaksi, dll.) adalah **data demo** untuk bercerita —
  konsisten dengan skenario full-automation di `analysis.md` (20–30 klien/junior).
- Semua teks Bahasa Indonesia, tema dark navy `#0b1120` + aksen `#f5c518` (identitas produk).

## Manual Book ✅

**`Praktis Manual Book v1.html`** + **`Praktis Manual Book v1.pdf`** (20 hal A4) — panduan 13 bagian
dengan 14 screenshot (images-modul/ + images-app/): pendahuluan & alur kerja, login & dashboard,
klien & industri, COA template, import kertas kerja, subledger & aging, ikhtisar, matrix 12 bulan,
laporan dasar, pembulatan, SPT 1771, antrian kerja, tips & referensi. Export PDF: `node scripts/export-pdf-a4.js`.
