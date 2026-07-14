#!/usr/bin/env python3
"""
Re-ping Bing/Yandex after you deploy a change.

    python tools/indexnow.py                 # all pages
    python tools/indexnow.py /about /services  # just these

IndexNow tells Bing about a change immediately instead of waiting for a crawl.
Bing's index partly feeds ChatGPT and Copilot search, so this matters for AI
visibility. Google ignores IndexNow — use Search Console's URL Inspection for
Google (roughly 10 requests/day).

The key file is public by design (it proves you own the domain); the copy in
.indexnow-key is just so this script can find it.

Never deployed (see .vercelignore).
"""
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HOST = "webrivio.com"
ALL = ["/", "/services", "/process", "/contact", "/about", "/privacy",
       "/website-cost-toronto", "/roofing-website-design-toronto"]

keyfile = ROOT / ".indexnow-key"
if not keyfile.exists():
    sys.exit("No .indexnow-key found in the repo root.")
key = keyfile.read_text(encoding="utf-8").strip()

paths = sys.argv[1:] or ALL
urls = [f"https://{HOST}{p if p.startswith('/') else '/' + p}" for p in paths]

payload = json.dumps({
    "host": HOST,
    "key": key,
    "keyLocation": f"https://{HOST}/{key}.txt",
    "urlList": urls,
}).encode()

req = urllib.request.Request(
    "https://api.indexnow.org/indexnow",
    data=payload,
    headers={"Content-Type": "application/json; charset=utf-8"},
    method="POST",
)

try:
    with urllib.request.urlopen(req, timeout=30) as r:
        code = r.status
except urllib.error.HTTPError as e:
    code = e.code

if code in (200, 202):
    print(f"\n  Submitted {len(urls)} URL(s) to Bing / Yandex / Seznam / Naver.\n")
    for u in urls:
        print(f"   -> {u}")
    print()
else:
    print(f"\n  IndexNow returned HTTP {code}.")
    print("  403 usually means the key file is not reachable at "
          f"https://{HOST}/{key}.txt — check it deployed.\n")
    sys.exit(1)
