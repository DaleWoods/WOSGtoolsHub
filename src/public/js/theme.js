(function () {
  const toggle = document.getElementById('theme-toggle');
  const label = document.getElementById('theme-toggle-label');
  if (!toggle || !label) return;

  function isDark() {
    return document.documentElement.classList.contains('dark');
  }

  function sync() {
    const dark = isDark();
    toggle.setAttribute('aria-pressed', String(dark));
    label.textContent = dark ? '☀️ Light' : '🌙 Dark';
  }

  toggle.addEventListener('click', function () {
    const dark = document.documentElement.classList.toggle('dark');
    sync();

    fetch('/api/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: dark ? 'dark' : 'light' }),
    }).catch(function () {
      // Best-effort — theme still applies locally for this page view even if the save fails.
    });
  });

  sync();
})();
