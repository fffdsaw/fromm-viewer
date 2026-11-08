# Meapri liquid-glass-web

Upstream: https://github.com/Meapri/liquid-glass-web
Revision: 1613f8311dbc31bc2331afcfe51a143c56dd6308 (version 0.1.0), MIT ©2026 Meapri.

Built without source changes using Node 22, `npm ci --ignore-scripts` and `npm run build:lib` (upstream package-lock.json). Copy ESM `dist/liquid-glass.js` and its `dist/assets/*.js` worker. Source-map comments omitted because debug maps are not shipped. Preserve LICENSE on redistribution.

The PC panes use `LiquidGlass`, Regular/bar, balanced (single SVG displacement pass, no chromatic aberration), with no `backdropSource`. Existing save/legacy controls use Regular/control. It therefore does not request the optional WebGL renderer or clone private conversations/video. The original small-control adapter adds no per-frame animation; the PC save-button adapter below animates a short activation highlight and releases its lens when settled. The upstream pointer field is shared and event-driven.

Safari/Firefox use the engine's CSS fallback; this does not claim arbitrary backdrop refraction on those browsers. Reduced motion/transparency, forced colors and hidden tabs disable enhancement. The default PC UI uses two bounded clear panes; the legacy mint option and mobile retain their existing control path. The pane/settings implementation is described below. App HTML/scripts/vendor code remain network-loaded: the existing service worker caches only its explicit public image allowlist, never authenticated data or media.

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

## PC clear panes and settings

PC now defaults to clear header/sidebar material; no experiment URL is required.
`web-glass-settings.js` exposes the pinned demo's public `LiquidGlass.update()`
controls for refraction, thickness, blur, saturation and specularIntensity, plus
neutral white tint opacity. Sidebar-bottom Settings provides enable/reset and
validated device-local persistence (`fromm.pcGlass.v1`), without account data.
The existing 701px + hover/fine-pointer branch limits this UI to PC.

Two public LiquidGlass instances use Regular/bar, balanced, light, no chromatic
aberration or backdropSource. Defaults: thickness28/refraction34/blur0,
saturation108, white tint28%, specular:false. A1328×120 header resolves to
thickness11.76/refraction10.2. No vendor JS/worker/license changes.
The opaque mint face is removed; backdrop colors pass through the entire pane.
Only decorative siblings are filtered, leaving text/control parents unfiltered.
The opaque top/rounded-corner surround is retained.

Option updates are throttled to160ms (with change-event flush), including a
continuous drag. Specular enable/disable waits for the engine's valid new filter
ID. Count-only changes do not reinitialize panes. Preferences support reload,
reset, cross-tab sync, invalid-value clamping and unavailable-storage operation.
Existing save-button activation remains a short separate decoration.

Normal scrolling keeps the actual native SVG filters attached with unchanged
maps. Sidebar width animation retains the same live SVG lens from its first frame;
the SDK updates its map in place after resize. The header stays active. Playing video releases both SVG owners and uses plain translucent
white without backdrop blur to protect playback. Pause/end restores idle optics.
Reduced motion/transparency, forced colors, mobile, <=2GB/2-core hints,
>360,000 CSS pixels per pane, unsupported paths and import/map failures retain
the appropriate readable fallback. The settings note reports actual fallback.

Performance trials of moving blur outside SVG or dividing the output into rim
strips did not yield consistent improvements; neither custom renderer is shipped.
The implementation retains the public SDK directly, with blur/specular zero by
default. In the PR82 VM sample, normal scrolling p95 was16.8ms with/without
panes, expanded-sidebar scrolling increased16.8→33.4ms, and video dropped0/89
versus0/87. Higher user-selected blur/gloss can cost more. See the raw paired
samples, not a hardware-FPS guarantee.

No WebGL/DOM capture, framework, CDN, new dependency or app-version change.
Actual OS-installed PWA, Safari/Firefox, physical GPU and real account streams
remain separate verification from Chromium layout/UA simulations.


## PC droplets and Controls

`web-glass-controls.js` reuses the pinned demo Controls' `LiquidGlass`,
`LiquidInteractive` and core PointerField. The existing single rail hover skin,
selected menu and selected artist get decorative lenses. Existing routing owns
selection; the demo's click-owning `LiquidSelection` is deliberately not mounted.
Visible download/play/search/sort/filter/scroll-top controls share a basic clear
face; at most eight small SVG owners prioritize hover, keyboard focus and rail
selection. Only decorative skins tilt/squish/illuminate; real hit boxes and
foreground glyphs stay fixed. Motion reduction disables optical motion; playing
video releases the small lenses as well as panes. Offscreen/removed controls,
login and pagehide clean up. See `docs/design-review/glass-controls/` for current
recording, tests and paired VM samples; expanded-pane scroll cost remains.


### Cursor optical light field correction

The mint rail is opaque and uniform; a displacement-only hover lens there had
no visible detail to bend. Its translating carrier now owns one child optical
face and a small neutral ambient light field behind that face. The unchanged
`LiquidGlass` native displacement/specular maps refract that local light field;
foreground labels remain above it. Cursor tint is capped at6%, with32% baseline
specular intensity plus the existing gloss preference. Other control/artist
profiles, map budget, fallback and playback/low-power gates stay unchanged.
See `test/rail-lens-spinner.browser.cjs`: zeroing actual SVG displacement changes
the normal cursor pixels, without injecting a checkerboard into the backdrop.
