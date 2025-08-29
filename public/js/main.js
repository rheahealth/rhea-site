// MVP starter script
document.addEventListener('DOMContentLoaded', () => {
  console.log('Rhea Health MVP loaded');

  async function loadComponents() {
    console.log('Loading header and footer components...');
    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    if (!headerPlaceholder || !footerPlaceholder) {
      console.error('Header/Footer placeholder not found');
      return; // nothing to do on pages without these placeholders
    }

    try {
      headerPlaceholder.innerHTML = await fetch('header.html').then(res => res.text());
      console.log('Header loaded');
    } catch (e) {
      console.error('Failed to load header.html', e);
      return;
    }

    try {
      footerPlaceholder.innerHTML = await fetch('footer.html').then(res => res.text());
      console.log('Footer loaded');
    } catch (e) {
      console.error('Failed to load footer.html', e);
    }

    // Initialize hamburger menu logic after header is loaded
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const dropdownMenu = document.querySelector('.dropdown-menu');

    if (!hamburgerMenu) {
      console.error('Hamburger menu element not found');
    } else {
      console.log('Hamburger menu element found');
    }

    if (!dropdownMenu) {
      console.error('Dropdown menu element not found');
    } else {
      console.log('Dropdown menu element found');
    }

    if (hamburgerMenu && dropdownMenu) {
      const firstLink = dropdownMenu.querySelector('a');
      function setExpanded(isOpen) {
        hamburgerMenu.setAttribute('aria-expanded', String(isOpen));
        dropdownMenu.classList.toggle('active', isOpen);
        if (isOpen && firstLink) firstLink.focus();
      }

      hamburgerMenu.addEventListener('click', () => {
        const next = !(dropdownMenu.classList.contains('active'));
        setExpanded(next);
      });

      // Toggle with keyboard
      hamburgerMenu.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const next = !(dropdownMenu.classList.contains('active'));
          setExpanded(next);
        } else if (e.key === 'Escape') {
          setExpanded(false);
        }
      });

      // Close on Escape when focus is inside menu
      dropdownMenu.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setExpanded(false);
      });
    } else {
      console.error('Cannot attach event listener due to missing elements');
    }
  }

  function initAccordion() {
    // FAQ Accordion Toggle
    const accordionItems = document.querySelectorAll('.accordion-item');

    accordionItems.forEach(item => {
      const header = item.querySelector('.accordion-header');
      header.addEventListener('click', () => {
        item.classList.toggle('active');
        const content = item.querySelector('.accordion-content');
        if (item.classList.contains('active')) {
          content.style.maxHeight = content.scrollHeight + 'px';
        } else {
          content.style.maxHeight = null;
        }
      });
    });
  }

  loadComponents();
  initAccordion();
});
