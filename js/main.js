/* ============================================================
   NICE Cardiology Guidance Issues — Main JS
   Navigation, severity filter, expand/collapse cards,
   keyboard accessibility (WCAG 2.1 AA), ARIA state management
   ============================================================ */

(function () {
  'use strict';

  /* --- Mobile hamburger menu (P0-4: aria-expanded, Escape key) --- */
  function initHamburger() {
    var btn = document.querySelector('.hamburger');
    var nav = document.querySelector('.nav-links');
    if (!btn || !nav) return;

    function toggleMenu() {
      var isOpen = btn.classList.toggle('open');
      nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    btn.addEventListener('click', toggleMenu);

    // close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        toggleMenu();
        btn.focus();
      }
    });

    // close on link click
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        if (nav.classList.contains('open')) toggleMenu();
      });
    });
  }

  /* --- Severity filter (P1-12: collapse hidden cards; P2-3: aria-pressed) --- */
  function initFilters() {
    var bar = document.querySelector('.filter-bar');
    if (!bar) return;

    var buttons = bar.querySelectorAll('.filter-btn');
    var cards = document.querySelectorAll('.issue-card');
    var liveRegion = document.getElementById('filter-live');

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var severity = btn.dataset.severity;

        // Toggle active + aria-pressed
        buttons.forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');

        // Filter cards — collapse hidden ones to fix stale max-height (P1-12)
        var visibleCount = 0;
        cards.forEach(function (card) {
          if (severity === 'all' || card.dataset.severity === severity) {
            card.style.display = '';
            visibleCount++;
          } else {
            card.style.display = 'none';
            // Collapse hidden cards so scrollHeight recalculates on re-show
            card.classList.remove('open');
            var body = card.querySelector('.issue-card-body');
            if (body) body.style.maxHeight = '0';
            var hdr = card.querySelector('.issue-card-header');
            if (hdr) hdr.setAttribute('aria-expanded', 'false');
          }
        });

        // Announce to screen readers
        if (liveRegion) {
          liveRegion.textContent = 'Showing ' + visibleCount + ' issue' + (visibleCount !== 1 ? 's' : '');
        }
      });
    });
  }

  /* --- Expand / Collapse with keyboard + ARIA (P0-4, P1-13) --- */
  function initExpandCollapse() {
    var headers = document.querySelectorAll('.issue-card-header');

    headers.forEach(function (header, idx) {
      // Make keyboard-operable
      header.setAttribute('tabindex', '0');
      header.setAttribute('role', 'button');
      header.setAttribute('aria-expanded', 'false');

      // Give body a unique ID for aria-controls
      var card = header.closest('.issue-card');
      var body = card.querySelector('.issue-card-body');
      if (body) {
        var bodyId = 'issue-body-' + idx;
        body.setAttribute('id', bodyId);
        header.setAttribute('aria-controls', bodyId);
      }

      function toggle() {
        if (!body) return;
        var isOpen = card.classList.contains('open');

        if (isOpen) {
          body.style.maxHeight = '0';
          card.classList.remove('open');
          header.setAttribute('aria-expanded', 'false');
        } else {
          body.style.maxHeight = body.scrollHeight + 'px';
          card.classList.add('open');
          header.setAttribute('aria-expanded', 'true');
        }
      }

      header.addEventListener('click', toggle);

      // Keyboard: Enter and Space (P0-4)
      header.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });

    // Resize handler: recalculate max-height for open cards (P1-13)
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        document.querySelectorAll('.issue-card.open .issue-card-body').forEach(function (body) {
          body.style.maxHeight = body.scrollHeight + 'px';
        });
      }, 150);
    });
  }

  /* --- Active nav link highlighting + aria-current --- */
  function initActiveNav() {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href === path || (path === '' && href === 'index.html')) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  /* --- Init everything on DOMContentLoaded --- */
  document.addEventListener('DOMContentLoaded', function () {
    initHamburger();
    initFilters();
    initExpandCollapse();
    initActiveNav();
  });
})();
