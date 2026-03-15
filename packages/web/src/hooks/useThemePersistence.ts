import { useState } from 'react';

const STORAGE_KEY = 'partylight_theme';

export function useThemePersistence(defaultTheme = 'solid-wash'): [string, (id: string) => void] {
  const [themeId, setThemeId] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) ?? defaultTheme; }
    catch { return defaultTheme; }
  });

  const setTheme = (id: string) => {
    setThemeId(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  };

  return [themeId, setTheme];
}
