// Applies the saved theme before the page paints (see src/lib/theme.ts). Kept as a plain file, not inline, so a
// Content-Security-Policy can forbid inline scripts.
(function () {
  var p = null;
  try { p = localStorage.getItem('tp-theme'); } catch (e) {}
  var dark = p === 'dark' || (p !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
})();
