"use client";

import { useContext } from "react";
import { LocaleContext } from "./LocaleProvider";

/**
 * Hook to access locale and translator in client components.
 * Usage: const { t, locale, setLocale } = useLocale();
 */
export function useLocale() {
  return useContext(LocaleContext);
}
