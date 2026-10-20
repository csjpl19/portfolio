const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation-principale');
if (menuButton && navigation) {
  document.documentElement.classList.add('has-js');
  const setMenuOpen = (open) => {
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    navigation.dataset.open = String(open);
  };
  setMenuOpen(false);
  menuButton.addEventListener('click', () => setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click', (event) => { if (event.target.closest('a')) setMenuOpen(false); });
  document.addEventListener('click', (event) => {
    if (!navigation.contains(event.target) && !menuButton.contains(event.target)) setMenuOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenuOpen(false); menuButton.focus();
    }
  });
  window.matchMedia('(max-width: 760px)').addEventListener('change', () => setMenuOpen(false));
}

// Sur l’accueil, le repère suit la section consultée. Sur les autres pages,
// l’attribut aria-current du HTML indique la page courante.
if (navigation && document.getElementById('accueil')) {
  const links = Array.from(navigation.querySelectorAll('a'));
  const sections = Array.from(document.querySelectorAll('.page-content > section'));
  const sectionLinks = new Map();
  const pagePath = window.location.pathname.replace(/index\.html$/, '');
  links.forEach((link) => {
    const url = new URL(link.href);
    if (url.pathname.replace(/index\.html$/, '') === pagePath) {
      sectionLinks.set(url.hash.slice(1) || 'accueil', link);
    }
  });

  let framePending = false;
  const updateCurrentSection = () => {
    framePending = false;
    const threshold = document.querySelector('.site-header').getBoundingClientRect().bottom + 80;
    let currentSection = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= threshold) currentSection = section;
    }
    const currentLink = sectionLinks.get(currentSection?.id);
    links.forEach((link) => {
      if (link === currentLink) {
        link.setAttribute('aria-current', currentSection.id === 'accueil' ? 'page' : 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };
  const scheduleUpdate = () => {
    if (!framePending) {
      framePending = true;
      window.requestAnimationFrame(updateCurrentSection);
    }
  };
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('hashchange', scheduleUpdate);
  window.addEventListener('pageshow', scheduleUpdate);
  updateCurrentSection();
}
