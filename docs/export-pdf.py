#!/usr/bin/env python3
"""Generate PDF from deck-preview.html — run: python3 docs/export-pdf.py"""
from playwright.sync_api import sync_playwright
import os, time

HTML = os.path.abspath(os.path.join(os.path.dirname(__file__), "deck-preview.html"))
PDF  = os.path.abspath(os.path.join(os.path.dirname(__file__), "Propuesta-ROI-Factorial.pdf"))

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    page.goto(f"file://{HTML}")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)  # let fonts render

    page.pdf(
        path=PDF,
        width="1280px",
        height="720px",
        print_background=True,
        margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
    )
    browser.close()

size = os.path.getsize(PDF) / 1024
print(f"✓ PDF generado: {PDF}  ({size:.0f} KB)")
