/* Shared site search — routes the header search box to the
   full-text search page (search.html), which searches the
   transcribed College history, newspapers, and documents. */
function runSearch(raw) {
  const q = (raw || '').trim();
  if (!q) return false;
  window.location.href = 'search.html?q=' + encodeURIComponent(q);
  return false;
}
