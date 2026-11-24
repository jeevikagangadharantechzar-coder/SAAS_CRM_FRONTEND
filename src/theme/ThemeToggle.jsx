import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "./ThemeProvider";

/**
 * The one reusable theme switch for the whole CRM.
 *
 *   <ThemeToggle />                      – icon button (header / navbar)
 *   <ThemeToggle variant="segmented" />  – Light / Dark / System picker (settings pages)
 *   <ThemeToggle variant="segmented" compact /> – full-width, tighter picker for menus/dropdowns
 */
const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export default function ThemeToggle({ variant = "icon", size = 20, className = "", showTooltip = true, compact = false }) {
  const { theme, isDark, setTheme, toggleTheme } = useTheme();

  if (variant === "segmented") {
    return (
      <div
        role="radiogroup"
        aria-label="Theme"
        className={`${compact ? "flex w-full" : "inline-flex"} items-center gap-1 rounded-lg border border-line bg-surface-muted p-1 ${className}`}
      >
        {OPTIONS.map((option) => {
          const { value, label, Icon } = option;
          const active = theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(value)}
              className={`flex items-center justify-center rounded-md font-medium transition-colors ${
                compact ? "flex-1 gap-1 px-1 py-1 text-xs" : "gap-1.5 px-3 py-1.5 text-sm"
              } ${
                active
                  ? "bg-surface text-fg shadow-sm"
                  : "text-fg-muted hover:text-fg hover:bg-surface-hover"
              }`}
            >
              <Icon size={compact ? 13 : 15} />
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <div className="relative group shrink-0">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        className={`p-1.5 sm:p-2 rounded-lg text-fg-secondary hover:bg-surface-hover transition-colors ${className}`}
      >
        {isDark ? <Sun size={size} /> : <Moon size={size} />}
      </button>
      {showTooltip && (
        <div
          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity
          text-xs px-3 py-1 rounded-md whitespace-nowrap pointer-events-none z-50"
          style={{ background: "var(--theme-tooltip-bg)", color: "var(--theme-tooltip-text)" }}
        >
          {isDark ? "Light mode" : "Dark mode"}
        </div>
      )}
    </div>
  );
}
