#!/usr/bin/env python3
"""
publish_approved.py  —  goodmorning.pics  (Stage 4)

Takes approved drawings, composites the "Good morning / Happy <Weekday>"
headline + wordmark, writes SEO-named PNGs into the site, creates one
content post per day with VARIED 2-3 sentence body copy, and emits
pins.csv — ready-to-paste pin descriptions (with a soft brand nod) for
manually seeding Pinterest before you turn on automation.

  python publish_approved.py

Reads:  review/manifest.json , review/approved.json
Writes: ../public/drawings/<seo>.png , ../src/content/blog/<seo>.md , pins.csv

Drop TTFs in scripts/fonts/ (script.ttf, headline.ttf) for nice type.
"""

import csv, json, sys
from datetime import date
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE     = Path(__file__).parent
REVIEW   = HERE / "review"
FONTS    = HERE / "fonts"
SITE     = HERE.parent
DRAWINGS = SITE / "public" / "drawings"
POSTS    = SITE / "src" / "content" / "blog"

SITE_URL = "https://goodmorning.pics"
WORDMARK = "goodmorning.pics"
FINAL_W, FINAL_H = 1000, 1500

# Varied body copy (in-post text). Picked deterministically by date so a given
# post is stable across re-runs. 2-3 sentences each: human touch + SEO body.
THEME_BODY = {
    "coffee": [
        "Pour something warm, take a slow breath, and let the day come to you. There's no rush this morning.",
        "The best mornings start with a quiet cup and a moment to yourself. Here's to a calm, steady start.",
        "First coffee, then everything else. Wishing you a warm and easy morning.",
        "Wrap your hands around something warm and ease into the day. Good things are ahead.",
    ],
    "camp": [
        "Mornings feel bigger outdoors — fresh air, quiet light, and the whole day waiting. Breathe it in.",
        "There's nothing like waking up to birdsong and a campfire. Here's to a morning close to nature.",
        "Cool air, warm coffee, and a sunrise over the trees. May your morning be peaceful and wide open.",
        "The quietest, best part of any trip is the early morning. Soak it up.",
    ],
    "breakfast": [
        "A good morning starts with something warm on the table and a minute to enjoy it. No need to hurry.",
        "Slow down, sit down, and start the day with something good. You've earned an easy morning.",
        "Breakfast tastes better when you take your time. Here's to a cozy, unhurried start.",
        "A full plate and a sunny window — that's a morning done right.",
    ],
    "breakfast-chili": [
        "Some mornings call for something hearty to set you up for the day. Dig in and take it on.",
        "A warm, filling start for a day with a lot ahead. Fuel up — you've got this.",
        "When the morning needs some backbone, a hearty bowl does the trick. Here's to a strong start.",
        "Comfort in a bowl to kick off the day. Make it a good one.",
    ],
    "sunrise": [
        "Every sunrise is a fresh start and a clean page. Here's to a bright, easy day.",
        "The sky put on a show this morning — take a second to enjoy it. Today is full of possibility.",
        "A new dawn, a new chance. Step into it gently.",
        "However yesterday went, the sun came up again. That's reason enough to begin.",
    ],
    "motivation": [
        "A new day, a clean page. Make it a good one.",
        "Small steps still move you forward. Take one this morning and see where it leads.",
        "You don't have to do it all today — just the next good thing. Begin there.",
        "Morning is the world quietly offering you another try. Take it.",
    ],
}

# SEO description flavor (clean, no hashtags — feeds the page meta + RSS).
THEME_FLAVOR = {
    "coffee": "with a warm cup of morning coffee",
    "camp": "from a peaceful campsite at dawn",
    "breakfast": "with a cozy breakfast table",
    "breakfast-chili": "with a hearty breakfast bowl",
    "sunrise": "over a calm sunrise",
    "motivation": "with a hopeful morning scene",
}

# Soft brand nod for the PIN description only (kept out of the SEO meta).
# Empty string = no nod (sunrise/motivation stay universal).
BRAND_NOD = {
    "coffee": "Start your morning with day9.coffee.",
    "camp": "Planning a first family campout? Dragonfly Supply has you covered.",
    "breakfast": "Easy morning recipes at Dragonfly Supply.",
    "breakfast-chili": "Cozy breakfast chili ideas from ChiliStation.",
    "sunrise": "",
    "motivation": "",
}

THEME_TAG = {
    "coffee": "morningcoffee", "camp": "campvibes", "breakfast": "breakfast",
    "breakfast-chili": "breakfast", "sunrise": "sunrise", "motivation": "morningmotivation",
}

def pick(pool, d: date):
    return pool[d.toordinal() % len(pool)]

def load_font(names, size):
    for n in names:
        p = FONTS / n
        if p.exists():
            return ImageFont.truetype(str(p), size)
    for sysfont in ("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
                    "C:/Windows/Fonts/georgiab.ttf", "C:/Windows/Fonts/segoeui.ttf"):
        if Path(sysfont).exists():
            return ImageFont.truetype(sysfont, size)
    return ImageFont.load_default()

def centered(draw, y, text, font, fill, stroke_fill, stroke=4):
    w = draw.textlength(text, font=font)
    draw.text(((FINAL_W - w) / 2, y), text, font=font, fill=fill,
              stroke_width=stroke, stroke_fill=stroke_fill)

def compose(src: Path, weekday: str) -> Image.Image:
    img = Image.open(src).convert("RGBA").resize((FINAL_W, FINAL_H), Image.LANCZOS)
    scrim = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(scrim)
    band = int(FINAL_H * 0.34)
    for i in range(band):
        a = int(150 * (1 - i / band))
        sd.line([(0, i), (FINAL_W, i)], fill=(255, 252, 246, a))
    img = Image.alpha_composite(img, scrim)
    d = ImageDraw.Draw(img)
    script = load_font(["script.ttf", "Caveat.ttf"], 96)
    head   = load_font(["headline.ttf", "Fredoka.ttf"], 120)
    mark   = load_font(["headline.ttf", "Fredoka.ttf"], 38)
    ink, halo = (58, 46, 37, 255), (255, 255, 255, 230)
    centered(d, 70,  "Good morning", script, ink, halo, 4)
    centered(d, 185, f"Happy {weekday}", head, ink, halo, 5)
    wmw = d.textlength(WORDMARK, font=mark)
    d.text(((FINAL_W - wmw) / 2, FINAL_H - 80), WORDMARK, font=mark,
           fill=(58, 46, 37, 220), stroke_width=3, stroke_fill=(255, 255, 255, 200))
    return img.convert("RGB")

def slug_for(d: date, weekday: str) -> str:
    return f"good-morning-{weekday.lower()}-{d.isoformat()}"

def write_post(entry, seo):
    d = date.fromisoformat(entry["date"])
    weekday, theme = entry["weekday"], entry["theme"]
    title = f"Good Morning — Happy {weekday}"
    desc  = (f"A retro hand-drawn good morning {weekday.lower()} picture "
             f"{THEME_FLAVOR[theme]}. A fresh original image to save and share.")
    body  = f"{pick(THEME_BODY[theme], d)} Wishing you a wonderful {weekday}."
    md = (f"---\ntitle: '{title}'\ndescription: '{desc}'\n"
          f"pubDate: '{entry['date']}'\nheroImage: '/drawings/{seo}.png'\n"
          f"theme: '{theme}'\n---\n\n{body}\n")
    (POSTS / f"{seo}.md").write_text(md, encoding="utf-8")
    return title

def pin_description(entry, seo):
    d = date.fromisoformat(entry["date"])
    weekday, theme = entry["weekday"], entry["theme"]
    line = pick(THEME_BODY[theme], d).split(".")[0] + "."
    nod = BRAND_NOD[theme]
    tags = f"#goodmorning #goodmorning{weekday.lower()} #{THEME_TAG[theme]} #morningvibes #retroart"
    parts = [f"Good morning! Happy {weekday}.", line,
             f"A fresh retro good morning {weekday.lower()} picture, new every day."]
    if nod:
        parts.append(nod)
    parts.append(tags)
    return " ".join(parts)

def main():
    man_p, app_p = REVIEW / "manifest.json", REVIEW / "approved.json"
    if not man_p.exists(): sys.exit("No manifest.json — run generate_month.py first.")
    if not app_p.exists(): sys.exit("No approved.json — approve in review.html and Export.")
    manifest = {e["date"]: e for e in json.loads(man_p.read_text())}
    approved = json.loads(app_p.read_text())["approved"]
    DRAWINGS.mkdir(parents=True, exist_ok=True)
    POSTS.mkdir(parents=True, exist_ok=True)

    rows, n = [], 0
    for dstr in approved:
        e = manifest.get(dstr)
        if not e or e.get("status") != "generated":
            print(f"skip {dstr} (not generated)"); continue
        src = REVIEW / e["file"]
        if not src.exists():
            print(f"skip {dstr} (missing {e['file']})"); continue
        seo = slug_for(date.fromisoformat(dstr), e["weekday"])
        compose(src, e["weekday"]).save(DRAWINGS / f"{seo}.png")
        title = write_post(e, seo)
        rows.append({"date": dstr, "weekday": e["weekday"], "theme": e["theme"],
                     "url": f"{SITE_URL}/blog/{seo}/", "title": title,
                     "pin_description": pin_description(e, seo)})
        print(f"published {dstr} -> {seo}")
        n += 1

    if rows:
        with open(HERE / "pins.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader(); w.writerows(rows)
    print(f"\n{n} post(s) published. Pin copy -> {HERE/'pins.csv'}")
    print("Review, commit, and push to deploy.")

if __name__ == "__main__":
    main()
