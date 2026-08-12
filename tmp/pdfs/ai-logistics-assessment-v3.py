#!/usr/bin/env python3
"""V3 AI Logistics Assessment — design-capability refined."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
import os

OUT = os.path.expanduser("~/.openclaw-autoclaw/workspace/output/ai-consulting/ai-logistics-assessment.pdf")
os.makedirs(os.path.dirname(OUT), exist_ok=True)

W, H = A4

# ── Color palette (single accent: deep navy-teal) ──
INK     = HexColor("#0F172A")       # near-black, not pure
ACCENT  = HexColor("#0D9488")       # teal-600 — single accent, authoritative
SURFACE = HexColor("#F8FAFC")       # warm off-white
BORDER  = HexColor("#E2E8F0")       # subtle border
MUTED   = HexColor("#64748B")       # secondary text
CANVAS  = HexColor("#FFFFFF")

c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle("AI Logistics Assessment — Rama Wijaya")

M  = 22*mm
FW = W - 2*M  # flow width

# ═══════════════════════════════════════════
# TOP STRIP — thin accent bar
# ═══════════════════════════════════════════
c.setFillColor(ACCENT)
c.rect(0, H - 3, W, 3, fill=1, stroke=0)

# ═══════════════════════════════════════════
# HEADER — authoritative, clean
# ═══════════════════════════════════════════
c.setFillColor(INK)
c.setFont("Helvetica-Bold", 11)
c.drawString(M, H - 28, "RAMA  WIJAYA")

c.setFont("Helvetica", 8)
c.setFillColor(MUTED)
c.drawString(M, H - 42, "VP Business Development & Partnership, Mile.app")
c.drawRightString(W - M, H - 28, "Confidential · August 2026")

c.setStrokeColor(BORDER)
c.setLineWidth(0.5)
c.line(M, H - 50, W - M, H - 50)

# ═══════════════════════════════════════════
# HERO — no gradient box, just tight type
# ═══════════════════════════════════════════
Y = H - 78

c.setFont("Helvetica-Bold", 34)  # display size
c.setFillColor(INK)
c.drawString(M, Y, "Potong Biaya Logistik")
Y -= 40
c.drawString(M, Y, "Hingga 20% dengan AI")
Y -= 16

c.setFont("Helvetica", 13)
c.setFillColor(MUTED)
c.drawString(M, Y, "Audit operasional 60 menit — gratis. Tanpa kewajiban apa pun.")

# ── Three stat pills (horizontal, minimal) ──
Y -= 32
stats = [
    ("50% → 97%", "Delivery\nSuccess"),
    ("−20%", "Biaya\nOperasional"),
    ("1M+ / hari", "Shipment\nHandled"),
]
pill_w = (FW - 20) / 3
for i, (big, small) in enumerate(stats):
    px = M + i * (pill_w + 10)

    # subtle pill bg
    c.setFillColor(SURFACE)
    c.roundRect(px, Y - 44, pill_w, 44, 4, fill=1, stroke=0)

    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(INK)
    c.drawString(px + 10, Y - 18, big)

    c.setFont("Helvetica", 7.5)
    c.setFillColor(MUTED)
    lines = small.split("\n")
    c.drawString(px + 10, Y - 32, lines[0])
    c.drawString(px + 10, Y - 42, lines[1])

# ── Credibility line ──
Y -= 60
c.setFont("Helvetica", 8)
c.setFillColor(MUTED)
c.drawString(M, Y,
    "20+ tahun di JNE · MITx Supply Chain · Six Sigma Black Belt · Mantan Ketua ASPERINDO Jabar")

# ═══════════════════════════════════════════
# SECTION — What We Assess (asymmetric 3+3)
# ═══════════════════════════════════════════
Y -= 32
c.setFont("Helvetica-Bold", 15)
c.setFillColor(INK)
c.drawString(M, Y, "Yang Kami Audit")
Y -= 8
c.setStrokeColor(ACCENT)
c.setLineWidth(2)
c.line(M, Y, M + 32, Y)

Y -= 16

# 6 items, left column 3, right column 3, but with varying emphasis
items = [
    ("Route & Last-Mile", "AI routing potong 15–30% biaya pengiriman", True),
    ("Customer Service", "Chatbot 24/7 — response time dari jam ke detik", False),
    ("Demand Forecasting", "Prediksi volume dengan akurasi 90%+", True),
    ("Warehouse Operations", "Computer vision untuk sorting & picking", False),
    ("Procurement", "AI vendor matching & negosiasi otomatis", True),
    ("KPI & Analytics", "Dashboard real-time, keputusan berbasis data", False),
]

col_w = (FW - 16) / 2
row_h = 26

for i, (title, desc, emphasized) in enumerate(items):
    col = i % 2
    row = i // 2
    ix = M + col * (col_w + 16)
    iy = Y - row * row_h

    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(INK)
    c.drawString(ix, iy, title)

    # bar indicator for emphasized items
    if emphasized:
        c.setFillColor(ACCENT)
        c.roundRect(ix - 10, iy + 2, 4, 14, 2, fill=1, stroke=0)

    c.setFont("Helvetica", 8.5)
    c.setFillColor(MUTED)
    c.drawString(ix + (14 if emphasized else 0), iy - 14, desc)

# ═══════════════════════════════════════════
# SECTION — Process (3 steps, timeline feel)
# ═══════════════════════════════════════════
Y = Y - 3 * row_h - 28

c.setFont("Helvetica-Bold", 15)
c.setFillColor(INK)
c.drawString(M, Y, "Proses")
Y -= 8
c.setStrokeColor(ACCENT)
c.setLineWidth(2)
c.line(M, Y, M + 32, Y)

Y -= 20

# Timeline connector
c.setStrokeColor(BORDER)
c.setLineWidth(1)
c.setDash(4, 4)
c.line(M + 20, Y - 16, W - M - 20, Y - 16)
c.setDash()

steps = [
    "Anda ceritakan operasi — 15 menit, santai via Zoom",
    "Saya analisis peluang AI — pakai framework Six Sigma",
    "Walkthrough temuan & action plan konkret — 45 menit",
]
step_w = (FW - 40) / 3
for i, text in enumerate(steps):
    sx = M + i * (step_w + 20)
    sy = Y

    # Circle
    c.setStrokeColor(ACCENT)
    c.setLineWidth(2)
    c.setFillColor(CANVAS)
    c.circle(sx + 10, sy - 16, 8, fill=1, stroke=1)
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(ACCENT)
    c.drawCentredString(sx + 10, sy - 20, str(i + 1))

    # Text
    c.setFont("Helvetica", 8.5)
    c.setFillColor(INK)
    c.drawString(sx + 26, sy - 9, text)

# ═══════════════════════════════════════════
# TESTIMONIAL / SOCIAL PROOF (single line)
# ═══════════════════════════════════════════
Y -= 52
c.setFillColor(SURFACE)
c.roundRect(M, Y - 28, FW, 28, 3, fill=1, stroke=0)

c.setFont("Helvetica", 8.5)
c.setFillColor(INK)
c.drawCentredString(W/2, Y - 9,
    "Untuk: Direktur Operasional  ·  Head of Supply Chain  ·  VP Logistics  ·  CEO Perusahaan Logistik  ·  Head of Procurement")
c.setFillColor(MUTED)
c.drawCentredString(W/2, Y - 22, "Hasil nyata dari pengalaman 20+ tahun. Bukan teori — ini yang sudah saya kerjakan.")

# ═══════════════════════════════════════════
# CTA — minimal, single accent use
# ═══════════════════════════════════════════
Y -= 48

c.setFont("Helvetica-Bold", 11)
c.setFillColor(INK)
c.drawCentredString(W/2, Y, "Hanya 5 slot tersedia bulan ini. Ambil slot Anda:")

Y -= 22

c.setFont("Helvetica", 10)
c.setFillColor(MUTED)
c.drawCentredString(W/2, Y,
    "rama.wijaya@hotmail.com   |   +62 878-7623-3424   |   linkedin.com/in/rama-wijaya-supplychain")

# ═══════════════════════════════════════════
# FOOTER
# ═══════════════════════════════════════════
c.setStrokeColor(BORDER)
c.setLineWidth(0.5)
c.line(M, 42, W - M, 42)

c.setFont("Helvetica", 7)
c.setFillColor(HexColor("#94A3B8"))
c.drawString(M, 28, "Rama Wijaya — VP Business Development & Partnership, Mile.app")
c.drawRightString(W - M, 28, "Dokumen terbatas · Tidak untuk disebarluaskan")

c.save()
print(f"✅ PDF v3 created: {OUT}")
