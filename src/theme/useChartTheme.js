import { useLayoutEffect } from "react";
import { Chart } from "chart.js";
import { useTheme } from "./ThemeProvider";

/**
 * Chart.js draws on <canvas>, so CSS variables can't reach it. This hook pushes
 * the active theme into Chart.js global defaults and, on a theme switch,
 * repaints every live chart IN PLACE with no animation (no remount, no
 * re-created canvas, no replayed entry animation), so switching stays instant.
 *
 *   const { colors } = useChartTheme();   // colors.grid, colors.tooltipBg, …
 */
export const applyChartDefaults = (colors) => {
  Chart.defaults.color = colors.textMuted;
  Chart.defaults.borderColor = colors.grid;
  Chart.defaults.elements.arc.borderColor = colors.surface;
  const tooltip = Chart.defaults.plugins.tooltip;
  tooltip.backgroundColor = colors.tooltipBg;
  tooltip.titleColor = colors.tooltipText;
  tooltip.bodyColor = colors.tooltipText;
  tooltip.borderColor = colors.border;
  tooltip.borderWidth = 1;
};

let appliedFor = null;
const syncCharts = (resolvedTheme, colors) => {
  if (appliedFor === resolvedTheme) return;
  const first = appliedFor === null;
  appliedFor = resolvedTheme;
  applyChartDefaults(colors);
  if (first) return; // initial render: charts are created with these defaults
  Object.values(Chart.instances).forEach((chart) => chart.update("none"));
};

export default function useChartTheme() {
  const { resolvedTheme, colors } = useTheme();
  // Before the first chart creates its canvas, apply defaults synchronously.
  if (appliedFor === null) syncCharts(resolvedTheme, colors);
  // On switch: runs inside the theme flip's commit, i.e. before the new frame paints.
  useLayoutEffect(() => syncCharts(resolvedTheme, colors), [resolvedTheme, colors]);
  return { colors };
}
