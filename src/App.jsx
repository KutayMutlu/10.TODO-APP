import { useState, useEffect } from 'react'
import './App.css'
import TodoCreate from './components/TodoCreate'
import TodoList from './components/TodoList'
import { ToastContainer, toast } from 'react-toastify';
import { FaSun, FaMoon } from "react-icons/fa";
import { IoMdSettings } from "react-icons/io";
import { motion, AnimatePresence } from 'framer-motion';
import "react-toastify/dist/ReactToastify.css";
import ProgressBar from './components/ProgressBar';
import TodoFilter from './components/TodoFilter';
import Swal from 'sweetalert2';
import { translations } from './constants';

// DND KIT
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

function App() {
  const [lang, setLang] = useState(() => {
    const savedLang = localStorage.getItem("lang");
    if (savedLang) return savedLang;
    return navigator.language.startsWith('tr') ? 'tr' : 'en';
  });

  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [filter, setFilter] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const savedSound = localStorage.getItem("soundEnabled");
    return savedSound !== null ? JSON.parse(savedSound) : true;
  });

  const t = translations[lang];

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  useEffect(() => {
    if (theme === "dark") document.body.classList.add("dark");
    else document.body.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("soundEnabled", JSON.stringify(isSoundEnabled));
  }, [isSoundEnabled]);

  const toggleTheme = () => setTheme(prev => prev === "light" ? "dark" : "light");

  const [todos, setTodos] = useState(() => {
    const savedTodos = localStorage.getItem("todos");
    return savedTodos ? JSON.parse(savedTodos) : [];
  });

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // TEMİZLENMİŞ SES FONKSİYONU
  const playSound = (soundName) => {
    if (!isSoundEnabled) return;
    try {
      const audio = new Audio(`/sounds/${soundName}.mp3`);
      audio.volume = 0.3;
      audio.play().catch(() => { /* Tarayıcı engeli için sessiz hata yönetimi */ });
    } catch (e) {
      // Hata yönetimi sessizce geçiliyor
    }
  };

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

  const handleAddTodo = (newTodo) => {
    if (!newTodo.content || newTodo.content.trim() === "") {
      playSound('warn');
      toast.warn(t.emptyWarn);
      return;
    }

    const todoWithDate = {
      ...newTodo,
      isCompleted: false,
      isArchived: false,
      createdAt: Date.now()
    };

    playSound('add');
    setTodos([todoWithDate, ...todos]);
    toast.info(t.addSuccess);
  }

  const removeTodo = (todoId) => {
    playSound('delete');
    setTodos(todos.filter((todo) => todo.id !== todoId));
    toast.error(t.deleteSuccess);
  }

  const updateTodo = (newTodo) => {
    if (!newTodo.content || newTodo.content.trim() === "") {
      playSound('warn');
      toast.warn(t.updateWarn || t.emptyWarn);
      return;
    }
    setTodos(todos.map((todo) => todo.id !== newTodo.id ? todo : newTodo));
    toast.success(t.updateSuccess);
  }

  const toggleCompleteTodo = (id) => {
    setTodos(todos.map((todo) => {
      if (todo.id === id) {
        if (todo.isArchived) {
          playSound('add');
          toast.success(lang === 'tr' ? "Hedef geri yüklendi!" : "Task restored!");
          return { ...todo, isArchived: false, isCompleted: false };
        }
        const newStatus = !todo.isCompleted;
        if (newStatus) {
          playSound('add');
          toast.success(t.congrats, { icon: "😊" });
        }
        return { ...todo, isCompleted: newStatus };
      }
      return todo;
    }));
  }

  const clearAllTodos = () => {
    Swal.fire({
      title: t.confirmAllDelete,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#6c63ff',
      cancelButtonColor: '#d33',
      confirmButtonText: lang === 'tr' ? 'Evet, sil!' : 'Yes, delete!',
      cancelButtonText: lang === 'tr' ? 'İptal' : 'Cancel',
      background: theme === 'dark' ? '#2d3436' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000',
    }).then((result) => {
      if (result.isConfirmed) {
        playSound('delete');
        setTodos([]);
        toast.error(t.deleteSuccess);
      }
    });
  };

  const clearCompletedTodos = () => {
    const completedExist = todos.some(todo => todo.isCompleted && !todo.isArchived);
    if (!completedExist) {
      toast.warn(lang === 'tr' ? "Arşivlenecek hedef bulunamadı." : "Nothing to archive.");
      return;
    }

    Swal.fire({
      title: lang === 'tr' ? 'Tamamlananlar Arşivlensin mi?' : 'Archive Completed?',
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#6c63ff',
      confirmButtonText: lang === 'tr' ? 'Evet, arşivle!' : 'Yes, archive!',
      cancelButtonText: lang === 'tr' ? 'Vazgeç' : 'Cancel',
      background: theme === 'dark' ? '#2d3436' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000',
    }).then((result) => {
      if (result.isConfirmed) {
        playSound('add');
        setTodos(todos.map(todo => todo.isCompleted && !todo.isArchived ? { ...todo, isArchived: true } : todo));
        toast.success(lang === 'tr' ? "Hedefler arşive taşındı! 📦" : "Tasks archived! 📦");
      }
    });
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === "archive") return todo.isArchived;
    if (todo.isArchived) return false;
    if (filter === "active") return !todo.isCompleted;
    if (filter === "completed") return todo.isCompleted;
    return true;
  });

  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (a.isCompleted === b.isCompleted) return 0;
    return a.isCompleted ? 1 : -1;
  });

  const activeTodosOnly = todos.filter(t => !t.isArchived);
  const totalTodos = activeTodosOnly.length;
  const completedCount = activeTodosOnly.filter(t => t.isCompleted).length;
  const progressPercentage = totalTodos > 0 ? (completedCount / totalTodos) * 100 : 0;

  return (
    <div className='App'>
      <div className="system-controls">
        <div className="settings-container">
          <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
            <IoMdSettings />
          </button>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="settings-menu"
              >
                <div className="setting-item">
                  <span>{lang === 'tr' ? "Dil / Language" : "Language / Dil"}</span>
                  <select
                    className="lang-select"
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                  >
                    <option value="tr">Türkçe 🇹🇷</option>
                    <option value="en">English 🇺🇸</option>
                  </select>
                </div>
                <div className="setting-item">
                  <span>{t.soundEffects}</span>
                  <div
                    className={`switch ${isSoundEnabled ? 'on' : 'off'}`}
                    onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                  >
                    <div className="switch-handle" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button className="theme-toggle-btn" onClick={toggleTheme}>
          {theme === "light" ? <FaMoon /> : <FaSun />}
        </button>
      </div>

      <h1 className='todo-header'>{filter === "archive" ? (lang === 'tr' ? "Arşiv" : "Archive") : t.header}</h1>

      <div className='main'>
        {filter !== "archive" && (
          <>
            <TodoCreate onCreateTodo={handleAddTodo} t={t} playSound={playSound} />
            {totalTodos > 0 && <ProgressBar percentage={progressPercentage} t={t} />}
          </>
        )}

        <TodoFilter
          currentFilter={filter}
          onFilterChange={setFilter}
          t={t}
          onClearAll={clearAllTodos}
          onClearCompleted={clearCompletedTodos}
        />

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <TodoList
            todos={sortedTodos}
            onRemoveTodo={removeTodo}
            onUpdateTodo={updateTodo}
            onToggleComplete={toggleCompleteTodo}
            t={t}
            playSound={playSound}
          />
        </DndContext>

        {filter === "archive" && sortedTodos.length === 0 && (
          <p className="empty-text" style={{ textAlign: 'center', marginTop: '20px', opacity: 0.6 }}>
            {lang === 'tr' ? "Arşiviniz boş. 📭" : "Archive is empty. 📭"}
          </p>
        )}
      </div>

      <ToastContainer
        theme={theme === "dark" ? "dark" : "light"}
        limit={3}
        autoClose={2000}
        position="top-right"
        style={{ zIndex: 99999 }}
      />

      <footer className="footer">
        <p>{t.footerText} <span className="footer-name">Kutay Mutlu</span></p>
      </footer>
    </div>
  )
}

export default App;