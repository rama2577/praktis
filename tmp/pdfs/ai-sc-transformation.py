#!/usr/bin/env python3
"""AI-Powered Supply Chain Transformation — Executive Deck for Rama Wijaya.
v4: clean layout, no overlap, enterprise tone, 2-page PDF."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
import os

OUT = os.path.expanduser(
    "~/.openclaw-autoclaw/workspace/output/ai-consulting/ai-logistics-assessment.pdf"
)
os.makedirs(os.path.dirname(OUT), exist_ok=True)

W, H = A4  # 595.27 x 841.89 pt

# ── Color palette — authoritative, not techie ──
INK    = HexColor("#0F172A")
ACCENT = HexColor("#1E40AF")   # deep blue — trust, not hype
LIGHT  = HexColor("#F1F5F9")
MUTED  = HexColor("#64748B")
CANVAS = HexColor("#FFFFFF")
BORDER = HexColor("#CBD5E1")

c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle("AI-Powered Supply Chain Transformation — Rama Wijaya")

M = 20*mm  # margin

# ═════════════════════════════════════════════════
# HELPER: draw a thin section divider
# ═════════════════════════════════════════════════
def divider(y, accent=False):
    if accent:
        c.setStrokeColor(ACCENT)
        c.setLineWidth(1.5)
    else:
        c.setStrokeColor(BORDER)
        c.setLineWidth(0.5)
    c.line(M, y, W - M, y)

# ═════════════════════════════════════════════════
# PAGE 1 — HERO + Challenges + Solutions + Results
# ═════════════════════════════════════════════════

# ── TOP STRIP ──
c.setFillColor(ACCENT)
c.rect(0, H - 3, W, 3, fill=1, stroke=0)

# ── HEADER LINE ──
Y = H - 22
c.setFont("Helvetica-Bold", 9)
c.setFillColor(INK)
c.drawString(M, Y, "RAMA WIJAYA")
c.setFont("Helvetica", 8)
c.setFillColor(MUTED)
c.drawRightString(W - M, Y, "Confidential · August 2026")
divider(Y - 6)

# ── HERO ──
Y -= 24
c.setFont("Helvetica", 9)
c.setFillColor(MUTED)
c.drawString(M, Y, "AI-POWERED SUPPLY CHAIN TRANSFORMATION")

Y -= 20
c.setFont("Helvetica-Bold", 28)
c.setFillColor(INK)
c.drawString(M, Y, "Kurangi Biaya.")
Y -= 32
c.drawString(M, Y, "Tingkatkan SLA.")
Y -= 32
c.drawString(M, Y, "Bangun Operasi yang Siap Bertumbuh.")

Y -= 12
c.setFont("Helvetica", 9.5)
c.setFillColor(MUTED)
c.drawString(M, Y, "oleh")

Y -= 16
c.setFont("Helvetica-Bold", 11)
c.setFillColor(INK)
c.drawString(M, Y, "Rama Wijaya")
c.setFont("Helvetica", 9)
c.setFillColor(MUTED)
c.drawString(M + 78, Y, "20+ Years Logistics Executive  ·  MIT Supply Chain  ·  Six Sigma Black Belt")
c.drawString(M, Y - 14, "VP Business Development & Partnership, Mile.app")

divider(Y - 28)

# ── Two-column: CHALLENGES (left) + SOLUTIONS (right) ──
Y -= 44
COL_W = (W - 2*M - 12*mm) / 2
LEFT   = M
RIGHT  = M + COL_W + 12*mm

# --- LEFT: Tantangan ---
c.setFont("Helvetica-Bold", 11)
c.setFillColor(INK)
c.drawString(LEFT, Y, "Tantangan yang Sering Saya Temukan")

Y -= 16
items_left = [
    "Biaya logistik terus naik",
    "Delivery performance stagnan",
    "Data operasional tersebar",
    "Forecast sering meleset",
    "SOP tidak konsisten",
    "Banyak pekerjaan administratif",
]
for item in items_left:
    c.setFont("Helvetica", 9.5)
    c.setFillColor(INK)
    c.drawString(LEFT + 12, Y, item)
    c.setFillColor(ACCENT)
    c.drawString(LEFT, Y, "—")
    Y -= 15

# --- RIGHT: Solusi ---
# Go back to the same starting Y for right column
RIGHT_Y_START = Y + 6 * 15 + 16  

c.setFont("Helvetica-Bold", 11)
c.setFillColor(INK)
c.drawString(RIGHT, RIGHT_Y_START, "Saya Membantu Dengan")

RY = RIGHT_Y_START - 16
items_right = [
    "AI Opportunity Assessment",
    "Process Redesign",
    "Supply Chain Optimization",
    "AI Automation",
    "Executive Dashboard",
    "Roadmap Digital Transformation",
]
for item in items_right:
    c.setFont("Helvetica", 9.5)
    c.setFillColor(INK)
    c.drawString(RIGHT + 12, RY, item)
    c.setFillColor(ACCENT)
    c.drawString(RIGHT, RY, "—")
    RY -= 15

# ── RESULTS — horizontal bar at bottom of column section ──
Y = min(Y, RY) - 24  # after both columns

divider(Y)
Y -= 18

c.setFont("Helvetica-Bold", 11)
c.setFillColor(INK)
c.drawString(M, Y, "Hasil yang Bisa Dicapai")

Y -= 18
results = [
    ("↓ 15–30%", "Biaya Operasional"),
    ("↑ 20%+", "Delivery Success"),
    ("↑ 30%+", "Customer Satisfaction"),
    ("↑ 2–3×", "Productivity"),
    ("↑ 3–5×", "Decision Speed"),
]

RES_W = (W - 2*M - 16) / 5
for i, (metric, label) in enumerate(results):
    rx = M + i * (RES_W + 4)
    c.setFont("Helvetica-Bold", 15)
    c.setFillColor(INK)
    c.drawString(rx, Y, metric)
    c.setFont("Helvetica", 8)
    c.setFillColor(MUTED)
    c.drawString(rx, Y - 12, label)

Y -= 36
divider(Y, accent=True)

# ── PAGE 1 FOOTER ──
c.setFont("Helvetica", 7)
c.setFillColor(HexColor("#94A3B8"))
c.drawCentredString(W/2, 16, "Rama Wijaya  ·  VP Business Development & Partnership, Mile.app  ·  Page 1/2")

# ═════════════════════════════════════════════════
# PAGE 2 — Why Me + The Offer
# ═════════════════════════════════════════════════
c.showPage()

Y = H - 22
c.setFont("Helvetica-Bold", 9)
c.setFillColor(INK)
c.drawString(M, Y, "RAMA WIJAYA")
c.setFont("Helvetica", 8)
c.setFillColor(MUTED)
c.drawRightString(W - M, Y, "Confidential · August 2026")
divider(Y - 6)

# ── WHY ME ──
Y -= 24
c.setFont("Helvetica-Bold", 13)
c.setFillColor(INK)
c.drawString(M, Y, "Mengapa Saya?")

Y -= 8
c.drawString(M, Y, "20+ tahun pengalaman langsung memimpin operasi logistik.")

Y -= 22
creds = [
    "JNE — 15 tahun, turnaround delivery 50% → 97%",
    "Mile.app — VP Business Development & Partnership",
    "Boma Cargo — Co-Founder",
    "MITx — Master Supply Chain Management",
    "Six Sigma Black Belt — Process improvement",
    "Finance & Procurement — P&L, modeling, vendor mgmt",
    "Last-Mile — Bangun aplikasi 1M+ shipment/hari",
    "Digital Transformation — Dari manual ke digital",
]

# 2 columns x 4 rows
CRED_COL_W = (W - 2*M - 12*mm) / 2
CRED_LEFT  = M
CRED_RIGHT = M + CRED_COL_W + 12*mm

for i, cred in enumerate(creds):
    col = i % 2
    row = i // 2
    cx = CRED_LEFT if col == 0 else CRED_RIGHT
    cy = Y - row * 22

    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(cx, cy, "✓")
    c.setFont("Helvetica", 9.5)
    c.setFillColor(INK)
    c.drawString(cx + 14, cy, cred)

Y -= 8 * 22 + 10
divider(Y, accent=True)

# ── THE OFFER ──
Y -= 18
c.setFont("Helvetica-Bold", 13)
c.setFillColor(INK)
c.drawString(M, Y, "AI Executive Assessment")
Y -= 8
c.setFont("Helvetica", 10)
c.setFillColor(MUTED)
c.drawString(M, Y, "Audit selama 60 menit. Gratis. Tanpa kewajiban.")

Y -= 28

deliverables = [
    "Executive Summary",
    "Quick Wins",
    "AI Readiness Score",
    "Prioritas Implementasi",
    "ROI Estimation",
    "Roadmap 90 Hari",
]

for i, d in enumerate(deliverables):
    col = i % 2
    row = i // 2
    dx = CRED_LEFT if col == 0 else CRED_RIGHT
    dy = Y - row * 24

    # subtle bg pill
    c.setFillColor(LIGHT)
    c.roundRect(dx, dy - 16, CRED_COL_W, 20, 4, fill=1, stroke=0)

    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(INK)
    c.drawString(dx + 10, dy - 5, d)

Y -= 3 * 24 + 28

# ── POSITIONING STATEMENT ──
c.setFillColor(LIGHT)
stmt_h = 60
c.roundRect(M, Y - stmt_h, W - 2*M, stmt_h, 5, fill=1, stroke=0)

c.setFont("Helvetica-Bold", 10)
c.setFillColor(INK)
c.drawString(M + 14, Y - 18,
    "Saya bukan AI Consultant.")

c.setFont("Helvetica", 9.5)
c.setFillColor(INK)
c.drawString(M + 14, Y - 36,
    "Saya adalah Supply Chain Executive yang menggunakan AI")

c.drawString(M + 14, Y - 50,
    "untuk mempercepat transformasi bisnis.")

# ── CTA ──
Y -= stmt_h + 28
c.setFont("Helvetica-Bold", 12)
c.setFillColor(INK)
c.drawCentredString(W/2, Y, "Mari bicara — bagaimana operasi Anda bisa saya bantu?")
Y -= 22
c.setFont("Helvetica", 10)
c.setFillColor(MUTED)
c.drawCentredString(W/2, Y, "rama.wijaya@hotmail.com   |   +62 878-7623-3424   |   linkedin.com/in/rama-wijaya-supplychain")

# ── PAGE 2 FOOTER ──
c.setFont("Helvetica", 7)
c.setFillColor(HexColor("#94A3B8"))
c.drawCentredString(W/2, 16, "Rama Wijaya  ·  VP Business Development & Partnership, Mile.app  ·  Page 2/2")

c.save()
print(f"✅ PDF created: {OUT}")
