# Meapri liquid-glass-web

Upstream: https://github.com/Meapri/liquid-glass-web
Revision: 1613f8311dbc31bc2331afcfe51a143c56dd6308 (version 0.1.0), MIT ©2026 Meapri.

Built without source changes using Node 22, `npm ci --ignore-scripts` and `npm run build:lib` (upstream package-lock.json). Copy ESM `dist/liquid-glass.js` and its `dist/assets/*.js` worker. Source-map comments omitted because debug maps are not shipped. Preserve LICENSE on redistribution.

The Viewer uses `LiquidGlass`, regular/control, balanced (single SVG displacement pass, no chromatic aberration), with no `backdropSource`. It therefore does not request the optional WebGL renderer or clone private conversations/video. The original small-control adapter adds no per-frame animation; the PC save-button adapter below animates a short activation highlight and releases its lens when settled. The upstream pointer field is shared and event-driven.

Safari/Firefox use the engine's CSS fallback; this does not claim arbitrary backdrop refraction on those browsers. Reduced motion/transparency, forced colors and hidden tabs disable enhancement. Filters are confined to small visible controls. App HTML/scripts/vendor code remain network-loaded: the existing service worker caches only its explicit public image allowlist, never authenticated data or media.

Apple reference: https://developer.apple.com/videos/play/wwdc2025/219/ — navigation layer separate from content; legibility, restrained motion and adaptive materials. No Apple artwork is copied.

## PC selection capsule materialization

`web-capsule-materialize.js` uses the unchanged bundled `LiquidGlass` public APIs
`resolved`, `configuredRefraction`, `flexRefraction(px|null)` and `destroy()`.
Reference implementation at the pinned revision:
- `demo/demo.ts` lines 132–140 and `src/styles/liquid-glass.css` lines 168–203:
  the showcase's `.lg-materialize` / `.lg-dematerialize` spring scale animation.
- `LiquidMenu.rampLens()` in the bundled engine: live `flexRefraction()` ramp
  without rebuilding maps. `LiquidMenu` itself is **not** mounted: its fixed
  positioning, trigger click and outside-dismiss behavior don't fit selection tools.

The PC capsule now stays visible at zero selection. Only the save button's
inner decorative skin receives the short first-selection highlight. The existing
public `flexRefraction()` API modulates a damped spring; its map stays at 8px
thickness (12px configured refraction). This is not ray tracing or per-frame map
regeneration. A sibling wrapper keeps the engine outside the real button, so
existing download progress text updates cannot remove the lens or change hit boxes.
Text and icons are never transformed or filtered. The skin fades after settling
and releases its engine; count-only changes and returning to a selected list do
not restart it. Clearing selection immediately disables save/X and fades the
highlight over 140ms; the outer capsule and select-all remain available.

Import/map timeouts, unsupported engine paths, low-power devices, reduced motion,
reduced transparency and forced colors use the readable static mint capsule.
There is no WebGL backdrop capture, private DOM cloning, CDN or framework addition.
The existing MIT LICENSE and bundled revision are unchanged.
