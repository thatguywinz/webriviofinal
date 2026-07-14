#!/usr/bin/env python3
"""
Webrivio SEO guard — run this after ANY edit to the site.

    python tools/seo-check.py

It re-checks the things that are easy to break by accident and expensive to
notice late. It does NOT re-audit the site; it protects the invariants the
audit established. Exit code 1 = something needs fixing before you deploy.

Never deployed (see .vercelignore).
"""
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = [
    "index.html", "services.html", "process.html", "contact.html", "about.html",
    "privacy.html", "website-cost-toronto.html", "roofing-website-design-toronto.html",
    "404.html",
]

# Facts that must never drift. If the business genuinely changes, change them HERE,
# then fix every page the checker flags — that is the point of the file.
PRICE = "499"
PHONE_DISPLAY = "(437) 494-1295"
PHONE_TEL = "+14374941295"
EMAIL = "hello@webrivio.com"

errors, warnings = [], []


def err(page, msg):
    errors.append(f"{page}: {msg}")


def warn(page, msg):
    warnings.append(f"{page}: {msg}")


def jsonld_blocks(src):
    return re.findall(r'<script type="application/ld\+json">(.*?)</script>', src, re.S)


def strip_tags(s):
    s = re.sub(r"<[^>]+>", " ", s)
    s = (s.replace("&amp;", "&").replace("&nbsp;", " ").replace("&#39;", "'")
          .replace("&quot;", '"').replace("&mdash;", "—").replace("&rarr;", "→"))
    return re.sub(r"\s+", " ", s).strip()


for page in PAGES:
    p = ROOT / page
    if not p.exists():
        err(page, "MISSING — a page in the sitemap does not exist")
        continue
    src = p.read_text(encoding="utf-8")

    # ---- 1. schema is parseable -------------------------------------------------
    blocks = jsonld_blocks(src)
    parsed = []
    for b in blocks:
        try:
            parsed.append(json.loads(b))
        except json.JSONDecodeError as e:
            err(page, f"JSON-LD does not parse ({e}) — rich results will be dropped")

    flat = json.dumps(parsed)

    # ---- 2. forbidden review markup ---------------------------------------------
    # Google disallows self-serving review markup on LocalBusiness/Organization.
    # Adding it risks a manual action. Reviews belong on the Google Business Profile.
    for bad in ("aggregateRating", "ratingValue", "reviewCount", '"Review"'):
        if bad.lower() in flat.lower():
            err(page, f"FORBIDDEN schema `{bad}` — spam-policy risk. Reviews go on GBP, not here.")

    # ---- 3. no fabricated social proof ------------------------------------------
    text = strip_tags(src).lower()
    for phrase in ("trusted by", "our clients say", "5-star", "five-star", "rated 5"):
        if phrase in text:
            warn(page, f'copy contains "{phrase}" — Webrivio has no clients yet. Is this true?')
    if re.search(r"\b\d+\+?\s+(happy\s+)?(clients|customers|businesses)\s+served", text):
        err(page, "claims a client count — Webrivio has no clients yet")

    # ---- 4. the 48-hour promise always carries its condition ---------------------
    if "48 hour" in text or "48-hour" in text:
        if not re.search(r"(content and (your )?payment|payment and (your )?content|content \+ payment)", text):
            err(page, "mentions 48 hours but never states the condition (content + payment). "
                      "An unconditional promise you cannot keep.")

    # ---- 5. price is consistent ---------------------------------------------------
    # Allowed: our price, the illustrative leak figure, the grant, and the market
    # ranges the cost guide legitimately quotes for DIY/freelancer/agency tiers.
    ALLOWED_FIGURES = {PRICE, "1840", "3000", "500", "1500", "6000", "10000"}
    prices = set(re.findall(r"\$(\d{3,5})\b", src))
    stray = prices - ALLOWED_FIGURES
    if stray:
        warn(page, f"unexpected price(s) {sorted(stray)} — the published price is ${PRICE}")

    # ---- 6. NAP consistency -------------------------------------------------------
    for tel in re.findall(r'tel:(\+?[\d\-() ]+)', src):
        if tel.replace("-", "").replace(" ", "") != PHONE_TEL:
            err(page, f"phone {tel} does not match {PHONE_TEL} — breaks NAP consistency with your GBP")
    PLACEHOLDERS = {"you@business.com"}  # form input placeholder, not a real address
    for mail in set(re.findall(r"[\w.+-]+@[\w.-]+\.\w+", src)):
        if mail != EMAIL and mail not in PLACEHOLDERS and "formsubmit" not in mail:
            warn(page, f"email {mail} is not {EMAIL}")

    # ---- 7. one h1, no skipped heading levels -------------------------------------
    h1s = re.findall(r"<h1[\s>]", src)
    if len(h1s) != 1:
        err(page, f"{len(h1s)} <h1> tags — must be exactly 1")
    levels = [int(m) for m in re.findall(r"<h([1-6])[\s>]", src)]
    prev = 0
    for lv in levels:
        if prev and lv > prev + 1:
            err(page, f"heading skips h{prev} -> h{lv} (accessibility + outline)")
            break
        prev = lv

    # ---- 8. images have alt text ---------------------------------------------------
    for img in re.findall(r"<img[^>]*>", src):
        if "alt=" not in img:
            src_attr = re.search(r'src="([^"]+)"', img)
            err(page, f"<img> without alt: {src_attr.group(1) if src_attr else img[:40]}")

    # ---- 9. every local asset actually exists ---------------------------------------
    for ref in set(re.findall(r'(?:src|href)="(/[^"#?]+\.(?:css|js|png|jpg|jpeg|webp|gif|ico|webmanifest))"', src)):
        if not (ROOT / ref.lstrip("/")).exists():
            err(page, f"broken reference: {ref}")

    # ---- 10. FAQ schema must match the visible copy VERBATIM -------------------------
    # This is the one that breaks silently when you reword an answer on the page and
    # forget the JSON-LD. Mismatched schema is a structured-data violation.
    visible_qs = {strip_tags(s).rstrip("?").lower()
                  for s in re.findall(r"<summary[^>]*>(.*?)</summary>", src, re.S)}
    if visible_qs:
        schema_qs = {q.rstrip("?").lower() for q in re.findall(r'"@type"\s*:\s*"Question".*?"name"\s*:\s*"([^"]+)"', flat, re.S)}
        for q in schema_qs - visible_qs:
            err(page, f'FAQ schema asks "{q[:58]}..." but no matching visible question — schema must mirror the page')
        for q in visible_qs - schema_qs:
            warn(page, f'visible FAQ "{q[:58]}..." is missing from FAQPage schema (lost AI-citation value)')

    # ---- 11. no leftover meta keywords ----------------------------------------------
    if 'name="keywords"' in src:
        warn(page, "<meta keywords> is obsolete and hands competitors your target list")

    # ---- 12. title / description sanity ---------------------------------------------
    t = re.search(r"<title>(.*?)</title>", src, re.S)
    if not t:
        err(page, "no <title>")
    d = re.search(r'<meta name="description" content="([^"]*)"', src)
    if page != "404.html":
        if not d:
            err(page, "no meta description")
        elif len(d.group(1)) > 165:
            warn(page, f"meta description is {len(d.group(1))} chars — will truncate (aim <155)")
    if not re.search(r'<link rel="canonical"', src) and page != "404.html":
        err(page, "no canonical")


# ---- 13. sitemap lists exactly the live pages ----------------------------------------
sm = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
listed = set(re.findall(r"<loc>https://webrivio\.com/?([^<]*)</loc>", sm))
expected = {"", "services", "process", "contact", "about", "privacy",
            "website-cost-toronto", "roofing-website-design-toronto"}
for missing in expected - listed:
    errors.append(f"sitemap.xml: /{missing} is live but not in the sitemap")
for extra in listed - expected:
    errors.append(f"sitemap.xml: /{extra} is listed but is not a real page")

# ---- report ---------------------------------------------------------------------------
print()
if errors:
    print(f"  {len(errors)} ERROR(S) — fix before deploying\n")
    for e in errors:
        print(f"   x  {e}")
if warnings:
    print(f"\n  {len(warnings)} warning(s) — worth a look\n")
    for w in warnings:
        print(f"   !  {w}")
if not errors and not warnings:
    print("  All checks pass. Safe to deploy.")
elif not errors:
    print("\n  No errors. Safe to deploy.")

print("\n  After deploying, re-ping Bing:")
print("    python tools/indexnow.py\n")
sys.exit(1 if errors else 0)
