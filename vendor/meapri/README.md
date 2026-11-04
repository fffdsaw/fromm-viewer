# Meapri liquid-glass-web

Upstream: https://github.com/Meapri/liquid-glass-web
Revision: 1613f8311dbc31bc2331afcfe51a143c56dd6308 (version 0.1.0), MIT ©2026 Meapri.

Built without source changes using Node 22, `npm ci --ignore-scripts` and `npm run build:lib` (upstream package-lock.json). Copy ESM `dist/liquid-glass.js` and its `dist/assets/*.js` worker. Source-map comments omitted because debug maps are not shipped. Preserve LICENSE on redistribution.

The Viewer uses `LiquidGlass`, regular/control, balanced (single SVG displacement pass, no chromatic aberration), with no `backdropSource`. It therefore does not request the optional WebGL renderer or clone private conversations/video. Main-thread per-frame animation is not added by the adapter. The upstream pointer field is shared and event-driven.

Safari/Firefox use the engine's CSS fallback; this does not claim arbitrary backdrop refraction on those browsers. Reduced motion/transparency, forced colors and hidden tabs disable enhancement. Filters are confined to small visible controls. App HTML/scripts/vendor code remain network-loaded: the existing service worker caches only its explicit public image allowlist, never authenticated data or media.

Apple reference: https://developer.apple.com/videos/play/wwdc2025/219/ — navigation layer separate from content; legibility, restrained motion and adaptive materials. No Apple artwork is copied.
