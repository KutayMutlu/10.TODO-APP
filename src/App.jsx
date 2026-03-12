import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import './App.css'
import { ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import "react-toastify/dist/ReactToastify.css";
import { translations } from './constants';
import SystemControls from './components/SystemControls';
import LoadingScreen from './components/LoadingScreen';
import AuthSection from './components/AuthSection';
import { useAuth } from './hooks/useAuth';
import { useTodos } from './hooks/useTodos';

// DND KIT
import { KeyboardSensor, PointerSensor, useSensor, useSensors, TouchSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

function App() {
  // --- STATE TANIMLAMALARI ---
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || (navigator.language.startsWith('tr') ? 'tr' : 'en'));
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [filter, setFilter] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const savedSound = localStorage.getItem("soundEnabled");
    return savedSound !== null ? JSON.parse(savedSound) : true;
  });

  const t = translations[lang];

  // --- 1. KONTROL: SETTINGS REF TANIMLAMA ---
  const settingsRef = useRef(null);

  // --- 2. KONTROL: DIŞARI TIKLAMA MANTIĞI (OUTSIDE CLICK) ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Eğer ayarlar açıksa ve tıklanan yer settings-container'ın dışındaysa kapat
      if (showSettings && settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };

    // Hem mousedown hem touchstart ekliyoruz (iPhone uyumluluğu için)
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showSettings]);

  // --- LOCAL STORAGE & TEMA ---
  useEffect(() => { localStorage.setItem("lang", lang); }, [lang]);
  useEffect(() => {
    theme === "dark" ? document.body.classList.add("dark") : document.body.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);
  useEffect(() => { localStorage.setItem("soundEnabled", JSON.stringify(isSoundEnabled)); }, [isSoundEnabled]);

  const playSound = useCallback((soundName) => {
    if (!isSoundEnabled) return;
    try {
      const audio = new Audio(`/sounds/${soundName}.mp3`);
      audio.volume = 0.3;
      audio.play().catch(() => { });
    } catch (e) { }
  }, [isSoundEnabled]);

  const {
    user,
    authLoading,
    initialAuthChecked,
    handleLogin,
    handleGuestLogin,
    handleUpgradeAccount,
    handleLogout,
  } = useAuth({
    t,
    lang,
    onAccountLinked: () => setShowSettings(false),
  });

  const {
    todos,
    setTodos,
    handleAddTodo,
    removeTodo,
    updateTodo,
    toggleCompleteTodo,
    clearAllTodos,
    clearCompletedTodos,
    activeTodosOnly,
    progressPercentage,
  } = useTodos({
    user,
    t,
    playSound,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Mouse ile 8px hareket etmeden sürükleme başlamaz
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,    // iPhone için kritik: 250ms basılı tutunca sürükleme başlar
        tolerance: 5,  // Parmağın 5px oynamasına izin verir (titreme payı)
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTodos((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleClearAllTodos = () => {
    if (todos.length === 0) return;
    Swal.fire({
      title: t.confirmAllDelete,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t.confirmDeleteYes,
    }).then((result) => {
      if (result.isConfirmed) {
        clearAllTodos();
      }
    });
  };

  const filteredTodos = useMemo(() => {
    if (filter === "archive") return todos.filter(todo => todo.isArchived);
    if (filter === "active") return todos.filter(todo => !todo.isArchived && !todo.isCompleted);
    if (filter === "completed") return todos.filter(todo => !todo.isArchived && todo.isCompleted);
    return todos.filter(todo => !todo.isArchived);
  }, [todos, filter]);

  const sortedTodos = useMemo(
    () => [...filteredTodos].sort((a, b) =>
      a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1
    ),
    [filteredTodos]
  );

  // Uygulama ilk açılırken (Firebase auth durumu henüz belli değilken) tam ekran, smooth bir yükleme ekranı göster
  if (!initialAuthChecked) {
    return <LoadingScreen text={t.loading} />;
  }

  return (
    <div className='App'>
      <SystemControls
        user={user}
        lang={lang}
        t={t}
        theme={theme}
        setTheme={setTheme}
        setLang={setLang}
        settingsRef={settingsRef}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        isSoundEnabled={isSoundEnabled}
        setIsSoundEnabled={setIsSoundEnabled}
        handleUpgradeAccount={handleUpgradeAccount}
        handleLogout={handleLogout}
      />

      <h1 className='todo-header'>{filter === "archive" ? t.archive : t.header}</h1>

      <div className='main'>
        <AuthSection
          user={user}
          lang={lang}
          t={t}
          filter={filter}
          authLoading={authLoading}
          onLogin={handleLogin}
          onGuestLogin={handleGuestLogin}
          onAddTodo={handleAddTodo}
          onFilterChange={setFilter}
          onClearAll={handleClearAllTodos}
          onClearCompleted={clearCompletedTodos}
          sensors={sensors}
          onDragEnd={handleDragEnd}
          todos={sortedTodos}
          setTodos={setTodos}
          onRemoveTodo={removeTodo}
          onUpdateTodo={updateTodo}
          onToggleComplete={toggleCompleteTodo}
          playSound={playSound}
          activeTodosOnly={activeTodosOnly}
          progressPercentage={progressPercentage}
        />
      </div>
      <ToastContainer theme={theme === "dark" ? "dark" : "light"} limit={3} autoClose={2000} />
      <footer className="footer">
        <p>{t.footerText} <span className="footer-name">Kutay Mutlu</span></p>
      </footer>
    </div>
  )
}
export default App;