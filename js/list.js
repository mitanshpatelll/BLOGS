(function () {
  'use strict';

  const rows = Array.from(document.querySelectorAll('.post-row'));
  const filters = Array.from(document.querySelectorAll('.filter'));
  const emptyState = document.querySelector('.post-list__empty');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------- Tag filter ---------------- */
  function tagsOf(row) {
    return (row.dataset.tags || '').split(/\s+/).filter(Boolean);
  }

  function applyFilter(tag, updateUrl) {
    const known = filters.some((button) => button.dataset.filter === tag);
    const active = known ? tag : 'all';

    filters.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === active));
    });

    let visible = 0;
    rows.forEach((row) => {
      const show = active === 'all' || tagsOf(row).includes(active);
      row.hidden = !show;
      if (show) visible += 1;
    });
    emptyState.hidden = visible > 0;

    if (updateUrl) {
      const url = new URL(window.location.href);
      if (active === 'all') url.searchParams.delete('tag');
      else url.searchParams.set('tag', active);
      try { window.history.replaceState(null, '', url); } catch (e) { /* file:// or sandboxed */ }
    }
  }

  // Keep the counts honest as posts are added.
  filters.forEach((button) => {
    const tag = button.dataset.filter;
    const count = tag === 'all' ? rows.length : rows.filter((row) => tagsOf(row).includes(tag)).length;
    const badge = button.querySelector('[data-count]');
    if (badge) badge.textContent = count;
  });

  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => applyFilter(button.dataset.filter, true));
  });

  applyFilter(new URLSearchParams(window.location.search).get('tag') || 'all', false);

  /* ---------------- Hover preview follows the cursor ---------------- */
  if (!reduceMotion.matches) {
    rows.forEach((row) => {
      const cover = row.querySelector('.post-row__cover');
      if (!cover) return;
      row.addEventListener('mousemove', (event) => {
        const rect = row.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        cover.style.setProperty('--preview-x', (x * 40).toFixed(1) + 'px');
        cover.style.setProperty('--preview-y', (y * 24).toFixed(1) + 'px');
      });
      row.addEventListener('mouseleave', () => {
        cover.style.removeProperty('--preview-x');
        cover.style.removeProperty('--preview-y');
      });
    });
  }
})();
