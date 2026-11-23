/* WORLDr — page failsafe.
   The landing and sign-up pages are driven by a module script (3D globe + animations).
   If that script cannot start (WebGL switched off, an old browser, a blocked file),
   the page used to stay black on "INITIALISING AETHAN" forever and nobody could sign up.
   The module sets window.__worldrReady = true once it is running. If it has not done so
   in time, hide the loader and offer the plain sign-in / register pages instead. */
(function () {
  var WAIT_MS = 6000;
  setTimeout(function () {
    if (window.__worldrReady) return;
    var loader = document.getElementById('loader');
    if (loader) loader.classList.add('hide');
    document.documentElement.classList.add('no-scene');
    var bar = document.createElement('div');
    bar.className = 'failsafe-bar';
    bar.setAttribute('role', 'alert');
    bar.innerHTML =
      '<span>Your browser could not start the animated view.</span>' +
      '<a href="/register">Create account</a>' +
      '<a href="/login">Sign in</a>';
    document.body.appendChild(bar);
    if (window.worldrTrack) { try { window.worldrTrack('landing_failsafe', { page: location.pathname }); } catch (e) {} }
  }, WAIT_MS);
})();

/* Build label + month length from the one shared file (public/design/build.json). */
(function () {
  fetch('/design/build.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (b) {
    if (!b) return;
    document.querySelectorAll('[data-build]').forEach(function (el) { el.textContent = b.stage + ' · v' + b.version; });
    document.querySelectorAll('[data-month-hours]').forEach(function (el) { el.textContent = String(b.realHoursPerGameMonth); });
    document.querySelectorAll('[data-discord]').forEach(function (el) { el.setAttribute('href', b.discord); });
  }).catch(function () {});
})();
