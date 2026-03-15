import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'partylight_theme';

export function useThemePersistence(defaultTheme = 'solid-wash'): [string, (id: string) => void] {
  const [themeId, setThemeId] = useState(defaultTheme);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) setThemeId(val);
    });
  }, []);

  const setTheme = (id: string) => {
    setThemeId(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  };

  return [themeId, setTheme];
}
