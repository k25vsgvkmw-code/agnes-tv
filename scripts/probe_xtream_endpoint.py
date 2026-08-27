#!/usr/bin/env python3
import socket
import ssl
import urllib.request
import urllib.error

HOST = "comepitv.online"
PORTS = [80, 443, 8080, 8000, 8880, 25461, 2052, 2082, 2086, 2095, 2096, 8443, 8081, 8888]
PATHS = ["/", "/player_api.php"]

print(f"DNS probe for {HOST}")
try:
    infos = socket.getaddrinfo(HOST, None, type=socket.SOCK_STREAM)
    ips = sorted({item[4][0] for item in infos})
    print("Resolved:", ", ".join(ips))
except Exception as e:
    print("DNS ERROR:", repr(e))
    raise SystemExit(2)

print("\nTCP probe")
open_ports = []
for port in PORTS:
    try:
        with socket.create_connection((HOST, port), timeout=3):
            print(f"OPEN {port}")
            open_ports.append(port)
    except Exception as e:
        print(f"CLOSED {port}: {type(e).__name__}")

print("\nHTTP probe")
for port in open_ports:
    schemes = ["https", "http"] if port in (443, 8443, 2096) else ["http", "https"]
    for scheme in schemes:
        for path in PATHS:
            url = f"{scheme}://{HOST}:{port}{path}"
            req = urllib.request.Request(url, headers={"User-Agent": "AGNES-TV-Diagnostic/1.0"})
            try:
                ctx = None
                if scheme == "https":
                    ctx = ssl.create_default_context()
                with urllib.request.urlopen(req, timeout=5, context=ctx) as r:
                    body = r.read(160)
                    print(f"{url} -> {r.status} {r.headers.get('Content-Type','')} body={body[:80]!r}")
            except urllib.error.HTTPError as e:
                print(f"{url} -> HTTP {e.code}")
            except Exception as e:
                print(f"{url} -> {type(e).__name__}: {e}")
