/* Installation only. No login, media, bridge or playback behavior lives here. */
(() => {
  'use strict';
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  // Use the documented GitHub Pages subpath, never take control of sibling apps.
  if (!location.pathname.startsWith('/fromm-viewer/')) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/fromm-viewer/sw.js', {
      scope: '/fromm-viewer/', updateViaCache: 'none'
    }).catch(() => {
      // Installation may be unavailable in private browsing. The web app still works.
    });
  }, {once: true});
})();
