#!/usr/bin/env python3
"""
Generate a one-page A4 ROI report PDF in Factorial's brand style.

Usage:
    python3 generate_roi_pdf.py input.json [output.pdf]
    python3 generate_roi_pdf.py              # → sample_roi_report.pdf
"""

import json, sys, os
from datetime import date
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white, Color
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

# ── Factorial brand palette (warm / cream from official calculator) ──
CORAL       = HexColor("#FF355E")
CORAL_LIGHT = HexColor("#FFF0F3")
CORAL_MID   = HexColor("#FFDCE4")
CREAM       = HexColor("#FFF8F0")
CREAM_CARD  = HexColor("#FFFDFB")
GREEN       = HexColor("#059669")
GREEN_LIGHT = HexColor("#ECFDF5")
GREEN_VAL   = HexColor("#16A34A")
RED_COST    = HexColor("#DC2626")
DARK        = HexColor("#1F1235")
GRAY        = HexColor("#6B7280")
GRAY_LIGHT  = HexColor("#F5F5F5")
BORDER      = HexColor("#F0E6E8")
WHITE       = white
SHADOW_CLR  = Color(0.15, 0.05, 0.1, alpha=0.06)
PURPLE_DARK = HexColor("#2D1B69")

W, H = A4
MX = 30
CONTENT_W = W - 2 * MX
R = 7


def fmt_eur(n):
    return f"{int(round(n)):,}".replace(",", ".")


def truncate(t, mx):
    return t if len(t) <= mx else t[:mx - 1] + "…"


def rr(c, x, y, w, h, r=R, fill=None, stroke=None, sw=0.5):
    p = c.beginPath()
    bx, by, tx, ty = x, y, x + w, y + h
    p.moveTo(bx + r, by); p.lineTo(tx - r, by)
    p.arcTo(tx - 2*r, by, tx, by + 2*r, -90, 90)
    p.lineTo(tx, ty - r); p.arcTo(tx - 2*r, ty - 2*r, tx, ty, 0, 90)
    p.lineTo(bx + r, ty); p.arcTo(bx, ty - 2*r, bx + 2*r, ty, 90, 90)
    p.lineTo(bx, by + r); p.arcTo(bx, by, bx + 2*r, by + 2*r, 180, 90)
    p.close()
    if fill and stroke:
        c.setFillColor(fill); c.setStrokeColor(stroke); c.setLineWidth(sw)
        c.drawPath(p, fill=1, stroke=1)
    elif fill:
        c.setFillColor(fill); c.drawPath(p, fill=1, stroke=0)
    elif stroke:
        c.setStrokeColor(stroke); c.setLineWidth(sw); c.drawPath(p, fill=0, stroke=1)


def shadow(c, x, y, w, h, r=R):
    rr(c, x + 1.5, y - 1.5, w, h, r=r, fill=SHADOW_CLR)


def gradient(c, x, y, w, h, c1, c2, steps=60):
    sw = w / steps
    for i in range(steps):
        t = i / (steps - 1)
        c.setFillColor(Color(
            c1.red + (c2.red - c1.red) * t,
            c1.green + (c2.green - c1.green) * t,
            c1.blue + (c2.blue - c1.blue) * t,
        ))
        c.rect(x + i * sw, y, sw + 0.5 if i < steps - 1 else sw, h, fill=1, stroke=0)


def pill(c, x, y, w, h, bg, text, fs=7, tc=DARK):
    rr(c, x, y, w, h, r=h / 2, fill=bg)
    c.setFillColor(tc); c.setFont("Helvetica-Bold", fs)
    c.drawCentredString(x + w / 2, y + h / 2 - fs * 0.35, text)


def circle(c, cx, cy, r, bg, text, fs=9, tc=WHITE):
    c.setFillColor(bg); c.circle(cx, cy, r, fill=1, stroke=0)
    c.setFillColor(tc); c.setFont("Helvetica-Bold", fs)
    c.drawCentredString(cx, cy - fs * 0.35, text)


def top_bar(c, cx, bot, cw, ch, bh, rad, color):
    p = c.beginPath()
    bx, by, tx, ty = cx, bot + ch - bh, cx + cw, bot + ch
    p.moveTo(bx, by); p.lineTo(tx, by); p.lineTo(tx, ty - rad)
    p.arcTo(tx - 2*rad, ty - 2*rad, tx, ty, 0, 90)
    p.lineTo(bx + rad, ty); p.arcTo(bx, ty - 2*rad, bx + 2*rad, ty, 90, 90)
    p.lineTo(bx, by); p.close()
    c.setFillColor(color); c.drawPath(p, fill=1, stroke=0)


def bot_strip(c, cx, bot, cw, sh, rad, bg, text, tc, fs=12):
    p = c.beginPath()
    bx, by, tx, ty = cx, bot, cx + cw, bot + sh
    p.moveTo(bx + rad, by); p.arcTo(bx, by, bx + 2*rad, by + 2*rad, 180, 90)
    p.lineTo(bx, ty); p.lineTo(tx, ty); p.lineTo(tx, by + rad)
    p.arcTo(tx - 2*rad, by, tx, by + 2*rad, -90, 90); p.close()
    c.setFillColor(bg); c.drawPath(p, fill=1, stroke=0)
    c.setFillColor(tc); c.setFont("Helvetica-Bold", fs)
    c.drawCentredString(cx + cw / 2, by + sh / 2 - fs * 0.35, text)


def generate_pdf(data, output_path):
    c = Canvas(output_path, pagesize=A4)

    # Cream page background
    c.setFillColor(CREAM)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    company = data.get("companyName", "Company")
    email = data.get("contactEmail", "")
    seats = data.get("seats", 0)
    hc = data.get("headcounts", {})
    emp, mgr, hr = hc.get("employee", 0), hc.get("manager", 0), hc.get("hr", 0)
    module_rows = data.get("moduleRows", [])
    priority = data.get("priorityModules", [])[:3]
    bundle_annual = data.get("bundleAnnual", 0)
    total_hrs = data.get("totalMonthlyHours", 0)
    total_money = data.get("totalMonthlyMoney", 0)
    annual_savings = total_money * 12
    monthly_cost = bundle_annual / 12 if bundle_annual > 0 else 1
    roi_pct = (annual_savings / bundle_annual * 100) if bundle_annual > 0 else 0
    top3_ids = {p["moduleId"] for p in priority}
    n_rows = len(module_rows)
    net_benefit = annual_savings - bundle_annual

    # ── Pre-measure quotes ──
    sq = ParagraphStyle("q", fontName="Helvetica-Oblique", fontSize=6.5, leading=8.5, textColor=GRAY)
    card_gap = 7
    card_w = (CONTENT_W - card_gap * 2) / 3
    qw = card_w - 14
    card_parts = []
    for pm in priority:
        q = pm.get("quote", "")
        if q:
            qp = Paragraph(f"“{truncate(q, 140)}”", sq)
            _, qh = qp.wrap(qw, 300)
        else:
            qp, qh = None, 0
        card_parts.append((qp, qh))

    card_fixed = 4 + 18 + 10 + 5 + 22 + 4
    card_h = max((card_fixed + qh for _, qh in card_parts), default=60)

    # Intro paragraph
    si = ParagraphStyle("i", fontName="Helvetica", fontSize=7.5, leading=10.5, textColor=DARK)
    intro_text = (
        f"Factorial's internal consulting team has prepared a personalized ROI analysis for "
        f"<b>{company}</b>, based on <b>{seats}</b> employees "
        f"(<b>{emp}</b> ICs · <b>{mgr}</b> Managers · <b>{hr}</b> HR Staff). "
        f"The study identifies the highest-impact modules and quantifies time and cost savings per stakeholder."
    )
    ip = Paragraph(intro_text, si)
    _, iph = ip.wrap(CONTENT_W - 16, 300)
    intro_h = iph + 10

    # ── Adaptive layout: compute heights & gaps ──
    header_h = 60
    kpi_h = 38
    lbl_h = 12
    tbl_hdr_h = 14
    row_h_base = 13.5
    totals_h = 22
    net_h = 30
    footer_h = 16

    fixed = (header_h + kpi_h + intro_h + lbl_h + card_h
             + lbl_h + tbl_hdr_h + row_h_base * n_rows + totals_h + net_h + footer_h)

    wts = [0.3, 0.3, 0.3, 0.5, 0.6, 0.15, 0.4, 0.35, 0.25]
    tw = sum(wts)
    rem = H - fixed
    row_h = row_h_base
    rb = rem * 0.35
    epr = min(3.5, rb / max(n_rows, 1))
    if epr > 0.5:
        row_h = row_h_base + epr
        rem = H - (fixed - row_h_base * n_rows + row_h * n_rows)
    unit = max(3, rem / tw)
    gaps = [w * unit for w in wts]

    cur_y = H

    # ════════════════════════════════════════════
    # 1. HEADER — white bar with coral accent line
    # ════════════════════════════════════════════
    hdr_bot = cur_y - header_h
    c.setFillColor(WHITE)
    c.rect(0, hdr_bot, W, header_h, fill=1, stroke=0)
    # Coral bottom accent line
    c.setFillColor(CORAL)
    c.rect(0, hdr_bot, W, 2.5, fill=1, stroke=0)

    # Factorial logo mark (simplified isotype)
    lx, ly = MX + 2, H - 38
    c.setFillColor(CORAL)
    c.circle(lx + 9, ly + 9, 12, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.circle(lx + 9, ly + 9, 4.5, fill=1, stroke=0)
    c.setFillColor(CORAL)
    c.ellipse(lx + 2, ly - 2, lx + 16, ly + 2, fill=1, stroke=0)
    # "factorial" wordmark
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(lx + 26, ly + 3, "factorial")

    # Right: company + subtitle
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(W - MX, H - 22, truncate(company, 36))
    c.setFont("Helvetica", 7.5)
    c.setFillColor(GRAY)
    c.drawRightString(W - MX, H - 33, "ROI Analysis · Confidential")
    if email:
        c.setFont("Helvetica", 7)
        c.drawRightString(W - MX, H - 43, truncate(email, 45))

    cur_y = hdr_bot - gaps[0]

    # ════════════════════════════════════════════
    # 2. KPI STRIP — 3 white cards in a row
    # ════════════════════════════════════════════
    kpi_bot = cur_y - kpi_h
    kpi_w = (CONTENT_W - 8) / 3
    kpis = [
        ("TOTAL DE AHORROS ANUALES:", f"€{fmt_eur(annual_savings)}", CORAL),
        ("COSTO ANUAL DEL SISTEMA:", f"€{fmt_eur(bundle_annual)}", RED_COST),
        ("ROI ANUAL:", f"{roi_pct:.0f}%", GREEN_VAL),
    ]
    for i, (lbl, val, vc) in enumerate(kpis):
        kx = MX + i * (kpi_w + 4)
        shadow(c, kx, kpi_bot, kpi_w, kpi_h, r=6)
        rr(c, kx, kpi_bot, kpi_w, kpi_h, r=6, fill=WHITE, stroke=BORDER, sw=0.5)
        c.setFillColor(GRAY)
        c.setFont("Helvetica-Bold", 5.5)
        c.drawCentredString(kx + kpi_w / 2, kpi_bot + kpi_h - 11, lbl)
        c.setFillColor(vc)
        c.setFont("Helvetica-Bold", 15)
        c.drawCentredString(kx + kpi_w / 2, kpi_bot + 8, val)

    cur_y = kpi_bot - gaps[1]

    # ════════════════════════════════════════════
    # 3. INTRO BOX — cream card
    # ════════════════════════════════════════════
    intro_bot = cur_y - intro_h
    rr(c, MX, intro_bot, CONTENT_W, intro_h, r=5, fill=WHITE, stroke=BORDER, sw=0.5)
    ip.drawOn(c, MX + 8, intro_bot + 5)

    cur_y = intro_bot - gaps[2]

    # ════════════════════════════════════════════
    # 4. PRIORITY MODULES — 3 cards
    # ════════════════════════════════════════════
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MX, cur_y + 2, "Priority Modules")
    cur_y -= lbl_h

    rd = 6
    for idx, pm in enumerate(priority):
        qpara, qh = card_parts[idx]
        cx = MX + idx * (card_w + card_gap)
        cb = cur_y - card_h

        shadow(c, cx, cb, card_w, card_h, r=rd)
        rr(c, cx, cb, card_w, card_h, r=rd, fill=WHITE, stroke=BORDER, sw=0.5)
        top_bar(c, cx, cb, card_w, card_h, 4, rd, CORAL)

        iy = cb + card_h - 8
        circle(c, cx + 14, iy - 5, 8, CORAL, str(idx + 1), 9, WHITE)
        c.setFillColor(DARK); c.setFont("Helvetica-Bold", 8.5)
        c.drawString(cx + 26, iy - 8, truncate(pm.get("label", ""), 22))
        iy -= 20

        hrs, money = pm.get("monthlyHours", 0), pm.get("monthlyMoney", 0)
        c.setFillColor(CORAL); c.setFont("Helvetica-Bold", 7)
        c.drawString(cx + 7, iy, f"{hrs:.0f}h/mo · €{fmt_eur(money)}/mo")
        iy -= 9

        c.setStrokeColor(CORAL_MID); c.setLineWidth(0.4)
        c.line(cx + 7, iy, cx + card_w - 7, iy)
        iy -= 5

        if qpara:
            qpara.drawOn(c, cx + 7, iy - qh + 2)

        bot_strip(c, cx, cb, card_w, 22, rd, CORAL_LIGHT,
                  f"€{fmt_eur(money)}/mo", CORAL, 12)

    cur_y -= card_h + gaps[3]

    # ════════════════════════════════════════════
    # 5. TABLE — full module breakdown
    # ════════════════════════════════════════════
    c.setFillColor(DARK); c.setFont("Helvetica-Bold", 9)
    c.drawString(MX, cur_y + 2, "Full Module Breakdown")
    cur_y -= lbl_h

    cmx = MX + 4
    chx = MX + CONTENT_W * 0.68
    crx = MX + CONTENT_W - 4

    # Header
    hb = cur_y - tbl_hdr_h
    rr(c, MX, hb, CONTENT_W, tbl_hdr_h, r=4, fill=CORAL)
    c.setFillColor(WHITE); c.setFont("Helvetica-Bold", 7)
    c.drawString(cmx, hb + tbl_hdr_h / 2 - 3, "Module")
    c.drawRightString(chx, hb + tbl_hdr_h / 2 - 3, "Hours saved/mo")
    c.drawRightString(crx, hb + tbl_hdr_h / 2 - 3, "€ Return/mo")
    cur_y = hb

    for idx, row in enumerate(module_rows):
        rb = cur_y - row_h
        is3 = row.get("moduleId") in top3_ids
        if is3:
            c.setFillColor(CORAL_LIGHT); c.rect(MX, rb, CONTENT_W, row_h, fill=1, stroke=0)
            c.setFillColor(CORAL); c.rect(MX, rb, 3, row_h, fill=1, stroke=0)
        elif idx % 2 == 0:
            c.setFillColor(WHITE); c.rect(MX, rb, CONTENT_W, row_h, fill=1, stroke=0)
        else:
            c.setFillColor(GRAY_LIGHT); c.rect(MX, rb, CONTENT_W, row_h, fill=1, stroke=0)

        ty = rb + row_h / 2 - 3
        c.setFillColor(DARK); c.setFont("Helvetica-Bold" if is3 else "Helvetica", 7)
        c.drawString(cmx + (4 if is3 else 0), ty, truncate(row.get("label", ""), 38))
        c.setFillColor(GRAY); c.setFont("Helvetica-Bold", 7)
        c.drawRightString(chx, ty, f"{row.get('monthlyHours', 0):.1f}h")
        c.setFillColor(GREEN_VAL); c.setFont("Helvetica-Bold", 7)
        c.drawRightString(crx, ty, f"€{fmt_eur(row.get('monthlyMoney', 0))}")
        cur_y = rb

    cur_y -= gaps[5] * 0.4

    # ════════════════════════════════════════════
    # 6. TOTALS ROW
    # ════════════════════════════════════════════
    tb = cur_y - totals_h
    rr(c, MX, tb, CONTENT_W, totals_h, r=5, fill=CORAL)
    c.setFillColor(WHITE)
    ly, vy = tb + totals_h - 8, tb + 5
    c.setFont("Helvetica", 6.5); c.drawString(cmx, ly, "Bundle price/yr")
    c.setFont("Helvetica-Bold", 10); c.drawString(cmx, vy, f"€{fmt_eur(bundle_annual)}")
    mid = MX + CONTENT_W / 2
    c.setFont("Helvetica", 6.5); c.drawCentredString(mid, ly, "Total hours/mo")
    c.setFont("Helvetica-Bold", 10); c.drawCentredString(mid, vy, f"{total_hrs:.0f}h")
    c.setFont("Helvetica", 6.5); c.drawRightString(crx, ly, "€ Return/mo · ROI")
    c.setFont("Helvetica-Bold", 11); c.drawRightString(crx, vy - 1, f"€{fmt_eur(total_money)} · {roi_pct:.0f}%")
    cur_y = tb - gaps[6]

    # ════════════════════════════════════════════
    # 7. NET BENEFIT — 3 cells
    # ════════════════════════════════════════════
    cw = CONTENT_W / 3
    nb = cur_y - net_h
    cells = [
        ("Ahorros anuales", f"€{fmt_eur(annual_savings)}", GREEN_LIGHT, GREEN_VAL),
        ("Coste anual", f"-€{fmt_eur(bundle_annual)}", CORAL_LIGHT, RED_COST),
        ("Beneficio neto", f"€{fmt_eur(net_benefit)}/yr",
         HexColor("#F0FDF4") if net_benefit >= 0 else HexColor("#FFF1F2"),
         GREEN_VAL if net_benefit >= 0 else RED_COST),
    ]
    for i, (lbl, val, bg, vc) in enumerate(cells):
        cx = MX + i * cw
        shadow(c, cx + 0.5, nb, cw - 1, net_h, r=5)
        rr(c, cx + 0.5, nb, cw - 1, net_h, r=5, fill=bg, stroke=BORDER, sw=0.3)
        c.setFillColor(GRAY); c.setFont("Helvetica", 6.5)
        c.drawCentredString(cx + cw / 2, nb + net_h - 10, lbl)
        c.setFillColor(vc); c.setFont("Helvetica-Bold", 13)
        c.drawCentredString(cx + cw / 2, nb + 7, val)

    # ════════════════════════════════════════════
    # 8. FOOTER
    # ════════════════════════════════════════════
    fy = max(10, nb - gaps[8])
    c.setStrokeColor(CORAL_MID); c.setLineWidth(0.4)
    c.line(MX, fy + 10, W - MX, fy + 10)
    c.setFillColor(GRAY); c.setFont("Helvetica", 6)
    c.drawString(MX, fy, "Prepared by Factorial · Confidential")
    c.drawRightString(W - MX, fy, date.today().strftime("%d %b %Y"))

    c.save()
    return output_path


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sample = {
            "companyName": "Acme Corporation",
            "contactName": "Maria Garcia",
            "contactEmail": "maria.garcia@acme.com",
            "seats": 200,
            "headcounts": {"employee": 170, "hr": 10, "manager": 20},
            "moduleRows": [
                {"moduleId": "core", "label": "Core HR", "monthlyHours": 120.0, "monthlyMoney": 3600},
                {"moduleId": "time_off", "label": "Time Off", "monthlyHours": 48.0, "monthlyMoney": 1440},
                {"moduleId": "time_tracking", "label": "Time Tracking", "monthlyHours": 135.0, "monthlyMoney": 4050},
                {"moduleId": "payroll", "label": "Payroll Connect", "monthlyHours": 60.0, "monthlyMoney": 1800},
                {"moduleId": "expenses", "label": "Expense Management", "monthlyHours": 45.0, "monthlyMoney": 1350},
                {"moduleId": "performance", "label": "Performance Management", "monthlyHours": 50.0, "monthlyMoney": 1500},
                {"moduleId": "recruitment", "label": "Recruitment (ATS)", "monthlyHours": 87.5, "monthlyMoney": 2625},
                {"moduleId": "engagement", "label": "Engagement Surveys", "monthlyHours": 35.0, "monthlyMoney": 1050},
                {"moduleId": "trainings", "label": "Training Management", "monthlyHours": 63.0, "monthlyMoney": 1890},
                {"moduleId": "compensations", "label": "Compensation", "monthlyHours": 52.0, "monthlyMoney": 1560},
                {"moduleId": "one", "label": "Factorial One (AI)", "monthlyHours": 44.0, "monthlyMoney": 1320},
            ],
            "priorityModules": [
                {"moduleId": "time_tracking", "label": "Time Tracking", "monthlyHours": 135.0, "monthlyMoney": 4050,
                 "quote": "Employees fill timesheets manually every week and half the team forgets, then payroll spends a full day reconciling everything"},
                {"moduleId": "core", "label": "Core HR", "monthlyHours": 120.0, "monthlyMoney": 3600,
                 "quote": "We have employee data in three different Excel files and nothing matches, onboarding is a disaster every time"},
                {"moduleId": "recruitment", "label": "Recruitment (ATS)", "monthlyHours": 87.5, "monthlyMoney": 2625,
                 "quote": "Candidates get lost in email threads, scheduling interviews takes forever, and we have no idea what our time-to-hire actually is"},
            ],
            "bundleAnnual": 38400,
            "totalMonthlyHours": 739.5,
            "totalMonthlyMoney": 22185,
        }
        out = os.path.join(os.path.dirname(__file__) or ".", "sample_roi_report.pdf")
        generate_pdf(sample, out)
        print(f"Sample PDF generated: {out}")
    else:
        inp = sys.argv[1]
        outp = sys.argv[2] if len(sys.argv) > 2 else inp.rsplit(".", 1)[0] + ".pdf"
        with open(inp) as f:
            data = json.load(f)
        generate_pdf(data, outp)
        print(f"PDF generated: {outp}")
