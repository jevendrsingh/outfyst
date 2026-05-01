/* ═══════════════════════════════════════════════════════════
   OUTFYST — main.js
   ═══════════════════════════════════════════════════════════
   
   WEB3FORMS SETUP (60 seconds):
   ──────────────────────────────
   1. Go to https://web3forms.com
   2. Enter the email address where you want form submissions
   3. They'll email you an access key — copy it
   4. Paste it below, replacing 'YOUR_ACCESS_KEY_HERE'
   5. Save, deploy, done. Submissions land in your inbox.
   
   ═══════════════════════════════════════════════════════════ */

const WEB3FORMS_ACCESS_KEY = 'YOUR_ACCESS_KEY_HERE';

/* ═══════════════════════════════════════════════════════════
   INIT — Runs after DOM is ready
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  initHeroAnimation();
  initManifestoObserver();
  initFormHandler();
  initCustomCursor();
  initCountdownTimer();
});

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
   FORM HANDLER — Web3Forms API
   ═══════════════════════════════════════════════════════════ */

function initFormHandler() {
  var form = document.getElementById('register-form');
  if (!form) return;

  var submitBtn = form.querySelector('.btn-submit');
  var errorEl = document.getElementById('form-error');
  var formContainer = document.getElementById('form-container');
  var successEl = document.getElementById('form-success');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Check access key
    if (WEB3FORMS_ACCESS_KEY === 'YOUR_ACCESS_KEY_HERE') {
      showError('Access key not configured. See js/main.js.');
      return;
    }

    // Gather form data
    var formData = {
      access_key: WEB3FORMS_ACCESS_KEY,
      name: form.querySelector('#field-name').value.trim(),
      email: form.querySelector('#field-email').value.trim(),
      phone: form.querySelector('#field-phone').value.trim(),
      city: form.querySelector('#field-city').value.trim(),
      message: form.querySelector('#field-message').value.trim(),
      subject: 'OUTFYST — New interest registration'
    };

    // Validate required fields
    if (!formData.name || !formData.email || !formData.city) {
      showError('Please fill in all required fields.');
      return;
    }

    // Disable & update button text
    submitBtn.disabled = true;
    submitBtn.textContent = 'SENDING...';
    hideError();

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (data.success) {
          showSuccess();
        } else {
          submitBtn.disabled = false;
          submitBtn.textContent = 'REGISTER INTEREST \u2192';
          showError("Something's off. Try again or DM us on Instagram.");
        }
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'REGISTER INTEREST \u2192';
        showError("Something's off. Try again or DM us on Instagram.");
      });
  });

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }
  }

  function hideError() {
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }

  function showSuccess() {
    // Replace form with success state
    if (formContainer) formContainer.style.display = 'none';
    if (successEl) successEl.style.display = 'block';
  }
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
