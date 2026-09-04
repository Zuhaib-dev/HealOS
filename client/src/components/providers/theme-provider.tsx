"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps, useTheme } from "next-themes";

function ThemeHotkeyListener() {
  const { resolvedTheme, setTheme } = useTheme();

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        !target ||
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      ) {
        return;
      }

      const isPlainD = event.key.toLowerCase() === "d" && !event.ctrlKey && !event.metaKey && !event.altKey;
      const isCmdShiftD = event.key.toLowerCase() === "d" && (event.metaKey || event.ctrlKey) && event.shiftKey;

      if (isPlainD || isCmdShiftD) {
        event.preventDefault();
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resolvedTheme, setTheme]);

  return null;
}

export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps & { children?: React.ReactNode }) {
  return (
    <NextThemesProvider {...props}>
      <ThemeHotkeyListener />
      {children}
    </NextThemesProvider>
  );
}
