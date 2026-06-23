#!/usr/bin/env python3
"""
review_server.py  —  goodmorning.pics  one-click review + publish

Replaces the export-json / move-file / run-publish dance. Run this instead
of opening review.html:

  cd scripts
  python review_server.py

It opens a review page at http://localhost:8000 . Click Approve on the
images you want (toggles, saved instantly to manifest.json). When you're
done, click "Publish approved" once — the server composites the headline,
writes the PNGs to ../public/drawings/, the posts to ../src/content/blog/,
and pins.csv. Then just: git add . ; git commit ; git push.

Rejects simply stay in review (nothing is deleted). Ctrl+C to stop.

Reuses all the publishing logic from publish_approved.py.
"""

import csv, json, http.server, socketserver
from datetime import date
from pathlib import Path

from publish_approved import (
    compose, write_post, pin_description, slug_for,
    HERE, REVIEW, DRAWINGS, POSTS, SITE_URL,
)

MANIFEST = REVIEW / "manifest.json"
PORT = 8005

def load_manifest():
    return json.loads(MANIFEST.read_text())

def save_manifest(m):
    MANIFEST.write_text(json.dumps(m, indent=2), encoding="utf-8")

def publish_all(manifest):
    DRAWINGS.mkdir(parents=True, exist_ok=True)
    POSTS.mkdir(parents=True, exist_ok=True)
    rows, errors, n = [], [], 0
    for e in manifest:
        if not e.get("approved") or e.get("status") != "generated":
            continue
        src = REVIEW / e["file"]
        if not src.exists():
            errors.append(f"{e['date']} (missing {e['file']})"); continue
        try:
            d = date.fromisoformat(e["date"])
            seo = slug_for(d, e["weekday"])
            compose(src, e["weekday"]).save(DRAWINGS / f"{seo}.png")
            write_post(e, seo)
            rows.append({
                "date": e["date"], "weekday": e["weekday"], "theme": e["theme"],
                "url": f"{SITE_URL}/blog/{seo}/",
                "title": f"Good Morning — Happy {e['weekday']}",
                "pin_description": pin_description(e, seo),
            })
            n += 1
        except Exception as ex:
            errors.append(f"{e['date']}: {ex}")
    if rows:
        with open(HERE / "pins.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader(); w.writerows(rows)
    return n, errors

def render_page(manifest):
    data = json.dumps(manifest)
    return """<!doctype html><html><head><meta charset="utf-8">
<title>goodmorning.pics review</title><style>
 body{font-family:system-ui,sans-serif;margin:0;background:#faf7f2;color:#3a2e25}
 header{position:sticky;top:0;background:#fff;border-bottom:1px solid #e7ddd0;
  padding:14px 20px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;z-index:5}
 header h1{font-size:18px;margin:0 12px 0 0}.count{font-weight:700}
 button{border:1px solid #d8cab5;background:#fff;border-radius:8px;padding:7px 12px;cursor:pointer;font-size:14px}
 button.primary{background:#3a2e25;color:#fff;border-color:#3a2e25}
 #status{margin-left:auto;font-size:13px;color:#6b5d4d}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px;padding:20px}
 .card{background:#fff;border:1px solid #e7ddd0;border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
 .card img{width:100%;aspect-ratio:2/3;object-fit:cover;background:#eee}
 .ph{width:100%;aspect-ratio:2/3;display:flex;align-items:center;justify-content:center;
  color:#b09a7f;font-size:13px;text-align:center;padding:12px;box-sizing:border-box}
 .meta{padding:10px 12px;font-size:13px}.theme{background:#f1e8da;border-radius:6px;padding:1px 7px;font-size:12px}
 .row{display:flex;gap:8px;padding:0 12px 12px}.row button{flex:1}
 .card.ok{outline:3px solid #3aa55d}
 .pub{padding:0 12px 10px;font-size:12px;color:#3aa55d;font-weight:600}
</style></head><body>
<header><h1>goodmorning.pics review</h1><span class="count" id="c"></span>
 <button onclick="all(true)">Approve all</button>
 <button onclick="all(false)">Clear all</button>
 <button class="primary" onclick="publish()">Publish approved</button>
 <span id="status"></span></header>
<div class="grid" id="g"></div><script>
const M=__DATA__;
function render(){const g=document.getElementById('g');g.innerHTML='';
 M.forEach((p,i)=>{const gen=p.status==='generated';const c=document.createElement('div');
  c.className='card'+(p.approved?' ok':'');
  const img=gen?`<img src="/image/${p.file}" loading="lazy">`:
   `<div class="ph">${p.theme}<br>${p.scene||''}<br><i>(not generated)</i></div>`;
  c.innerHTML=img+`<div class="meta"><b>${p.weekday}</b> &middot; ${p.date}<br>
   <span class="theme">${p.theme}</span></div>`+
   (gen?`<div class="row"><button onclick="set(${i},${!p.approved})">${p.approved?'Approved \u2713':'Approve'}</button></div>`:'');
  g.appendChild(c);});
 document.getElementById('c').textContent=M.filter(p=>p.approved).length+' approved';}
async function set(i,v){M[i].approved=v;render();
 await fetch('/approve',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({date:M[i].date,approved:v})});}
async function all(v){for(const p of M){if(p.status==='generated')p.approved=v;}render();
 await fetch('/approve',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({all:true,approved:v})});}
async function publish(){const s=document.getElementById('status');s.textContent='Publishing...';
 const r=await fetch('/publish',{method:'POST'});const j=await r.json();
 s.textContent=`Published ${j.published}`+(j.errors.length?` (${j.errors.length} skipped)`:'')+'. Now git push.';}
render();</script></body></html>""".replace("__DATA__", data)

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass  # quiet

    def _send(self, code, body, ctype="text/html; charset=utf-8"):
        if isinstance(body, str): body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path in ("/", "/review", "/index.html"):
            self._send(200, render_page(load_manifest()))
        elif self.path.startswith("/image/"):
            f = REVIEW / self.path[len("/image/"):]
            if f.exists() and f.suffix == ".png":
                self._send(200, f.read_bytes(), "image/png")
            else:
                self._send(404, "not found")
        else:
            self._send(404, "not found")

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        if self.path == "/approve":
            req = json.loads(raw or b"{}")
            m = load_manifest()
            if req.get("all"):
                for e in m:
                    if e.get("status") == "generated": e["approved"] = bool(req["approved"])
            else:
                for e in m:
                    if e["date"] == req.get("date"): e["approved"] = bool(req["approved"])
            save_manifest(m)
            self._send(200, json.dumps({"ok": True}), "application/json")
        elif self.path == "/publish":
            n, errors = publish_all(load_manifest())
            self._send(200, json.dumps({"published": n, "errors": errors}), "application/json")
        else:
            self._send(404, "not found")

def main():
    if not MANIFEST.exists():
        raise SystemExit("No manifest.json — run generate_month.py first.")
    with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"Review at: http://localhost:{PORT}")
        print("Approve the ones you like, click 'Publish approved', then git push. Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped.")

if __name__ == "__main__":
    main()
