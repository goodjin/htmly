# Changelog

All notable changes to **htmly** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.4] - 2026-06-06

### Added

- **Toolbar visual system** (`webview/src/styles/tokens.css`, `webview/src/components/Toolbar.vue`, `webview/src/main.ts`)
  - New `tokens.css` defines the webview-only design-token baseline: corner-radius scale (`--radius-sm/md/lg`), tinted elevation shadows (`--shadow-1/2`) derived from `--vscode-foreground` via `color-mix()` so they stay theme-agnostic across light / dark / high-contrast, and motion tokens (`--ease-out`, `--ease-back`, durations).
  - `Toolbar.vue` consumes the tokens: restyle to a unified pill / chip aesthetic, explicit `:hover` / `:focus-visible` ring, and a keyframe-driven "press-down → release" interaction so tool buttons feel physical.
  - Redundant `:active` style removed in favor of the keyframe-driven transform.
  - `main.ts` imports `tokens.css` once at the webview root.

- **`MathSymbolsDropdown` popover styling aligned to the new token system** (`webview/src/components/MathSymbolsDropdown.vue`)
  - Surface background, border, radius, shadow, and open / close transition now read from the same tokens as `Toolbar.vue`. Fade + slight translate-in entrance, matches toolbar chip rhythm.

### Fixed

- **Vitest jsdom environment crashed 50 `ExportDialog` tests with `localStorage.getItem is not a function`** (`webview/src/test-setup.ts`)
  - Node 25+ ships a built-in `localStorage` global; without a valid `--localstorage-file` flag it is an empty object, which jsdom refuses to overwrite. The new `installLocalStoragePolyfill()` detects the missing `Storage` interface and installs a `MemoryStorage` implementation on both `globalThis` and `window`. Brings the 50 affected `ExportDialog` tests back to green without changing any component code.

## [1.8.3] - 2026-06-05

### Fixed

- **Preview mode hid the entire toolbar, trapping users in preview** (`webview/src/components/Toolbar.vue`)
  - The whole `<Toolbar>` element (including the WYSIWYG / Source / Split / Preview mode switcher) was being removed by `v-if="!toolbarHidden"`. When `htmly.autoHideToolbarInPreview` was `true` and the user switched to Preview mode, the mode switcher disappeared and there was no way to switch back to the other modes.
  - The toolbar root and the mode switcher group are now always rendered. Only the action groups (style/heading, formatting, insert, etc.) are still gated by `toolbarHidden` so Preview stays uncluttered.
  - Test coverage: `webview/src/components/Toolbar.test.ts` (39/39 passing) and the cross-mode export regression test in `webview/src/core/crossModeExport.test.ts` (Export button now asserted visible in Preview mode).

- **Preview pane defaulted to DPR 2x and inverted the zoom direction, so 1x looked blank and 2x/3x made the preview smaller** (`webview/src/components/PreviewPane.vue`)
  - `selectedDpr` default was changed from `2` to `1` (Preview now opens at 100% by default).
  - The `frameDimensions.scale` formula was flipped from `1 / preset.dpr` (shrink) to `preset.dpr` (zoom). 1x = 100%, 2x = 200%, 3x = 300%, matching the labeled DPR control.
  - The wrapper container around the iframe now grows with `dims.scale` (`width: dims.width * scale`, `height: dims.height * scale`) so the parent scroll viewport matches the rendered content instead of clipping it.
  - The `transform: scale(...)` was moved off the wrapper and onto the iframe itself (new `iframeStyle` computed) so the wrapper's layout box equals the iframe's visual box.
  - `overflow: hidden;` was removed from `.preview-frame-wrapper` because it was clipping the scaled content.
  - Test coverage: `webview/src/components/PreviewPane.test.ts` updated to assert `scale(2)` / `scale(3)` on the iframe and the default `data-dpr="1"` on the wrapper (31/31 passing).

### Notes

- Pure bugfix release. No new features, no breaking changes, no dependency additions.
- The fix commits are still in the working tree (uncommitted) at the time of this release; the hashes will be back-filled once the commit set is finalized.
