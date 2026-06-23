# Good Morning Pics — complete setup

Everything to take the deployed Astro blog scaffold to a finished,
SEO-ready, auto-generating brand. Drop these files into your repo over
the stock starter (matching the paths below), then follow the run order.

## File map (where each file goes)

```
astro.config.mjs                      ← sets site = goodmorning.pics (critical)
public/
  robots.txt                          ← points crawlers at the sitemap
src/
  consts.ts                           ← brand name + theme→brand map (the "brain")
  hubs.ts                             ← theme hubs + weekday hubs config
  content.config.ts                   ← post schema (adds theme, string heroImage)
  components/
    Header.astro                      ← brand title, simple nav
    Footer.astro                      ← three brand links + copyright
  layouts/
    BlogPost.astro                    ← per-post page (big image + brand link)
  pages/
    index.astro                       ← designed homepage (featured + hubs)
    about.astro                       ← brand About page
    [hub].astro                       ← ALL hubs: /coffee.../monday...
    rss.xml.js                        ← RSS with image enclosures (for Pinterest)
    blog/
      index.astro                     ← FIXED: plain <img>, not <Image>
scripts/
  generate_month.py                   ← Stage 1+2: prompts + gpt-image-1
  publish_approved.py                 ← Stage 4: compose text + write posts + pins.csv
  requirements.txt
  README.md                           ← scripts workflow detail
  fonts/                              ← drop script.ttf + headline.ttf here
```

Files you do NOT need to change from the stock starter:
`BaseHead.astro`, `HeaderLink.astro`, `FormattedDate.astro`, and
`src/pages/blog/[...slug].astro` (it already passes `theme` through).

## One-time setup

1. Drop all files above into the repo (overwrite the stock versions).
2. Delete the demo content so the new schema is happy:
   ```powershell
   del src\content\blog\*.md
   del src\content\blog\*.mdx
   ```
3. Make sure the sitemap integration is installed (the starter includes it;
   if `npm run dev` complains): `npx astro add sitemap`
4. Fonts: download from Google Fonts and put in `scripts/fonts/`:
   - Caveat  → rename to `script.ttf`
   - Fredoka → rename to `headline.ttf`
5. Python deps + key (PowerShell):
   ```powershell
   cd scripts
   pip install -r requirements.txt
   $env:OPENAI_API_KEY = "sk-..."
   ```
   (GPT image models may need Organization Verification in the OpenAI console.)

## Confirm the shell works

```powershell
npm run dev
```
Check: homepage loads (empty sections hidden), `/coffee` and `/monday`
show "coming soon", `/about` reads right. Then commit + push — Vercel
redeploys. Last domain step: add goodmorning.pics in Vercel → Domains,
and 301 goodmorning.pictures → goodmorning.pics at your registrar.

## Produce a month of drawings

```powershell
cd scripts
python generate_month.py --year 2026 --month 7 --dry-run   # free: read the plan
python generate_month.py --year 2026 --month 7 --limit 3   # cheap: test the look
# tweak STYLE / scenes if needed, then:
python generate_month.py --year 2026 --month 7             # full month
```
Open `scripts/review/review.html`, Approve/Reject each, **Export
approved.json** into `scripts/review/`, then:
```powershell
python publish_approved.py
```
This writes SEO images to `public/drawings/`, posts to
`src/content/blog/`, and `scripts/pins.csv` (ready-to-paste pin copy).
Review, commit, push.

## Pinterest rollout (don't skip the order)

1. Create the business account; handle `goodmorningpicsdaily`, display
   name "Good Morning Pics", avatar = the sun-cup mark (1024×1024).
2. Make the 6 boards with the keyword descriptions.
3. **Hand-pin ~15–20** over the first week or two using `pins.csv` copy,
   each pin to its day-of-week board + theme board (max 2 boards/pin).
4. Only after that history exists, turn on RSS→Tailwind automation at
   ~3–5 pins/day pointing at `https://goodmorning.pics/rss.xml`.

## Still optional (nice-to-have, not required)

- A default Open Graph share image in `public/` referenced by
  `BaseHead.astro` (for when the homepage/hubs get shared).
- Contextual "more like this" links on each post page (to its theme +
  weekday hub) for stronger internal linking.
```
