import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { translations } from '../constants';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const stored = localStorage.getItem('lang');
    if (stored) return stored;
    const navLang = navigator.language || navigator.userLanguage || 'en';
    if (navLang.toLowerCase().startsWith('tr')) return 'tr';
    if (navLang.toLowerCase().startsWith('fr')) return 'fr';
    return 'en';
  });

  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'light'
  );

  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const savedSound = localStorage.getItem('soundEnabled');
    return savedSound !== null ? JSON.parse(savedSound) : true;
  });

  const t = useMemo(() => translations[lang], [lang]);

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('soundEnabled', JSON.stringify(isSoundEnabled));
  }, [isSoundEnabled]);

  const playSound = useCallback(
    (soundName) => {
      if (!isSoundEnabled) return;
      try {
        const audio = new Audio(`/sounds/${soundName}.mp3`);
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch {
        // sessizce yut
      }
    },
    [isSoundEnabled]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      theme,
      setTheme,
      t,
      isSoundEnabled,
      setIsSoundEnabled,
      playSound,
    }),
    [lang, theme, t, isSoundEnabled, playSound]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}

