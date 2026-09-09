(() => {
  const selected = localStorage.getItem('yobro-language');
  const isHome = window.location.pathname === '/';
  const prefersEnglish = !(navigator.languages?.[0] || navigator.language || 'de').toLowerCase().startsWith('de');

  if (isHome && (selected === 'en' || (!selected && prefersEnglish))) {
    window.location.replace('/en/' + window.location.search + window.location.hash);
  }
})();
