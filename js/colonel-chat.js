/* ============================================================
   "Chat with the Colonel" — front-end widget
   Turns the header brand-badge into a CTA that opens a chat with
   Col. William Savoy. Talks ONLY to our own backend (never to
   Anthropic directly), which holds the API key + daily spend cap.
   Loaded on every page via a single <script src> tag.
   ============================================================ */
(function () {
  "use strict";

  // ---- CONFIG ---------------------------------------------------
  // After deploying colonel-server to Railway, paste its URL here:
  //   const COLONEL_API = "https://YOUR-APP.up.railway.app/api/chat";
  const COLONEL_API = "https://savoytexas-production.up.railway.app/api/chat";

  // Head image for the chat header (same one used on the badge).
  const HEAD_IMG = "Images/ColSavoy-head.png";
  // Full-figure cartoon shown beside the chat window.
  const FIGURE_IMG = "Images/ColSavoy.png";

  // The Colonel's opening greeting (display only — not sent to the API,
  // so saying hello costs nothing).
  const GREETING =
    "Well howdy, friend, and welcome to Savoy! I'm Colonel William Savoy — " +
    "I gave the forty acres that started this town back in '72. Sit a spell " +
    "and ask me anything you like about my town and the good folks who built it.";

  const NOT_CONFIGURED =
    "Beg pardon, friend — my study isn't quite wired up yet. (Site owner: set " +
    "COLONEL_API in js/colonel-chat.js to your Railway URL.)";

  // ---- state ----------------------------------------------------
  let overlay, messagesEl, inputEl, sendBtn;
  let history = [];          // real turns sent to the API: {role, content}
  let greeted = false;
  let busy = false;
  let capReached = false;

  // ---- helpers --------------------------------------------------
  function ensureStylesheet() {
    if (document.querySelector('link[data-colonel-chat]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/colonel-chat.css";
    link.setAttribute("data-colonel-chat", "");
    document.head.appendChild(link);
  }

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function addMessage(text, who, isError) {
    const m = el("div", "colonel-msg from-" + who + (isError ? " is-error" : ""));
    m.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");
    messagesEl.appendChild(m);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return m;
  }

  function showTyping() {
    const t = el("div", "colonel-typing");
    t.id = "colonel-typing";
    t.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(t);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function hideTyping() {
    const t = document.getElementById("colonel-typing");
    if (t) t.remove();
  }

  // ---- build the overlay ---------------------------------------
  function buildOverlay() {
    overlay = el("div", "colonel-overlay");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Chat with Colonel William Savoy");

    const stage = el("div", "colonel-stage");

    const figure = el("img", "colonel-figure");
    figure.src = FIGURE_IMG;
    figure.alt = "Colonel William Savoy";

    const win = el("div", "colonel-window");

    // header
    const header = el("div", "colonel-header");
    const hbadge = el("img", "ch-badge");
    hbadge.src = HEAD_IMG; hbadge.alt = "";
    const titles = el("div", "ch-titles");
    titles.appendChild(el("div", "ch-title", "Chat with the Colonel"));
    titles.appendChild(el("div", "ch-sub", "Col. William Savoy &middot; Savoy, Texas"));
    const close = el("button", "colonel-close", "&times;");
    close.setAttribute("aria-label", "Close chat");
    close.addEventListener("click", closeChat);
    header.appendChild(hbadge);
    header.appendChild(titles);
    header.appendChild(close);

    // messages
    messagesEl = el("div", "colonel-messages");

    // input row
    const inputRow = el("div", "colonel-input");
    inputEl = el("textarea");
    inputEl.placeholder = "Ask the Colonel about Savoy…";
    inputEl.rows = 1;
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
    });
    sendBtn = el("button", "colonel-send", "Send");
    sendBtn.addEventListener("click", submit);
    inputRow.appendChild(inputEl);
    inputRow.appendChild(sendBtn);

    win.appendChild(header);
    win.appendChild(messagesEl);
    win.appendChild(inputRow);

    stage.appendChild(figure);
    stage.appendChild(win);
    overlay.appendChild(stage);

    // click on the dim backdrop (not the window/figure) closes
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || e.target === stage) closeChat();
    });

    document.body.appendChild(overlay);
  }

  // ---- open / close --------------------------------------------
  function openChat() {
    if (!overlay) buildOverlay();
    overlay.classList.add("open");
    document.addEventListener("keydown", onEsc);
    if (!greeted) {
      addMessage(GREETING, "colonel");
      greeted = true;
    }
    setTimeout(function () { inputEl && inputEl.focus(); }, 320);
  }
  function closeChat() {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.removeEventListener("keydown", onEsc);
  }
  function onEsc(e) { if (e.key === "Escape") closeChat(); }

  // ---- send a message ------------------------------------------
  function submit() {
    const text = (inputEl.value || "").trim();
    if (!text || busy) return;
    inputEl.value = "";

    addMessage(text, "user");
    history.push({ role: "user", content: text });

    if (capReached) {
      addMessage(
        "Well now, friend, I've already begged off for the day to tend to town " +
        "business. Do come back tomorrow.", "colonel");
      return;
    }
    if (COLONEL_API.indexOf("YOUR-RAILWAY") !== -1) {
      addMessage(NOT_CONFIGURED, "colonel", true);
      return;
    }

    busy = true;
    sendBtn.disabled = true;
    showTyping();

    fetch(COLONEL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        hideTyping();
        const reply = (data && data.reply) ||
          "Beg pardon, friend — I didn't quite catch that.";
        addMessage(reply, "colonel", !!(data && data.error));
        if (!(data && data.error)) {
          history.push({ role: "assistant", content: reply });
        }
        if (data && data.capReached) capReached = true;
      })
      .catch(function () {
        hideTyping();
        addMessage(
          "Beg pardon, friend — the telegraph line to my study seems to be " +
          "down. Try me again in a moment.", "colonel", true);
      })
      .finally(function () {
        busy = false;
        sendBtn.disabled = false;
        inputEl.focus();
      });
  }

  // ---- wire the header badge into a CTA ------------------------
  function wireBadge() {
    var badge = document.querySelector(".brand-badge");
    if (!badge) return;
    badge.setAttribute("title", "Click Here to Chat with The Colonel");
    badge.setAttribute("role", "button");
    badge.setAttribute("aria-label", "Click here to chat with the Colonel");
    badge.addEventListener("click", function (e) {
      e.preventDefault();   // it's an <a href="index.html"> — don't navigate
      openChat();
    });
  }

  // ---- init -----------------------------------------------------
  function init() {
    ensureStylesheet();
    wireBadge();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
