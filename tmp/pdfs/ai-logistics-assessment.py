#!/usr/bin/env python3
"""Generate AI Logistics Assessment 1-pager for Rama Wijaya."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph, Frame, Table, TableStyle, Spacer
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import os

OUTPUT = os.path.expanduser("~/.openclaw-autoclaw/workspace/tmp/pdfs/ai-logistics-assessment.pdf")
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

W, H = A4

# Colors
DARK = HexColor("#1a1a2e")
ACCENT = HexColor("#e94560")
MID = HexColor("#333366")
LIGHT_BG = HexColor("#f8f9fa")
WHITE = HexColor("#ffffff")
GRAY = HexColor("#6c757d")

c = canvas.Canvas(OUTPUT, pagesize=A4)
c.setTitle("AI Logistics Assessment — Rama Wijaya")

# ── Background ──
c.setFillColor(DARK)
c.rect(0, H - 85*mm, W, 85*mm, fill=1, stroke=0)

# ── Header ──
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 26)
c.drawString(20*mm, H - 22*mm, "Free AI Logistics Assessment")

c.setFont("Helvetica", 14)
c.setFillColor(HexColor("#cccccc"))
c.drawString(20*mm, H - 32*mm, "Discover where AI can cut costs and boost efficiency in your operations")
c.drawString(20*mm, H - 40*mm, "— a complimentary 60-minute audit by Rama Wijaya")

# ── Credibility bar ──
c.setFillColor(ACCENT)
c.rect(20*mm, H - 95*mm, W - 40*mm, 10*mm, fill=1, stroke=0)
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 9)
c.drawString(25*mm, H - 88.5*mm,
    "20+ Years in Logistics · JNE (15 yrs) · MITx Supply Chain · Six Sigma Black Belt · Turnaround 50%→97% Delivery Success")

# ── Left Column: What's Covered ──
LEFT_X = 20*mm
Y = H - 110*mm

c.setFillColor(DARK)
c.setFont("Helvetica-Bold", 13)
c.drawString(LEFT_X, Y, "What We'll Assess")

Y -= 10*mm
items = [
    ("🚚 Route Optimization", "Reduce delivery cost with AI-powered routing"),
    ("💬 Customer Service", "Chatbot & auto-tracking for 24/7 support"),
    ("📊 Demand Forecasting", "Predict volume, optimize fleet & inventory"),
    ("📦 Warehouse Ops", "Computer vision + AI for picking & sorting"),
    ("💰 Procurement", "AI vendor matching & automated RFQ processes"),
    ("📈 KPI Dashboards", "Real-time analytics with AI-driven insights"),
]

for icon_title, desc in items:
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(DARK)
    c.drawString(LEFT_X, Y, icon_title)
    c.setFont("Helvetica", 9)
    c.setFillColor(GRAY)
    c.drawString(LEFT_X + 55*mm, Y, desc)
    Y -= 8*mm

# ── Right Column: How It Works ──
RIGHT_X = 110*mm
Y2 = H - 110*mm

c.setFillColor(DARK)
c.setFont("Helvetica-Bold", 13)
c.drawString(RIGHT_X, Y2, "How It Works")

Y2 -= 12*mm
steps = [
    ("1", "You share a quick overview of\nyour operations (15 min call)"),
    ("2", "I analyze your process against\nAI opportunities (offline)"),
    ("3", "We walk through findings &\nactionable next steps (45 min)"),
]

for num, text in steps:
    # Circle
    c.setFillColor(ACCENT)
    c.circle(RIGHT_X + 5*mm, Y2 + 2*mm, 5*mm, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(RIGHT_X + 5*mm, Y2 - 1*mm, num)
    # Text
    c.setFillColor(DARK)
    c.setFont("Helvetica", 9)
    lines = text.split("\n")
    c.drawString(RIGHT_X + 14*mm, Y2 + 6*mm, lines[0])
    if len(lines) > 1:
        c.drawString(RIGHT_X + 14*mm, Y2, lines[1])
    Y2 -= 22*mm

# ── Bottom: CTA & Contact ──
Y3 = H - 230*mm
c.setFillColor(LIGHT_BG)
c.rect(20*mm, Y3 - 10*mm, W - 40*mm, 20*mm, fill=1, stroke=0)
c.setFillColor(DARK)
c.setFont("Helvetica-Bold", 11)
c.drawCentredString(W/2, Y3 + 2*mm, "Limited to 5 companies this month — request yours now")
c.setFont("Helvetica", 9)
c.setFillColor(GRAY)
c.drawCentredString(W/2, Y3 - 5*mm,
    "rama.wijaya@hotmail.com  |  +62 878-7623-3424  |  linkedin.com/in/rama-wijaya-supplychain")

# ── Bottom divider ──
c.setStrokeColor(ACCENT)
c.setLineWidth(2)
c.line(20*mm, Y3 - 22*mm, W - 20*mm, Y3 - 22*mm)

# ── Footer ──
c.setFont("Helvetica", 7)
c.setFillColor(HexColor("#999999"))
c.drawString(20*mm, Y3 - 30*mm, "Rama Wijaya — VP Business Development & Partnership at Mile.app")
c.drawRightString(W - 20*mm, Y3 - 30*mm, "Confidential · August 2026")

c.save()
print(f"✅ PDF created: {OUTPUT}")
