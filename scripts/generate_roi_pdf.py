#!/usr/bin/env python3
"""
Generate a one-page A4 ROI report PDF in Factorial brand style.

Usage:
    python3 generate_roi_pdf.py input.json [output.pdf]

input.json schema:
{
  "companyName": "Acme Corp",
  "contactName": "Jane Doe",
  "contactEmail": "jane@acme.com",
  "seats": 200,
  "headcounts": { "employee": 170, "hr": 10, "manager": 20 },
  "moduleRows": [
    { "moduleId": "core", "label": "Core HR", "monthlyHours": 120, "monthlyMoney": 3600 },
    ...
  ],
  "priorityModules": [
    { "moduleId": "core", "label": "Core HR", "monthlyHours": 120, "monthlyMoney": 3600, "quote": "..." },
    ...  (max 3)
  ],
  "bundleAnnual": 48000,
  "totalMonthlyHours": 500,
  "totalMonthlyMoney": 15000
}
"""

import json
import sys
import os
from datetime import date
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white, Color
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle


# ── Brand palette ──
PINK        = HexColor("#FF4F7B")
PURPLE      = HexColor("#4C1FD4")
LIGHT_PINK  = HexColor("#FFF2F5")
PINK_MID    = HexColor("#FFD6E0")
PINK_ACCENT = HexColor("#FFE8EE")
GREEN       = HexColor("#059669")
GREEN_LIGHT = HexColor("#ECFDF5")
DARK        = HexColor("#1A1A2E")
GRAY        = HexColor("#6B7280")
GRAY_LIGHT  = HexColor("#F9FAFB")
WHITE       = white
SHADOW      = Color(0, 0, 0, alpha=0.06)

W, H = A4  # 595.27 x 841.89 pt
MX = 28
CONTENT_W = W - 2 * MX
R = 5


def fmt_eur(n):
    return f"{int(round(n)):,}".replace(",", ".")


def truncate(text, max_chars):
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 1] + "…"


def draw_rounded_rect(c, x, y, w, h, r=R, fill=None, stroke=None, stroke_width=0.5):
    p = c.beginPath()
    bx, by = x, y
    tx, ty = x + w, y + h
    p.moveTo(bx + r, by)
    p.lineTo(tx - r, by)
    p.arcTo(tx - 2 * r, by, tx, by + 2 * r, -90, 90)
    p.lineTo(tx, ty - r)
    p.arcTo(tx - 2 * r, ty - 2 * r, tx, ty, 0, 90)
    p.lineTo(bx + r, ty)
    p.arcTo(bx, ty - 2 * r, bx + 2 * r, ty, 90, 90)
    p.lineTo(bx, by + r)
    p.arcTo(bx, by, bx + 2 * r, by + 2 * r, 180, 90)
    p.close()
    if fill and stroke:
        c.setFillColor(fill)
        c.setStrokeColor(stroke)
        c.setLineWidth(stroke_width)
        c.drawPath(p, fill=1, stroke=1)
    elif fill:
        c.setFillColor(fill)
        c.drawPath(p, fill=1, stroke=0)
    elif stroke:
        c.setStrokeColor(stroke)
        c.setLineWidth(stroke_width)
        c.drawPath(p, fill=0, stroke=1)


def draw_shadow(c, x, y, w, h, r=R, offset=1.5):
    draw_rounded_rect(c, x + offset, y - offset, w, h, r=r, fill=SHADOW)


def draw_gradient_rect(c, x, y, w, h, color_left, color_right, steps=80):
    strip_w = w / steps
    r1, g1, b1 = color_left.red, color_left.green, color_left.blue
    r2, g2, b2 = color_right.red, color_right.green, color_right.blue
    for i in range(steps):
        t = i / (steps - 1)
        cr = r1 + (r2 - r1) * t
        cg = g1 + (g2 - g1) * t
        cb = b1 + (b2 - b1) * t
        c.setFillColor(Color(cr, cg, cb))
        sx = x + i * strip_w
        sw = strip_w + 0.5
        c.rect(sx, y, sw if i < steps - 1 else strip_w, h, fill=1, stroke=0)


def draw_pill(c, x, y, w, h, fill_color, text, font_size=7, text_color=DARK):
    draw_rounded_rect(c, x, y, w, h, r=h / 2, fill=fill_color)
    c.setFillColor(text_color)
    c.setFont("Helvetica-Bold", font_size)
    c.drawCentredString(x + w / 2, y + h / 2 - font_size * 0.35, text)


def draw_circle_badge(c, cx, cy, r, fill_color, text, font_size=9, text_color=WHITE):
    c.setFillColor(fill_color)
    c.circle(cx, cy, r, fill=1, stroke=0)
    c.setFillColor(text_color)
    c.setFont("Helvetica-Bold", font_size)
    c.drawCentredString(cx, cy - font_size * 0.35, text)


def draw_top_bar(c, cx, card_bot, card_w, card_h, bar_h, rr, color):
    p = c.beginPath()
    bx, by = cx, card_bot + card_h - bar_h
    tx, ty = cx + card_w, card_bot + card_h
    p.moveTo(bx, by)
    p.lineTo(tx, by)
    p.lineTo(tx, ty - rr)
    p.arcTo(tx - 2 * rr, ty - 2 * rr, tx, ty, 0, 90)
    p.lineTo(bx + rr, ty)
    p.arcTo(bx, ty - 2 * rr, bx + 2 * rr, ty, 90, 90)
    p.lineTo(bx, by)
    p.close()
    c.setFillColor(color)
    c.drawPath(p, fill=1, stroke=0)


def draw_bottom_strip(c, cx, card_bot, card_w, strip_h, rr, fill_color, text, text_color, font_size=11):
    p = c.beginPath()
    bx, by = cx, card_bot
    tx, ty = cx + card_w, card_bot + strip_h
    p.moveTo(bx + rr, by)
    p.arcTo(bx, by, bx + 2 * rr, by + 2 * rr, 180, 90)
    p.lineTo(bx, ty)
    p.lineTo(tx, ty)
    p.lineTo(tx, by + rr)
    p.arcTo(tx - 2 * rr, by, tx, by + 2 * rr, -90, 90)
    p.close()
    c.setFillColor(fill_color)
    c.drawPath(p, fill=1, stroke=0)
    c.setFillColor(text_color)
    c.setFont("Helvetica-Bold", font_size)
    c.drawCentredString(cx + card_w / 2, by + strip_h / 2 - font_size * 0.35, text)


def generate_pdf(data, output_path):
    c = Canvas(output_path, pagesize=A4)

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
    roi_mult = total_money / monthly_cost if monthly_cost > 0 else 0
    top3_ids = {p["moduleId"] for p in priority}
    n_rows = len(module_rows)

    # ── Pre-measure variable-height elements ──
    style_quote = ParagraphStyle("q", fontName="Helvetica-Oblique", fontSize=6.5, leading=8.5, textColor=GRAY)
    card_gap = 6
    card_w = (CONTENT_W - card_gap * 2) / 3
    quote_w = card_w - 14

    card_parts = []
    for pm in priority:
        q = pm.get("quote", "")
        if q:
            qp = Paragraph(f"“{truncate(q, 150)}”", style_quote)
            _, qh = qp.wrap(quote_w, 300)
        else:
            qp, qh = None, 0
        card_parts.append((qp, qh))

    card_inner_fixed = 4 + 18 + 10 + 4 + 20 + 4  # top-bar + badge + hours + divider + strip + pad
    card_h = max((card_inner_fixed + qh for _, qh in card_parts), default=60)

    style_intro = ParagraphStyle("i", fontName="Helvetica", fontSize=7.5, leading=10.5, textColor=DARK)
    intro_text = (
        f"Factorial’s internal consulting team has prepared a personalized ROI analysis for "
        f"<b>{company}</b>, based on <b>{seats}</b> employees "
        f"(<b>{emp}</b> ICs · <b>{mgr}</b> Managers · <b>{hr}</b> HR Staff). "
        f"The study identifies the highest-impact modules and quantifies time and cost savings per stakeholder."
    )
    intro_para = Paragraph(intro_text, style_intro)
    _, intro_para_h = intro_para.wrap(CONTENT_W - 16, 300)
    intro_box_h = intro_para_h + 10

    # ── Compute all fixed section heights ──
    header_h = 68
    hero_h = 56
    section_label_h = 12
    table_header_h = 14
    row_h_base = 14
    totals_h = 22
    net_strip_h = 32
    footer_h = 18

    fixed_content = (
        header_h + hero_h + intro_box_h + section_label_h + card_h
        + section_label_h + table_header_h + row_h_base * n_rows + totals_h
        + net_strip_h + footer_h
    )

    # Weighted gap distribution — tighter where sections are logically connected
    # Gaps: 0=header→hero  1=hero→intro  2=intro→cards-label  3=cards→table-label
    #        4=table-rows(flush)  5=rows→totals  6=totals→net  7=net→footer
    gap_weights = [0.4, 0.35, 0.6, 0.7, 0.15, 0.5, 0.45, 0.35]
    total_weight = sum(gap_weights)
    remaining = H - fixed_content

    # First pass: absorb excess into taller rows (up to +4pt each)
    row_h = row_h_base
    row_budget = remaining * 0.4  # spend up to 40% of slack on row height
    extra_per_row = min(4, row_budget / max(n_rows, 1))
    if extra_per_row > 0.5:
        row_h = row_h_base + extra_per_row
        remaining = H - (fixed_content - row_h_base * n_rows + row_h * n_rows)

    unit = max(3, remaining / total_weight)
    gaps = [w * unit for w in gap_weights]

    cur_y = H

    # ════════════════════════════════════════════
    # 1. HEADER (gradient, 68pt)
    # ════════════════════════════════════════════
    header_bot = cur_y - header_h
    draw_gradient_rect(c, 0, header_bot, W, header_h, PINK, PURPLE)

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(MX + 4, H - 30, "Factorial")

    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(W - MX - 4, H - 24, truncate(company, 35))
    c.setFont("Helvetica", 8)
    c.drawRightString(W - MX - 4, H - 36, "ROI Analysis · Confidential")
    if email:
        c.setFont("Helvetica", 7.5)
        c.drawRightString(W - MX - 4, H - 47, truncate(email, 45))

    cur_y = header_bot - gaps[0]

    # ════════════════════════════════════════════
    # 2. HERO STRIP (light pink, 56pt)
    # ════════════════════════════════════════════
    hero_bot = cur_y - hero_h
    draw_rounded_rect(c, MX, hero_bot, CONTENT_W, hero_h, r=7, fill=LIGHT_PINK)

    # Left: pills
    pill_top_y = hero_bot + hero_h / 2 + 6
    draw_pill(c, MX + 8, pill_top_y, 78, 17, WHITE, f"{seats} employees", 8, DARK)
    pill_bot_y = hero_bot + hero_h / 2 - 15
    px = MX + 8
    for lbl in [f"{emp} ICs", f"{mgr} Mgrs", f"{hr} HR"]:
        pw = max(44, len(lbl) * 5.8 + 14)
        draw_pill(c, px, pill_bot_y, pw, 14, WHITE, lbl, 6.5, GRAY)
        px += pw + 4

    # Center: annual return
    cx_mid = MX + CONTENT_W / 2
    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(cx_mid, hero_bot + hero_h / 2 + 5, f"€{fmt_eur(annual_savings)}")
    c.setFillColor(GRAY)
    c.setFont("Helvetica", 7.5)
    c.drawCentredString(cx_mid, hero_bot + hero_h / 2 - 10, "annual return")

    # Right: ROI
    rx = W - MX - 50
    c.setFillColor(PINK)
    c.setFont("Helvetica-Bold", 30)
    c.drawCentredString(rx, hero_bot + hero_h / 2 + 7, f"{roi_mult:.1f}x")
    c.setFillColor(GRAY)
    c.setFont("Helvetica", 7.5)
    c.drawCentredString(rx, hero_bot + hero_h / 2 - 10, "ROI")

    cur_y = hero_bot - gaps[1]

    # ════════════════════════════════════════════
    # 3. INTRO BOX (light pink, snug)
    # ════════════════════════════════════════════
    intro_bot = cur_y - intro_box_h
    draw_rounded_rect(c, MX, intro_bot, CONTENT_W, intro_box_h, r=5, fill=LIGHT_PINK)
    intro_para.drawOn(c, MX + 8, intro_bot + 5)

    cur_y = intro_bot - gaps[2]

    # ════════════════════════════════════════════
    # 4. PRIORITY MODULES (3 cards)
    # ════════════════════════════════════════════
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MX, cur_y + 2, "Priority Modules")
    cur_y -= section_label_h

    rr = 6
    for idx, pm in enumerate(priority):
        qpara, qh = card_parts[idx]
        cx = MX + idx * (card_w + card_gap)
        card_bot = cur_y - card_h

        draw_shadow(c, cx, card_bot, card_w, card_h, r=rr)
        draw_rounded_rect(c, cx, card_bot, card_w, card_h, r=rr, fill=WHITE, stroke=HexColor("#F0E0E8"), stroke_width=0.5)
        draw_top_bar(c, cx, card_bot, card_w, card_h, 4, rr, PINK)

        iy = card_bot + card_h - 4 - 4  # below top bar

        # Badge + name
        draw_circle_badge(c, cx + 14, iy - 5, 8, PINK, str(idx + 1), 9, WHITE)
        c.setFillColor(DARK)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(cx + 26, iy - 8, truncate(pm.get("label", ""), 22))
        iy -= 20

        # Hours + money
        c.setFillColor(PINK)
        c.setFont("Helvetica-Bold", 7)
        hrs = pm.get("monthlyHours", 0)
        money = pm.get("monthlyMoney", 0)
        c.drawString(cx + 7, iy, f"{hrs:.0f}h/mo · €{fmt_eur(money)}/mo")
        iy -= 8

        # Divider
        c.setStrokeColor(PINK_MID)
        c.setLineWidth(0.5)
        c.line(cx + 7, iy, cx + card_w - 7, iy)
        iy -= 5

        # Quote
        if qpara:
            qpara.drawOn(c, cx + 7, iy - qh + 2)

        # Bottom strip
        draw_bottom_strip(c, cx, card_bot, card_w, 20, rr, PINK_ACCENT,
                          f"€{fmt_eur(money)}/mo", PINK, 11)

    cur_y -= card_h + gaps[3]

    # ════════════════════════════════════════════
    # 5. FULL MODULE BREAKDOWN TABLE
    # ════════════════════════════════════════════
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MX, cur_y + 2, "Full Module Breakdown")
    cur_y -= section_label_h

    col_mod_x = MX + 3
    col_hrs_x = MX + CONTENT_W * 0.68
    col_ret_x = MX + CONTENT_W - 3

    # Header row
    hdr_bot = cur_y - table_header_h
    draw_rounded_rect(c, MX, hdr_bot, CONTENT_W, table_header_h, r=4, fill=PINK)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(col_mod_x, hdr_bot + table_header_h / 2 - 3, "Module")
    c.drawRightString(col_hrs_x, hdr_bot + table_header_h / 2 - 3, "Hours saved/mo")
    c.drawRightString(col_ret_x, hdr_bot + table_header_h / 2 - 3, "€ Return/mo")
    cur_y = hdr_bot

    # Data rows
    for idx, row in enumerate(module_rows):
        row_bot = cur_y - row_h
        is_top3 = row.get("moduleId") in top3_ids

        if is_top3:
            c.setFillColor(PINK_ACCENT)
            c.rect(MX, row_bot, CONTENT_W, row_h, fill=1, stroke=0)
            c.setFillColor(PINK)
            c.rect(MX, row_bot, 3, row_h, fill=1, stroke=0)
        elif idx % 2 == 0:
            c.setFillColor(WHITE)
            c.rect(MX, row_bot, CONTENT_W, row_h, fill=1, stroke=0)
        else:
            c.setFillColor(GRAY_LIGHT)
            c.rect(MX, row_bot, CONTENT_W, row_h, fill=1, stroke=0)

        text_y = row_bot + row_h / 2 - 3
        c.setFillColor(DARK)
        c.setFont("Helvetica-Bold" if is_top3 else "Helvetica", 7)
        c.drawString(col_mod_x + (4 if is_top3 else 0), text_y, truncate(row.get("label", ""), 40))

        c.setFillColor(GRAY)
        c.setFont("Helvetica-Bold", 7)
        c.drawRightString(col_hrs_x, text_y, f"{row.get('monthlyHours', 0):.1f}h")

        c.setFillColor(GREEN)
        c.setFont("Helvetica-Bold", 7)
        c.drawRightString(col_ret_x, text_y, f"€{fmt_eur(row.get('monthlyMoney', 0))}")

        cur_y = row_bot

    cur_y -= gaps[5] * 0.4

    # ════════════════════════════════════════════
    # 6. TOTALS ROW (solid pink, white text)
    # ════════════════════════════════════════════
    totals_bot = cur_y - totals_h
    draw_rounded_rect(c, MX, totals_bot, CONTENT_W, totals_h, r=5, fill=PINK)

    c.setFillColor(WHITE)
    lbl_y = totals_bot + totals_h - 8
    val_y = totals_bot + 5

    c.setFont("Helvetica", 6.5)
    c.drawString(col_mod_x, lbl_y, "Bundle price/yr")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(col_mod_x, val_y, f"€{fmt_eur(bundle_annual)}")

    mid = MX + CONTENT_W / 2
    c.setFont("Helvetica", 6.5)
    c.drawCentredString(mid, lbl_y, "Total hours/mo")
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(mid, val_y, f"{total_hrs:.0f}h")

    c.setFont("Helvetica", 6.5)
    c.drawRightString(col_ret_x, lbl_y, "€ Return/mo · ROI")
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(col_ret_x, val_y - 1, f"€{fmt_eur(total_money)} · {roi_mult:.1f}x")

    cur_y = totals_bot - gaps[6]

    # ════════════════════════════════════════════
    # 7. NET BENEFIT STRIP (3 cells)
    # ════════════════════════════════════════════
    cell_w = CONTENT_W / 3
    strip_bot = cur_y - net_strip_h

    net_benefit = annual_savings - bundle_annual
    cells = [
        ("Annual savings", f"€{fmt_eur(annual_savings)}", GREEN_LIGHT, GREEN),
        ("Annual cost", f"€{fmt_eur(bundle_annual)}", LIGHT_PINK, PINK),
        ("Net benefit", f"€{fmt_eur(net_benefit)}/yr",
         HexColor("#F0FDF4") if net_benefit >= 0 else HexColor("#FFF1F2"),
         GREEN if net_benefit >= 0 else PINK),
    ]
    for i, (lbl, val, bg, val_c) in enumerate(cells):
        cx = MX + i * cell_w
        draw_rounded_rect(c, cx + 0.5, strip_bot, cell_w - 1, net_strip_h, r=5, fill=bg)
        c.setFillColor(GRAY)
        c.setFont("Helvetica", 6.5)
        c.drawCentredString(cx + cell_w / 2, strip_bot + net_strip_h - 10, lbl)
        c.setFillColor(val_c)
        c.setFont("Helvetica-Bold", 13)
        c.drawCentredString(cx + cell_w / 2, strip_bot + 7, val)

    # ════════════════════════════════════════════
    # 8. FOOTER (snug below net strip)
    # ════════════════════════════════════════════
    footer_y = max(10, strip_bot - gaps[7])
    c.setStrokeColor(PINK_MID)
    c.setLineWidth(0.4)
    c.line(MX, footer_y + 10, W - MX, footer_y + 10)

    c.setFillColor(GRAY)
    c.setFont("Helvetica", 6)
    c.drawString(MX, footer_y, "Prepared by Factorial · Confidential")
    c.drawRightString(W - MX, footer_y, date.today().strftime("%d %b %Y"))

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
                {
                    "moduleId": "time_tracking",
                    "label": "Time Tracking",
                    "monthlyHours": 135.0,
                    "monthlyMoney": 4050,
                    "quote": "Employees fill timesheets manually every week and half the team forgets, then payroll spends a full day reconciling everything",
                },
                {
                    "moduleId": "core",
                    "label": "Core HR",
                    "monthlyHours": 120.0,
                    "monthlyMoney": 3600,
                    "quote": "We have employee data in three different Excel files and nothing matches, onboarding is a disaster every time",
                },
                {
                    "moduleId": "recruitment",
                    "label": "Recruitment (ATS)",
                    "monthlyHours": 87.5,
                    "monthlyMoney": 2625,
                    "quote": "Candidates get lost in email threads, scheduling interviews takes forever, and we have no idea what our time-to-hire actually is",
                },
            ],
            "bundleAnnual": 38400,
            "totalMonthlyHours": 739.5,
            "totalMonthlyMoney": 22185,
        }
        out = os.path.join(os.path.dirname(__file__) or ".", "sample_roi_report.pdf")
        generate_pdf(sample, out)
        print(f"Sample PDF generated: {out}")
    else:
        input_path = sys.argv[1]
        output_path = sys.argv[2] if len(sys.argv) > 2 else input_path.rsplit(".", 1)[0] + ".pdf"
        with open(input_path) as f:
            data = json.load(f)
        generate_pdf(data, output_path)
        print(f"PDF generated: {output_path}")
