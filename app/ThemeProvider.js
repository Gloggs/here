"use client"
import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Remembers the theme the user picked in Settings (light, dark or match device).
export function ThemeProvider({ children, ...props }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      storageKey="theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
