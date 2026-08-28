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

  // --- Bulk select / activate / deactivate ---
  const bar = document.getElementById('bulk-action-bar');
  const countLabel = document.getElementById('bulk-selected-count');
  const clearBtn = document.getElementById('bulk-clear');
  const checkboxes = Array.from(document.querySelectorAll('[data-app-checkbox]'));

  function selectedIds() {
    return checkboxes.filter(function (cb) { return cb.checked; }).map(function (cb) { return Number(cb.value); });
  }

  function refreshBar() {
    const ids = selectedIds();
    if (!bar || !countLabel) return;
    bar.classList.toggle('hidden', ids.length === 0);
    bar.classList.toggle('flex', ids.length > 0);
    countLabel.textContent = ids.length + ' selected';
  }

  checkboxes.forEach(function (cb) {
    cb.addEventListener('change', refreshBar);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      checkboxes.forEach(function (cb) { cb.checked = false; });
      refreshBar();
    });
  }

  document.querySelectorAll('[data-bulk-action]').forEach(function (button) {
    button.addEventListener('click', function () {
      const ids = selectedIds();
      if (ids.length === 0) return;
      const action = button.dataset.bulkAction;
      button.disabled = true;
      fetch('/admin/apps/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appIds: ids, action: action }),
      })
        .then(function () {
          window.location.href = '/admin/apps?toast=' + encodeURIComponent(ids.length + ' app(s) updated');
        })
        .catch(function () {
          button.disabled = false;
          window.alert('Bulk update failed — please try again.');
        });
    });
  });
})();
