/*
 * Funnel tracking for the static landing + onboarding pages.
 * Sends events to /analytics-event (a Next.js route that forwards to PostHog
 * when configured, and does nothing otherwise). Shares the anonymous id with
 * the Next.js app (localStorage "worldr_anon_id") so the funnel is continuous.
 * Usage: window.worldrTrack('event_name', { optional: 'props' })
 */
(function () {
  var ANON_ID_KEY = 'worldr_anon_id';

  function anonId() {
    try {
      var id = localStorage.getItem(ANON_ID_KEY);
      if (!id) {
        id = (window.crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : String(Date.now()) + '-' + Math.random().toString(16).slice(2);
        localStorage.setItem(ANON_ID_KEY, id);
      }
      return id;
    } catch (e) {
      return null;
    }
  }

  window.worldrTrack = function (event, props) {
    try {
      var id = anonId();
      if (!id) return;
      var properties = { $current_url: location.href, $pathname: location.pathname, $referrer: document.referrer };
      if (props) for (var k in props) if (Object.prototype.hasOwnProperty.call(props, k)) properties[k] = props[k];
      var body = JSON.stringify({ event: event, distinct_id: id, properties: properties });
      // sendBeacon survives the page navigating away right after the event.
      if (navigator.sendBeacon && navigator.sendBeacon('/analytics-event', new Blob([body], { type: 'application/json' }))) return;
      fetch('/analytics-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true });
    } catch (e) { /* never break the page */ }
  };
})();
