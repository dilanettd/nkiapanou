document.addEventListener("DOMContentLoaded", function () {
  //===== Preloader
  window.onload = function () {
    window.setTimeout(fadeout, 500);
  };

  function fadeout() {
    const preloader = document.querySelector(".preloader");
    if (preloader) {
      preloader.style.opacity = "0";
      preloader.style.display = "none";
    }
  }

  /*=====================================
    Sticky
    =======================================*/
  window.onscroll = function () {
    var header_navbar = document.querySelector(".navbar-area");
    if (header_navbar) {
      var sticky = header_navbar.offsetTop;

      // show or hide the back-top-top button
      var backToTop = document.querySelector(".scroll-top");
      if (backToTop) {
        if (
          document.body.scrollTop > 50 ||
          document.documentElement.scrollTop > 50
        ) {
          backToTop.style.display = "flex";
        } else {
          backToTop.style.display = "none";
        }
      }
    }
  };

  //===== mobile-menu-btn
  let navbarToggler = document.querySelector(".mobile-menu-btn");
  if (navbarToggler) {
    navbarToggler.addEventListener("click", function () {
      navbarToggler.classList.toggle("active");
    });
  }
});
