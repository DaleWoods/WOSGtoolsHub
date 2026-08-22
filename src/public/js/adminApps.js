(function () {
  document.querySelectorAll('[data-admin-app-group]').forEach(function (group) {
    const categoryId = group.dataset.adminAppGroup;
    let dragged = null;

    group.querySelectorAll('[data-admin-app-row]').forEach(function (row) {
      row.setAttribute('draggable', 'true');

      row.addEventListener('dragstart', function () {
        dragged = row;
        row.classList.add('opacity-50');
      });

      row.addEventListener('dragend', function () {
        row.classList.remove('opacity-50');
        dragged = null;
        saveOrder(group, categoryId);
      });

      row.addEventListener('dragover', function (event) {
        event.preventDefault();
        if (!dragged || dragged === row) return;
        const rect = row.getBoundingClientRect();
        const before = event.clientY - rect.top < rect.height / 2;
        group.insertBefore(dragged, before ? row : row.nextSibling);
      });
    });
  });

  function saveOrder(group, categoryId) {
    const orderedIds = Array.from(group.querySelectorAll('[data-admin-app-row]')).map(function (row) {
      return Number(row.dataset.appId);
    });
    fetch('/admin/apps/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: Number(categoryId), orderedIds: orderedIds }),
    }).catch(function () {
      // Best-effort — a page refresh will show the last-saved order if this fails.
    });
  }
})();
