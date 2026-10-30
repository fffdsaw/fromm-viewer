# Mobile player and accessibility refinement

Based on main `82e41b0`. Keeps the dark palette, original video proportions and
separate PiP button. No changes to LIVE/Native/extension authentication, receive,
HLS, quality selection, download or save naming/duplicate detection logic.

## Changes

- Card containers are labelled groups; selection is an independent 44px checkbox
  button, a sibling of playback/download/native media controls. Card body clicks,
  Shift selection, dragging and double-click previews retain their existing rules.
  Keyboard users can select with Space/Enter on the new checkbox. Programmatic
  card focus/selection is retained without adding another normal Tab stop.
- LIVE/Replay/Channel navigation is a group of native buttons with `aria-pressed`,
  preserving Tab/Enter/Space operation rather than advertising an incomplete tab
  widget. LIVE video region has a matching labelled group role.
- Login privacy text uses the existing muted color token at 12px. Adjacent-month
  calendar dates retain a secondary color with adequate contrast.
- Mobile/coarse-pointer player and rotation buttons have 44px input boxes while
  their SVGs remain 20px. PiP remains separate. Sliders have 32px input surfaces
  and retain 4px visual tracks. At narrow widths time sits above the seek bar so
  the five buttons do not overlap. Mobile time and video metadata are 12px.
- Video list titles can occupy two lines; selection markers have their own space.
- At widths <=900px Replay/Channel viewing hides global navigation, leaving Back,
  title and Download in the player. LIVE retains its top bar and hides the extra
  global tools only. The list's state is not rewritten to achieve this: existing
  filters, selected items and scroll restoration remain responsible for Back.
- Mobile stage aspect follows real video dimensions and rotation. Tall video is
  bounded by the viewport; landscape video no longer needs a full-height stage.
  `contain` and existing fullscreen behavior remain; no crop or zoom is added.

## Before / after checks

| Item | Before | After |
| Login privacy text contrast | 4.34:1 | 6.89:1 |
|---|---|---|
| Mobile player buttons | 30 x 32 CSS px | 44 x 44 CSS px |
| Rotation buttons | 30 x 30 | 44 x 44 on mobile/coarse pointers |
| Seek input height | 20px | 32px |
| Volume input height | 4px | 32px; track still 4px |
| Mobile playback time | 10px | 12px |
| Player metadata | 10–11px | 12px |
| List titles | One line | Up to two lines |
| Global Replay/Channel viewer header | Visible during playback | Hidden on mobile; restored on list return |
| Impeccable static signals | 12 | 10; low-contrast signal removed |

The detector's remaining signals are dynamic hidden images (2), small text outside
this scope (2), LIVE indicator (1), loading/download progress animations (4), and
progress glow (1). They are not ten confirmed defects; the progress/hidden-image
signals require context. No rules were suppressed to obtain these numbers.

`test/ui-accessibility.browser.cjs` runs axe-core 4.11.1 plus real Chromium checks
at 320x700, 390x844, 844x390 and 1440x900, covering portrait/landscape local video,
rotation, non-overlapping controls, separate PiP, keyboard card selection,
calendar, LIVE waiting controls and list state restoration. Existing player fade,
settings dismissal, direct selection, marquee and LIVE/PiP regressions remain.
CI uploads synthetic UI screenshots as `channel-browser-screenshots`.

The tests use synthetic metadata and local video; they never access an account or
real Fromm service. Passing automated accessibility rules is not WCAG certification.
Real LIVE, authenticated streams, physical mobile/iOS/Safari and screen-reader
usability remain unverified. No actual startup/FPS improvement is claimed.

Hooks were neither installed nor enabled. Impeccable is invoked manually from the
existing tooling checkout; this PR does not include that separate installation.

The existing Replay layout regression retains full-height checks on desktop,
but checks source-ratio sizing and hidden global tools on mobile. Decode/advance,
contain, controls, viewport bounds, scroll lock and Back restoration checks stay.

Short-stage rotation also exposed a settings popover covering its own toggle.
The popover now caps its scrollable height to the space above that toggle.
The viewport suite checks the gap plus click-to-close and Escape after rotation.
The existing surface-click test waits for toggle/ResizeObserver placement frames
before computing a real exposed video hit point. No click or playback assertion
is removed. Local real HLS mobile quality/rotation/state regressions passed.
