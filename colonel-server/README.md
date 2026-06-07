# Chat with the Colonel — backend

Small Node service that powers the **"Chat with the Colonel"** feature on the
Savoy, Texas history website. It holds the Anthropic API key, speaks as
Col. William Savoy (grounded in `knowledge.md`, built from the site's archive),
and enforces a **hard daily spend cap** so the chat can never run up a bill.

The static site (`js/colonel-chat.js`) calls `POST /api/chat` here — it never
talks to Anthropic directly, so the key is never exposed in the browser.

## Endpoints
- `POST /api/chat` — body `{ "messages": [{ "role": "user", "content": "..." }] }`
  → `{ "reply": "...", "capReached": false }`
- `GET /api/status` — today's spend, the cap, and whether it's reached
- `GET /` — health check

## Configuration
All via environment variables — see `.env.example`. Only `ANTHROPIC_API_KEY`
is required. Cap defaults to **$0.01/day**; model defaults to **claude-haiku-4-5**.

## Deploy to Railway
1. **Create the service.** In your existing Railway project: *New → GitHub Repo*
   (or the Railway CLI). Set the **Root Directory** to `colonel-server` so Railway
   builds only this folder. Railway auto-detects Node and runs `npm start`.
2. **Set variables.** Service → *Variables* → add `ANTHROPIC_API_KEY` (required).
   Optionally add `DAILY_CAP_USD`, `ALLOWED_ORIGIN`, etc. from `.env.example`.
3. **(Recommended) Persist the spend counter.** Add a **Volume** mounted at
   `/data`, then set `SPEND_FILE=/data/spend.json`. Without this the daily counter
   resets on each redeploy (harmless — it can only reset the budget *early*).
4. **Get the public URL.** Service → *Settings → Networking → Generate Domain*.
   You'll get something like `https://colonel-chat-production.up.railway.app`.
5. **Point the site at it.** In `js/colonel-chat.js`, set:
   ```js
   const COLONEL_API = "https://YOUR-APP.up.railway.app/api/chat";
   ```
   and (recommended) set `ALLOWED_ORIGIN` on Railway to your site's origin.

### Quick test after deploy
```bash
curl https://YOUR-APP.up.railway.app/api/status
curl -X POST https://YOUR-APP.up.railway.app/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"How did the town get its name?"}]}'
```

## Run locally
```bash
cd colonel-server
npm install
ANTHROPIC_API_KEY=sk-ant-... npm start
# → http://localhost:3000
```

## Updating the Colonel's knowledge
`knowledge.md` is generated from the site's `data/` archive by
`/tmp/savoy_work/build_colonel_kb.py`. Re-run that script after the archive
changes, then redeploy. Keep the digest comfortably above ~4,096 tokens so it
stays eligible for prompt caching (which is what keeps each message cheap).
