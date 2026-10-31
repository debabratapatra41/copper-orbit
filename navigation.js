(function () {
  const header = document.querySelector('header');
  header.className = 'site-header';
  header.innerHTML = `
    <a class="brand main-brand" href="#overview" aria-label="Copper Orbit design system home">
      <span class="logo" aria-hidden="true"></span>
      <span>copper orbit</span>
      <span class="version">DS</span>
    </a>
    <nav class="main-nav" aria-label="Main navigation">
      <a href="#overview">Overview</a>
      <a href="#foundations">Foundations</a>
      <a href="#actions">Components</a>
      <a href="#data">Data</a>
      <a href="#rules">Guidelines</a>
    </nav>
    <div class="header-actions">
      <button class="button contrast compact nav-cta" data-toast="Design-system review mode">Review</button>
      <button id="theme" class="button secondary compact nav-theme" aria-pressed="false">Dark mode</button>
      <button id="menu-toggle" class="button secondary compact menu-button" aria-expanded="false" aria-controls="mobile-nav">Menu</button>
    </div>
    <nav id="mobile-nav" class="mobile-nav" aria-label="All sections" hidden>
      <a href="#overview">Overview</a>
      <a href="#foundations">Color & typography</a>
      <a href="#actions">Actions</a>
      <a href="#forms">Form controls</a>
      <a href="#data">Data display</a>
      <a href="#feedback">Feedback & overlays</a>
      <a href="#rules">Guidelines</a>
    </nav>`;

  const toggle = document.querySelector('#menu-toggle');
  const menu = document.querySelector('#mobile-nav');

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    if (window.CopperIcons) CopperIcons.setButtonLabel(toggle, open ? 'Close' : 'Menu', open ? 'x' : 'menu');
  }

  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('click', event => { if (!header.contains(event.target)) setMenu(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
})();
