import { useState, useEffect, useRef, useMemo } from 'react';
import './App.css';
import { ToastContainer, toast } from 'react-toastify';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';
import SystemControls from './components/SystemControls';
import LoadingScreen from './components/LoadingScreen';
import AuthSection from './components/AuthSection';
import { useAuth } from './hooks/useAuth';
import { useTodos } from './hooks/useTodos';
import { useSettings } from './context/SettingsContext.jsx';

// DND KIT
import { KeyboardSensor, PointerSensor, useSensor, useSensors, TouchSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

function App() {
  // --- SETTINGS CONTEXT ---
  const {
    lang,
    setLang,
    theme,
    setTheme,
    t,
    isSoundEnabled,
    setIsSoundEnabled,
    playSound,
  } = useSettings();

  // --- LOCAL STATE (UYGULAMA ÖZEL) ---
  const [filter, setFilter] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

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
    archiveSelected,
    completeSelected,
    deleteSelected,
    activeTodosOnly,
    progressPercentage,
  } = useTodos({
    user,
    t,
    playSound,
  });

  // Touch cihazlarda pointer/touch ile yanlışlıkla sürükleme olmasın diye kısa gecikme (ortalama 400–600 ms).
  const isTouchDevice = useMemo(
    () => typeof window !== 'undefined' && ('ontouchstart' in window || window.matchMedia('(pointer: coarse)').matches),
    []
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isTouchDevice
        ? { delay: 500, tolerance: 25 }   // Mobilde ~0,5 sn basılı tutunca sürükleme
        : { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 500,
        tolerance: 25,
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

  const handleLogoutWithTodos = () => {
    setShowSettings(false);
    handleLogout(todos);
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

  const handleToggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (prev) {
        setSelectedIds([]);
      }
      return !prev;
    });
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleArchiveSelected = () => {
    if (selectedIds.length === 0) return;
    const archivable = selectedIds.filter((id) => {
      const todo = todos.find((t) => t.id === id);
      return todo && todo.isCompleted && !todo.isArchived;
    });
    if (archivable.length === 0) {
      toast.warn(t.noArchivableSelected);
      return;
    }
    archiveSelected(archivable);
    setSelectedIds([]);
    setSelectionMode(false);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    Swal.fire({
      title: t.confirmSelectedDelete,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t.confirmDeleteYes,
    }).then((result) => {
      if (result.isConfirmed) {
        const deletable = selectedIds.filter((id) => {
          const todo = todos.find((t) => t.id === id);
          return todo && !todo.isArchived;
        });
        if (deletable.length === 0) return;
        deleteSelected(deletable);
        setSelectedIds([]);
        setSelectionMode(false);
      }
    });
  };

  const handleCompleteSelected = () => {
    if (selectedIds.length === 0) return;
    const toComplete = selectedIds.filter((id) => {
      const todo = todos.find((t) => t.id === id);
      return todo && !todo.isArchived && !todo.isCompleted;
    });
    if (toComplete.length === 0) return;
    completeSelected(toComplete);
    setSelectedIds([]);
    setSelectionMode(false);
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

  const handleSelectAllVisible = () => {
    const ids = filteredTodos
      .filter((todo) => !todo.isArchived)
      .map((todo) => todo.id);
    const allAlreadySelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds(allAlreadySelected ? [] : ids);
  };

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
        handleLogout={handleLogoutWithTodos}
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
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelectionMode={handleToggleSelectionMode}
          onToggleSelect={handleToggleSelect}
          onArchiveSelected={handleArchiveSelected}
          onCompleteSelected={handleCompleteSelected}
          onDeleteSelected={handleDeleteSelected}
          onSelectAll={handleSelectAllVisible}
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
      <ToastContainer
        theme={theme === "dark" ? "dark" : "light"}
        limit={3}
        autoClose={2000}
        closeOnClick
        draggable
        draggableDirection="x"
      />
      <footer className="footer">
        <p>{t.footerText} <span className="footer-name">Kutay Mutlu</span></p>
      </footer>
    </div>
  )
}
export default App;