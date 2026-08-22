(function () {
  const EMOJI_OPTIONS = [
    '🔧', '📈', '💼', '🔍', '🎫', '📊', '🛒', '📦', '💳', '🧾',
    '🖥️', '📱', '🔔', '🗂️', '⚙️', '🚀', '🧭', '🔐', '📝', '🎯',
  ];

  const picker = document.getElementById('icon-picker');
  const iconInput = document.getElementById('icon-input');
  if (picker && iconInput) {
    EMOJI_OPTIONS.forEach(function (emoji) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = emoji;
      btn.className =
        'flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-lg hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700';
      btn.addEventListener('click', function () {
        iconInput.value = emoji;
      });
      picker.appendChild(btn);
    });
  }

  const statusSelect = document.getElementById('status-select');
  const visibilitySelect = document.getElementById('visibility-select');
  const accessSection = document.getElementById('access-section');
  const internalNotice = document.getElementById('internal-notice');

  function refreshVisibility() {
    if (!statusSelect || !visibilitySelect) return;
    const isInternal = statusSelect.value === 'internal';
    const isRestricted = visibilitySelect.value === 'restricted';
    if (accessSection) accessSection.classList.toggle('hidden', !isRestricted);
    if (internalNotice) internalNotice.classList.toggle('hidden', !isInternal);
  }

  if (statusSelect) statusSelect.addEventListener('change', refreshVisibility);
  if (visibilitySelect) visibilitySelect.addEventListener('change', refreshVisibility);
  refreshVisibility();
})();
