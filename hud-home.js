(() => {
  'use strict';
  const cards = [...document.querySelectorAll('.tool-card')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const search = document.getElementById('tool-search');
  const clear = document.getElementById('clear-search');
  const count = document.getElementById('results-count');
  const empty = document.getElementById('empty-state');
  let category = 'all';
  const normalize = value => value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
  const searchable = cards.map(card => normalize(card.dataset.search + ' ' + card.textContent));
  function filter() {
    const words = normalize(search.value).split(' ').filter(Boolean);
    let visible = 0;
    cards.forEach((card, index) => {
      const match = (category === 'all' || category === card.dataset.category) && words.every(word => searchable[index].includes(word));
      card.hidden = !match;
      if (match) visible++;
    });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
    count.textContent = `${visible} tools`;
    empty.hidden = visible !== 0;
    clear.hidden = search.value.length === 0;
  }
  filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.filter; filter(); }));
  search.addEventListener('input', () => { category = 'all'; filter(); });
  function reset() { search.value = ''; category = 'all'; filter(); search.focus(); }
  clear.addEventListener('click', reset);
  document.getElementById('reset-tools').addEventListener('click', reset);
  search.addEventListener('keydown', event => { if (event.key === 'Escape') reset(); });
  const theme = document.getElementById('theme-toggle');
  function showTheme() {
    const light = document.documentElement.dataset.theme === 'light';
    theme.setAttribute('aria-pressed', String(light));
    theme.setAttribute('aria-label', light ? 'Dark theme चालू करें' : 'Light theme चालू करें');
    document.querySelector('meta[name="theme-color"]').content = light ? '#f4f7fb' : '#050a12';
  }
  theme.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('ht-hud-theme', next); } catch (error) { /* Theme remains usable without storage. */ }
    showTheme();
  });
  const menu = document.getElementById('menu-toggle');
  const nav = document.getElementById('main-nav');
  function closeMenu() { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
  menu.addEventListener('click', () => menu.setAttribute('aria-expanded', String(nav.classList.toggle('open'))));
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });
  showTheme();
  filter();
})();
