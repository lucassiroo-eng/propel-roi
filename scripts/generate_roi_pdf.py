#!/usr/bin/env python3
"""
Generate a one-page A4 ROI report PDF in Factorial's brand style.

Usage:
    python3 generate_roi_pdf.py input.json [output.pdf]
    python3 generate_roi_pdf.py              # → sample_roi_report.pdf
"""

import json, sys, os, math
from datetime import date
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white, Color
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

# ── Factorial brand palette ──
CORAL       = HexColor("#FF6473")
CORAL_DARK  = HexColor("#FF355E")
CREAM       = HexColor("#FFF8F0")
CREAM_WARM  = HexColor("#FFF3E8")
GREEN       = HexColor("#059669")
GREEN_LIGHT = HexColor("#ECFDF5")
GREEN_VAL   = HexColor("#16A34A")
RED_COST    = HexColor("#DC2626")
DARK        = HexColor("#1A1A2E")
GRAY        = HexColor("#6B7280")
GRAY_SOFT   = HexColor("#9CA3AF")
GRAY_LIGHTEST = HexColor("#FAFAFA")
BORDER      = HexColor("#E5E7EB")
WHITE       = white
SHADOW_CLR  = Color(0.1, 0.05, 0.1, alpha=0.05)

# Module category colours (matching app UI)
CAT_COLORS = {
    "Core HR":            HexColor("#6B7280"),
    "Time":               HexColor("#F59E0B"),
    "Payroll & Benefits": HexColor("#FB923C"),
    "Talent":             HexColor("#E05C75"),
    "Finance":            HexColor("#14B8A6"),
    "IT":                 HexColor("#0D9488"),
    "AI":                 HexColor("#E05C75"),
    "Integrations":       HexColor("#6366F1"),
}

CAT_BG = {
    "Core HR":            HexColor("#F3F4F6"),
    "Time":               HexColor("#FFFBEB"),
    "Payroll & Benefits": HexColor("#FFF7ED"),
    "Talent":             HexColor("#FFF1F2"),
    "Finance":            HexColor("#F0FDFA"),
    "IT":                 HexColor("#F0FDFA"),
    "AI":                 HexColor("#FFF1F2"),
    "Integrations":       HexColor("#EEF2FF"),
}

MODULE_TO_CAT = {
    "core": "Core HR", "analytics": "Core HR",
    "time_off": "Time", "time_tracking": "Time", "time_planning": "Time",
    "payroll": "Payroll & Benefits", "compensations": "Payroll & Benefits",
    "benefits": "Payroll & Benefits", "wellhub": "Payroll & Benefits",
    "recruitment": "Talent", "performance": "Talent", "trainings": "Talent",
    "lms": "Talent", "engagement": "Talent", "complaints": "Talent", "crm": "Talent",
    "expenses": "Finance", "procurement": "Finance", "projects": "Finance",
    "headcount_planning": "Finance",
    "space": "IT", "software_management": "IT", "it_inventory": "IT",
    "one": "AI",
    "integration_business_central": "Integrations",
    "integration_netsuite": "Integrations",
    "integration_sage_200": "Integrations",
    "integration_milena": "Integrations",
    "integration_suprema_xiptic": "Integrations",
    "silae": "Integrations",
}

W, H = A4
MX = 28
CONTENT_W = W - 2 * MX
R = 6


def fmt(n):
    return f"{int(round(n)):,}".replace(",", ".")


def trunc(t, mx):
    return t if len(t) <= mx else t[:mx - 1] + "…"


def rr(c, x, y, w, h, r=R, fill=None, stroke=None, sw=0.5):
    """Draw a rounded rect."""
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
    rr(c, x + 1, y - 1, w, h, r=r, fill=SHADOW_CLR)


def gradient_h(c, x, y, w, h, c1, c2, steps=50):
    sw = w / steps
    for i in range(steps):
        t = i / (steps - 1)
        c.setFillColor(Color(
            c1.red + (c2.red - c1.red) * t,
            c1.green + (c2.green - c1.green) * t,
            c1.blue + (c2.blue - c1.blue) * t,
        ))
        c.rect(x + i * sw, y, sw + 0.5 if i < steps - 1 else sw, h, fill=1, stroke=0)


def cat_color(module_id):
    cat = MODULE_TO_CAT.get(module_id, "Core HR")
    return CAT_COLORS.get(cat, GRAY)


def cat_bg(module_id):
    cat = MODULE_TO_CAT.get(module_id, "Core HR")
    return CAT_BG.get(cat, GRAY_LIGHTEST)


def cat_name(module_id):
    return MODULE_TO_CAT.get(module_id, "Core HR")


def generate_pdf(data, output_path):
    c = Canvas(output_path, pagesize=A4)

    company = data.get("companyName", "Company")
    email = data.get("contactEmail", "")
    contact = data.get("contactName", "")
    seats = data.get("seats", 0)
    hc = data.get("headcounts", {})
    emp, mgr, hr_ = hc.get("employee", 0), hc.get("manager", 0), hc.get("hr", 0)
    module_rows = data.get("moduleRows", [])
    priority = data.get("priorityModules", [])[:3]
    bundle_annual = data.get("bundleAnnual", 0)
    total_hrs = data.get("totalMonthlyHours", 0)
    total_money = data.get("totalMonthlyMoney", 0)
    annual_savings = total_money * 12
    roi_pct = (annual_savings / bundle_annual * 100) if bundle_annual > 0 else 0
    net_benefit = annual_savings - bundle_annual
    top3_ids = {p["moduleId"] for p in priority}
    n_rows = len(module_rows)

    # ── Pre-measure priority card quotes ──
    sq = ParagraphStyle("q", fontName="Helvetica-Oblique", fontSize=6.2, leading=8, textColor=GRAY)
    card_gap = 8
    card_w = (CONTENT_W - card_gap * 2) / 3
    qw = card_w - 16
    card_parts = []
    for pm in priority:
        q = pm.get("quote", "")
        if q:
            qp = Paragraph(f"“{trunc(q, 130)}”", sq)
            _, qh = qp.wrap(qw, 200)
        else:
            qp, qh = None, 0
        card_parts.append((qp, qh))

    card_top_bar = 5
    card_fixed = card_top_bar + 22 + 12 + 22 + 6
    card_h = max((card_fixed + qh for _, qh in card_parts), default=62)

    # ── Adaptive layout ──
    header_h = 52
    kpi_h = 46
    intro_h = 28
    sect_lbl = 13
    tbl_hdr_h = 15
    row_h_base = 14
    totals_h = 24
    net_h = 32
    footer_h = 18

    fixed = (header_h + kpi_h + intro_h + sect_lbl + card_h
             + sect_lbl + tbl_hdr_h + row_h_base * n_rows + totals_h + net_h + footer_h)

    rem = H - fixed
    wts = [6, 7, 5, 8, 10, 2, 8, 8, 5]
    tw = sum(wts)

    # Expand row height if lots of slack
    row_h = row_h_base
    if rem > 80:
        extra = min(4, (rem * 0.3) / max(n_rows, 1))
        row_h = row_h_base + extra
        fixed = (header_h + kpi_h + intro_h + sect_lbl + card_h
                 + sect_lbl + tbl_hdr_h + row_h * n_rows + totals_h + net_h + footer_h)
        rem = H - fixed

    unit = max(1.5, rem / tw)
    gaps = [w * unit for w in wts]
    y = H

    # ══════════════════════════════════════════════
    #  BACKGROUND
    # ══════════════════════════════════════════════
    c.setFillColor(WHITE)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Subtle warm tint on top third
    c.setFillColor(Color(1, 0.97, 0.93, alpha=0.5))
    c.rect(0, H * 0.6, W, H * 0.4, fill=1, stroke=0)

    # ══════════════════════════════════════════════
    #  1. HEADER
    # ══════════════════════════════════════════════
    hdr_bot = y - header_h

    # Coral accent line at bottom of header
    c.setFillColor(CORAL_DARK)
    c.rect(0, hdr_bot, W, 2, fill=1, stroke=0)

    # Logo: coral dot + "factorial" wordmark
    lx = MX
    ly = H - 32
    c.setFillColor(CORAL_DARK)
    c.circle(lx + 10, ly + 4, 10, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.circle(lx + 10, ly + 4, 3.5, fill=1, stroke=0)
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(lx + 24, ly - 2, "factorial")

    # Right side: company + subtitle
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(W - MX, H - 22, trunc(company, 36))
    c.setFillColor(GRAY)
    c.setFont("Helvetica", 7.5)
    c.drawRightString(W - MX, H - 33, "ROI Analysis")
    if email:
        c.setFont("Helvetica", 6.5)
        c.drawRightString(W - MX, H - 42, trunc(email, 45))

    y = hdr_bot - gaps[0]

    # ══════════════════════════════════════════════
    #  2. KPI CARDS — 3 metric cards
    # ══════════════════════════════════════════════
    kpi_bot = y - kpi_h
    kpi_w = (CONTENT_W - 12) / 3
    kpis = [
        ("Ahorros anuales", f"€{fmt(annual_savings)}", GREEN_VAL, GREEN_LIGHT, HexColor("#D1FAE5")),
        ("Coste del sistema", f"€{fmt(bundle_annual)}/yr", CORAL_DARK, HexColor("#FFF1F2"), HexColor("#FECDD3")),
        ("ROI", f"{roi_pct:.0f}%", HexColor("#7C3AED"), HexColor("#F5F3FF"), HexColor("#DDD6FE")),
    ]
    for i, (lbl, val, vc, bg, accent) in enumerate(kpis):
        kx = MX + i * (kpi_w + 6)
        shadow(c, kx, kpi_bot, kpi_w, kpi_h, r=8)
        rr(c, kx, kpi_bot, kpi_w, kpi_h, r=8, fill=bg, stroke=accent, sw=0.8)
        # Colored top accent
        c.saveState()
        p = c.beginPath()
        p.moveTo(kx + 8, kpi_bot + kpi_h); p.lineTo(kx + kpi_w - 8, kpi_bot + kpi_h)
        p.arcTo(kx + kpi_w - 16, kpi_bot + kpi_h - 4, kx + kpi_w, kpi_bot + kpi_h, 0, 90)
        p.lineTo(kx + 8, kpi_bot + kpi_h)
        p.arcTo(kx, kpi_bot + kpi_h - 4, kx + 16, kpi_bot + kpi_h, 90, 90)
        p.close()
        c.clipPath(p, stroke=0)
        c.setFillColor(vc)
        c.rect(kx, kpi_bot + kpi_h - 3, kpi_w, 3, fill=1, stroke=0)
        c.restoreState()

        c.setFillColor(GRAY_SOFT)
        c.setFont("Helvetica", 6.5)
        c.drawCentredString(kx + kpi_w / 2, kpi_bot + kpi_h - 14, lbl.upper())
        c.setFillColor(vc)
        c.setFont("Helvetica-Bold", 17)
        c.drawCentredString(kx + kpi_w / 2, kpi_bot + 10, val)

    y = kpi_bot - gaps[1]

    # ══════════════════════════════════════════════
    #  3. INTRO LINE
    # ══════════════════════════════════════════════
    intro_bot = y - intro_h
    rr(c, MX, intro_bot, CONTENT_W, intro_h, r=6, fill=CREAM_WARM, stroke=BORDER, sw=0.4)
    si = ParagraphStyle("i", fontName="Helvetica", fontSize=7, leading=9.5, textColor=DARK)
    intro_text = (
        f"Personalized ROI analysis for <b>{company}</b> — "
        f"<b>{seats}</b> employees "
        f"({emp} ICs · {mgr} Managers · {hr_} HR). "
        f"Identifying highest-impact modules with time and cost savings per stakeholder."
    )
    ip = Paragraph(intro_text, si)
    _, iph = ip.wrap(CONTENT_W - 16, 100)
    ip.drawOn(c, MX + 8, intro_bot + (intro_h - iph) / 2)

    y = intro_bot - gaps[2]

    # ══════════════════════════════════════════════
    #  4. PRIORITY MODULES — 3 cards with category color
    # ══════════════════════════════════════════════
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MX, y + 2, "Priority Modules")
    y -= sect_lbl

    for idx, pm in enumerate(priority):
        qpara, qh = card_parts[idx]
        cx = MX + idx * (card_w + card_gap)
        cb = y - card_h
        mid = pm.get("moduleId", "core")
        color = cat_color(mid)
        bg = cat_bg(mid)

        shadow(c, cx, cb, card_w, card_h, r=7)
        rr(c, cx, cb, card_w, card_h, r=7, fill=WHITE, stroke=BORDER, sw=0.5)

        # Category color bar at top
        c.saveState()
        clip = c.beginPath()
        clip.moveTo(cx + 7, cb + card_h); clip.lineTo(cx + card_w - 7, cb + card_h)
        clip.arcTo(cx + card_w - 14, cb + card_h - 14, cx + card_w, cb + card_h, 0, 90)
        clip.lineTo(cx + 7, cb + card_h)
        clip.arcTo(cx, cb + card_h - 14, cx + 14, cb + card_h, 90, 90)
        clip.close()
        c.clipPath(clip, stroke=0)
        c.setFillColor(color)
        c.rect(cx, cb + card_h - card_top_bar, card_w, card_top_bar, fill=1, stroke=0)
        c.restoreState()

        iy = cb + card_h - card_top_bar - 4

        # Number circle + label
        c.setFillColor(color)
        c.circle(cx + 13, iy - 5, 7, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(cx + 13, iy - 7.5, str(idx + 1))
        c.setFillColor(DARK)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(cx + 24, iy - 8.5, trunc(pm.get("label", ""), 22))
        iy -= 18

        # Stats line
        hrs, money = pm.get("monthlyHours", 0), pm.get("monthlyMoney", 0)
        c.setFillColor(color)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(cx + 8, iy, f"{hrs:.0f}h/mo · €{fmt(money)}/mo")
        iy -= 10

        # Divider
        c.setStrokeColor(Color(color.red, color.green, color.blue, alpha=0.2))
        c.setLineWidth(0.4)
        c.line(cx + 8, iy, cx + card_w - 8, iy)
        iy -= 4

        # Quote
        if qpara:
            qpara.drawOn(c, cx + 8, iy - qh + 2)

        # Bottom value strip with category color
        strip_h = 22
        c.saveState()
        clip2 = c.beginPath()
        bx, by = cx, cb
        clip2.moveTo(bx + 7, by); clip2.arcTo(bx, by, bx + 14, by + 14, 180, 90)
        clip2.lineTo(bx, by + strip_h); clip2.lineTo(bx + card_w, by + strip_h)
        clip2.lineTo(bx + card_w, by + 7)
        clip2.arcTo(bx + card_w - 14, by, bx + card_w, by + 14, -90, 90)
        clip2.close()
        c.clipPath(clip2, stroke=0)
        c.setFillColor(bg)
        c.rect(cx, cb, card_w, strip_h, fill=1, stroke=0)
        c.restoreState()

        c.setFillColor(color)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(cx + card_w / 2, cb + 6, f"€{fmt(money)}/mo")

    y -= card_h + gaps[3]

    # ══════════════════════════════════════════════
    #  5. TABLE — full module breakdown with category colors
    # ══════════════════════════════════════════════
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MX, y + 2, "Full Module Breakdown")
    y -= sect_lbl

    col_mod = MX + 6
    col_hrs = MX + CONTENT_W * 0.65
    col_eur = MX + CONTENT_W - 6

    # Table header
    hb = y - tbl_hdr_h
    rr(c, MX, hb, CONTENT_W, tbl_hdr_h, r=5, fill=DARK)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(col_mod, hb + tbl_hdr_h / 2 - 3, "Module")
    c.drawRightString(col_hrs, hb + tbl_hdr_h / 2 - 3, "Hours saved/mo")
    c.drawRightString(col_eur, hb + tbl_hdr_h / 2 - 3, "€ Return/mo")
    y = hb

    for idx, row in enumerate(module_rows):
        rb = y - row_h
        mid = row.get("moduleId", "")
        color = cat_color(mid)
        bg = cat_bg(mid) if mid in top3_ids else (WHITE if idx % 2 == 0 else GRAY_LIGHTEST)

        c.setFillColor(bg)
        c.rect(MX, rb, CONTENT_W, row_h, fill=1, stroke=0)

        # Category color left accent
        c.setFillColor(color)
        c.rect(MX, rb, 3, row_h, fill=1, stroke=0)

        # Subtle bottom border
        c.setStrokeColor(BORDER)
        c.setLineWidth(0.3)
        c.line(MX, rb, MX + CONTENT_W, rb)

        ty = rb + row_h / 2 - 3
        is3 = mid in top3_ids
        c.setFillColor(DARK)
        c.setFont("Helvetica-Bold" if is3 else "Helvetica", 7)
        c.drawString(col_mod + 2, ty, trunc(row.get("label", ""), 36))

        c.setFillColor(GRAY)
        c.setFont("Helvetica", 7)
        c.drawRightString(col_hrs, ty, f"{row.get('monthlyHours', 0):.1f}h")

        c.setFillColor(color)
        c.setFont("Helvetica-Bold", 7)
        c.drawRightString(col_eur, ty, f"€{fmt(row.get('monthlyMoney', 0))}")

        y = rb

    y -= gaps[5] * 0.3

    # ══════════════════════════════════════════════
    #  6. TOTALS ROW
    # ══════════════════════════════════════════════
    tb = y - totals_h
    gradient_h(c, MX, tb, CONTENT_W, totals_h, DARK, HexColor("#2D1B69"))

    # Round the corners
    c.saveState()
    clip3 = c.beginPath()
    bx, by = MX, tb
    rr_r = 5
    clip3.moveTo(bx + rr_r, by); clip3.lineTo(bx + CONTENT_W - rr_r, by)
    clip3.arcTo(bx + CONTENT_W - 2*rr_r, by, bx + CONTENT_W, by + 2*rr_r, -90, 90)
    clip3.lineTo(bx + CONTENT_W, by + totals_h - rr_r)
    clip3.arcTo(bx + CONTENT_W - 2*rr_r, by + totals_h - 2*rr_r, bx + CONTENT_W, by + totals_h, 0, 90)
    clip3.lineTo(bx + rr_r, by + totals_h)
    clip3.arcTo(bx, by + totals_h - 2*rr_r, bx + 2*rr_r, by + totals_h, 90, 90)
    clip3.lineTo(bx, by + rr_r)
    clip3.arcTo(bx, by, bx + 2*rr_r, by + 2*rr_r, 180, 90)
    clip3.close()
    c.clipPath(clip3, stroke=0)
    gradient_h(c, MX, tb, CONTENT_W, totals_h, DARK, HexColor("#2D1B69"))
    c.restoreState()

    c.setFillColor(WHITE)
    ty_top = tb + totals_h - 8
    ty_bot = tb + 5

    c.setFont("Helvetica", 6)
    c.drawString(col_mod, ty_top, "Bundle price/yr")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(col_mod, ty_bot, f"€{fmt(bundle_annual)}")

    mid_x = MX + CONTENT_W * 0.45
    c.setFont("Helvetica", 6)
    c.drawCentredString(mid_x, ty_top, "Total return/mo")
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(mid_x, ty_bot, f"{total_hrs:.0f}h  ·  €{fmt(total_money)}")

    c.setFont("Helvetica", 6)
    c.drawRightString(col_eur, ty_top, "ROI")
    c.setFont("Helvetica-Bold", 13)
    c.drawRightString(col_eur, ty_bot - 1, f"{roi_pct:.0f}%")

    y = tb - gaps[6]

    # ══════════════════════════════════════════════
    #  7. NET BENEFIT STRIP — 3 metric pills
    # ══════════════════════════════════════════════
    cw = (CONTENT_W - 8) / 3
    nb = y - net_h
    cells = [
        ("Ahorros anuales",  f"€{fmt(annual_savings)}", GREEN_VAL, GREEN_LIGHT, HexColor("#D1FAE5")),
        ("Coste anual",      f"-€{fmt(bundle_annual)}", RED_COST,  HexColor("#FFF1F2"), HexColor("#FECDD3")),
        ("Beneficio neto",   f"€{fmt(net_benefit)}/yr",
         GREEN_VAL if net_benefit >= 0 else RED_COST,
         GREEN_LIGHT if net_benefit >= 0 else HexColor("#FFF1F2"),
         HexColor("#D1FAE5") if net_benefit >= 0 else HexColor("#FECDD3")),
    ]
    for i, (lbl, val, vc, bg, bdr) in enumerate(cells):
        cx = MX + i * (cw + 4)
        shadow(c, cx, nb, cw, net_h, r=8)
        rr(c, cx, nb, cw, net_h, r=8, fill=bg, stroke=bdr, sw=0.6)
        c.setFillColor(GRAY_SOFT)
        c.setFont("Helvetica", 6)
        c.drawCentredString(cx + cw / 2, nb + net_h - 10, lbl)
        c.setFillColor(vc)
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(cx + cw / 2, nb + 7, val)

    # ══════════════════════════════════════════════
    #  8. FOOTER
    # ══════════════════════════════════════════════
    fy = max(12, nb - gaps[8])
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.3)
    c.line(MX, fy + 10, W - MX, fy + 10)
    c.setFillColor(GRAY_SOFT)
    c.setFont("Helvetica", 5.5)
    c.drawString(MX, fy, "Prepared by Factorial · Confidential")
    c.drawRightString(W - MX, fy, date.today().strftime("%d %b %Y"))

    c.save()
    return output_path


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sample = {
            "companyName": "HT Médica",
            "contactName": "Alejandro Garrote",
            "contactEmail": "recepcion.sanrafael@htmedica.com",
            "seats": 745,
            "headcounts": {"employee": 680, "hr": 25, "manager": 40},
            "moduleRows": [
                {"moduleId": "core", "label": "Core HR", "monthlyHours": 413.3, "monthlyMoney": 8800},
                {"moduleId": "time_tracking", "label": "Time Tracking", "monthlyHours": 596.0, "monthlyMoney": 13020},
                {"moduleId": "time_off", "label": "Time Off", "monthlyHours": 326.0, "monthlyMoney": 8220},
                {"moduleId": "time_planning", "label": "Shift Management", "monthlyHours": 585.0, "monthlyMoney": 13550},
                {"moduleId": "trainings", "label": "Training Management", "monthlyHours": 149.5, "monthlyMoney": 4325},
                {"moduleId": "performance", "label": "Performance Management", "monthlyHours": 115.0, "monthlyMoney": 3250},
                {"moduleId": "engagement", "label": "Engagement Surveys", "monthlyHours": 82.5, "monthlyMoney": 2375},
                {"moduleId": "expenses", "label": "Expense Management", "monthlyHours": 262.5, "monthlyMoney": 7450},
                {"moduleId": "payroll", "label": "Payroll Connect", "monthlyHours": 150.0, "monthlyMoney": 4500},
                {"moduleId": "it_inventory", "label": "IT Inventory", "monthlyHours": 3.3, "monthlyMoney": 100},
                {"moduleId": "software_management", "label": "Software Management", "monthlyHours": 42.5, "monthlyMoney": 1275},
                {"moduleId": "recruitment", "label": "Recruitment (ATS)", "monthlyHours": 35.0, "monthlyMoney": 1008},
                {"moduleId": "compensations", "label": "Compensation", "monthlyHours": 125.0, "monthlyMoney": 3650},
            ],
            "priorityModules": [
                {"moduleId": "time_planning", "label": "Shift Management", "monthlyHours": 585.0, "monthlyMoney": 13550,
                 "quote": "Gestión de turnos y cuadrantes muy manual, con herramientas poco ágiles. Se acordó demo específica de turnos con Isabel, la directora asistencial."},
                {"moduleId": "time_tracking", "label": "Time Tracking", "monthlyHours": 596.0, "monthlyMoney": 13020,
                 "quote": "El cliente está buscando una plataforma integral para RRHH y TI, con especial interés en fichajes."},
                {"moduleId": "core", "label": "Core HR", "monthlyHours": 413.3, "monthlyMoney": 8800,
                 "quote": "Herramienta desactualizada y poco eficiente para gestión actual de procesos RRHH, con 700 empleados en 41 centros."},
            ],
            "bundleAnnual": 39184,
            "totalMonthlyHours": 2885.6,
            "totalMonthlyMoney": 71523,
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
