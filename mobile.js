  const sideBarIcon = document.querySelector('.sideBar');
  const menu = document.getElementById('mobileMenu');

  sideBarIcon.addEventListener('click', () => {
    menu.style.display = (menu.style.display === 'flex') ? 'none' : 'flex';
  });

  