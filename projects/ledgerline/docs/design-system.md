# Design System — Praktis (EN-07)

Design system formal untuk produk Praktis (AI Bookkeeping Platform).
Dasar: dark navy + gold, trust blue sekunder, tipografi khas Indonesia-tech.
Sumber token: `src/app/globals.css` (CSS custom properties).

---

## 1. Prinsip

1. **Data-dense, gelap, tenang** — latar navy gelap `#0b1120`, konten `#e5e9f2`; mata fokus ke angka.
2. **Gold = aksi & AI** — emas dipakai hemat: CTA utama, highlight KPI, fokus keyboard.
3. **Trust blue = sekunder & chart** — biru untuk data/grafik, link sekunder, status informasi.
4. **Tipografi Indonesia-tech** — DM Sans (body), Space Grotesk (heading/tabular), JetBrains Mono (angka/kode).
5. **Motion halus & konsisten** — stagger saat load, fade-in, progress grow; hormati `prefers-reduced-motion`.

## 2. Warna (Token)

| Token | Value | Penggunaan |
|---|---|---|
| `--background` | `#0b1120` | Latar halaman |
| `--foreground` | `#e5e9f2` | Teks utama |
| `--card` | `#101a30` | Surface kartu/panel |
| `--card-border` (`--line`) | `#1e2a45` | Border kartu |
| `--accent` | `#f5c518` | Gold — CTA, highlight, fokus |
| `--trust` | `#3b82f6` | Blue — chart, link sekunder |
| `--positive` | `#22c55e` | Sukses / SLA met |
| `--warning` | `#f59e0b` | Peringatan / at-risk |
| `--danger` | `#ef4444` | Gagal / breach / tolak |

Utilitas Tailwind: `bg-card`, `border-line`, `text-accent`, `bg-accent`, `text-trust`, `bg-trust`, `text-positive/warning/danger`, `bg-*` dst.

### Status tones (badge)
- `positive` → emerald (met/approve/aktif)
- `warning` → amber (at-risk/pending lama)
- `danger` → red (breach/tolak/gagal)
- `neutral` → slate (informasi)
- `accent` → gold (AI/highlight)

## 3. Tipografi

| Token | Font | Penggunaan |
|---|---|---|
| `--font-sans` | DM Sans | Body, label, tombol |
| `--font-heading` | Space Grotesk | H1–H6, angka besar KPI |
| `--font-mono` | JetBrains Mono | Angka tabular, kode, ID |

Aturan: heading pakai `font-heading` (kelas Tailwind sudah di-set via `@theme`); data numerik pakai `font-mono`/`tabular-nums` agar sejajar.

## 4. Spacing & Radius

- Spacing: scale Tailwind default (4px base) — `p-4`/`p-5` kartu, `space-y-6` antar section.
- Radius: `rounded-xl` (kartu/panel), `rounded-lg` (tombol/input), `rounded-full` (badge).
- Border: `border border-line` pada kartu; `border-dashed border-slate-700` pada empty state.

## 5. Shadow & Hover

- `card-hover`: border menyala ke gold + shadow lembut + `translateY(-1px)` saat hover (dipakai KPI cards).
- Tidak ada shadow berat — surface gelap + border sudah cukup.

## 6. Motion

| Utility | Animasi | Penggunaan |
|---|---|---|
| `.animate-fade-in` | fade 0.6s | Halaman/panel utama |
| `.animate-stagger` | fadeInUp berurutan (delay 0.05–0.40s) | Grid kartu/daftar |
| `.animate-progress` | progressGrow 0.8s | Bar SLA |
| `prefers-reduced-motion` | semua animasi dimatikan | Aksesibilitas |

## 7. Grain Overlay

`body::before` — SVG noise 256px, opacity 0.03, fixed, pointer-events none.
Memberi tekstur halus ala fintech tanpa mengganggu keterbacaan.

## 8. Komponen Library (`src/components/ui/`)

| Komponen | File | Catatan |
|---|---|---|
| `Card`, `CardHeader`, `CardBody` | `card.tsx` | `rounded-xl border border-line bg-card/40 p-5`; header opsional title+desc |
| `Button` | `button.tsx` | variant: `primary` (gold), `secondary` (outline), `ghost`, `danger`; size `sm`/`md` |
| `Badge` (`StatusBadge`) | `badge.tsx` | tone: positive/warning/danger/neutral/accent; dot + label |
| `Table`, `THead`, `TBody`, `TR`, `TH`, `TD` | `table.tsx` | header uppercase tracking; angka `font-mono`; row hover |
| `EmptyState` | `empty-state.tsx` | ikon + judul + deskripsi + aksi opsional |
| `ErrorState` | `error-state.tsx` | pesan + tombol coba lagi |
| `Skeleton`, `SkeletonList` | `skeleton.tsx` | loading shimmer |

Konvensi:
- Komponen stateless, className pass-through (`className?: string`).
- Server-safe (tidak wajib `"use client"`) kecuali butuh state.
- Aksesibilitas: `role` sesuai (status/alert), `:focus-visible` gold outline.

## 9. Dashboard per Role (EN-07)

| Role | Fokus | Urutan section |
|---|---|---|
| JUNIOR | Antrian review miliknya | Pipeline (antrian) → Aktivitas → SLA → Insight |
| SENIOR | Exception & kualitas | SLA/Confidence → Pipeline → Insight → Aktivitas |
| TAX | Review pajak | Pipeline → SLA → Insight → Aktivitas |
| PARTNER | KPI firma & kepatuhan | SLA → Insight → Confidence → Pipeline → Aktivitas |
| ADMIN (dev) | Semua | Pipeline → SLA/Confidence → Aktivitas → Insight |

Prinsip: tiap role langsung melihat *pekerjaannya*; KPI ringkas tetap di atas (KpiCards) untuk semua role.

## 10. Portal Klien

Portal klien memakai token yang sama (dark navy + gold, DM Sans) — sudah konsisten sejak EN-08 tanpa desain ulang; export dokumen (PDF) memakai template dark BI yang selaras.
