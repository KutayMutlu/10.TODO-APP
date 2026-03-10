import { useState, useEffect, useMemo } from 'react'
import './App.css'
import TodoCreate from './components/TodoCreate'
import TodoList from './components/TodoList'
import { ToastContainer, toast } from 'react-toastify';
import { FaSun, FaMoon } from "react-icons/fa";
import { IoMdSettings } from "react-icons/io"; // Ayarlar ikonu
import { motion, AnimatePresence } from 'framer-motion';
import "react-toastify/dist/ReactToastify.css";
import ProgressBar from './components/ProgressBar';
import TodoFilter from './components/TodoFilter';
import Swal from 'sweetalert2';

// DND KIT IMPORTLARI
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

const translations = {
  tr: {
    header: "To-Do List",
    completedTitle: "Tamamlanan Hedefler",
    emptyWarn: "Lütfen bir hedef giriniz! ⚠️",
    deleteConfirm: "Bu hedefi silmek istediğinize emin misiniz? 🗑️",
    confirmAllDelete: "Tüm hedefleri silmek istediğinize emin misiniz? 🗑️",
    confirmArchive: "Tamamlanan tüm hedefleri arşive taşımak istiyor musunuz? 📦",
    addSuccess: "Hedef başarıyla eklendi! 🚀",
    deleteSuccess: "Hedef başarıyla silindi! 🗑️",
    updateSuccess: "Hedefiniz güncellendi! ✅",
    updateWarn: "Görev içeriği boş bırakılamaz! ⚠️",
    congrats: "Tebrikler hedefinizi tamamladınız! 😊",
    noTodos: "Henüz bir hedefiniz yok. Hadi bir tane ekleyin! ✨",
    footerText: "Designed & Developed by",
    placeholder: "Bir hedef giriniz...",
    buttonText: "HEDEF EKLE",
    all: "Hepsi",
    active: "Yapılacaklar",
    completed: "Tamamlananlar",
    archive: "Arşiv",
    clearAll: "Tümünü Sil",
    clearCompleted: "Tamamlananları Arşivle",
    progressText: "İlerleme Durumu",
    progressCompleted: "Tamamlanan",
    settings: "Ayarlar",
    soundEffects: "Ses Efektleri"
  },
  en: {
    header: "To-Do List",
    completedTitle: "Completed Tasks",
    emptyWarn: "Please enter a task! ⚠️",
    deleteConfirm: "Are you sure you want to delete this task? 🗑️",
    confirmAllDelete: "Are you sure you want to delete all tasks? 🗑️",
    confirmArchive: "Do you want to move all completed tasks to archive? 📦",
    addSuccess: "Task added successfully! 🚀",
    deleteSuccess: "Task deleted successfully! 🗑️",
    updateSuccess: "Task updated successfully! ✅",
    updateWarn: "Task content cannot be empty! ⚠️",
    congrats: "Congratulations, you completed your goal! 😊",
    noTodos: "No tasks yet. Let's add one! ✨",
    footerText: "Designed & Developed by",
    placeholder: "Enter a task...",
    buttonText: "ADD TASK",
    all: "All",
    active: "Active",
    completed: "Completed",
    archive: "Archive",
    clearAll: "Clear All",
    clearCompleted: "Archive Completed",
    progressText: "Progress Status",
    progressCompleted: "Completed",
    settings: "Settings",
    soundEffects: "Sound Effects"
  }
};

function App() {
  const [lang, setLang] = useState(() => {
    const savedLang = localStorage.getItem("lang");
    if (savedLang) return savedLang;
    return navigator.language.startsWith('tr') ? 'tr' : 'en';
  });

  // 2. KONTROL: Dil değiştiğinde localStorage güncelle
  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  const t = translations[lang]; // useMemo yerine direkt state'ten besleniyor
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [filter, setFilter] = useState("all");
  const [showSettings, setShowSettings] = useState(false);

  const [darkMode, setDarkMode] = useState(false);


  // 1. KONTROL: Ses ayarının yüklenmesi
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const savedSound = localStorage.getItem("soundEnabled");
    return savedSound !== null ? JSON.parse(savedSound) : true;
  });

  useEffect(() => {
    if (theme === "dark") document.body.classList.add("dark");
    else document.body.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // 2. KONTROL: Ses tercihinin kaydedilmesi
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

  const playSound = (soundName) => {
    // Ses kontrolü burada devreye giriyor
    if (!isSoundEnabled) return;

    try {
      const audio = new Audio(`/sounds/${soundName}.mp3`);
      audio.volume = 0.3;
      audio.play().catch(error => console.log("Ses çalma engellendi"));
    } catch (e) {
      console.error("Ses dosyası bulunamadı.");
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
    if (newTodo.content.trim() === "") {
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
    setTodos([...todos, todoWithDate]);
    toast.info(t.addSuccess);
  }

  const removeTodo = (todoId) => {
    playSound('delete');
    setTodos(todos.filter((todo) => todo.id !== todoId));
    toast.error(t.deleteSuccess);
  }

  const updateTodo = (newTodo) => {
    if (newTodo.content.trim() === "") { toast.warn(t.updateWarn); return; }
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
          toast.success(t.congrats, { icon: "😊", position: "top-right" });
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
      confirmButtonColor: '#7d5fff',
      cancelButtonColor: '#d33',
      confirmButtonText: lang === 'tr' ? 'Evet, sil!' : 'Yes, delete!',
      cancelButtonText: lang === 'tr' ? 'İptal' : 'Cancel',
      background: theme === 'dark' ? '#1e1e1e' : '#fff',
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
      confirmButtonColor: '#7d5fff',
      confirmButtonText: lang === 'tr' ? 'Evet, arşivle!' : 'Yes, archive!',
      cancelButtonText: lang === 'tr' ? 'Vazgeç' : 'Cancel',
      background: theme === 'dark' ? '#1e1e1e' : '#fff',
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

  // 3. KONTROL: Sistem kontrollerinin render edilmesi
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
            <TodoCreate onCreateTodo={handleAddTodo} t={t} />
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
          />
        </DndContext>

        {filter === "archive" && sortedTodos.length === 0 && (
          <p className="empty-text" style={{ textAlign: 'center', marginTop: '20px', opacity: 0.6 }}>
            {lang === 'tr' ? "Arşiviniz boş. 📭" : "Archive is empty. 📭"}
          </p>
        )}
      </div>

      <ToastContainer theme={theme === "dark" ? "dark" : "light"} limit={3} autoClose={2000} />
      <footer className="footer">
        <p>{t.footerText} <span className="footer-name">Kutay Mutlu</span></p>
      </footer>
    </div>
  )
}

export default App;