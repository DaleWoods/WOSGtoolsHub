(function () {
  const toast = document.getElementById('toast');
  if (!toast) return;
  setTimeout(function () {
    toast.classList.add('opacity-0');
    setTimeout(function () {
      toast.remove();
    }, 300);
  }, 3000);
})();
