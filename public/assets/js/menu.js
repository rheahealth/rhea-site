// Mobile menu. Loaded in <head> so the "js" class is set before the page
// renders; without JavaScript the menu stays visible as a sideways-scrolling row.
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', function () {
  var header = document.querySelector('.site-header');
  var button = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  if (!header || !button || !nav) return;

  button.hidden = false;

  function setOpen(open) {
    header.classList.toggle('menu-open', open);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    button.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
  }

  button.addEventListener('click', function () {
    setOpen(button.getAttribute('aria-expanded') !== 'true');
  });

  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.classList.contains('menu-open')) {
      setOpen(false);
      button.focus();
    }
  });

  document.addEventListener('click', function (e) {
    if (header.classList.contains('menu-open') && !header.contains(e.target)) setOpen(false);
  });

  window.matchMedia('(min-width: 641px)').addEventListener('change', function (mq) {
    if (mq.matches) setOpen(false);
  });
});
