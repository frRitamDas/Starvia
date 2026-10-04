"use client";

import * as React from "react";

/**
 * Tiny theme provider — no extra dependency.
 * Persists to localStorage and applies `.dark` on <html>.
 * A blocking script in the root layout prevents any flash of the wrong theme.
 */

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "starvia-theme";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function systemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? systemTheme() : theme;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    setThemeState(stored);
    setResolvedTheme(applyTheme(stored));

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      const current = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
      if (current === "system") setResolvedTheme(applyTheme("system"));
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const setTheme = React.useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
    setResolvedTheme(applyTheme(next));
  }, []);

  const toggle = React.useCallback(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    const current = stored === "system" ? systemTheme() : stored;
    setTheme(current === "dark" ? "light" : "dark");
  }, [setTheme]);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggle }),
    [theme, resolvedTheme, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    // Safe fallback so a component never crashes outside the provider.
    return {
      theme: "system" as Theme,
      resolvedTheme: "light" as const,
      setTheme: () => {},
      toggle: () => {},
    };
  }
  return context;
}

/** Inline script that runs before paint to avoid a theme flash. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
