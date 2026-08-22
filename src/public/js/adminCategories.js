(function () {
  const list = document.getElementById('category-list');
  if (!list) return;
  let dragged = null;

  list.querySelectorAll('[data-category-row]').forEach(function (row) {
    row.setAttribute('draggable', 'true');

    row.addEventListener('dragstart', function () {
      dragged = row;
      row.classList.add('opacity-50');
    });

    row.addEventListener('dragend', function () {
      row.classList.remove('opacity-50');
      dragged = null;
      const orderedIds = Array.from(list.querySelectorAll('[data-category-row]')).map(function (r) {
        return Number(r.dataset.categoryId);
      });
      fetch('/admin/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: orderedIds }),
      }).catch(function () {});
    });

    row.addEventListener('dragover', function (event) {
      event.preventDefault();
      if (!dragged || dragged === row) return;
      const rect = row.getBoundingClientRect();
      const before = event.clientY - rect.top < rect.height / 2;
      list.insertBefore(dragged, before ? row : row.nextSibling);
    });
  });
})();
