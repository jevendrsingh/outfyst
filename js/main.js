/* ═══════════════════════════════════════════════════════════
   OUTFYST — main.js
   ═══════════════════════════════════════════════════════════
   
   All credentials are managed via environment variables.
   The build script (build.js) injects them into index.html
   at deploy time. See .env.example for the full list.
   
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   INIT — Runs after DOM is ready
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  initThemeToggle();
  initHeroAnimation();
  initManifestoObserver();
  initFormHandler();
  initCustomCursor();
  initCountdownTimer();
});

/* ═══════════════════════════════════════════════════════════
   THEME TOGGLE
   ═══════════════════════════════════════════════════════════ */

function initThemeToggle() {
  var toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  var STORAGE_KEY = 'outfyst_theme';

  // Check saved preference or system preference
  var saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  toggle.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'light' ? 'dark' : 'light';

    if (next === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', next);
    }

    localStorage.setItem(STORAGE_KEY, next);
  });
}

/* ═══════════════════════════════════════════════════════════
   HERO ENTRANCE ANIMATION
   ═══════════════════════════════════════════════════════════ */

function initHeroAnimation() {
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var headline = document.querySelector('.hero__headline');
  var cta = document.querySelector('.hero__cta');

  if (prefersReduced) {
    if (headline) headline.classList.add('animate-in');
    if (cta) cta.classList.add('animate-in');
    return;
  }

  // Stagger: headline first, then CTA 200ms later
  setTimeout(function () {
    if (headline) headline.classList.add('animate-in');
  }, 100);

  setTimeout(function () {
    if (cta) cta.classList.add('animate-in');
  }, 300);
}

/* ═══════════════════════════════════════════════════════════
   MANIFESTO — IntersectionObserver
   ═══════════════════════════════════════════════════════════ */

function initManifestoObserver() {
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lines = document.querySelectorAll('.manifesto__line');

  if (!lines.length) return;

  if (prefersReduced) {
    lines.forEach(function (line) { line.classList.add('visible'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        // Stagger each line by 200ms based on its index
        var index = parseInt(entry.target.getAttribute('data-index'), 10) || 0;
        setTimeout(function () {
          entry.target.classList.add('visible');
        }, index * 200);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px'
  });

  lines.forEach(function (line) {
    observer.observe(line);
  });
}

/* ═══════════════════════════════════════════════════════════
   FORM HANDLER — Web3Forms (native POST)
   ═══════════════════════════════════════════════════════════ */

function initFormHandler() {
  var form = document.getElementById('register-form');
  if (!form) return;

  var submitBtn = form.querySelector('.btn-submit');

  form.addEventListener('submit', function () {
    // Show loading state while form submits
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'SENDING...';
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   CUSTOM CURSOR (desktop / fine pointer only)
   ═══════════════════════════════════════════════════════════ */

function initCustomCursor() {
  // Only enable on devices with fine pointer (mouse)
  if (!window.matchMedia('(pointer: fine)').matches) return;

  // Respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var cursor = document.createElement('div');
  cursor.classList.add('custom-cursor');
  cursor.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cursor);

  var mouseX = 0;
  var mouseY = 0;
  var cursorX = 0;
  var cursorY = 0;
  var rafId = null;

  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!rafId) {
      rafId = requestAnimationFrame(updateCursor);
    }
  });

  function updateCursor() {
    cursorX = mouseX;
    cursorY = mouseY;
    cursor.style.transform = 'translate(' + cursorX + 'px, ' + cursorY + 'px)';
    rafId = null;
  }

  // Hover state for interactive elements
  var interactiveSelectors = 'a, button, input, textarea, [data-cursor-hover]';

  document.addEventListener('mouseover', function (e) {
    if (e.target.closest(interactiveSelectors)) {
      cursor.classList.add('hovering');
    }
  });

  document.addEventListener('mouseout', function (e) {
    if (e.target.closest(interactiveSelectors)) {
      cursor.classList.remove('hovering');
    }
  });

  // Hide cursor when it leaves the window
  document.addEventListener('mouseleave', function () {
    cursor.style.opacity = '0';
  });

  document.addEventListener('mouseenter', function () {
    cursor.style.opacity = '1';
  });
}

/* ═══════════════════════════════════════════════════════════
   COUNTDOWN TIMER
   ═══════════════════════════════════════════════════════════ */

function initCountdownTimer() {
  var daysEl = document.getElementById('count-days');
  var hoursEl = document.getElementById('count-hours');
  var minutesEl = document.getElementById('count-minutes');
  var secondsEl = document.getElementById('count-seconds');

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  // Set launch date to 45 days from now (persisted per visitor)
  var launchKey = 'outfyst_launch_date';
  var stored = localStorage.getItem(launchKey);
  var launchDate;

  if (stored) {
    launchDate = new Date(stored);
  } else {
    launchDate = new Date();
    launchDate.setDate(launchDate.getDate() + 45);
    localStorage.setItem(launchKey, launchDate.toISOString());
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function tick() {
    var now = new Date();
    var diff = launchDate - now;

    if (diff <= 0) {
      daysEl.textContent = '00';
      hoursEl.textContent = '00';
      minutesEl.textContent = '00';
      secondsEl.textContent = '00';
      return;
    }

    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((diff % (1000 * 60)) / 1000);

    daysEl.textContent = pad(days);
    hoursEl.textContent = pad(hours);
    minutesEl.textContent = pad(minutes);
    secondsEl.textContent = pad(seconds);
  }

  tick();
  setInterval(tick, 1000);
}
