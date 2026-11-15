# Fromm Viewer Liquid Glass optical research — 2026-11-15

## Status, provenance and isolation

- Standalone branch: `experiment/liquid-glass-optics-research-20261115`, created from PR #123 checkpoint `ad7c01c8cd3c7ef27acc28f5e7029d328379e01e`.
- Does **not** change `main`, PR #123, PR #124, live site, production vendor files, authentication, Fromm chat, media or download routines.
- This is an **optical geometry experiment**, not a drop-in replacement, Apple source recovery, or benchmark of Meapri vs ybouane.
- No private user data/Fromm API calls. The demo draws synthetic colored bars and text only.

## Source review (public code, checked 2026-11-15)

1. Existing Meapri bundle: [`vendor/meapri/liquid-glass.js`](../vendor/meapri/liquid-glass.js), upstream [Meapri/liquid-glass-web](https://github.com/Meapri/liquid-glass-web). The `st` CPU fallback/worker displacement map computes a rounded-rectangle SDF, queries a lens normal (`xt(...).lensNormal`), encodes X/Y into the R/G channels, and feeds an SVG `feDisplacementMap` filter. The optical map is cached by size/thickness/refraction/pixel ratio. `Ve` composes R/G/B shifted outputs for chromatic dispersion.
2. In this pinned Meapri bundle, `effectiveChromatic()` is zero unless `quality==='high'`; the SVG filter creates separate R/G/B passes only when the effective `chromaticAberration > 0.12`. A nonzero config alone in `balanced` is **not sufficient**.
3. [ybouane `src/shaders.ts`](https://github.com/ybouane/liquidglass/blob/main/src/shaders.ts): WebGL fragment shader uses a rounded-rect SDF, a circular bevel height field, finite-difference surface normal, biconvex or dome refraction, edge-localized chromatic channel offsets, Fresnel, Blinn–Phong highlights, and a border/rim mask.
4. [ybouane `src/LiquidGlass.ts`](https://github.com/ybouane/liquidglass/blob/main/src/LiquidGlass.ts) + [`src/HtmlCapture.ts`](https://github.com/ybouane/liquidglass/blob/main/src/HtmlCapture.ts): dynamic HTML is captured/composited into a canvas (and video into frames); this is materially different from Meapri's native backdrop SVG route. Do not insert this into authenticated Fromm conversation DOM without a separate privacy/performance review.
5. Apple [Meet Liquid Glass — WWDC25](https://developer.apple.com/videos/play/wwdc2025/219/) describes edge lensing, interactive materialization, content-adaptive tint/shadow, and preserving legibility. These are *observed public behavioral specifications*, not proprietary implementation code.

### Technical conclusion

The existing Meapri algorithm **already includes rounded geometry, surface normals, and color channel separation**. Replacing it with a full ybouane renderer is not the first logical improvement. The first useful experiment is to vary the **edge-band falloff, surface-normal distribution and color dispersion** independently, keeping the existing native backdrop sampling and control hit boxes. Stronger color everywhere is not an acceptable proxy for authentic glass.

## Current standalone deliverables

- [`optical-profile.js`](../experiments/liquid-glass-optics/optical-profile.js): pure rounded-rectangle SDF, bevel height, finite-difference surface normal, edge-weighted refraction, chromatic channel offsets, and Fresnel proxy. This is **original exploratory code inspired by openly documented math**, not a copied upstream shader.
- [`index.html`](../experiments/liquid-glass-optics/index.html): visual study with two synthetic scenes (no-refraction versus experimental refraction) and separate sliders for refraction, chromatic split, bevel depth and rim width. Uses CPU Canvas 2D: **not representative of final FPS/GPU cost**. Not a Meapri-vs-ybouane live A/B.
- [`test/optical-profile.test.cjs`](../test/optical-profile.test.cjs): 7 Node unit cases for signed-distance shape, clear center, stronger rim, bilateral symmetry, disabled effects, outside exclusion and numerical stability.

Run from checkout of this branch:

```sh
node --test test/optical-profile.test.cjs
python3 -m http.server 8000
```

Open `http://localhost:8000/experiments/liquid-glass-optics/`. For the existing full synthetic test suite, `node --test test/*.test.cjs` requires the repo's normal runtime and fixtures.

## Next work — separate check-pointed tasks

1. **Optical map experiment**: port only the well-behaved geometry/profile changes into an opt-in Meapri **fork rebuilt from its MIT source**, retaining vendor license and original engine as fallback. Do not patch a minified vendor bundle blindly. Use explicit namespacing or a separate vendor path to avoid overwriting the original.
2. **Native backdrop benchmark**: test on 3 actual Fromm controls in a synthetic fixture, check text alignment, readable icons, edge fringing, scroll smoothness, playback, and performance in Chrome and Edge. Do not capture authenticated DOM or print chat content.
3. **Measured A/B**: compare unmodified Meapri, PR #124's high-quality config, and the custom optical-map build. Collect screenshots under matching size/background, frame time p95, SVG filter count, memory and zoom/DPR; include reduced motion and fallback.
4. **Apple reference**: use an independently running Mac/Xcode `glassEffect(.regular)` reference app with a matching synthetic background to compare light response, thickness transition, highlight locality and morph timing. No assumption that Apple internal source or GPU shader symbols are accessible.
5. Decide final candidate only after visual comparison + browser regression; do not bundle two simultaneous per-control rendering engines.

## Open technical questions and acceptance gates

- How much the mapped displacement field differs from the stock Meapri model at 32–60px control heights (before generating more/larger SVG maps).
- Whether a narrow rim changes sign/aliasing at corners or reduces readable text contrast.
- Whether a split-channel SVG filter causes edge ghosting, high compositing cost or Chrome/Edge differences. Test before inclusion.
- Whether the current `profile:'control'` / `preset:'balanced'` optics are enough without a new fork after quality/slider correction from PR #124.
- Current result: **source reviewed and isolated math verified**, not integrated, not deployed, and no physical GPU FPS claim.

## Safety and licensing

Both third-party repos use MIT licensing. Preserve each upstream copyright and license if distributing copied implementation. This experiment intentionally uses independent simple geometric formulas rather than importing ybouane's renderer. Retain the original Meapri implementation and disable a new material without touching login, LIVE, message cache, download and media.
