# Meapri liquid-glass-web

Upstream: https://github.com/Meapri/liquid-glass-web
Revision: 1613f8311dbc31bc2331afcfe51a143c56dd6308 (version 0.1.0), MIT ©2026 Meapri.

Built without source changes using Node 22, `npm ci --ignore-scripts` and `npm run build:lib` (upstream package-lock.json). Copy ESM `dist/liquid-glass.js` and its `dist/assets/*.js` worker. Source-map comments omitted because debug maps are not shipped. Preserve LICENSE on redistribution.

The Viewer uses `LiquidGlass`, regular/control, balanced (single SVG displacement pass, no chromatic aberration), with no `backdropSource`. It therefore does not request the optional WebGL renderer or clone private conversations/video. The original small-control adapter adds no per-frame animation; the PC save-button adapter below animates a short activation highlight and releases its lens when settled. The upstream pointer field is shared and event-driven.

Safari/Firefox use the engine's CSS fallback; this does not claim arbitrary backdrop refraction on those browsers. Reduced motion/transparency, forced colors and hidden tabs disable enhancement. The default UI confines filters to small visible controls; the opt-in header experiment below adds one bounded bar surface. App HTML/scripts/vendor code remain network-loaded: the existing service worker caches only its explicit public image allowlist, never authenticated data or media.

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

## Opt-in Regular header experiment

`?headerGlass=regular` enables `web-header-glass.js` for PC (the existing 701px +
hover/fine-pointer branch). The default URL stays the comparison baseline.
The unchanged vendored `LiquidGlass` public constructor is used with
`variant: regular`, `profile: bar`, `preset/quality: balanced`, no chromatic
aberration, mapPixelRatio1, no backdropSource/refractBackground, and edges:false.
Requested thickness28/refraction34 resolve through the engine's bar
profile to thickness11.76/refraction10.2 at a 1328×120 surface. Tint is
rgba(224,241,233,.18), saturation108. Gaussian blur is zero and the extra
specular map/blend is disabled; the existing CSS rim highlight remains.
These are measured rendered settings, not copied preview percentages.

Only an aria-hidden, inert, pointer-transparent decorative sibling receives the
SVG backdrop filter. A feathered opaque mint center protects text and controls;
a numeric vector surround mask keeps scrolled content out of the top gap and
outside the rounded bar. There is no text filter/transform, private DOM clone,
video capture, WebGL scene, CDN or new framework. Other optical decorations are
static in this trial to avoid nested lenses; their normal-URL behavior remains.

One idle-created instance follows header size changes. Login, hidden pages,
mobile, <=2GB/2-core hints, reduced motion/transparency, forced colors, areas over
360,000 CSS pixels, unsupported engine paths and import/map failures use the
existing readable mint header. The SVG mode is enabled only after the actual
url(#lg-filter) is installed. QA's read-only snapshot and setPaused A/B switch
are on `FrommHeaderGlass`; the flag is not persisted. This is a header experiment,
not final site-wide engine deployment. MIT LICENSE and bundled source unchanged.

Live scrolling: the initial experiment's scroll-to-frost switch has been removed
because the lens must remain visible while its backdrop moves. The same native
SVG stays attached throughout scrolling, with no scroll listener, per-frame
adapter updates or map regeneration. Zero blur and no specular blend reduce the
filter graph's work while preserving its original displacement strength. This
does not guarantee 60fps on every GPU; paired performance samples are recorded.
Only sidebar expansion/collapse still calls the public suspend()/resume() API
with a cheap 3px CSS frost while the header changes size. A resize while
suspended rebuilds once after settling.
Playing video releases the header engine and uses the original opaque mint bar;
pause/end permits an idle rebuild. No per-frame map regeneration or video hooks
that change playback are used. The API snapshot distinguishes svg/frost/plain
and the reason. See paired raw performance evidence in the experiment review.
