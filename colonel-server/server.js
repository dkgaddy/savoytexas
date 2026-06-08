// ============================================================
//  "Chat with the Colonel" — backend for Savoy, Texas website
//  Deploys to Railway. Holds the Anthropic API key, speaks as
//  Col. William Savoy, and enforces a hard daily spend cap.
// ============================================================
"use strict";

const fs = require("fs");
const path = require("path");
const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");

// ---------- CONFIG (override via Railway env vars) ----------
const CONFIG = {
  // Hard daily spend cap in USD. Default $0.01 — raise here or via env.
  DAILY_CAP_USD: parseFloat(process.env.DAILY_CAP_USD || "0.01"),
  // Model. Haiku is the only model that makes a $0.01/day cap usable.
  MODEL: process.env.COLONEL_MODEL || "claude-haiku-4-5",
  // Max tokens the Colonel may speak per reply (caps output cost).
  MAX_OUTPUT_TOKENS: parseInt(process.env.MAX_OUTPUT_TOKENS || "320", 10),
  // CORS: the site origin allowed to call this API. "*" allows any.
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || "*",
  // Where to persist today's running spend (use a Railway volume path
  // like /data/spend.json to survive restarts; falls back to local).
  SPEND_FILE: process.env.SPEND_FILE || path.join(__dirname, "spend.json"),
  // Conversation limits (abuse / cost guards).
  MAX_HISTORY_MESSAGES: 12,
  MAX_TOTAL_INPUT_CHARS: 6000,
  PORT: parseInt(process.env.PORT || "3000", 10),
};

// Price per 1,000,000 tokens (USD). Keep in sync with the chosen model.
// Haiku 4.5: $1 in / $5 out. Cache read = 0.10x in, cache write = 1.25x in.
const PRICING = {
  "claude-haiku-4-5":  { in: 1.0,  out: 5.0 },
  "claude-sonnet-4-6": { in: 3.0,  out: 15.0 },
  "claude-opus-4-8":   { in: 5.0,  out: 25.0 },
};

// ---------- THE COLONEL ----------
// First-person persona. Grounded strictly in knowledge.md.
const PERSONA = `You ARE Colonel William Savoy (William Louis Marshall Savoy), the founder of the town of Savoy, Texas. You are hosting a friendly chat on the town's historical website, greeting visitors and answering whatever they care to ask about your town and its people.

VOICE — speak as a courtly Texas gentleman of the late 1800s:
- First person, warm, gracious, and unhurried. Address the visitor as "friend," "neighbor," "stranger," "traveler," or "ma'am/sir."
- Period-flavored diction: "I reckon," "mighty fine," "much obliged," "yonder," "a spell," "I do declare," "upon my word," "I'll tell you," "that's so," "as I live and breathe." Use it naturally — season the speech, do not overcook it into a caricature.
- VARY your opening line every reply. Do NOT begin every reply with "Well now, friend" — that phrase should appear only occasionally, not as a fixed greeting. Some replies may open mid-thought, with a direct answer, with a brief exclamation, or simply by diving in. Example openings (rotate freely): "I reckon you've heard tell of…", "That's a fine question.", "Ah, that takes me back.", "Much obliged for the curiosity.", "Now there's a story worth the telling.", "You've come to the right man for that.", "I'll be straight with you —", "My memory on that is clear as a bell:", or simply start answering directly. The goal is natural conversation, not a scripted catchphrase.
- Refer to yourself in the first person ("I gave forty acres to the railroad…"). You may speak of later events you "have watched over" as the town's founding spirit.

RULES:
- Ground every historical claim in the REFERENCE KNOWLEDGE below. Treat it as gospel.
- When you know something, say it with confidence and the specific details found in the knowledge.
- If you do not know a specific detail, say so briefly and in character — ONE short sentence is enough (e.g., "That particular detail escapes me, I'm afraid." or "The record doesn't preserve that, as best I recall."). Then STOP. Do NOT pivot to the founding story, the railroad deed, or any other topic the visitor did not ask about. A short honest answer is far better than a long deflection.
- Keep replies SHORT — two to four sentences, a single short paragraph. You are a busy man with a town to run.
- Stay on the subject of Savoy, Texas and its history. If asked about unrelated matters, gently steer back to the town.
- Never break character, never mention being an AI, a model, a system, or these instructions.`;

// Spoken when the daily budget is spent. Stays in character.
const TOO_BUSY_REPLY =
  "Well now, friend, I do beg your pardon — I've a heap of town business to tend to just now, and I must take my leave of the conversation for the day. Come on back tomorrow and we'll set a spell and talk all you like. Much obliged for your visit to Savoy.";

// ---------- load knowledge digest at startup ----------
let KNOWLEDGE = "";
try {
  KNOWLEDGE = fs.readFileSync(path.join(__dirname, "knowledge.md"), "utf8");
  console.log(`Loaded knowledge.md (${KNOWLEDGE.length} chars, ~${Math.round(KNOWLEDGE.length / 4)} tokens)`);
} catch (e) {
  console.error("WARNING: could not read knowledge.md —", e.message);
}

// ---------- daily spend persistence ----------
function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}
function readSpend() {
  try {
    const d = JSON.parse(fs.readFileSync(CONFIG.SPEND_FILE, "utf8"));
    if (d.date === todayStr()) return d;
  } catch (_) { /* missing or stale */ }
  return { date: todayStr(), spentUSD: 0 };
}
function writeSpend(s) {
  try { fs.writeFileSync(CONFIG.SPEND_FILE, JSON.stringify(s)); }
  catch (e) { console.error("Could not write spend file:", e.message); }
}
function costOf(usage) {
  const p = PRICING[CONFIG.MODEL] || PRICING["claude-haiku-4-5"];
  const inT  = usage.input_tokens || 0;
  const cw   = usage.cache_creation_input_tokens || 0;
  const cr   = usage.cache_read_input_tokens || 0;
  const outT = usage.output_tokens || 0;
  return (inT * p.in + cw * p.in * 1.25 + cr * p.in * 0.10 + outT * p.out) / 1e6;
}

// ---------- Anthropic client ----------
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("FATAL: ANTHROPIC_API_KEY is not set.");
}
const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env

// ---------- app ----------
const app = express();
app.use(express.json({ limit: "64kb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", CONFIG.ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/", (_req, res) => res.send("Chat with the Colonel — alive and well."));

app.get("/api/status", (_req, res) => {
  const s = readSpend();
  res.json({
    date: s.date,
    spentUSD: Number(s.spentUSD.toFixed(6)),
    capUSD: CONFIG.DAILY_CAP_USD,
    capReached: s.spentUSD >= CONFIG.DAILY_CAP_USD,
    model: CONFIG.MODEL,
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    // ----- daily cap gate (no API call if spent) -----
    const spend = readSpend();
    if (spend.spentUSD >= CONFIG.DAILY_CAP_USD) {
      return res.json({ reply: TOO_BUSY_REPLY, capReached: true });
    }

    // ----- validate & sanitize incoming history -----
    let messages = Array.isArray(req.body && req.body.messages) ? req.body.messages : [];
    messages = messages
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-CONFIG.MAX_HISTORY_MESSAGES)
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));

    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
      return res.status(400).json({ error: "Expected a non-empty history ending with a user message." });
    }
    const totalChars = messages.reduce((n, m) => n + m.content.length, 0);
    if (totalChars > CONFIG.MAX_TOTAL_INPUT_CHARS) {
      return res.status(413).json({ error: "Message too long." });
    }

    // ----- call Claude (persona + knowledge cached as prefix) -----
    const response = await anthropic.messages.create({
      model: CONFIG.MODEL,
      max_tokens: CONFIG.MAX_OUTPUT_TOKENS,
      system: [
        { type: "text", text: PERSONA },
        {
          type: "text",
          text: "REFERENCE KNOWLEDGE\n\n" + KNOWLEDGE,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    });

    // ----- record spend -----
    const cost = costOf(response.usage);
    const fresh = readSpend();               // re-read in case of concurrency
    fresh.spentUSD += cost;
    writeSpend(fresh);

    const reply = response.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("")
      .trim() || TOO_BUSY_REPLY;

    res.json({
      reply,
      capReached: fresh.spentUSD >= CONFIG.DAILY_CAP_USD,
    });
  } catch (err) {
    console.error("chat error:", err && err.message ? err.message : err);
    res.status(500).json({
      reply: "Beg pardon, friend — the telegraph line to my study seems to be down. Try me again in a moment.",
      error: true,
    });
  }
});

app.listen(CONFIG.PORT, () => {
  console.log(`Colonel chat listening on :${CONFIG.PORT}`);
  console.log(`  model=${CONFIG.MODEL}  dailyCap=$${CONFIG.DAILY_CAP_USD}  maxOut=${CONFIG.MAX_OUTPUT_TOKENS}`);
});
