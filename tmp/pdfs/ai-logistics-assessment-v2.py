#!/usr/bin/env python3
"""Generate v2 AI Logistics Assessment — advertising-optimized for Rama Wijaya."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
import os

OUTPUT = os.path.expanduser("~/.openclaw-autoclaw/workspace/output/ai-consulting/ai-logistics-assessment.pdf")
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

W, H = A4  # 595.27 x 841.89 pt

# ── Color palette ──
DARK    = HexColor("#0B0C10")
DARK2   = HexColor("#1F2833")
ACCENT  = HexColor("#E8453C")  # stronger red — urgency
ACCENT2 = HexColor("#F39C12")  # gold — value
WHITE   = HexColor("#FFFFFF")
LIGHT   = HexColor("#F5F6FA")
GRAY    = HexColor("#6B7280")
GREEN   = HexColor("#27AE60")

c = canvas.Canvas(OUTPUT, pagesize=A4)
c.setTitle("AI Logistics Assessment — Rama Wijaya")

M = 18*mm  # margin

# ═══════════════════════════════════════════
# SECTION 1 — HERO BANNER (top 35%)
# ═══════════════════════════════════════════

HERO_H = 265  # pt

# Dark background
c.setFillColor(DARK)
c.rect(0, H - HERO_H, W, HERO_H, fill=1, stroke=0)

# Accent stripe top
c.setFillColor(ACCENT)
c.rect(0, H - 4, W, 4, fill=1, stroke=0)

# ── Main headline ──
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 28)
c.drawString(M, H - 42, "Potong Biaya Logistik")
c.drawString(M, H - 68, "Hingga 20% dengan AI")

# Subhead
c.setFont("Helvetica", 14)
c.setFillColor(HexColor("#CBD5E1"))
c.drawString(M, H - 95, "Audit operasional 60 menit — gratis.")

# Gold highlight box for key stat
c.setFillColor(ACCENT2)
box_x, box_y, box_w, box_h = M, H - 145, W - 2*M, 52
c.roundRect(box_x, box_y - box_h, box_w, box_h, 6, fill=1, stroke=0)

c.setFillColor(DARK)
c.setFont("Helvetica-Bold", 13)
c.drawString(M + 12, box_y - 22, "✦  Turnaround delivery: 50% → 97%   ✦  Biaya operasional turun 20%   ✦  1M+ shipment/hari")
c.setFont("Helvetica", 10)
c.drawString(M + 12, box_y - 42, "Hasil nyata dari 20+ tahun di JNE, Boma Cargo & Mile.app. Bukan teori — ini yang sudah saya kerjakan.")

# ── Authority badges ──
c.setFont("Helvetica", 8.5)
c.setFillColor(HexColor("#94A3B8"))
badges_y = box_y - box_h - 20
c.drawString(M, badges_y,
    "MITx Supply Chain   ·   Six Sigma Black Belt   ·   VP BD & Partnership   ·   Mantan Ketua ASPERINDO Jabar")
c.drawString(M, badges_y - 14,
    "Klien sebelumnya: Perusahaan logistik, retail, e-commerce, 3PL, dan last-mile delivery")

# ═══════════════════════════════════════════
# SECTION 2 — THE OFFER (value prop)
# ═══════════════════════════════════════════

S2_Y = H - HERO_H - 24
c.setFont("Helvetica-Bold", 16)
c.setFillColor(DARK)
c.drawString(M, S2_Y, "Yang Akan Kita Audit Bersama")

S2_Y -= 28

# 6 benefit cards — 2 columns x 3 rows
cards = [
    ("🚚", "Route & Last-Mile", "AI routing potong 15-30%\nbiaya per pengiriman"),
    ("💬", "Customer Service", "Chatbot 24/7 — response\ndari jam ke detik"),
    ("📊", "Demand Forecasting", "Prediksi volume dengan\nakurasi 90%+"),
    ("📦", "Warehouse Ops", "Computer vision percept\nsorting & picking"),
    ("💰", "Procurement", "AI vendor matching,\nnegosiasi otomatis"),
    ("📈", "KPI & Analytics", "Dashboard real-time,\nkeputusan berbasis data"),
]

col_w = (W - 2*M - 10) / 2
card_w = col_w - 8
card_h = 48
x_start = M

for i, (icon, title, desc) in enumerate(cards):
    col = i % 2
    row = i // 2
    cx = x_start + col * (col_w + 10)
    cy = S2_Y - row * (card_h + 10)

    # Card bg
    c.setFillColor(LIGHT)
    c.roundRect(cx, cy - card_h, card_w, card_h, 5, fill=1, stroke=0)

    # Icon
    c.setFont("Helvetica", 16)
    c.drawString(cx + 8, cy - 18, icon)

    # Title
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(DARK)
    c.drawString(cx + 34, cy - 14, title)

    # Description
    c.setFont("Helvetica", 8.5)
    c.setFillColor(GRAY)
    lines = desc.split("\n")
    c.drawString(cx + 34, cy - 28, lines[0])
    if len(lines) > 1:
        c.drawString(cx + 34, cy - 40, lines[1])

# ═══════════════════════════════════════════
# SECTION 3 — HOW IT WORKS (3 steps)
# ═══════════════════════════════════════════

S3_Y = S2_Y - (3 * (card_h + 10)) - 24

c.setFont("Helvetica-Bold", 16)
c.setFillColor(DARK)
c.drawString(M, S3_Y, "Prosesnya Sederhana")

S3_Y -= 28

steps = [
    ("1", "Anda ceritakan operasi\n(15 menit, telpon/zoom)", "Tidak perlu siapkan\npresentasi — ngobrol aja"),
    ("2", "Saya analisis & identifikasi\npeluang AI (offline)", "Pakai framework Six Sigma\n+ 20 tahun pengalaman"),
    ("3", "Walkthrough temuan +\nrekomendasi (45 menit)", "Anda dapat action plan\nkonkret, bukan slide theory"),
]

step_w = (W - 2*M - 24) / 3
for i, (num, title, sub) in enumerate(steps):
    sx = M + i * (step_w + 12)
    sy = S3_Y

    # Number circle
    c.setFillColor(ACCENT)
    c.circle(sx + 18, sy - 18, 14, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(sx + 18, sy - 24, num)

    # Title
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(DARK)
    tlines = title.split("\n")
    c.drawString(sx + 40, sy - 14, tlines[0])
    c.drawString(sx + 40, sy - 28, tlines[1])

    # Sub
    c.setFont("Helvetica", 8)
    c.setFillColor(GRAY)
    slines = sub.split("\n")
    c.drawString(sx + 40, sy - 46, slines[0])
    c.drawString(sx + 40, sy - 56, slines[1])

# ═══════════════════════════════════════════
# SECTION 4 — SOCIAL PROOF
# ═══════════════════════════════════════════

S4_Y = S3_Y - 90

c.setFillColor(DARK2)
proof_h = 70
c.roundRect(M, S4_Y - proof_h, W - 2*M, proof_h, 6, fill=1, stroke=0)

c.setFont("Helvetica-Bold", 11)
c.setFillColor(WHITE)
c.drawString(M + 16, S4_Y - 22, "Siapa yang Cocok untuk Assessment Ini?")

c.setFont("Helvetica", 9.5)
c.setFillColor(HexColor("#CBD5E1"))
c.drawString(M + 16, S4_Y - 44,
    "Direktur Operasional   ·   Head of Supply Chain   ·   VP Logistics   ·   CEO Perusahaan Logistik   ·   Head of Procurement")

# ═══════════════════════════════════════════
# SECTION 5 — URGENCY + CTA
# ═══════════════════════════════════════════

S5_Y = S4_Y - proof_h - 28

# Urgency bar
c.setFillColor(ACCENT)
urg_h = 44
c.roundRect(M, S5_Y - urg_h, W - 2*M, urg_h, 5, fill=1, stroke=0)

c.setFont("Helvetica-Bold", 14)
c.setFillColor(WHITE)
c.drawCentredString(W/2, S5_Y - 22, "⚠  Hanya 5 slot tersedia bulan ini — gratis, tanpa kewajiban apa pun")

# CTA
S5_Y -= urg_h + 20
c.setFont("Helvetica-Bold", 12)
c.setFillColor(DARK)
c.drawCentredString(W/2, S5_Y, "Ambil slot Anda sekarang:")

S5_Y -= 22
c.setFont("Helvetica", 11)
c.setFillColor(GRAY)
c.drawCentredString(W/2, S5_Y,
    "rama.wijaya@hotmail.com   |   +62 878-7623-3424   |   linkedin.com/in/rama-wijaya-supplychain")

# ── Footer ──
c.setFont("Helvetica", 7.5)
c.setFillColor(HexColor("#9CA3AF"))
c.drawCentredString(W/2, 28, "Rama Wijaya — VP Business Development & Partnership, Mile.app")
c.drawCentredString(W/2, 16, "Dokumen ini bersifat terbatas · Agustus 2026 · Tidak untuk disebarluaskan")

c.save()
print(f"✅ PDF v2 created: {OUTPUT}")
