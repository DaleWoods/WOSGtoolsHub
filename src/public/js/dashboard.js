(function () {
  // --- Search / filter ---
  const searchInput = document.getElementById('tile-search');
  const groups = Array.from(document.querySelectorAll('[data-category-group]'));

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      const query = searchInput.value.trim().toLowerCase();
      groups.forEach(function (group) {
        const tiles = Array.from(group.querySelectorAll('[data-tile]'));
        let visibleCount = 0;
        tiles.forEach(function (tile) {
          const haystack = (tile.dataset.name + ' ' + tile.dataset.description).toLowerCase();
          const matches = query === '' || haystack.includes(query);
          tile.classList.toggle('hidden', !matches);
          if (matches) visibleCount++;
        });
        group.classList.toggle('hidden', visibleCount === 0);
      });
    });
  }

  // --- Track "Open" clicks for the Recently opened row ---
  document.querySelectorAll('[data-open-app-id]').forEach(function (link) {
    link.addEventListener('click', function () {
      const appId = link.dataset.openAppId;
      fetch('/api/apps/' + appId + '/open', { method: 'POST' }).catch(function () {
        // Best-effort — navigation to the tool already happened via target="_blank".
      });
    });
  });

  // --- Drag-and-drop reorder within a category (personal, per-user) ---
  groups.forEach(function (group) {
    const grid = group.querySelector('[data-tile-grid]');
    if (!grid) return;

    let dragged = null;

    grid.querySelectorAll('[data-tile]').forEach(function (tile) {
      tile.setAttribute('draggable', 'true');

      tile.addEventListener('dragstart', function () {
        dragged = tile;
        tile.classList.add('opacity-50');
      });

      tile.addEventListener('dragend', function () {
        tile.classList.remove('opacity-50');
        dragged = null;
        saveOrder(grid);
      });

      tile.addEventListener('dragover', function (event) {
        event.preventDefault();
        if (!dragged || dragged === tile) return;
        const rect = tile.getBoundingClientRect();
        const before = event.clientX - rect.left < rect.width / 2;
        grid.insertBefore(dragged, before ? tile : tile.nextSibling);
      });
    });
  });

  function saveOrder(grid) {
    const appIds = Array.from(grid.querySelectorAll('[data-tile]')).map(function (tile) {
      return Number(tile.dataset.appId);
    });
    fetch('/api/dashboard/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appIds: appIds }),
    }).catch(function () {
      // Best-effort — order will simply not persist if this fails.
    });
  }
})();
