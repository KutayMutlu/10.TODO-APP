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
    if (navLang.toLowerCase().startsWith('sq')) return 'sq';
    return 'en';
  });

  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;

    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      return prefersDark ? 'dark' : 'light';
    }

    return 'light';
  });

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

  // İsteğe bağlı: sistem teması değişirse (örn. telefonun genel teması değiştiğinde) otomatik güncelle
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event) => {
      const stored = localStorage.getItem('theme');
      // Kullanıcı manuel seçim yaptıysa sistem değişimine saygı duymama:
      if (stored === 'light' || stored === 'dark') return;
      setTheme(event.matches ? 'dark' : 'light');
    };

    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [setTheme]);

  useEffect(() => {
    localStorage.setItem('soundEnabled', JSON.stringify(isSoundEnabled));
  }, [isSoundEnabled]);

  const playSound = useCallback(
    (soundName) => {
      if (!isSoundEnabled) return;
      if (soundName === 'complete') {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          if (ctx.state === 'suspended') ctx.resume();
          const playTone = (freq, startTime, duration) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
          };
          playTone(523.25, 0, 0.12);
          playTone(659.25, 0.1, 0.2);
        } catch {
          // Tarayıcı Web Audio desteklemiyorsa sessizce atla
        }
        return;
      }
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

/* eslint-disable-next-line react-refresh/only-export-components -- useSettings is a hook, same module is intentional */
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}

