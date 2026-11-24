# CRM Theme (Light / Dark)

Every colour in the CRM comes from this folder. Both themes use the six palette colours:

| Token | Hex | Light theme role | Dark theme role |
|---|---|---|---|
| `--palette-ink` | `#0A1018` | primary text | page background |
| `--palette-navy` | `#1D2B3A` | strong surfaces | cards, sidebar, modals |
| `--palette-slate` | `#38506A` | secondary text | borders |
| `--palette-steel` | `#71859A` | muted text / icons | muted text / icons |
| `--palette-mist` | `#B8C4CF` | borders | secondary text |
| `--palette-cloud` | `#F2F5F6` | page background | primary text |

## Files

| File | Purpose |
|---|---|
| `tokens.css` | Palette, semantic tokens (`--theme-*`) for both themes, and the remap of Tailwind's gray/slate/zinc/neutral/stone scales onto the palette |
| `overrides.css` | **Generated.** Dark-mode fixes for `bg-white`, dark buttons/backdrops, light text, pastel tints, and light hex classes. Rebuild with `npm run theme:build` (source: `scripts/generate-theme-overrides.mjs`) |
| `base.css` | Body, headings, native inputs, scrollbars, and third-party widgets (datepicker, big-calendar, date-range, CKEditor, phone input, react-select, toasts, Recharts, Leaflet, Reactour) |
| `ThemeProvider.jsx` | `useTheme()` → `{ theme, resolvedTheme, isDark, setTheme, toggleTheme, colors }`. Sets `class="dark"` and `data-theme` on `<html>`, persists to `localStorage.crmTheme`, follows the OS in "system" mode, and syncs across tabs |
| `ThemeToggle.jsx` | The one switch: `<ThemeToggle />` (icon), `<ThemeToggle variant="segmented" />` (Light/Dark/System), and `compact` for menus |
| `palette.js` | JS mirror of the palette for canvas code; `themeVars` for inline styles |
| `useChartTheme.js` | Chart.js defaults; live charts repaint in place (no remount) on theme change |

`index.html` applies the saved theme before first paint, so there's no flash.

## Switch performance

A theme switch is one class flip on `<html>`. All CSS transitions are suppressed for that frame (`html.theme-switching`), and a single View Transitions cross-fade (200 ms, GPU-composited) makes the change look smooth. Don't add per-element colour transitions for theming, and don't put transitions on `html`/`*`; they're what made switching lag. Theme tokens are plain hex (not `color-mix()`), which keeps style recalculation cheap.

## Writing new UI

Prefer the semantic utilities:

```jsx
<div className="bg-surface text-fg border border-line">
  <p className="text-fg-secondary">…</p>
  <span className="text-fg-muted">…</span>
</div>
```

Also available: `bg-app`, `bg-surface-muted`, `bg-surface-hover`, `bg-surface-raised`, `border-line-strong`, and `bg-palette-ink` … `bg-palette-cloud`.

The regular Tailwind neutrals (`bg-white`, `bg-gray-50`, `text-gray-900`, `border-gray-200`, …) and pastel tints (`bg-blue-50 text-blue-700`) are themed automatically, so existing patterns keep working.

**Don't** hard-code neutral hex values in `style={{}}`. Use `themeVars` or `var(--theme-surface)`, `var(--theme-text)`, `var(--theme-border)`, and so on. You don't need `dark:` classes for neutrals; use them only for intentional per-theme accents.
