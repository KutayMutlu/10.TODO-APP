import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { translations } from '../constants';

/** AudioBuffer'ı 16-bit PCM WAV olarak kodlar; diğer seslerle aynı Audio elementiyle çalınır (sessiz mod davranışı). */
function encodeWav(buffer) {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const data = buffer.getChannelData(0);
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = data.length * bytesPerSample;
  const headerLength = 44;
  const buf = new ArrayBuffer(headerLength + dataLength);
  const view = new DataView(buf);
  const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataLength, true);
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Uint8Array(buf);
}

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
          const sampleRate = 44100;
          const duration = 0.35;
          const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, sampleRate * duration, sampleRate);
          const playTone = (freq, startTime, dur) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.2, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + dur);
            osc.start(startTime);
            osc.stop(startTime + dur);
          };
          playTone(523.25, 0, 0.12);
          playTone(659.25, 0.1, 0.2);
          ctx.startRendering().then((buffer) => {
            const wav = encodeWav(buffer);
            const blob = new Blob([wav], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.volume = 0.3;
            audio.onended = () => URL.revokeObjectURL(url);
            audio.onerror = () => URL.revokeObjectURL(url);
            audio.play().catch(() => URL.revokeObjectURL(url));
          }).catch(() => {});
        } catch {
          // sessizce yut
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

