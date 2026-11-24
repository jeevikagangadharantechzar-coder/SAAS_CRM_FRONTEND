/**
 * JS mirror of the theme palette (src/theme/tokens.css).
 * Use only where CSS variables can't reach — e.g. Chart.js canvas options.
 * Everywhere else prefer the CSS variables / Tailwind semantic classes.
 */
export const THEME_STORAGE_KEY = "crmTheme";
export const THEMES = ["light", "dark", "system"];

export const PALETTE = {
  ink: "#0A1018",
  navy: "#1D2B3A",
  slate: "#38506A",
  steel: "#71859A",
  mist: "#B8C4CF",
  cloud: "#F2F5F6",
};

export const BRAND = "#008ecc";

const LIGHT = {
  bg: PALETTE.cloud,
  surface: "#ffffff",
  surfaceMuted: PALETTE.cloud,
  border: "#D5DCE2",
  borderStrong: PALETTE.mist,
  text: PALETTE.ink,
  textSecondary: PALETTE.slate,
  textMuted: PALETTE.steel,
  grid: "#E4E9ED",
  tooltipBg: PALETTE.navy,
  tooltipText: PALETTE.cloud,
};

const DARK = {
  bg: PALETTE.ink,
  surface: PALETTE.navy,
  surfaceMuted: "#121B26",
  border: "#2F4359",
  borderStrong: PALETTE.slate,
  text: PALETTE.cloud,
  textSecondary: PALETTE.mist,
  textMuted: PALETTE.steel,
  grid: "#2F4359",
  tooltipBg: PALETTE.cloud,
  tooltipText: PALETTE.ink,
};

export const getThemeColors = (resolvedTheme) => ({
  ...(resolvedTheme === "dark" ? DARK : LIGHT),
  palette: PALETTE,
  brand: BRAND,
});

/** CSS variable references — safe to use in inline `style={{}}` objects. */
export const themeVars = {
  bg: "var(--theme-bg)",
  surface: "var(--theme-surface)",
  surfaceMuted: "var(--theme-surface-muted)",
  surfaceHover: "var(--theme-surface-hover)",
  border: "var(--theme-border)",
  borderStrong: "var(--theme-border-strong)",
  text: "var(--theme-text)",
  textSecondary: "var(--theme-text-secondary)",
  textMuted: "var(--theme-text-muted)",
  inputBg: "var(--theme-input-bg)",
};
