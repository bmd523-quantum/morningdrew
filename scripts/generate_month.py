#!/usr/bin/env python3
"""
generate_month.py  —  goodmorning.pics  (Stage 1 + 2)

Builds a full month of day-of-week + theme prompts in a locked RETRO
MID-CENTURY style and generates raw drawings with gpt-image-1.

The key to non-repetitive output: each theme has a POOL of scene
variations, and the scene is chosen deterministically from the date — so
the same weekday/theme looks different week to week, but a given date
always reproduces the same image. Combined with the day-of-week text
overlay (added later), every pin is visually distinct.

  python generate_month.py --year 2026 --month 7 --dry-run   # free preview
  python generate_month.py --year 2026 --month 7 --limit 3   # cheap test
  python generate_month.py --year 2026 --month 7             # full month
  python generate_month.py --start 2026-06-23 --end 2026-07-01  # date range

Requires: pip install -r requirements.txt   and   OPENAI_API_KEY set.
"""

import argparse, base64, calendar, json, os, sys, time
from datetime import date, timedelta
from pathlib import Path

# ---------------------------------------------------------------- config
MODEL         = "gpt-image-1"     # upgrade path: "gpt-image-1.5" / "gpt-image-2"
SIZE          = "1024x1536"       # portrait 2:3
QUALITY       = "medium"
OUTPUT_FORMAT = "png"
REVIEW_DIR    = Path(__file__).parent / "review"

# Day-of-week is the primary axis; theme is the visual flavor + brand link.
WEEKDAY_THEME = {
    0: "coffee", 1: "sunrise", 2: "breakfast",
    3: "coffee", 4: "camp",    5: "breakfast", 6: "motivation",
}
FIRST_SATURDAY_IS_CHILI = True

# Locked brand style (retro mid-century). "no text" is deliberate — we add
# the headline ourselves in publish_approved.py; models misspell text.
STYLE = (
    "A retro mid-century modern illustration. Muted vintage 1960s-70s palette of "
    "mustard gold, burnt orange, soft teal, and cream, with a subtle grainy print "
    "texture. Bold simple geometric shapes, limited flat colors, slightly imperfect "
    "hand-printed look. Vertical 2:3 composition with calm, uncluttered negative "
    "space in the upper third for a title to be added later. No text, no words, no "
    "letters anywhere in the image."
)

# Scene POOLS — variety lives here. Add/edit freely; more = longer before repeat.
THEME_SCENES = {
    "coffee": [
        "a steaming coffee cup on a sunny windowsill beside a small potted plant",
        "a steaming mug of coffee on a wooden table next to an open book",
        "a French press and a single cup on a kitchen counter at sunrise",
        "a cup of coffee beside a plate of buttered toast in warm morning light",
        "an overhead view of a coffee cup, saucer, and a tiny flower on a table",
        "a coffee pot pouring into a mug with steam rising and a warm glow",
        "a cozy mug of coffee held in two hands with a soft sunrise behind",
        "a coffee cup on a stack of books by a window with hanging plants",
        "a moka pot on a stovetop with a waiting cup in early light",
        "a coffee mug beside reading glasses and a folded newspaper",
        "a latte glass on a cafe table with a sunrise through the window",
        "a cup of coffee on a balcony railing overlooking rolling hills at dawn",
    ],
    "camp": [
        "a small tent beside a gentle campfire with a coffee pot and misty pines",
        "a camp mug on a log next to a smoking campfire at dawn",
        "a tent with its flap open looking out on a sunrise over mountains",
        "a kettle on a campfire grate with mountains and morning mist",
        "two camp chairs facing a calm lake at sunrise with a thermos between them",
        "a canoe at the water's edge at dawn with a misty forest",
        "a lantern and coffee pot on a picnic table at a campsite in early light",
        "a campfire with a pan of breakfast cooking, pines and a rising sun",
        "a hammock between two trees with a mug nearby and morning sun filtering",
        "a backpack and bedroll at a tent entrance as the sun crests the hills",
    ],
    "breakfast": [
        "a warm breakfast table with a stack of pancakes, fruit, and juice",
        "a bowl of oatmeal topped with berries beside a cup of coffee",
        "a plate of eggs and toast with a glass of orange juice in morning sun",
        "fresh croissants and jam on a sunny kitchen table",
        "a bowl of granola and yogurt with sliced fruit by a window",
        "waffles with syrup and berries in soft morning light",
        "a breakfast board of bread, cheese, and fruit on a wooden table",
        "a bowl of cereal with a spoon and a small vase of flowers",
        "a teapot and scones on a tray by a sunny window",
        "a fruit bowl and a basket of muffins on a farmhouse table",
        "avocado toast and a smoothie on a bright kitchen counter",
        "a bagel with spread and a cup of tea beside a morning newspaper",
    ],
    "breakfast-chili": [
        "a rustic bowl of hearty breakfast chili topped with a fried egg and a coffee mug beside it",
        "a bowl of chili with herbs on a wooden table in morning light",
        "a cast iron skillet of breakfast chili with toast on the side",
        "a steaming bowl of chili garnished with cheese and a fried egg in a cozy kitchen",
        "a hearty bowl of chili with cornbread in a warm morning glow",
        "a bowl of chili with avocado and egg beside a cup of coffee at a sunrise window",
    ],
    "sunrise": [
        "a serene sunrise over rolling hills and a calm meadow",
        "a sun cresting layered mountains with geometric clouds",
        "a sunrise over a still lake with soft reflections",
        "the sun rising behind rolling farmland with a winding path",
        "a sunrise over ocean waves with simple geometric birds",
        "a sun breaking over a forest of stylized pines",
        "a sunrise over a desert with simple cacti and distant mesas",
        "a bright sun rising over a field of wildflowers",
        "a misty sunrise over a valley with a small distant house",
        "a sun rising between two hills with a meandering river",
    ],
    "motivation": [
        "a cheerful little bird on a blossoming branch greeting a large rising sun",
        "a single sunflower turned toward the morning sun",
        "a small bird mid-song on a branch against a bright sky",
        "a hot air balloon drifting over hills at sunrise",
        "a winding path leading uphill toward a rising sun",
        "a butterfly over a meadow with the sun cresting the hills",
        "a lighthouse on a cliff with the sun rising over the sea",
        "a sprout breaking through soil with sunbeams above",
        "a mountain peak catching the first light of day",
        "an open window with curtains and sunlight over a vase of flowers",
    ],
}

WEEKDAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]

# ---------------------------------------------------------------- planning
def theme_for(d: date) -> str:
    wd = d.weekday()
    if FIRST_SATURDAY_IS_CHILI and wd == 5 and d.day <= 7:
        return "breakfast-chili"
    return WEEKDAY_THEME[wd]

def scene_for(d: date, theme: str) -> str:
    pool = THEME_SCENES[theme]
    # Deterministic but well-spread: the date's ordinal indexes the pool, so
    # consecutive same-weekdays (7 days apart) land on different scenes.
    return pool[d.toordinal() % len(pool)]

def iter_dates(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)

def build_plan_for_dates(dates):
    plan = []
    for d in dates:
        theme = theme_for(d)
        scene = scene_for(d, theme)
        plan.append({
            "date": d.isoformat(),
            "weekday": WEEKDAYS[d.weekday()],
            "theme": theme,
            "scene": scene,
            "prompt": f"{STYLE} Scene: {scene}.",
            "file": f"{d.isoformat()}_{theme}.png",
            "status": "planned",
            "approved": False,
        })
    return plan

def build_plan(year: int, month: int):
    last = calendar.monthrange(year, month)[1]
    return build_plan_for_dates(iter_dates(date(year, month, 1), date(year, month, last)))

# ---------------------------------------------------------------- generation
def generate(entry, client):
    out = REVIEW_DIR / entry["file"]
    if out.exists():
        entry["status"] = "generated"; return "skip"
    resp = client.images.generate(
        model=MODEL, prompt=entry["prompt"], size=SIZE,
        quality=QUALITY, output_format=OUTPUT_FORMAT, n=1,
    )
    out.write_bytes(base64.b64decode(resp.data[0].b64_json))
    entry["status"] = "generated"; return "ok"

# ---------------------------------------------------------------- review page
def write_review_html(plan):
    data = json.dumps(plan)
    html = """<!doctype html><html><head><meta charset="utf-8">
<title>goodmorning.pics review</title><style>
 body{font-family:system-ui,sans-serif;margin:0;background:#faf7f2;color:#3a2e25}
 header{position:sticky;top:0;background:#fff;border-bottom:1px solid #e7ddd0;
  padding:14px 20px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
 header h1{font-size:18px;margin:0 12px 0 0}.count{font-weight:700}
 button{border:1px solid #d8cab5;background:#fff;border-radius:8px;padding:7px 12px;cursor:pointer}
 button.primary{background:#3a2e25;color:#fff;border-color:#3a2e25}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px;padding:20px}
 .card{background:#fff;border:1px solid #e7ddd0;border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
 .card img{width:100%;aspect-ratio:2/3;object-fit:cover;background:#eee}
 .ph{width:100%;aspect-ratio:2/3;display:flex;align-items:center;justify-content:center;
  color:#b09a7f;font-size:13px;text-align:center;padding:12px;box-sizing:border-box}
 .meta{padding:10px 12px;font-size:13px}.theme{background:#f1e8da;border-radius:6px;padding:1px 7px;font-size:12px}
 .row{display:flex;gap:8px;padding:0 12px 12px}.row button{flex:1}
 .card.ok{outline:3px solid #3aa55d}.card.no{opacity:.45}
 details{padding:0 12px 10px;font-size:12px;color:#7a6a58}
</style></head><body>
<header><h1>goodmorning.pics review</h1><span class="count" id="c"></span>
 <button onclick="all(true)">Approve all</button>
 <button onclick="all(false)">Reject all</button>
 <button class="primary" onclick="exp()">Export approved.json</button></header>
<div class="grid" id="g"></div><script>
const PLAN=__DATA__;
function render(){const g=document.getElementById('g');g.innerHTML='';
 PLAN.forEach((p,i)=>{const c=document.createElement('div');
  c.className='card'+(p.approved?' ok':(p._rej?' no':''));
  const img=p.status==='generated'?`<img src="${p.file}" loading="lazy">`:
   `<div class="ph">${p.theme}<br>${p.scene}<br><i>(dry run)</i></div>`;
  c.innerHTML=img+`<div class="meta"><b>${p.weekday}</b> &middot; ${p.date}<br>
   <span class="theme">${p.theme}</span></div>
   <details><summary>scene + prompt</summary>${p.scene}<hr>${p.prompt}</details>
   <div class="row"><button onclick="set(${i},true)">Approve</button>
   <button onclick="set(${i},false)">Reject</button></div>`;g.appendChild(c);});
 document.getElementById('c').textContent=PLAN.filter(p=>p.approved).length+' / '+PLAN.length+' approved';}
function set(i,v){PLAN[i].approved=v;PLAN[i]._rej=!v;render();}
function all(v){PLAN.forEach(p=>{p.approved=v;p._rej=!v;});render();}
function exp(){const dates=PLAN.filter(p=>p.approved).map(p=>p.date);
 const b=new Blob([JSON.stringify({approved:dates},null,2)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='approved.json';a.click();}
render();</script></body></html>"""
    (REVIEW_DIR / "review.html").write_text(html.replace("__DATA__", data), encoding="utf-8")

# ---------------------------------------------------------------- main
def parse_date(s: str) -> date:
    try:
        return date.fromisoformat(s)
    except ValueError:
        raise argparse.ArgumentTypeError(f"invalid date {s!r} — use YYYY-MM-DD")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", type=int)
    ap.add_argument("--month", type=int)
    ap.add_argument("--start", type=parse_date, help="first date (YYYY-MM-DD)")
    ap.add_argument("--end", type=parse_date, help="last date (YYYY-MM-DD)")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.start or args.end:
        if not (args.start and args.end):
            ap.error("--start and --end must be used together")
        if args.year or args.month:
            ap.error("use either --year/--month or --start/--end, not both")
        if args.end < args.start:
            ap.error("--end must be on or after --start")
        plan = build_plan_for_dates(iter_dates(args.start, args.end))
    elif args.year and args.month:
        plan = build_plan(args.year, args.month)
    else:
        ap.error("provide --year and --month, or --start and --end")

    REVIEW_DIR.mkdir(exist_ok=True)

    if not args.dry_run:
        try:
            from openai import OpenAI
        except ImportError:
            sys.exit("openai not installed — pip install -r requirements.txt")
        if not os.environ.get("OPENAI_API_KEY"):
            sys.exit("OPENAI_API_KEY not set.")
        client = OpenAI()
        todo = plan[:args.limit] if args.limit else plan
        for i, e in enumerate(todo, 1):
            try:
                r = generate(e, client)
                print(f"[{i}/{len(todo)}] {e['date']} {e['weekday']:9} {e['theme']:15} {r}")
            except Exception as ex:
                e["status"] = "error"; print(f"[{i}/{len(todo)}] {e['date']} ERROR: {ex}")
            time.sleep(1)
    else:
        print(f"DRY RUN — {len(plan)} days planned, no images generated.")

    (REVIEW_DIR / "manifest.json").write_text(json.dumps(plan, indent=2), encoding="utf-8")
    write_review_html(plan)
    print(f"\nManifest: {REVIEW_DIR/'manifest.json'}\nOpen: {REVIEW_DIR/'review.html'}")

if __name__ == "__main__":
    main()
