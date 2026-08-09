#!/usr/bin/env python3
"""Generator mockup layar Praktis untuk deck — 10 layar HTML (dark navy)."""
import os

OUT = os.path.join(os.path.dirname(__file__), "mockups")
os.makedirs(OUT, exist_ok=True)

CSS = """
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; background:#0b1120; color:#e5e9f2; display:flex; min-height:100vh; }
/* sidebar */
.side { width:220px; background:#0d1526; border-right:1px solid #1e2a45; padding:18px 12px; display:flex; flex-direction:column; gap:4px; flex-shrink:0; }
.logo { display:flex; align-items:center; gap:10px; padding:0 8px 16px; border-bottom:1px solid #1e2a45; margin-bottom:14px; }
.logo .badge { width:34px; height:34px; border-radius:9px; background:#f5c518; color:#0b1120; font-weight:800; display:flex; align-items:center; justify-content:center; font-size:15px; }
.logo b { font-size:14px; } .logo small { display:block; color:#64748b; font-size:10px; }
.menu { font-size:10px; color:#475569; text-transform:uppercase; letter-spacing:.08em; padding:10px 8px 4px; }
.mi { padding:8px 10px; border-radius:8px; font-size:13px; color:#94a3b8; }
.mi.on { background:rgba(245,197,24,.12); color:#f5c518; font-weight:600; }
.mi.off { color:#475569; }
.sp { flex:1; }
.me { display:flex; align-items:center; gap:9px; border-top:1px solid #1e2a45; padding:12px 8px 0; }
.av { width:30px; height:30px; border-radius:50%; background:rgba(245,197,24,.18); color:#f5c518; font-weight:700; display:flex; align-items:center; justify-content:center; font-size:12px; }
/* main */
.main { flex:1; display:flex; flex-direction:column; min-width:0; }
.top { display:flex; align-items:center; justify-content:space-between; padding:12px 26px; border-bottom:1px solid #1e2a45; background:rgba(16,26,48,.5); }
.top h3 { font-size:13px; font-weight:500; color:#cbd5e1; }
.tright { display:flex; align-items:center; gap:12px; font-size:11px; color:#64748b; }
.pill { display:inline-flex; align-items:center; gap:6px; border:1px solid rgba(16,185,129,.35); background:rgba(16,185,129,.1); color:#34d399; padding:3px 10px; border-radius:99px; font-weight:600; font-size:10px; }
.dot { width:6px; height:6px; border-radius:50%; background:#34d399; }
.content { padding:24px 26px; display:flex; flex-direction:column; gap:18px; }
.h1 { font-size:21px; font-weight:700; } .sub { font-size:12px; color:#64748b; margin-top:3px; }
/* cards & grid */
.grid { display:grid; gap:14px; }
.g5 { grid-template-columns:repeat(5,1fr); } .g2 { grid-template-columns:repeat(2,1fr); } .g3 { grid-template-columns:repeat(3,1fr); }
.card { background:#101a30; border:1px solid #1e2a45; border-radius:14px; padding:16px; }
.kpi .l { font-size:10px; text-transform:uppercase; letter-spacing:.07em; color:#64748b; display:flex; justify-content:space-between; }
.kpi .v { font-size:26px; font-weight:700; margin-top:8px; } .kpi .h { font-size:10px; color:#64748b; margin-top:4px; }
.grn{color:#34d399} .ylw{color:#f5c518} .red{color:#f87171} .sky{color:#38bdf8} .slt{color:#e5e9f2}
/* pipeline */
.pipe { display:flex; align-items:stretch; gap:8px; }
.stage { flex:1; border-radius:12px; border:1px solid #1e2a45; background:#0d1526; padding:14px; min-width:0; }
.stage .t { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:#64748b; }
.stage .n { font-size:24px; font-weight:700; margin-top:6px; }
.stage .d { font-size:9px; color:#475569; margin-top:3px; }
.arrow { align-self:center; color:#334155; font-size:16px; }
/* bars */
.bar { height:8px; border-radius:99px; background:#1e2a45; overflow:hidden; margin-top:6px; }
.bar > i { display:block; height:100%; border-radius:99px; }
/* table */
table { width:100%; border-collapse:collapse; font-size:12px; }
th { text-align:left; color:#64748b; font-weight:500; font-size:10px; text-transform:uppercase; letter-spacing:.05em; padding:8px 10px; border-bottom:1px solid #1e2a45; }
td { padding:9px 10px; border-bottom:1px solid #141f38; color:#cbd5e1; }
.mono { font-family:'SF Mono',Menlo,monospace; font-size:11px; }
/* buttons */
.btn { border-radius:9px; padding:9px 16px; font-size:12px; font-weight:600; border:none; cursor:pointer; }
.b-green{background:#059669;color:#fff} .b-amber{background:rgba(245,197,24,.15);color:#f5c518;border:1px solid rgba(245,197,24,.4)}
.b-red{background:rgba(248,113,113,.12);color:#f87171;border:1px solid rgba(248,113,113,.4)} .b-slate{background:#1e293b;color:#cbd5e1}
/* queue cards */
.q { border:1px solid #1e2a45; border-radius:12px; background:#0d1526; padding:14px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
.q.urgent { border-color:rgba(248,113,113,.45); }
.chip { font-size:10px; padding:2px 9px; border-radius:99px; font-weight:600; }
.c-j{background:rgba(245,158,11,.14);color:#fbbf24;border:1px solid rgba(245,158,11,.4)}
.c-s{background:rgba(245,197,24,.14);color:#f5c518;border:1px solid rgba(245,197,24,.4)}
.c-t{background:rgba(56,189,248,.12);color:#38bdf8;border:1px solid rgba(56,189,248,.35)}
.c-p{background:rgba(248,113,113,.12);color:#f87171;border:1px solid rgba(248,113,113,.4)}
.c-urgent{background:rgba(248,113,113,.18);color:#f87171;border:1px solid rgba(248,113,113,.5)}
.c-ok{background:rgba(16,185,129,.12);color:#34d399;border:1px solid rgba(16,185,129,.35)}
/* upload */
.drop { border:2px dashed #334155; border-radius:14px; padding:38px; text-align:center; color:#64748b; background:rgba(13,21,38,.5); }
.drop b { color:#cbd5e1; font-size:14px; } .drop .ic { font-size:30px; margin-bottom:8px; }
/* misc */
.row { display:flex; align-items:center; gap:10px; }
.mt { margin-top:10px; } .mb { margin-bottom:10px; } .small { font-size:11px; color:#64748b; }
.right { margin-left:auto; } .ta-r { text-align:right; }
.step { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid #141f38; font-size:13px; }
.ok { color:#34d399; font-weight:700; } .wait { color:#64748b; } .spin { display:inline-block; width:14px; height:14px; border:2px solid #334155; border-top-color:#f5c518; border-radius:50%; animation:sp 1s linear infinite; }
@keyframes sp { to { transform:rotate(360deg); } }
.alert { border:1px solid rgba(248,113,113,.4); background:rgba(248,113,113,.08); color:#fca5a5; border-radius:10px; padding:10px 14px; font-size:12px; }
textarea { width:100%; border-radius:9px; border:1px solid #334155; background:#0b1120; color:#cbd5e1; padding:9px 11px; font-size:12px; font-family:inherit; resize:none; }
.conf { font-size:11px; color:#f5c518; font-weight:600; }
"""

def shell(side_on, content, title="Praktis — AI Bookkeeping"):
    menu = [
        ("Dashboard", "Dashboard", "on" if side_on == "Dashboard" else "off"),
        ("Antrian Review", "Antrian", "on" if side_on == "Antrian" else "off"),
        ("Pengecualian", "Exception", "on" if side_on == "Exception" else "off"),
        ("Metrik Kualitas", "Kualitas", "on" if side_on == "Kualitas" else "off"),
        ("Knowledge Base", "Knowledge", "on" if side_on == "Knowledge" else "off"),
        ("Klien", "Klien", "on" if side_on == "Klien" else "off"),
    ]
    m = ""
    groups = [("Operasional", ["Dashboard", "Antrian", "Exception"]), ("Analitik", ["Kualitas", "Knowledge"]), ("Sistem", ["Klien"])]
    for gname, keys in groups:
        m += f'<div class="menu">{gname}</div>'
        for key, label, state in menu:
            if key in keys:
                m += f'<div class="mi {state}">{label}</div>'
    return f"""<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="side">
  <div class="logo"><div class="badge">P</div><div><b>Praktis</b><small>AI Bookkeeping</small></div></div>
  {m}
  <div class="sp"></div>
  <div class="me"><div class="av">BS</div><div><div style="font-size:12px">Budi Santoso</div><div style="font-size:10px;color:#64748b">Junior Accountant</div></div></div>
</div>
<div class="main">
  <div class="top"><h3>Operations Dashboard</h3>
    <div class="tright"><span>Sabtu, 8 Agustus 2026</span><span class="pill"><span class="dot"></span>AI Online</span></div>
  </div>
  <div class="content">{content}</div>
</div>
</body></html>"""

def kpi(l, v, h, tone="slt", icon="•"):
    return f'<div class="card kpi"><div class="l"><span>{l}</span><span>{icon}</span></div><div class="v {tone}">{v}</div><div class="h">{h}</div></div>'

def stage(t, n, d, tone="slt"):
    return f'<div class="stage"><div class="t">{t}</div><div class="n {tone}">{n}</div><div class="d">{d}</div></div>'

def slabar(label, target, pct, tone, detail):
    return f"""<div style="margin-bottom:12px"><div class="row" style="justify-content:space-between"><span style="font-size:12px;color:#cbd5e1">{label} <span class="small">({target})</span></span><span class="small">{detail}</span></div>
    <div class="bar"><i style="width:{pct}%;background:{tone}"></i></div></div>"""

# ── 01 Dashboard ──────────────────────────────────────────────
content = f"""
<div><div class="h1">Dashboard</div><div class="sub">Ringkasan operasional real-time — Jumat, 7 Agustus 2026</div></div>
<div class="grid g5">
{kpi("Klien Aktif","28","+3 bulan ini","slt","🏢")}
{kpi("AI Automation","96,8%","jurnal AI tanpa pengecualian","grn","🤖")}
{kpi("Jobs in Progress","342","128 draft AI · 214 menunggu review","ylw","⚙️")}
{kpi("Transaksi Hari Ini","1.847","+12% vs rata-rata harian","slt","📄")}
{kpi("SLA Breaches","2","Junior 1 · Pajak 1","red","⏱️")}
</div>
<div class="card"><div class="row mb"><b style="font-size:13px">Pipeline Produksi</b><span class="small right">auto-refresh · 14:23:05</span></div>
<div class="pipe">
{stage("Draft Jurnal","96","hasil AI menunggu antrian")}
<span class="arrow">→</span>
{stage("Rule Engine","12","dokumen diproses AI","ylw")}
<span class="arrow">→</span>
{stage("Review Junior","118","verifikasi awal","ylw")}
<span class="arrow">→</span>
{stage("Review Senior","64","pemeriksaan lanjutan")}
<span class="arrow">→</span>
{stage("Review Pajak","32","tax & persetujuan partner","sky")}
</div></div>
<div class="grid g2">
  <div class="card"><b style="font-size:13px">Monitoring SLA</b><div class="mt">
  {slabar("Review Junior","≤ 2 jam",62,"#fbbf24","5 antre · 1 telat · 12 selesai (11 OK/1 breach)")}
  {slabar("Review Senior","≤ 4 jam",34,"#34d399","3 antre · 9 selesai (9 OK)")}
  {slabar("Review Pajak","≤ 4 jam",48,"#34d399","2 antre · 8 selesai (7 OK/1 breach)")}
  {slabar("Persetujuan Partner","≤ 2 jam",21,"#34d399","1 antre · 6 selesai (6 OK)")}
  </div></div>
  <div class="card"><b style="font-size:13px">Distribusi Keyakinan AI</b><div class="small mb">Skor confidence jurnal aktual</div>
  <div style="display:flex;align-items:flex-end;gap:14px;height:150px;padding-top:10px">
    <div style="flex:1;text-align:center"><div style="height:14px;background:#f5c518;border-radius:6px 6px 0 0;width:100%"></div><div class="small" style="margin-top:6px">&lt;50%</div></div>
    <div style="flex:1;text-align:center"><div style="height:34px;background:#f5c518;border-radius:6px 6px 0 0"></div><div class="small" style="margin-top:6px">50–70%</div></div>
    <div style="flex:1;text-align:center"><div style="height:78px;background:#f5c518;border-radius:6px 6px 0 0"></div><div class="small" style="margin-top:6px">70–85%</div></div>
    <div style="flex:1;text-align:center"><div style="height:140px;background:#f5c518;border-radius:6px 6px 0 0"></div><div class="small" style="margin-top:6px">≥85%</div></div>
  </div></div>
</div>
<div class="card"><b style="font-size:13px">Aktivitas Terbaru</b>
  <div class="step"><span class="ok">✓</span><span>Sistem — AI membuat draft jurnal <span class="small">· INV-2026-0812 · PT Sentosa Raya</span></span><span class="small right">2 mnt lalu</span></div>
  <div class="step"><span class="ok">✓</span><span>Rina Hartono — menyetujui jurnal <span class="small">· 12 entri · PT Maju Jaya</span></span><span class="small right">8 mnt lalu</span></div>
  <div class="step"><span style="color:#f87171">🚩</span><span>Sistem — dokumen ditandai pengecualian <span class="small">· faktur PPN tidak ditemukan</span></span><span class="small right">12 mnt lalu</span></div>
  <div class="step"><span class="ok">✓</span><span>Budi Santoso — menyetujui jurnal <span class="small">· 4 entri · CV Berkah Abadi</span></span><span class="small right">25 mnt lalu</span></div>
</div>"""
open(f"{OUT}/01-dashboard.html", "w").write(shell("Dashboard", content))

# ── 02 Upload ─────────────────────────────────────────────────
content = f"""
<div><div class="h1">PT Sentosa Raya</div><div class="sub">Klien · Ritel · NPWP 01.234.567.8-012.000 · 1.247 transaksi bulan ini</div></div>
<div class="grid g2">
  <div class="card"><b style="font-size:13px">Unggah Dokumen</b><div class="mt">
    <div class="drop"><div class="ic">📤</div><b>Tarik & letakkan dokumen di sini</b><div class="mt">atau <span style="color:#f5c518">pilih file</span> — PDF, JPG, atau XLSX (maks 10 MB)</div></div>
    <div class="row mt"><span class="chip c-ok">BANK_STATEMENT</span><span>Rekening koran BCA — mutasi Juli 2026</span></div>
    <div class="row mt" style="justify-content:flex-end"><button class="btn b-green">Unggah & Proses AI →</button></div>
  </div></div>
  <div class="card"><b style="font-size:13px">Dokumen Terbaru</b>
    <table class="mt"><tr><th>Berkas</th><th>Tipe</th><th>Status</th><th class="ta-r">Ukuran</th></tr>
    <tr><td>rekening-koran-bca-juli.xlsx</td><td>Bank</td><td><span class="chip c-ok">Diproses ✓</span></td><td class="ta-r mono">842 KB</td></tr>
    <tr><td>invoice-penjualan.pdf</td><td>Invoice</td><td><span class="chip c-ok">Diproses ✓</span></td><td class="ta-r mono">214 KB</td></tr>
    <tr><td>faktur-pembelian-supplier.jpg</td><td>Invoice</td><td><span class="chip c-j">Dalam antrian AI</span></td><td class="ta-r mono">1,1 MB</td></tr>
    <tr><td>laporan-persediaan.xlsx</td><td>Bank</td><td><span class="chip c-urgent">Perlu perhatian</span></td><td class="ta-r mono">356 KB</td></tr>
    </table></div>
</div>
<div class="card"><b style="font-size:13px">Jurnal yang Dihasilkan AI (bulan ini)</b><div class="small mb">128 jurnal draft · 96,8% lolos validasi · 4 perlu review</div>
  <table><tr><th>Deskripsi</th><th>Keyakinan</th><th>Status</th><th class="ta-r">Total</th></tr>
  <tr><td>Penjualan kredit — INV-2026-0812</td><td><span class="conf">94%</span></td><td><span class="chip c-s">Review Senior</span></td><td class="ta-r mono">Rp 9.435.000</td></tr>
  <tr><td>Pembayaran utang — PO-4451</td><td><span class="conf">91%</span></td><td><span class="chip c-j">Review Junior</span></td><td class="ta-r mono">Rp 4.200.000</td></tr>
  <tr><td>Penerimaan pelunasan piutang</td><td><span class="conf">88%</span></td><td><span class="chip c-j">Review Junior</span></td><td class="ta-r mono">Rp 6.750.000</td></tr>
  <tr><td>Beban gaji & tunjangan — Juli</td><td><span class="conf">76%</span></td><td><span class="chip c-urgent">Perlu review</span></td><td class="ta-r mono">Rp 48.000.000</td></tr>
  </table></div>"""
open(f"{OUT}/02-upload.html", "w").write(shell("Klien", content))

# ── 03 Pipeline processing ─────────────────────────────────────
content = f"""
<div><div class="h1">AI Pipeline</div><div class="sub">Memproses rekening-koran-bca-juli.xlsx · PT Sentosa Raya</div></div>
<div class="grid g2">
  <div class="card"><b style="font-size:13px">Status Pemrosesan</b>
    <div class="mt step"><span class="ok">✓</span><span>Validasi berkas <span class="small">(magic bytes · 842 KB · XLSX)</span></span></div>
    <div class="mt step"><span class="ok">✓</span><span>Ekstraksi data <span class="small">(3 sheet · 1.247 baris mutasi)</span></span></div>
    <div class="mt step"><span class="ok">✓</span><span>Deteksi business event <span class="small">(penerimaan, pembayaran, transfer)</span></span></div>
    <div class="mt step"><span class="ok">✓</span><span>Draft jurnal + referensi PSAK & COA</span></div>
    <div class="mt step"><span class="ok">✓</span><span>Validasi saldo (debit = kredit)</span></div>
    <div class="mt step"><span class="wait"><span class="spin"></span></span><span style="color:#f5c518">Penilaian keyakinan (confidence scoring)…</span></div>
    <div class="mt" style="font-size:11px;color:#64748b">Estimasi selesai: &lt; 5 detik · trace ID 9f2c-81ab</div>
  </div>
  <div class="card"><b style="font-size:13px">Ringkasan Deteksi</b>
    <div class="mt row" style="justify-content:space-between"><span class="small">Transaksi terdeteksi</span><b>1.247</b></div>
    <div class="mt row" style="justify-content:space-between"><span class="small">Jurnal draft dihasilkan</span><b>86</b></div>
    <div class="mt row" style="justify-content:space-between"><span class="small">Keyakinan tinggi (≥85%)</span><b class="grn">78</b></div>
    <div class="mt row" style="justify-content:space-between"><span class="small">Perlu perhatian (exception)</span><b class="ylw">4</b></div>
    <div class="mt row" style="justify-content:space-between"><span class="small">Tidak terdeteksi</span><b class="red">4</b></div>
    <div class="alert mt">🚩 4 transaksi tidak dikenali — akan diflag untuk review manusia, tidak pernah diarang oleh AI.</div>
  </div>
</div>"""
open(f"{OUT}/03-pipeline.png.html".replace(".png.html", ".html"), "w").write(shell("Dashboard", content))

# ── 04 Draft generated ─────────────────────────────────────────
content = f"""
<div><div class="h1">Draft Jurnal — Hasil AI</div><div class="sub">INV-2026-0812 · Penjualan kredit · PT Sentosa Raya · <span class="conf">Keyakinan 94%</span></div></div>
<div class="grid g3">
  <div class="card" style="grid-column:span 2"><b style="font-size:13px">Garis Jurnal</b>
    <table class="mt"><tr><th>Kode</th><th>Akun</th><th class="ta-r">Debit</th><th class="ta-r">Kredit</th><th>Ref</th></tr>
    <tr><td class="mono">1-1200</td><td>Piutang Usaha</td><td class="ta-r mono">Rp 9.435.000</td><td class="ta-r mono">–</td><td class="mono">PSAK 72</td></tr>
    <tr><td class="mono">4-1000</td><td>Pendapatan Penjualan</td><td class="ta-r mono">–</td><td class="ta-r mono">Rp 8.500.000</td><td class="mono">PSAK 72</td></tr>
    <tr><td class="mono">2-2000</td><td>PPN Keluaran (11%)</td><td class="ta-r mono">–</td><td class="ta-r mono">Rp 935.000</td><td class="mono">PPN 11%</td></tr>
    <tr style="background:rgba(245,197,24,.05)"><td colspan="2"><b>Saldo</b></td><td class="ta-r mono"><b>Rp 9.435.000</b></td><td class="ta-r mono"><b>Rp 9.435.000</b></td><td class="grn">✓ seimbang</td></tr>
    </table>
    <div class="row mt"><span class="chip c-ok">DRAFT</span><span class="small">Bersumber dari: invoice-penjualan.pdf · dibuat oleh AI · trace 9f2c-81ab</span></div>
  </div>
  <div class="card"><b style="font-size:13px">Verifikasi AI</b>
    <div class="mt step"><span class="ok">✓</span><span>Saldo debit = kredit</span></div>
    <div class="mt step"><span class="ok">✓</span><span>PPN 11% dari DPP Rp 8.500.000</span></div>
    <div class="mt step"><span class="ok">✓</span><span>Ref PSAK 72 (pendapatan kontrak)</span></div>
    <div class="mt step"><span class="ok">✓</span><span>Kode akun valid (COA ritel)</span></div>
    <div class="row mt" style="justify-content:space-between"><span class="small">Traceability</span><span class="conf">lengkap</span></div>
    <button class="btn b-green mt" style="width:100%">Kirim ke Review Junior →</button>
  </div>
</div>"""
open(f"{OUT}/04-draft-generated.html", "w").write(shell("Dashboard", content))

# ── 05 Review Junior ───────────────────────────────────────────
content = f"""
<div><div class="h1">Antrian Review</div><div class="sub">Jurnal yang menunggu persetujuan Anda · diurutkan berdasarkan urgensi</div></div>
<div class="card"><div class="row mb"><span class="chip c-j">Review Junior</span><span class="small">5 menunggu</span></div>
<div class="q urgent mb"><div><div class="row"><b style="font-size:13px">PT Sentosa Raya</b><span class="chip c-urgent">Urgent</span><span class="conf">94% keyakinan AI</span></div>
<div class="small mt">Penjualan kredit — INV-2026-0812 · Invoice · Tahap: Review Junior</div></div>
<div class="ta-r"><div class="small">Tenggat</div><b class="red">12 mnt lagi</b></div></div>
<div class="q mb"><div><div class="row"><b style="font-size:13px">CV Berkah Abadi</b><span class="conf">88%</span></div>
<div class="small mt">Penerimaan pelunasan piutang · Rekening koran · Tahap: Review Junior</div></div>
<div class="ta-r"><div class="small">Tenggat</div><span>1 jam 20 mnt</span></div></div>
<div class="q"><div><div class="row"><b style="font-size:13px">PT Maju Jaya</b><span class="conf">76%</span></div>
<div class="small mt">Beban gaji & tunjangan — Juli · Payroll · Tahap: Review Junior</div></div>
<div class="ta-r"><div class="small">Tenggat</div><span>2 jam 5 mnt</span></div></div>
</div>
<div class="grid g2">
  <div class="card" style="grid-column:span 2"><b style="font-size:13px">Review — Penjualan kredit INV-2026-0812</b>
    <table class="mt"><tr><th>Kode</th><th>Akun</th><th class="ta-r">Debit</th><th class="ta-r">Kredit</th><th>Ref</th></tr>
    <tr><td class="mono">1-1200</td><td>Piutang Usaha</td><td class="ta-r mono">Rp 9.435.000</td><td class="ta-r mono">–</td><td class="mono">PSAK 72</td></tr>
    <tr><td class="mono">4-1000</td><td>Pendapatan Penjualan</td><td class="ta-r mono">–</td><td class="ta-r mono">Rp 8.500.000</td><td class="mono">PSAK 72</td></tr>
    <tr><td class="mono">2-2000</td><td>PPN Keluaran (11%)</td><td class="ta-r mono">–</td><td class="ta-r mono">Rp 935.000</td><td class="mono">PPN 11%</td></tr>
    </table>
    <textarea class="mt" rows="2" placeholder="Catatan review (wajib untuk Tolak)…"></textarea>
    <div class="row mt"><button class="btn b-green">Setujui ✓</button><button class="btn b-amber">Kembalikan ↩</button><button class="btn b-red">Tolak ✕</button></div>
  </div>
</div>"""
open(f"{OUT}/05-review-junior.html", "w").write(shell("Antrian", content))

# ── 06 Review Senior ───────────────────────────────────────────
content = f"""
<div><div class="h1">Antrian Review</div><div class="sub">Jurnal yang menunggu persetujuan Anda · diurutkan berdasarkan urgensi</div></div>
<div class="card"><div class="row mb"><span class="chip c-s">Review Senior</span><span class="small">3 menunggu</span></div>
<div class="q mb"><div><div class="row"><b style="font-size:13px">PT Sentosa Raya</b><span class="chip c-j">Lulus Junior</span><span class="conf">94%</span></div>
<div class="small mt">Penjualan kredit — INV-2026-0812 · Tahap: Review Senior</div></div>
<div class="ta-r"><div class="small">Tenggat</div><span>3 jam 40 mnt</span></div></div>
<div class="q"><div><div class="row"><b style="font-size:13px">PT Maju Jaya</b><span class="conf">86%</span></div>
<div class="small mt">Penyusutan aset tetap — mesin produksi · Tahap: Review Senior</div></div>
<div class="ta-r"><div class="small">Tenggat</div><span>5 jam</span></div></div>
</div>
<div class="grid g2">
  <div class="card" style="grid-column:span 2"><b style="font-size:13px">Review Senior — Penjualan kredit INV-2026-0812</b>
    <table class="mt"><tr><th>Kode</th><th>Akun</th><th class="ta-r">Debit</th><th class="ta-r">Kredit</th><th>Ref</th></tr>
    <tr><td class="mono">1-1200</td><td>Piutang Usaha</td><td class="ta-r mono">Rp 9.435.000</td><td class="ta-r mono">–</td><td class="mono">PSAK 72</td></tr>
    <tr><td class="mono">4-1000</td><td>Pendapatan Penjualan</td><td class="ta-r mono">–</td><td class="ta-r mono">Rp 8.500.000</td><td class="mono">PSAK 72</td></tr>
    <tr><td class="mono">2-2000</td><td>PPN Keluaran (11%)</td><td class="ta-r mono">–</td><td class="ta-r mono">Rp 935.000</td><td class="mono">PPN 11%</td></tr>
    </table>
    <div class="row mt"><span class="chip c-ok">Sudah direview Junior</span><span class="small">Budi Santoso · 2 mnt lalu · catatan: "Sesuai faktur & mutasi bank"</span></div>
    <div class="row mt"><span class="chip c-ok">Balance 0</span><span class="chip c-ok">Traceable</span><span class="chip c-ok">PPN benar</span></div>
    <textarea class="mt" rows="2" placeholder="Catatan review…"></textarea>
    <div class="row mt"><button class="btn b-green">Setujui → Review Pajak</button><button class="btn b-amber">Kembalikan ke Junior</button><button class="btn b-red">Tolak</button></div>
  </div>
</div>"""
open(f"{OUT}/06-review-senior.html", "w").write(shell("Antrian", content))

# ── 07 Review Tax ──────────────────────────────────────────────
content = f"""
<div><div class="h1">Antrian Review</div><div class="sub">Jurnal yang menunggu persetujuan Anda · diurutkan berdasarkan urgensi</div></div>
<div class="card"><div class="row mb"><span class="chip c-t">Review Pajak</span><span class="small">2 menunggu</span></div>
<div class="q mb"><div><div class="row"><b style="font-size:13px">PT Sentosa Raya</b><span class="chip c-s">Lulus Senior</span><span class="conf">94%</span></div>
<div class="small mt">Penjualan kredit — INV-2026-0812 · Tahap: Review Pajak</div></div>
<div class="ta-r"><div class="small">Tenggat</div><span>3 jam</span></div></div>
</div>
<div class="grid g2">
  <div class="card"><b style="font-size:13px">Pemeriksaan Pajak</b>
    <div class="mt step"><span class="ok">✓</span><span>PPN Keluaran 11% — DPP Rp 8.500.000 → Rp 935.000</span></div>
    <div class="mt step"><span class="ok">✓</span><span>Faktur pajak 010.000-22.12345678 terverifikasi</span></div>
    <div class="mt step"><span class="ok">✓</span><span>Kode akun PPN sesuai (2-2000)</span></div>
    <div class="mt step"><span class="ok">✓</span><span>PPN masukan terkait: Rp 312.000 (beban operasional)</span></div>
    <div class="mt step"><span class="ok">✓</span><span>Siap untuk rekap SPT Masa PPN Juli</span></div>
  </div>
  <div class="card"><b style="font-size:13px">Ringkasan PPN Masa — Juli 2026</b>
    <div class="mt row" style="justify-content:space-between"><span class="small">PPN Keluaran</span><b class="mono">Rp 128.400.000</b></div>
    <div class="mt row" style="justify-content:space-between"><span class="small">PPN Masukan</span><b class="mono">Rp 86.250.000</b></div>
    <div class="mt row" style="justify-content:space-between"><span class="small">PPN Kurang Bayar</span><b class="mono ylw">Rp 42.150.000</b></div>
    <div class="mt row" style="justify-content:space-between"><span class="small">Jatuh tempo pelaporan</span><b>31 Agustus 2026</b></div>
    <button class="btn b-green mt" style="width:100%">Setujui → Persetujuan Partner</button>
  </div>
</div>"""
open(f"{OUT}/07-tax-review.html", "w").write(shell("Antrian", content))

# ── 08 Partner approval ────────────────────────────────────────
content = f"""
<div><div class="h1">Persetujuan Partner</div><div class="sub">Jurnal final sebelum dikunci & dilaporkan ke klien</div></div>
<div class="grid g2">
  <div class="card"><b style="font-size:13px">Penjualan kredit — INV-2026-0812</b>
    <table class="mt"><tr><th>Kode</th><th>Akun</th><th class="ta-r">Debit</th><th class="ta-r">Kredit</th></tr>
    <tr><td class="mono">1-1200</td><td>Piutang Usaha</td><td class="ta-r mono">Rp 9.435.000</td><td class="ta-r mono">–</td></tr>
    <tr><td class="mono">4-1000</td><td>Pendapatan Penjualan</td><td class="ta-r mono">–</td><td class="ta-r mono">Rp 8.500.000</td></tr>
    <tr><td class="mono">2-2000</td><td>PPN Keluaran (11%)</td><td class="ta-r mono">–</td><td class="ta-r mono">Rp 935.000</td></tr>
    </table>
    <div class="row mt"><span class="chip c-ok">Lulus Junior</span><span class="chip c-ok">Lulus Senior</span><span class="chip c-ok">Lulus Pajak</span><span class="conf">94%</span></div>
    <div class="small mt">4 reviewer · audit trail lengkap · SLA semua MET</div>
  </div>
  <div class="card"><b style="font-size:13px">Tindakan</b>
    <div class="mt step"><span class="ok">✓</span><span>Budi Santoso — Junior, 14:02</span></div>
    <div class="mt step"><span class="ok">✓</span><span>Rina Hartono — Senior, 14:05</span></div>
    <div class="mt step"><span class="ok">✓</span><span>Sari Wulandari — Pajak, 14:07</span></div>
    <button class="btn b-green mt" style="width:100%">Setujui & Kunci Final (APPROVED)</button>
    <div class="row mt"><button class="btn b-amber">Kembalikan ke Pajak</button></div>
  </div>
</div>
<div class="alert">✅ Jurnal dikunci APPROVED — otomatis masuk laporan keuangan bulan Juli & tidak bisa diubah tanpa jejak audit.</div>"""
open(f"{OUT}/08-partner-approval.html", "w").write(shell("Antrian", content))

# ── 09 Exception ───────────────────────────────────────────────
content = f"""
<div><div class="h1">Manajemen Exception</div><div class="sub">Jurnal yang ditandai AI karena dokumen tidak jelas — resolusi mengirimnya kembali ke pipeline</div></div>
<div class="grid g2">
  <div class="card" style="border-color:rgba(248,113,113,.4)"><div class="row"><b style="font-size:13px">CV Berkah Abadi</b><span class="chip c-urgent">Exception</span><span class="conf">55% keyakinan AI</span></div>
    <div class="small mt">Faktur pembelian supplier — pembelian kredit</div>
    <div class="alert mt">🚩 Faktur PPN tidak ditemukan — faktur tidak memuat nomor faktur pajak / NPWP pemasok</div>
    <div class="small mt">faktur-pembelian-supplier.jpg · dibuat 07 Agu 2026, 13:41</div>
  </div>
  <div class="card"><b style="font-size:13px">Resolusi</b>
    <div class="small mt mb">Resolusi mengirim jurnal ke antrian Review Junior untuk diproses ulang (EXCEPTION → JUNIOR_REVIEW).</div>
    <textarea rows="3" placeholder="Catatan resolusi (mis. Faktur PPN sudah dilengkapi klien)…"></textarea>
    <button class="btn b-green mt" style="width:100%">Resolusi & Kirim ke Antrian</button>
  </div>
</div>
<div class="card"><b style="font-size:13px">Riwayat Exception</b>
  <table class="mt"><tr><th>Klien</th><th>Flag</th><th>Keyakinan</th><th>Status</th><th class="ta-r">Aksi</th></tr>
  <tr><td>CV Berkah Abadi</td><td class="red">Faktur PPN tidak ditemukan</td><td>55%</td><td><span class="chip c-urgent">Aktif</span></td><td class="ta-r">—</td></tr>
  <tr><td>PT Maju Jaya</td><td class="ylw">Event tidak terdeteksi</td><td>48%</td><td><span class="chip c-ok">Diresolusi</span></td><td class="ta-r small">Rina · 2 hari lalu</td></tr>
  </table></div>"""
open(f"{OUT}/09-exception.html", "w").write(shell("Exception", content))

# ── 10 Report ──────────────────────────────────────────────────
content = f"""
<div><div class="h1">Laporan Keuangan — PT Sentosa Raya</div><div class="sub">Periode Juli 2026 · dibuat otomatis dari 1.247 jurnal APPROVED · <span class="chip c-ok">Final</span></div></div>
<div class="grid g3">
  <div class="card"><b style="font-size:13px">Laba Rugi Ringkas</b>
    <table class="mt"><tr><th>Akun</th><th class="ta-r">Juli 2026</th></tr>
    <tr><td>Pendapatan Penjualan</td><td class="ta-r mono">Rp 486.500.000</td></tr>
    <tr><td>Beban Pokok Penjualan</td><td class="ta-r mono">(Rp 312.400.000)</td></tr>
    <tr><td>Laba Kotor</td><td class="ta-r mono">Rp 174.100.000</td></tr>
    <tr><td>Beban Operasional</td><td class="ta-r mono">(Rp 96.750.000)</td></tr>
    <tr style="background:rgba(16,185,129,.08)"><td><b>Laba Bersih</b></td><td class="ta-r mono"><b class="grn">Rp 77.350.000</b></td></tr>
    </table></div>
  <div class="card"><b style="font-size:13px">Neraca — Ringkas</b>
    <table class="mt"><tr><th>Akun</th><th class="ta-r">31 Jul 2026</th></tr>
    <tr><td>Kas & Bank</td><td class="ta-r mono">Rp 208.900.000</td></tr>
    <tr><td>Piutang Usaha</td><td class="ta-r mono">Rp 94.350.000</td></tr>
    <tr><td>Persediaan</td><td class="ta-r mono">Rp 156.200.000</td></tr>
    <tr><td>Aset Tetap (net)</td><td class="ta-r mono">Rp 412.000.000</td></tr>
    <tr><td>Total Aset</td><td class="ta-r mono"><b>Rp 871.450.000</b></td></tr>
    </table></div>
  <div class="card"><b style="font-size:13px">Pengiriman ke Klien</b>
    <div class="mt step"><span class="ok">✓</span><span>Laba rugi & neraca (PDF)</span></div>
    <div class="mt step"><span class="ok">✓</span><span>Rekap PPN Masa Juli (draft SPT)</span></div>
    <div class="mt step"><span class="ok">✓</span><span>Buku besar & mutasi per akun (XLSX)</span></div>
    <div class="mt step"><span class="wait"><span class="spin"></span></span><span>Mengirim email ke finance@sentosaraya.co.id…</span></div>
    <div class="small mt">Dikirim H+3 setelah tutup buku · SLA: H+5</div>
  </div>
</div>"""
open(f"{OUT}/10-report.html", "w").write(shell("Dashboard", content))

print("Generated:", len(os.listdir(OUT)), "files in", OUT)
