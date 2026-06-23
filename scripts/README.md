# goodmorning.pics — daily drawing generator

A two-stage pipeline with a human approval gate in the middle. Nothing
reaches the site until you approve it.

```
scripts/
  generate_month.py     Stage 1+2: plan + generate raw drawings
  publish_approved.py   Stage 4: composite text + write site posts
  requirements.txt
  fonts/                drop TTFs here (see below)
  review/               created by the script: raw images, manifest, review.html
```

## Setup (PowerShell, once)

```powershell
cd scripts
pip install -r requirements.txt
$env:OPENAI_API_KEY = "sk-..."   # your key
```

GPT image models may require **Organization Verification** in your OpenAI
console (platform.openai.com) before the API will return images.

### Fonts (for nice headline type)

Drop two free TTFs into `scripts/fonts/`:
- `script.ttf`   — a handwritten face (e.g. Google Fonts "Caveat")
- `headline.ttf` — a friendly rounded face (e.g. "Fredoka" or "Quicksand")

Without them the script falls back to a default font (works, but plain).

## Workflow

**1. See the month's plan for free (no API spend):**
```powershell
python generate_month.py --year 2026 --month 7 --dry-run
```
Open `review/review.html` to read every day's theme + prompt.

**2. Cheap real test — generate just 3:**
```powershell
python generate_month.py --year 2026 --month 7 --limit 3
```
Check the look in `review/review.html`. Tweak `STYLE` / `THEME_SCENE` in
`generate_month.py` and re-run until you like it. Already-generated days
are skipped, so re-runs only fill gaps.

**3. Generate the full month:**
```powershell
python generate_month.py --year 2026 --month 7
```

**4. Approve.** Open `review/review.html`, Approve/Reject each, then
**Export approved.json** (saves to your Downloads — move it into
`scripts/review/`). To regenerate a reject: delete its PNG from
`review/` and re-run step 3.

**5. Publish the approved ones into the site:**
```powershell
python publish_approved.py
```
This composites "Good morning / Happy <Weekday>" + the wordmark, writes
SEO-named PNGs to `public/drawings/`, and creates one post per day in
`src/content/blog/`.

**6. Ship it:**
```powershell
npm run dev          # eyeball locally
git add . ; git commit -m "July drawings" ; git push
```
Vercel redeploys automatically.

## How the design maps to the keyword data

- **Day-of-week is the headline** (502K/mo of search volume) — derived
  from the date automatically.
- **Theme is the visual flavor + brand link** — set per weekday in
  `WEEKDAY_THEME`. coffee→day9, camp/breakfast→Dragonfly,
  breakfast-chili→ChiliStation, sunrise/motivation→footer only.
- **SEO**: keyword filenames, keyword title/alt, a sentence of body text
  so Google will rank the page, all three discovery channels at once.
