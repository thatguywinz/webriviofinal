#!/usr/bin/env python3
"""Local preview server for webrivio.com — mimics Vercel's cleanUrls + redirects.

    python tools/preview.py          # serves on http://localhost:8899 and opens your browser
    python tools/preview.py 5000     # pick another port

Never deployed (tools/ is in .vercelignore). Ctrl+C to stop.
"""
import os
import sys
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REDIRECTS = {"/work": "/case-studies", "/work.html": "/case-studies"}


class CleanUrlHandler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def send_head(self):
        path = self.path.split("?")[0].split("#")[0]
        if path in REDIRECTS:
            self.send_response(302)
            self.send_header("Location", REDIRECTS[path])
            self.end_headers()
            return None
        # cleanUrls: /case-studies -> case-studies.html
        if path != "/" and "." not in os.path.basename(path):
            candidate = os.path.join(ROOT, path.lstrip("/") + ".html")
            if os.path.isfile(candidate):
                self.path = path + ".html"
        return super().send_head()

    def log_message(self, fmt, *args):
        pass  # keep the terminal quiet


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8899
    server = ThreadingHTTPServer(("127.0.0.1", port), CleanUrlHandler)
    url = f"http://localhost:{port}/"
    print(f"  Webrivio preview running at {url}   (Ctrl+C to stop)")
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  stopped")


if __name__ == "__main__":
    main()
