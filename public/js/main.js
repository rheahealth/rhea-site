// MVP starter script
document.addEventListener('DOMContentLoaded', () => {
  console.log('Rhea Health MVP loaded');

  async function loadComponents() {
    console.log('Loading header and footer components...');
    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');

    if (!headerPlaceholder) {
      console.error('Header placeholder not found');
    } else {
      console.log('Header placeholder found');
    }

    if (!footerPlaceholder) {
      console.error('Footer placeholder not found');
    } else {
      console.log('Footer placeholder found');
    }

    headerPlaceholder.innerHTML = await fetch('header.html').then(res => res.text());
    console.log('Header loaded');
    footerPlaceholder.innerHTML = await fetch('footer.html').then(res => res.text());
    console.log('Footer loaded');

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
      hamburgerMenu.addEventListener('click', () => {
        console.log('Hamburger menu clicked');
        dropdownMenu.classList.toggle('active');
        console.log('Dropdown menu active state:', dropdownMenu.classList.contains('active'));
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
