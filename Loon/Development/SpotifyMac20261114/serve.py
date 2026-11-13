"""Loopback-only, bounded local observer. No raw request or access logging."""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EVENTS = []


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        if self.path == "/events":
            payload = json.dumps(EVENTS).encode()
            kind = "application/json"
        elif self.path in ("/Observe.lpx", "/observe.js", "/Mac.lpx", "/DebugMac.lpx", "/DisplayMac.lpx", "/CacheProbe.lpx"):
            payload = (ROOT / self.path[1:]).read_bytes()
            kind = "text/plain; charset=utf-8"
        elif self.path in ("/SpotifyLyrics.js", "/SpotifyLyrics.Entry.js", "/SpotifyLyrics.Request.js", "/SpotifyLyrics.Debug.js", "/SpotifyLyrics.Mac.js", "/SpotifyLyrics.Entry.Mac.js", "/SpotifyLyrics.Entry.Mac.TypesDebug.js", "/SpotifyLyrics.CacheProbe2.js"):
            payload = (ROOT / "runtime" / self.path[1:]).read_bytes()
            kind = "text/javascript; charset=utf-8"
        else:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self):
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json" or self.headers.get("Origin"):
            self.send_error(400)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_error(400)
            return
        if self.path != "/events" or not 0 < size <= 4096:
            self.send_error(400)
            return
        try:
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict) or set(data) - {"phase", "route", "method", "status", "format", "bytes", "flags", "outputStatus", "outputBytes"}:
                raise ValueError()
            if len(EVENTS) < 400:
                EVENTS.append(data)
        except (ValueError, TypeError):
            self.send_error(400)
            return
        self.send_response(204)
        self.end_headers()


if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", 18765), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
