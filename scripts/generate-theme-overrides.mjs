/**
 * Generates src/theme/overrides.css — the dark-theme correction layer.
 *
 *   npm run theme:build
 *
 * Why this exists
 * ---------------
 * tokens.css remaps the Tailwind neutral scales onto the brand palette, which
 * themes ~all gray/slate utilities automatically. A plain variable swap cannot
 * tell *how* a colour is used, though, so a few patterns need a per-property
 * correction in dark mode:
 *   1. bg-white / from-white …          → dark surface (white is also used for text)
 *   2. bg-gray-700…950 (+ /opacity)     → stay DARK (buttons, tooltips, backdrops)
 *   3. text-gray-50…300                 → stay LIGHT (text on dark/colour banners)
 *   4. pastel tints bg-blue-50 etc.     → subtle dark tints; matching text lifted
 *   5. arbitrary light hex classes      → dark equivalents
 *
 * All rules use `:where(html.dark)` so they carry the *same* specificity as the
 * utility they correct; they live in @layer utilities after Tailwind's output,
 * so `hover:` / `focus:` / authored `dark:` variants still win where intended.
 * The file only references CSS variables from tokens.css — change colours
 * there, not here.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/theme/overrides.css");

const D = ":where(html.dark)";
const NEUTRALS = ["gray", "slate", "zinc", "neutral", "stone"];
const HUES = [
  "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal",
  "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
];
const OPACITIES = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 85, 90, 95];

const esc = (cls) => cls.replace(/([:/\[\]#.%()])/g, "\\$1");
const mixT = (c, pct) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

/** variant → selector suffix builder */
const VARIANTS = {
  "": (c) => `.${esc(c)}`,
  "hover:": (c) => `.${esc("hover:" + c)}:hover`,
  "focus:": (c) => `.${esc("focus:" + c)}:focus`,
  "active:": (c) => `.${esc("active:" + c)}:active`,
  "group-hover:": (c) => `.${esc("group-hover:" + c)}:is(:where(.group):hover *)`,
  "file:": (c) => `.${esc("file:" + c)}::file-selector-button`,
  "hover:file:": (c) => `.${esc("hover:file:" + c)}:hover::file-selector-button`,
};
const DEFAULT_VARIANTS = ["", "hover:", "focus:", "active:", "group-hover:"];
const WITH_FILE = [...DEFAULT_VARIANTS, "file:", "hover:file:"];

const blocks = [];
const rule = (selectors, decl) => {
  blocks.push(`${selectors.map((s) => `${D} ${s}`).join(",\n")} {\n  ${decl}\n}`);
};
const forVariants = (cls, variants = DEFAULT_VARIANTS) =>
  variants.map((v) => VARIANTS[v](cls));

const section = (title) => blocks.push(`\n/* ---- ${title} ${"-".repeat(Math.max(0, 66 - title.length))} */`);

/* 1. WHITE ------------------------------------------------------------------ */
section("white surfaces");
rule(forVariants("bg-white", WITH_FILE), "background-color: var(--theme-surface);");
for (const o of OPACITIES.filter((o) => o >= 50)) {
  rule(forVariants(`bg-white/${o}`), `background-color: ${mixT("var(--theme-surface)", o)};`);
}
rule(forVariants("from-white", ["", "hover:"]), "--tw-gradient-from: var(--theme-surface);");
rule(forVariants("via-white", ["", "hover:"]), "--tw-gradient-via: var(--theme-surface);");
rule(forVariants("to-white", ["", "hover:"]), "--tw-gradient-to: var(--theme-surface);");
rule(forVariants("border-white", ["", "hover:"]), "border-color: var(--theme-surface);");
rule(forVariants("ring-white", ["", "focus:"]), "--tw-ring-color: var(--theme-surface);");
rule(forVariants("ring-offset-white", ["", "focus:"]), "--tw-ring-offset-color: var(--theme-surface);");
rule(forVariants("divide-white").map((s) => `${s} > :not(:last-child)`), "border-color: var(--theme-border);");
rule(forVariants("text-black", ["", "hover:"]), "color: var(--theme-text);");
rule(forVariants("bg-gray-white"), "background-color: var(--theme-surface);"); // typo seen in codebase

/* 2. NEUTRAL DARK BACKGROUNDS STAY DARK ------------------------------------- */
section("neutral dark backgrounds stay dark");
const darkBg = {
  600: "var(--palette-steel)",
  700: "var(--palette-slate)",
  800: "color-mix(in srgb, var(--palette-navy) 40%, var(--palette-slate))",
  900: "var(--palette-ink)",
  950: "var(--palette-ink)",
};
for (const [shade, val] of Object.entries(darkBg)) {
  const all = (fn) => NEUTRALS.map((n) => fn(`${n}-${shade}`));
  rule(all((c) => forVariants(`bg-${c}`)).flat(), `background-color: ${val};`);
  for (const o of OPACITIES) {
    rule(all((c) => forVariants(`bg-${c}/${o}`, ["", "hover:"])).flat(), `background-color: ${mixT(val, o)};`);
  }
  if (+shade >= 800) {
    rule(all((c) => VARIANTS[""](`from-${c}`)), `--tw-gradient-from: ${val};`);
    rule(all((c) => VARIANTS[""](`via-${c}`)), `--tw-gradient-via: ${val};`);
    rule(all((c) => VARIANTS[""](`to-${c}`)), `--tw-gradient-to: ${val};`);
    rule(all((c) => VARIANTS[""](`border-${c}`)), "border-color: var(--palette-slate);");
  }
}

/* 3. NEUTRAL LIGHT TEXT STAYS LIGHT ----------------------------------------- */
section("neutral light text stays light");
const lightText = {
  50: "var(--palette-cloud)",
  100: "var(--palette-cloud)",
  200: "color-mix(in srgb, var(--palette-mist) 50%, var(--palette-cloud))",
  300: "var(--palette-steel)",
};
for (const [shade, val] of Object.entries(lightText)) {
  rule(NEUTRALS.flatMap((n) => forVariants(`text-${n}-${shade}`)), `color: ${val};`);
}

/* 4. COLOURED PASTEL TINTS --------------------------------------------------- */
section("coloured pastel tints");
const tintPct = { 50: 10, 100: 16, 200: 24, 300: 34 };
const borderPct = { 50: 18, 100: 25, 200: 35, 300: 45 };
const textMap = { 600: 400, 700: 300, 800: 300, 900: 200, 950: 200 };
for (const h of HUES) {
  const base = `var(--color-${h}-500)`;
  for (const [shade, pct] of Object.entries(tintPct)) {
    const val = `color-mix(in srgb, ${base} ${pct}%, var(--theme-surface))`;
    rule(forVariants(`bg-${h}-${shade}`, WITH_FILE), `background-color: ${val};`);
    for (const o of [30, 40, 50, 60, 70, 80]) {
      rule(forVariants(`bg-${h}-${shade}/${o}`, ["", "hover:"]), `background-color: ${mixT(val, o)};`);
    }
    rule([VARIANTS[""](`from-${h}-${shade}`)], `--tw-gradient-from: ${val};`);
    rule([VARIANTS[""](`via-${h}-${shade}`)], `--tw-gradient-via: ${val};`);
    rule([VARIANTS[""](`to-${h}-${shade}`)], `--tw-gradient-to: ${val};`);
    rule(forVariants(`border-${h}-${shade}`, ["", "hover:", "focus:"]),
      `border-color: color-mix(in srgb, ${base} ${borderPct[shade]}%, var(--theme-surface));`);
  }
  for (const [from, to] of Object.entries(textMap)) {
    rule(forVariants(`text-${h}-${from}`, WITH_FILE), `color: var(--color-${h}-${to});`);
  }
}

/* 5. ARBITRARY LIGHT HEX CLASSES -------------------------------------------- */
section("arbitrary light hex classes");
const brandTint = "color-mix(in srgb, #008ecc 14%, var(--theme-surface))";
const hex = {
  "#f2fbff": brandTint, "#e8f7ff": brandTint, "#f0faff": brandTint, "#e6f6fd": brandTint,
  "#f8f9fb": "var(--theme-surface-muted)", "#f0f2f5": "var(--theme-surface-muted)",
  "#f8fafc": "var(--theme-surface-muted)", "#f9fafb": "var(--theme-surface-muted)",
  "#f1f5f9": "var(--theme-surface-muted)", "#fafafa": "var(--theme-surface-muted)",
  "#fff": "var(--theme-surface)", "#ffffff": "var(--theme-surface)", "#FFFFFF": "var(--theme-surface)",
  "#efeae2": "var(--theme-bg)",
  "#d9fdd3": "color-mix(in srgb, #25d366 22%, var(--theme-surface))",
  "#DCF8C6": "color-mix(in srgb, #25d366 22%, var(--theme-surface))",
  "#dcf8c6": "color-mix(in srgb, #25d366 22%, var(--theme-surface))",
};
for (const [h, val] of Object.entries(hex)) {
  rule(forVariants(`bg-[${h}]`), `background-color: ${val};`);
  for (const o of [30, 40, 50, 60, 70, 80, 90]) {
    rule(forVariants(`bg-[${h}]/${o}`, ["", "hover:"]), `background-color: ${mixT(val, o)};`);
  }
}
for (const t of ["#111827", "#0f172a", "#1f2937", "#202124", "#1f1f1f", "#000", "#000000", "#333", "#374151"]) {
  rule(forVariants(`text-[${t}]`, ["", "hover:"]), "color: var(--theme-text);");
}
for (const t of ["#5f6368", "#444746", "#6b7280", "#64748b", "#4b5563", "#666", "#555"]) {
  rule(forVariants(`text-[${t}]`, ["", "hover:"]), "color: var(--theme-text-secondary);");
}
for (const b of ["#e5e7eb", "#e8eaed", "#e2e8f0", "#ddd", "#eee", "#d1d5db"]) {
  rule(forVariants(`border-[${b}]`), "border-color: var(--theme-border);");
}

const css = `/* AUTO-GENERATED by scripts/generate-theme-overrides.mjs — do not edit by hand.
   Run \`npm run theme:build\` after changing the generator. Colours live in tokens.css. */
@layer utilities {
${blocks.join("\n")}
}
`;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, css);
console.log(`Wrote ${OUT} (${blocks.length} blocks, ${(css.length / 1024).toFixed(1)} KB)`);
