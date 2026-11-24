import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { THEME_STORAGE_KEY, THEMES, getThemeColors } from "./palette";

/**
 * Centralized theme state for the whole CRM (tenant app + Super Admin).
 *
 *   const { theme, resolvedTheme, isDark, setTheme, toggleTheme, colors } = useTheme();
 *
 * theme          – user preference: "light" | "dark" | "system"
 * resolvedTheme  – what is actually shown: "light" | "dark"
 * colors         – resolved palette/semantic colours for JS consumers (charts, canvas)
 *
 * PERFORMANCE — how a switch works
 * --------------------------------
 * Animating colours per element is what makes theme switches lag: ~900
 * components carry `transition-all` / `transition-colors`, so every one of them
 * would tween on its own timeline and the browser would re-paint each frame.
 * Instead a switch is:
 *   1. one synchronous flip of `class="dark"` on <html> (CSS variables do the rest),
 *      with all CSS transitions suppressed for that single frame, and
 *   2. a single GPU cross-fade of the whole page via the View Transitions API
 *      (old/new snapshots are composited — cost does not grow with page size).
 * Browsers without View Transitions, or users with reduced motion, get an
 * instant, flicker-free switch.
 */
const ThemeContext = createContext(null);

const LEGACY_KEYS = ["superAdminTheme"];

const readStoredTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (THEMES.includes(stored)) return stored;
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key);
      if (legacy === "dark" || legacy === "light") return legacy;
    }
  } catch {
    /* storage unavailable */
  }
  return "light";
};

const darkQuery = () => (typeof window !== "undefined" ? window.matchMedia?.("(prefers-color-scheme: dark)") : null);
const resolve = (pref, systemDark) => (pref === "system" ? (systemDark ? "dark" : "light") : pref);

/** Flip the theme on <html>. No-op if already applied. */
export const applyThemeToDocument = (resolved) => {
  const root = document.documentElement;
  if (root.getAttribute("data-theme") === resolved && root.classList.contains("dark") === (resolved === "dark")) {
    return false;
  }
  root.classList.toggle("dark", resolved === "dark");
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
  return true;
};

/** Run `update` with every CSS transition disabled, so nothing tweens on its own. */
const withoutTransitions = (update) => {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  update();
  // Force the new styles to be computed while transitions are off…
  void window.getComputedStyle(root).backgroundColor;
  // …then re-enable them on the next frame (final values are already applied).
  requestAnimationFrame(() => root.classList.remove("theme-switching"));
};

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Smooth, compositor-only cross-fade when supported; instant swap otherwise. */
const runThemeSwitch = (update) => {
  if (typeof document.startViewTransition !== "function" || prefersReducedMotion() || document.hidden) {
    withoutTransitions(update);
    return;
  }
  try {
    document.startViewTransition(() => withoutTransitions(update));
  } catch {
    withoutTransitions(update);
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(readStoredTheme);
  const [systemDark, setSystemDark] = useState(() => !!darkQuery()?.matches);

  const resolvedTheme = resolve(theme, systemDark);

  // Follow OS changes when preference is "system"
  useEffect(() => {
    const mq = darkQuery();
    if (!mq) return undefined;
    const onChange = (e) => runThemeSwitch(() => flushSync(() => setSystemDark(e.matches)));
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Keep every open tab in sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === THEME_STORAGE_KEY && THEMES.includes(e.newValue)) {
        withoutTransitions(() => flushSync(() => setThemeState(e.newValue)));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Keep <html> in sync with state. Layout effect = runs synchronously inside the
  // flushSync commit above, so OS/other-tab changes flip in the same frame.
  // No-op when setTheme already applied the class.
  useLayoutEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback(
    (next) => {
      if (!THEMES.includes(next)) return;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
        LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
      } catch {
        /* storage unavailable */
      }
      const nextResolved = resolve(next, systemDark);
      runThemeSwitch(() => {
        applyThemeToDocument(nextResolved);
        // Commit React state inside the same frame so icons/charts match the snapshot.
        flushSync(() => setThemeState(next));
      });
    },
    [systemDark]
  );

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  const colors = useMemo(() => getThemeColors(resolvedTheme), [resolvedTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      isDark: resolvedTheme === "dark",
      setTheme,
      toggleTheme,
      colors,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
};
