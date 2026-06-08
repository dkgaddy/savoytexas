# Deploying "Chat with the Colonel" to Railway

A step-by-step guide to make the Colonel actually talk. The website code is
already done and pushed; this connects it to a small backend on Railway that
holds your Anthropic API key and enforces the daily spend cap.

> **Why a backend at all?** A static site can't safely call the Claude API —
> the key would be exposed in the browser, and the $0.01/day cap can't be
> enforced client-side. The Railway service solves both: it keeps the key
> secret and tracks spend. The site only ever calls *your* service.

---

## What you'll need (5 minutes of prep)

1. **A Railway account** — https://railway.app (you already have a project here).
2. **An Anthropic API key** — from https://console.anthropic.com → *Settings →
   API Keys → Create Key*. It looks like `sk-ant-...`. Copy it somewhere safe;
   you'll paste it into Railway, never into the website code.
3. The repo is already pushed to GitHub (`dkgaddy/savoytexas`), and the backend
   lives in the **`colonel-server/`** folder.

---

## Part 1 — Deploy the backend on Railway (dashboard method)

### Step 1: Create the service from your GitHub repo
1. Open your Railway project → click **+ New** (or **+ Create**) → **GitHub Repo**.
2. Pick **`dkgaddy/savoytexas`**. (If Railway can't see it, click *Configure
   GitHub App* and grant access to that repo.)
3. Railway will add a service and try to build. It will likely fail the first
   time because it's looking at the repo root — fix that next.

### Step 2: Point the service at the `colonel-server/` folder
1. Click the new service → **Settings** tab.
2. Find **Root Directory** (under *Build* / *Source*) and set it to:
   ```
   colonel-server
   ```
3. Railway now builds only that folder. It auto-detects Node, runs
   `npm install`, then `npm start` (defined in `package.json`). No other build
   config is needed.

### Step 3: Add your environment variables
1. Service → **Variables** tab → **+ New Variable**.
2. Add the one required variable:
   | Name | Value |
   |------|-------|
   | `ANTHROPIC_API_KEY` | `sk-ant-...` (the key you copied) |
3. (Optional) Add any of these to override defaults — see `.env.example`:
   | Name | Default | Purpose |
   |------|---------|---------|
   | `DAILY_CAP_USD` | `0.01` | Hard daily spend cap |
   | `COLONEL_MODEL` | `claude-haiku-4-5` | Which model to use |
   | `MAX_OUTPUT_TOKENS` | `320` | Caps reply length (and output cost) |
   | `ALLOWED_ORIGIN` | `*` | Lock to your site's origin (see Part 3) |
4. Railway redeploys automatically when you save variables.

### Step 4: (Recommended) Persist the spend counter across restarts
Without this, the daily-spend tally resets every time Railway redeploys. That's
*safe* (it can only reset the budget early, never overspend), but a volume keeps
it accurate.
1. Service → **Settings** → **Volumes** → **+ New Volume**.
2. Set the **Mount path** to:
   ```
   /data
   ```
3. Go back to **Variables** and add:
   | Name | Value |
   |------|-------|
   | `SPEND_FILE` | `/data/spend.json` |

### Step 5: Give the service a public URL
1. Service → **Settings** → **Networking** → **Generate Domain**.
2. You'll get a URL like:
   ```
   https://savoytexas-production-xxxx.up.railway.app
   ```
   Copy it — you need it in Part 2.

### Step 6: Confirm the backend is alive
In a terminal (or your browser for the first two):
```bash
# health check — should say "Chat with the Colonel — alive and well."
curl https://savoytexas-production.up.railway.app

# status — shows today's spend, the cap, and the model
curl https://savoytexas-production.up.railway.app/api/status

# a real question to the Colonel (costs a fraction of a cent)
curl -X POST https://savoytexas-production.up.railway.app/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"How did the town get its name?"}]}'
```
If the last one returns a reply in the Colonel's voice, the backend works. 🎉

---

## Part 2 — Connect the website to the backend

1. Open **`js/colonel-chat.js`** and find this line near the top (~line 16):
   ```js
   const COLONEL_API = "https://savoytexas-production.up.railway.app/api/chat";
   ```
2. Replace it with your real URL from Step 5 (keep the `/api/chat` on the end):
   ```js
   const COLONEL_API = "https://savoytexas-production-xxxx.up.railway.app/api/chat";
   ```
3. Save, then commit and push:
   ```bash
   git add js/colonel-chat.js
   git commit -m "Point Colonel chat at Railway backend"
   git push origin main
   ```
4. Reload the site, click the badge, and ask the Colonel something. Done.

---

## Part 3 — (Recommended) Lock down CORS

While `ALLOWED_ORIGIN=*` works, it lets any site call your endpoint. Once the
live URL works, restrict it to your site's origin:

1. Find your site's origin (the part before the first `/` after `https://`):
   - GitHub Pages: `https://dkgaddy.github.io`
   - Custom domain: e.g. `https://savoytexas.org`
2. Railway → service → **Variables** → set:
   | Name | Value |
   |------|-------|
   | `ALLOWED_ORIGIN` | `https://dkgaddy.github.io` |
3. Save (Railway redeploys). The chat keeps working from your site; other
   origins get blocked.

> Note: this is a light deterrent, not hard auth. The real protection against a
> runaway bill is `DAILY_CAP_USD` — that cannot be bypassed from the browser.

---

## Cost cheat-sheet

- Default cap is **$0.01/day total across all visitors** — roughly **4–6
  messages/day** with Haiku + prompt caching, then the Colonel says he's "too
  busy with town business" until the next day (UTC).
- To make it more usable, raise the cap on Railway — **no code change**, just set
  `DAILY_CAP_USD` (e.g. `0.25` or `1.00`) in Variables.
- Watch spend anytime at `https://savoytexas-production.up.railway.app/api/status`.

---

## Updating the Colonel's knowledge later

`colonel-server/knowledge.md` is generated from the site's `data/` archive by
`/tmp/savoy_work/build_colonel_kb.py`. If you expand the archive, re-run that
script, commit the new `knowledge.md`, and push — Railway redeploys
automatically. Keep the digest above ~4,096 tokens so it stays eligible for
prompt caching (that's what keeps each message cheap).

---

## Troubleshooting

| Symptom | Likely cause / fix |
|--------|--------------------|
| Build fails on Railway | Root Directory isn't set to `colonel-server` (Part 1, Step 2). |
| Chat says "study isn't wired up yet" | `COLONEL_API` in `js/colonel-chat.js` still has the placeholder URL (Part 2). |
| "telegraph line… is down" in chat | Backend unreachable or errored. Check Railway **Deploy Logs**; verify the domain works with the `curl` health check. |
| Replies are always "too busy" | Daily cap reached, or `DAILY_CAP_USD` is set very low/`0`. Check `/api/status`. |
| 401 / auth errors in Railway logs | `ANTHROPIC_API_KEY` missing or wrong in Variables. |
| Works in `curl` but not from the site | CORS — set `ALLOWED_ORIGIN` to your exact site origin, or `*` to test (Part 3). |

### Local test (optional)
```bash
cd colonel-server
npm install
ANTHROPIC_API_KEY=sk-ant-... npm start   # → http://localhost:3000
```
