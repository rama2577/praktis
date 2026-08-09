#!/usr/bin/env python3
"""generate_client_mockups.py — 6 layar Portal Klien Praktis (digital imaging untuk deck).
Output: mockups/11-*.html … 16-*.html (dark navy #0b1120 + aksen #f5c518, konsisten dgn mockup internal).
Cerita demo konsisten: PT Sentosa Raya (ritel), INV-2026-0812, laporan Juli 2026.
"""
import os

CSS = """
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,'Segoe UI',Roboto,sans-serif; background:#0b1120; color:#e5e9f2; min-height:100vh; display:flex; flex-direction:column; }
/* topbar */
.top { display:flex; align-items:center; gap:14px; padding:12px 28px; border-bottom:1px solid #1e2a45; background:#0d1526; }
.logo { display:flex; align-items:center; gap:10px; }
.logo .badge { width:32px; height:32px; border-radius:9px; background:#f5c518; color:#0b1120; font-weight:800; display:flex; align-items:center; justify-content:center; font-size:14px; }
.logo b { font-size:14px; } .logo small { display:block; color:#64748b; font-size:10px; }
.div { width:1px; height:26px; background:#1e2a45; }
.client { display:flex; align-items:center; gap:9px; }
.client .av { width:30px; height:30px; border-radius:50%; background:rgba(245,197,24,.18); color:#f5c518; font-weight:700; display:flex; align-items:center; justify-content:center; font-size:12px; }
.client b { font-size:13px; } .client small { display:block; color:#64748b; font-size:10px; }
.sp { flex:1; }
.pill { display:inline-flex; align-items:center; gap:6px; border:1px solid rgba(16,185,129,.35); background:rgba(16,185,129,.1); color:#34d399; padding:3px 10px; border-radius:99px; font-weight:600; font-size:10px; }
.dot { width:6px; height:6px; border-radius:50%; background:#34d399; }
/* nav */
.nav { display:flex; gap:4px; padding:0 28px; background:#0d1526; border-bottom:1px solid #1e2a45; }
.nav a { padding:11px 16px; font-size:13px; color:#94a3b8; text-decoration:none; border-bottom:2px solid transparent; }
.nav a.on { color:#f5c518; border-bottom-color:#f5c518; font-weight:600; }
/* content */
.content { padding:24px 28px; display:flex; flex-direction:column; gap:18px; flex:1; }
.h1 { font-size:21px; font-weight:700; } .sub { font-size:12px; color:#64748b; margin-top:3px; }
.grid { display:grid; gap:14px; } .g2 { grid-template-columns:repeat(2,1fr); } .g3 { grid-template-columns:repeat(3,1fr); } .g4 { grid-template-columns:repeat(4,1fr); }
.card { background:#101a30; border:1px solid #1e2a45; border-radius:14px; padding:16px; }
.card .ct { font-size:10px; text-transform:uppercase; letter-spacing:.07em; color:#64748b; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; }
.kpi .v { font-size:26px; font-weight:700; margin-top:8px; } .kpi .h { font-size:10px; color:#64748b; margin-top:4px; }
.grn{color:#34d399} .ylw{color:#f5c518} .red{color:#f87171} .sky{color:#38bdf8} .slt{color:#e5e9f2}
table { width:100%; border-collapse:collapse; font-size:12px; }
th { text-align:left; color:#64748b; font-weight:500; font-size:10px; text-transform:uppercase; letter-spacing:.05em; padding:8px 10px; border-bottom:1px solid #1e2a45; }
td { padding:10px; border-bottom:1px solid #141f38; color:#cbd5e1; }
.mono { font-family:'SF Mono',Menlo,monospace; font-size:11px; }
.btn { border-radius:9px; padding:9px 16px; font-size:12px; font-weight:600; border:none; cursor:pointer; text-decoration:none; display:inline-block; }
.b-gold{background:#f5c518;color:#0b1120} .b-out{background:transparent;color:#f5c518;border:1px solid rgba(245,197,24,.45)}
.b-slate{background:#1e293b;color:#cbd5e1;border:1px solid #334155}
.chip { font-size:10px; padding:2px 9px; border-radius:99px; font-weight:600; }
.c-ok{background:rgba(16,185,129,.12);color:#34d399;border:1px solid rgba(16,185,129,.35)}
.c-wait{background:rgba(245,158,11,.14);color:#fbbf24;border:1px solid rgba(245,158,11,.4)}
.c-red{background:rgba(248,113,113,.12);color:#f87171;border:1px solid rgba(248,113,113,.4)}
.drop { border:2px dashed #334155; border-radius:14px; padding:46px; text-align:center; color:#64748b; background:rgba(13,21,38,.5); }
.drop .ic { font-size:34px; margin-bottom:10px; } .drop b { color:#cbd5e1; font-size:15px; }
.row { display:flex; align-items:center; gap:10px; } .mt { margin-top:12px; } .small { font-size:11px; color:#64748b; }
.insight { border-left:3px solid #f5c518; background:#101a30; border:1px solid #1e2a45; border-radius:12px; padding:14px 16px; }
.insight .tag { font-size:10px; color:#f5c518; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
.bar-h { height:10px; border-radius:99px; background:#1e2a45; overflow:hidden; margin-top:6px; }
.bar-h > i { display:block; height:100%; border-radius:99px; }
.alert { border:1px solid rgba(248,113,113,.4); background:rgba(248,113,113,.08); color:#fca5a5; border-radius:10px; padding:10px 14px; font-size:12px; }
.foot { padding:14px 28px; border-top:1px solid #1e2a45; font-size:11px; color:#475569; display:flex; justify-content:space-between; }
"""

def top(active, client=True):
    nav_items = [("Beranda","index","12"),("Dokumen","upload","13"),("Laporan","report","14"),("Analisa","analytics","15"),("Wawasan AI","ai","16")]
    links = ""
    for label, key, num in nav_items:
        cls = "on" if key == active else ""
        links += f'<a class="{cls}" href="#">{label}</a>'
    client_html = ""
    if client:
        client_html = '<div class="div"></div><div class="client"><div class="av">SR</div><div><b>PT Sentosa Raya</b><small>Retail · Jakarta</small></div></div>'
    return f"""<div class="top">
  <div class="logo"><div class="badge">P</div><div><b>Praktis</b><small>Portal Klien</small></div></div>
  {client_html}
  <div class="sp"></div>
  <span class="pill"><span class="dot"></span>Semua sistem normal</span>
</div>
<div class="nav">{links}</div>"""

def page(title, active, body, client=True, foot_extra=""):
    return f"""<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><style>{CSS}</style></head><body>
{top(active, client)}
<div class="content">{body}</div>
<div class="foot"><span>Praktis Portal Klien · PT Sentosa Raya</span><span>{foot_extra or "Disediakan oleh konsultan akuntan Anda"}</span></div>
</body></html>"""

# ───────────── 11 · LOGIN ─────────────
login = """<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,'Segoe UI',Roboto,sans-serif; background:#0b1120; color:#e5e9f2; min-height:100vh; display:flex; align-items:center; justify-content:center;
  background-image:radial-gradient(700px 420px at 85% -10%,rgba(245,197,24,.12),transparent 60%),radial-gradient(600px 400px at -10% 110%,rgba(56,189,248,.08),transparent 60%); }
.box { width:420px; background:#0d1526; border:1px solid #1e2a45; border-radius:18px; padding:38px 36px; box-shadow:0 24px 60px rgba(0,0,0,.4); }
.logo { display:flex; align-items:center; gap:12px; justify-content:center; }
.logo .badge { width:40px; height:40px; border-radius:11px; background:#f5c518; color:#0b1120; font-weight:800; display:flex; align-items:center; justify-content:center; font-size:17px; }
.logo b { font-size:17px; } .logo small { display:block; color:#64748b; font-size:11px; text-align:left; }
h1 { font-size:20px; text-align:center; margin:22px 0 4px; } p.sub { text-align:center; color:#64748b; font-size:12px; margin-bottom:22px; }
label { display:block; font-size:11px; color:#94a3b8; margin:14px 0 6px; }
input { width:100%; border-radius:10px; border:1px solid #334155; background:#0b1120; color:#e5e9f2; padding:11px 13px; font-size:13px; }
input:focus { outline:none; border-color:#f5c518; }
.btn { width:100%; margin-top:22px; border-radius:10px; padding:12px; background:#f5c518; color:#0b1120; font-weight:700; font-size:14px; border:none; cursor:pointer; }
.hint { text-align:center; font-size:11px; color:#475569; margin-top:14px; }
.firm { display:flex; align-items:center; justify-content:center; gap:8px; margin-top:20px; padding-top:18px; border-top:1px solid #1e2a45; font-size:11px; color:#64748b; }
.firm .av { width:22px; height:22px; border-radius:6px; background:rgba(245,197,24,.18); color:#f5c518; font-weight:700; display:flex; align-items:center; justify-content:center; font-size:10px; }
.sec { text-align:center; font-size:10px; color:#475569; margin-top:10px; }
</style></head><body>
<div class="box">
  <div class="logo"><div class="badge">P</div><div><b>Praktis</b><small>Portal Klien</small></div></div>
  <h1>Masuk ke portal Anda</h1>
  <p class="sub">Akses dokumen, laporan keuangan, dan wawasan AI Anda</p>
  <form>
    <label for="e">Email</label><input id="e" type="email" value="bendahara@sentosaraya.co.id" placeholder="nama@perusahaan.com">
    <label for="p">Kata sandi</label><input id="p" type="password" value="••••••••••" placeholder="••••••••••">
    <div class="row" style="justify-content:space-between;margin-top:10px;font-size:11px">
      <label style="margin:0;display:flex;gap:6px;align-items:center;color:#94a3b8"><input type="checkbox" checked style="width:auto">Ingat saya</label>
      <a href="#" style="color:#f5c518;text-decoration:none">Lupa kata sandi?</a>
    </div>
    <button class="btn" type="button">Masuk</button>
  </form>
  <div class="hint">Belum punya akun? Hubungi konsultan akuntan Anda</div>
  <div class="firm"><div class="av">KA</div><span>Disediakan oleh <b>Konsultan Akuntan Anda</b></span></div>
  <div class="sec">🔒 Terenkripsi · Hanya untuk Anda</div>
</div>
</body></html>"""

# ───────────── 12 · BERANDA ─────────────
beranda = f"""
<div class="row"><div><div class="h1">Selamat datang, PT Sentosa Raya 👋</div><div class="sub">Ringkasan status keuangan dan dokumen Anda · Jumat, 14 Agustus 2026</div></div>
<div class="sp"></div><a href="#" class="btn b-gold">+ Upload dokumen</a></div>
<div class="grid g4">
  <div class="card kpi"><div class="ct">Pendapatan · Juli 2026</div><div class="v ylw">Rp 385,4 jt</div><div class="h grn">▲ 9,5% dari Juni (Rp 352 jt)</div></div>
  <div class="card kpi"><div class="ct">Margin kotor · Juli</div><div class="v">23,0%</div><div class="h red">▼ 1,3 poin · lihat Wawasan AI</div></div>
  <div class="card kpi"><div class="ct">PPN terutang · Juli</div><div class="v">Rp 7,34 jt</div><div class="h">Jatuh tempo 31 Agustus</div></div>
  <div class="card kpi"><div class="ct">Piutang belum tertagih</div><div class="v sky">Rp 12,7 jt</div><div class="h">1 invoice > 45 hari</div></div>
</div>
<div class="grid g2">
  <div class="card"><div class="ct">Status dokumen · Agustus 2026 <span class="chip c-ok">3 terkirim</span></div>
    <table>
      <tr><th>Dokumen</th><th>Periode</th><th>Status</th></tr>
      <tr><td>Rekening koran BCA · 1–14 Agu</td><td class="mono">AGU 2026</td><td><span class="chip c-ok">✓ Diproses AI</span></td></tr>
      <tr><td>Faktur penjualan (12 dok)</td><td class="mono">AGU 2026</td><td><span class="chip c-wait">Menunggu review</span></td></tr>
      <tr><td>Kwitansi &amp; nota pembelian</td><td class="mono">AGU 2026</td><td><span class="chip c-wait">Menunggu review</span></td></tr>
    </table>
    <p class="small mt">Dokumen Juli 2026 selesai diproses ✓</p>
  </div>
  <div class="card"><div class="ct">Laporan terbaru <a href="#" style="color:#f5c518;font-size:11px;text-decoration:none">Lihat semua →</a></div>
    <div class="row" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid #141f38">
      <div><b style="font-size:13px">Laporan Keuangan · Juli 2026</b><div class="small">Laba rugi, neraca, arus kas, rekap PPN</div></div>
      <div style="display:flex;gap:8px"><a href="#" class="btn b-out" style="padding:6px 12px">Lihat</a><a href="#" class="btn b-slate" style="padding:6px 12px">PDF</a></div>
    </div>
    <div class="row" style="justify-content:space-between;padding:10px 0">
      <div><b style="font-size:13px">Wawasan AI · Juli 2026</b><div class="small">3 temuan + 2 rekomendasi</div></div>
      <a href="#" class="btn b-out" style="padding:6px 12px">Buka</a>
    </div>
  </div>
</div>
<div class="card"><div class="ct">Siklus pelaporan · Juli 2026</div>
  <div class="row" style="gap:0;text-align:center">
    <div style="flex:1;padding:12px;background:rgba(16,185,129,.08);border-radius:10px"><b class="grn" style="font-size:16px">✓</b><div class="small">Data lengkap<br>2 Agu</div></div>
    <div style="color:#334155;padding:0 6px;font-weight:700">→</div>
    <div style="flex:1;padding:12px;background:rgba(16,185,129,.08);border-radius:10px"><b class="grn" style="font-size:16px">✓</b><div class="small">Diproses AI<br>2 Agu</div></div>
    <div style="color:#334155;padding:0 6px;font-weight:700">→</div>
    <div style="flex:1;padding:12px;background:rgba(16,185,129,.08);border-radius:10px"><b class="grn" style="font-size:16px">✓</b><div class="small">Review akuntan<br>4 Agu</div></div>
    <div style="color:#334155;padding:0 6px;font-weight:700">→</div>
    <div style="flex:1;padding:12px;background:rgba(245,197,24,.1);border-radius:10px;border:1px solid rgba(245,197,24,.35)"><b class="ylw" style="font-size:16px">✓</b><div class="small">Laporan siap<br><b class="ylw">H+3</b> · SLA H+5</div></div>
  </div>
</div>
"""

# ───────────── 13 · UPLOAD ─────────────
upload = f"""
<div class="h1">Upload dokumen</div>
<div class="sub">Kirim faktur, rekening koran, atau nota — AI akan memprosesnya otomatis. Format: PDF, JPG, XLSX (maks 20 MB/file).</div>
<div class="card">
  <div class="drop">
    <div class="ic">📤</div>
    <b>Seret file ke sini</b><br><span class="small">atau</span><br><br>
    <a href="#" class="btn b-gold">Pilih file dari perangkat</a>
  </div>
</div>
<div class="card"><div class="ct">Riwayat upload · Agustus 2026</div>
  <table>
    <tr><th>File</th><th>Diunggah</th><th>Status</th><th style="text-align:right">Aksi</th></tr>
    <tr><td><b>Rekening-korani-BCA-1-14agu.pdf</b> <span class="small">· 214 KB</span></td><td class="mono">14 Agu 09:12</td><td><span class="chip c-ok">✓ Diproses AI</span></td><td style="text-align:right"><a href="#" class="btn b-out" style="padding:5px 10px">Lihat jurnal</a></td></tr>
    <tr><td><b>Faktur-penjualan-agu-2026.zip</b> <span class="small">· 12 file</span></td><td class="mono">14 Agu 09:10</td><td><span class="chip c-wait">Menunggu review</span></td><td style="text-align:right"><span class="small">—</span></td></tr>
    <tr><td><b>Kwitansi-pembelian-juli.xlsx</b> <span class="small">· 98 KB</span></td><td class="mono">12 Agu 15:40</td><td><span class="chip c-ok">✓ Diproses AI</span></td><td style="text-align:right"><a href="#" class="btn b-out" style="padding:5px 10px">Lihat jurnal</a></td></tr>
    <tr><td><b>invoice-penjualan-0812.pdf</b> <span class="small">· 146 KB · INV-2026-0812</span></td><td class="mono">12 Agu 15:38</td><td><span class="chip c-ok">✓ Diproses AI · conf. 94%</span></td><td style="text-align:right"><a href="#" class="btn b-out" style="padding:5px 10px">Lihat jurnal</a></td></tr>
  </table>
  <div class="alert mt">⚠️ <b>Rekening-korani-bca-juni.pdf</b> — 1 baris tidak terbaca (mutasi 12 Jun Rp 350.000). Mohon unggah ulang halaman 3 atau hubungi konsultan Anda.</div>
</div>
"""

# ───────────── 14 · LAPORAN ─────────────
report = f"""
<div class="row"><div><div class="h1">Laporan keuangan</div><div class="sub">Laporan standar per periode — unduh PDF/XLSX kapan saja</div></div>
<div class="sp"></div>
<span class="pill"><span class="dot"></span>Laporan Juli 2026 · final ✓</span></div>
<div class="grid g2">
  <div class="card"><div class="ct">Periode</div>
    <table>
      <tr><th>Periode</th><th>Status</th><th style="text-align:right">Aksi</th></tr>
      <tr><td><b>Juli 2026</b></td><td><span class="chip c-ok">Final · H+3</span></td><td style="text-align:right"><a href="#" class="btn b-gold" style="padding:5px 10px">Buka</a></td></tr>
      <tr><td><b>Juni 2026</b></td><td><span class="chip c-ok">Final</span></td><td style="text-align:right"><a href="#" class="btn b-out" style="padding:5px 10px">Buka</a></td></tr>
      <tr><td><b>Mei 2026</b></td><td><span class="chip c-ok">Final</span></td><td style="text-align:right"><a href="#" class="btn b-out" style="padding:5px 10px">Buka</a></td></tr>
      <tr><td><b>Agustus 2026</b></td><td><span class="chip c-wait">Dalam proses</span></td><td style="text-align:right"><span class="small">—</span></td></tr>
    </table>
  </div>
  <div class="card"><div class="ct">Laba rugi · Juli 2026 <a href="#" style="color:#f5c518;font-size:11px">Neraca · Arus kas · PPN →</a></div>
    <table>
      <tr><th>Akun</th><th style="text-align:right">Jumlah</th></tr>
      <tr><td>Pendapatan penjualan</td><td class="ta-r mono">385.400.000</td></tr>
      <tr><td>Harga pokok penjualan</td><td class="ta-r mono">(296.800.000)</td></tr>
      <tr><td><b>Laba kotor</b></td><td class="ta-r mono" style="color:#f5c518"><b>88.600.000</b></td></tr>
      <tr><td>Beban usaha</td><td class="ta-r mono">(46.200.000)</td></tr>
      <tr><td><b>Laba usaha</b></td><td class="ta-r mono" style="color:#34d399"><b>42.400.000</b></td></tr>
      <tr><td>Estimasi pajak (0,5% final)</td><td class="ta-r mono">(1.927.000)</td></tr>
      <tr><td><b>Laba bersih</b></td><td class="ta-r mono" style="color:#34d399"><b>40.473.000</b></td></tr>
    </table>
    <div class="row mt" style="gap:8px">
      <a href="#" class="btn b-gold" style="padding:7px 14px">Unduh PDF</a>
      <a href="#" class="btn b-slate" style="padding:7px 14px">Unduh XLSX</a>
      <a href="#" class="btn b-out" style="padding:7px 14px">Kirim ke email</a>
    </div>
  </div>
</div>
"""

# ───────────── 15 · ANALISA ─────────────
analytics = f"""
<div class="row"><div><div class="h1">Analisa keuangan</div><div class="sub">Tren, rasio, dan perbandingan — diperbarui otomatis tiap laporan final</div></div>
<div class="sp"></div><span class="chip c-ok">Data s.d. Juli 2026</span></div>
<div class="grid g2">
  <div class="card"><div class="ct">Pendapatan 6 bulan (Rp jt) · margin kotor</div>
    <svg viewBox="0 0 560 210" width="100%" height="210" font-family="inherit">
      <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5c518" stop-opacity=".35"/><stop offset="1" stop-color="#f5c518" stop-opacity="0"/></linearGradient></defs>
      <line x1="40" y1="180" x2="540" y2="180" stroke="#1e2a45"/><line x1="40" y1="120" x2="540" y2="120" stroke="#16223c"/>
      <line x1="40" y1="60" x2="540" y2="60" stroke="#16223c"/>
      <path d="M40 173 L124 170 L208 163 L292 156 L376 150 L460 128 L540 116 L540 180 L40 180 Z" fill="url(#g1)"/>
      <polyline points="40,173 124,170 208,163 292,156 376,150 460,128 540,116" fill="none" stroke="#f5c518" stroke-width="3" stroke-linecap="round"/>
      <g fill="#e5e9f2" font-size="10" text-anchor="middle">
        <circle cx="40" cy="173" r="4" fill="#f5c518"/><text y="188">Feb 274</text>
        <circle cx="124" cy="170" r="4" fill="#f5c518"/><text y="188">Mar 291</text>
        <circle cx="208" cy="163" r="4" fill="#f5c518"/><text y="188">Apr 305</text>
        <circle cx="292" cy="156" r="4" fill="#f5c518"/><text y="188">Mei 310</text>
        <circle cx="376" cy="150" r="4" fill="#f5c518"/><text y="188">Jun 352</text>
        <circle cx="460" cy="128" r="4" fill="#f5c518"/><text y="188">Jul 385</text>
        <circle cx="540" cy="116" r="5" fill="#f5c518"/><text y="188" fill="#f5c518" font-weight="700">+9,5%</text>
      </g>
      <polyline points="40,60 124,63 208,66 292,68 376,64 460,58 540,52" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4 3"/>
    </svg>
    <p class="small">— Pendapatan (gold) · — Margin kotor % (biru, turun 25,1% → 23,0%)</p>
  </div>
  <div class="card"><div class="ct">Beban per kategori · Juli 2026</div>
    <div class="row"><span class="small" style="width:110px">HPP</span><div class="fill"><div class="bar-h"><i style="width:92%;background:#f5c518"></i></div></div><span class="mono small">296,8 jt</span></div>
    <div class="row"><span class="small" style="width:110px">Gaji &amp; tunjangan</span><div class="fill"><div class="bar-h"><i style="width:26%;background:#38bdf8"></i></div></div><span class="mono small">24,0 jt</span></div>
    <div class="row"><span class="small" style="width:110px">Sewa toko</span><div class="fill"><div class="bar-h"><i style="width:14%;background:#38bdf8"></i></div></div><span class="mono small">12,0 jt</span></div>
    <div class="row"><span class="small" style="width:110px">Operasional</span><div class="fill"><div class="bar-h"><i style="width:11%;background:#38bdf8"></i></div></div><span class="mono small">10,2 jt</span></div>
    <div class="row"><span class="small" style="width:110px">Lain-lain</span><div class="fill"><div class="bar-h"><i style="width:5%;background:#38bdf8"></i></div></div><span class="mono small">4,0 jt</span></div>
  </div>
</div>
<div class="grid g4">
  <div class="card kpi"><div class="ct">Margin kotor</div><div class="v">23,0%</div><div class="h red">▼ 1,3 poin (3 bln terakhir)</div></div>
  <div class="card kpi"><div class="ct">Rasio lancar</div><div class="v">1,8×</div><div class="h grn">Sehat · ≥ 1,5</div></div>
  <div class="card kpi"><div class="ct">Perputaran piutang</div><div class="v">27 hari</div><div class="h ylw">Naik 4 hari dari Juni</div></div>
  <div class="card kpi"><div class="ct">Rasio beban/pendapatan</div><div class="v">12,0%</div><div class="h grn">Efisien · < 15%</div></div>
</div>
"""

# ───────────── 16 · WAWASAN AI ─────────────
ai = f"""
<div class="row"><div><div class="h1">Wawasan AI</div><div class="sub">Temuan otomatis dari data keuangan Anda — tiap bulan setelah laporan final</div></div>
<div class="sp"></div><a href="#" class="btn b-gold">Unduh ringkasan</a></div>
<div class="card"><div class="ct">Ringkasan · Juli 2026</div>
  <p style="font-size:13px;color:#cbd5e1;line-height:1.7">Pendapatan naik <b class="grn">9,5%</b> ke Rp 385,4 jt — bulan terbaik dalam 6 bulan. Namun <b class="red">margin kotor turun ke 23,0%</b> karena HPP naik 8% lebih cepat dari penjualan. Arus kas operasional tetap positif; PPN terutang Rp 7,34 jt jatuh tempo 31 Agustus. Perhatikan 1 piutang yang sudah lewat 45 hari.</p>
</div>
<div class="grid g2">
  <div class="insight"><div class="tag">📉 Margin kotor</div>
    <p style="font-size:13px;color:#cbd5e1;margin-top:6px;line-height:1.6">HPP naik <b>8,2%</b> (Rp 274,3 → 296,8 jt) sementara penjualan naik 9,5% — sebagian besar dari kenaikan harga distributor. <b>Rekomendasi:</b> tinjau ulang 3 pemasok teratas atau pertimbangkan harga jual ulang.</p>
    <p class="small mt">Sumber: pembelian Juli vs Juni · akurasi 92%</p>
  </div>
  <div class="insight"><div class="tag">💰 Piutang</div>
    <p style="font-size:13px;color:#cbd5e1;margin-top:6px;line-height:1.6"><b>INV-2026-0795 Rp 3,25 jt</b> sudah lewat 45 hari (PT Maju Jaya). Piutang total Rp 12,7 jt = 21 hari penjualan. <b>Rekomendasi:</b> kirim pengingat otomatis ke PT Maju Jaya sebelum tutup buku Agustus.</p>
    <p class="small mt">Sumber: aging piutang · akurasi 95%</p>
  </div>
  <div class="insight"><div class="tag">🧾 PPN</div>
    <p style="font-size:13px;color:#cbd5e1;margin-top:6px;line-height:1.6">PPN keluaran Rp 38,5 jt · PPN masukan Rp 31,2 jt → <b>terutang Rp 7,34 jt</b>, jatuh tempo 31 Agustus. Semua faktur sudah punya nomor seri yang valid. <b>Rekomendasi:</b> setor sebelum tanggal 31 untuk hindari denda 2%.</p>
    <p class="small mt">Sumber: rekap PPN masa Juli · akurasi 97%</p>
  </div>
  <div class="insight"><div class="tag">📊 Efisiensi</div>
    <p style="font-size:13px;color:#cbd5e1;margin-top:6px;line-height:1.6">Rasio beban/pendapatan stabil di <b>12,0%</b> (bawah tolok ukur 15%). Sewa 12 jt/bln = 3,1% dari penjualan — wajar untuk ritel. <b>Rekomendasi:</b> pertahankan struktur biaya; potensi ekspansi toko ke-2 mulai terlihat sehat.</p>
    <p class="small mt">Sumber: analisa tren 6 bulan · akurasi 90%</p>
  </div>
</div>
<div class="alert">ℹ️ Wawasan AI bersifat informatif dan disusun otomatis — keputusan akhir tetap dengan konsultan akuntan Anda.</div>
"""

os.makedirs("mockups", exist_ok=True)
files = {
    "mockups/11-login-klien.html": login,
    "mockups/12-beranda-klien.html": page("Beranda", "index", beranda),
    "mockups/13-upload-klien.html": page("Upload dokumen", "upload", upload),
    "mockups/14-laporan-klien.html": page("Laporan keuangan", "report", report),
    "mockups/15-analisa-klien.html": page("Analisa keuangan", "analytics", analytics),
    "mockups/16-wawasan-ai.html": page("Wawasan AI", "ai", ai, foot_extra="Wawasan AI bersifat informatif — keputusan dengan konsultan Anda"),
}
for f, html in files.items():
    with open(f, "w") as fh:
        fh.write(html)
    print("✓", f)
print("Selesai — 6 mockup portal klien dibuat.")
