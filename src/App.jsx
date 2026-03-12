import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import TodoCreate from './components/TodoCreate'
import TodoList from './components/TodoList'
import { ToastContainer, toast } from 'react-toastify';
import { FaSun, FaMoon, FaSignOutAlt, FaGoogle } from "react-icons/fa";
import { IoMdSettings } from "react-icons/io";
import { motion, AnimatePresence } from 'framer-motion';
import "react-toastify/dist/ReactToastify.css";
import ProgressBar from './components/ProgressBar';
import TodoFilter from './components/TodoFilter';
import Swal from 'sweetalert2';
import { translations } from './constants';
import { FcGoogle } from "react-icons/fc";

// --- FIREBASE IMPORTLARI ---
import { auth, provider, db } from "./firebase";
import {
  onAuthStateChanged, signOut, signInWithPopup, getRedirectResult, signInAnonymously, linkWithPopup
} from "firebase/auth";
import {
  collection, addDoc, deleteDoc, doc, updateDoc,
  onSnapshot, query, orderBy, serverTimestamp, writeBatch, where
} from "firebase/firestore";

// DND KIT
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, TouchSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

// --- TARİH FORMATLAYICI ---
const formatFirebaseDate = (date) => {
  if (!date) return "---";
  try {
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleString();
    const d = new Date(date);
    return isNaN(d.getTime()) ? "---" : d.toLocaleString();
  } catch (e) { return "---"; }
};

function App() {
  // --- STATE TANIMLAMALARI ---
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || (navigator.language.startsWith('tr') ? 'tr' : 'en'));
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [filter, setFilter] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const savedSound = localStorage.getItem("soundEnabled");
    return savedSound !== null ? JSON.parse(savedSound) : true;
  });
  const [todos, setTodos] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);

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

  // --- KRİTİK: ASLA TAKILMAZ VE OPTİMİZE AUTH (V6 - HYBRID) ---
  useEffect(() => {
    let isMounted = true;

    // En hızlı yakalama: onAuthStateChanged
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (isMounted) {
        setUser(currentUser);
        setAuthLoading(false); // Kullanıcıyı gördüğün an (veya null ise) içeri al
      }
    });

    // Redirect sonucunu sessizce arka planda hallet
    getRedirectResult(auth).then((res) => {
      if (isMounted && res?.user) {
        toast.success(lang === 'tr' ? "Giriş başarılı!" : "Login successful!");
      }
    }).catch(console.error);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [lang]);

  // --- VERİ TABANI (FIRESTORE) BAĞLANTISI ---
  useEffect(() => {
    if (!user) { setTodos([]); return; }
    const q = query(collection(db, "todos"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const todosArray = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        todosArray.push({ ...data, id: doc.id, displayDate: formatFirebaseDate(data.createdAt) });
      });
      setTodos(todosArray);
    }, (error) => { console.error("Firestore Hatası:", error); });
    return () => unsubscribe();
  }, [user]);

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

  // --- EVENT HANDLERLAR ---
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) setUser(result.user);
    } catch (error) { toast.error("Giriş başarısız!"); }
  };

  const handleGuestLogin = async () => {
    try {
      setAuthLoading(true);
      let currentUser = auth.currentUser;
      if (!currentUser) {
        const result = await signInAnonymously(auth);
        currentUser = result.user;
        toast.info(lang === 'tr' ? "Misafir oturumu açıldı." : "Guest session started.");
      } else {
        toast.info(lang === 'tr' ? "Eski oturumunuz yüklendi." : "Previous session restored.");
      }
      setUser(currentUser);
      setTimeout(() => {
        toast.warning(lang === 'tr' ? "Hedeflerinizin kaybolmaması için lütfen bir hesap bağlayın." : "Please link an account to prevent data loss.", { autoClose: 5000, position: "top-center", className: 'wide-toast' });
      }, 1000);
    } finally { setAuthLoading(false); }
  };

  const handleUpgradeAccount = async () => {
    try {
      setAuthLoading(true);
      const result = await linkWithPopup(auth.currentUser, provider);
      const upgradedUser = result.user;
      const googleProfile = upgradedUser.providerData.find(p => p.providerId === "google.com");
      setUser({
        ...upgradedUser,
        photoURL: googleProfile?.photoURL || upgradedUser.photoURL,
        displayName: googleProfile?.displayName || upgradedUser.displayName,
        isAnonymous: false
      });
      setShowSettings(false);
      toast.success(lang === 'tr' ? "Hesabınız bağlandı!" : "Account linked!");
    } catch (error) {
      if (error.code === 'auth/credential-already-in-use') {
        Swal.fire({ title: lang === 'tr' ? 'Hesap Zaten Var' : 'Account Already Exists', text: lang === 'tr' ? "Bu Google hesabı zaten başka bir kullanıcıya bağlı." : "This account is already linked.", icon: 'warning' });
      }
    } finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    if (!user) return;
    setShowSettings(false);
    if (!user.isAnonymous) {
      await signOut(auth);
      setUser(null);
      toast.info(lang === 'tr' ? "Çıkış yapıldı." : "Logged out.");
      return;
    }
    Swal.fire({
      title: lang === 'tr' ? 'Oturumu Kapat' : 'Logout',
      text: lang === 'tr' ? "Verileriniz silinsin mi?" : "Delete data?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: lang === 'tr' ? 'Hepsini Sil' : 'Delete All',
      cancelButtonText: lang === 'tr' ? 'Verilerimi Sakla' : 'Keep My Data',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c63ff',
    }).then(async (swalResult) => {
      if (swalResult.isConfirmed) {
        try {
          const batch = writeBatch(db);
          todos.forEach((todo) => batch.delete(doc(db, "todos", todo.id)));
          await batch.commit();
          await signOut(auth);
          setUser(null);
          toast.error(lang === 'tr' ? "Veriler temizlendi." : "Data cleared.");
        } catch (e) { console.error(e); }
      } else if (swalResult.dismiss === Swal.DismissReason.cancel) {
        setUser(null);
        toast.info(lang === 'tr' ? "Verileriniz saklandı." : "Data saved.");
      }
    });
  };

  const handleAddTodo = async (newTodo) => {
    if (!user || !newTodo.content?.trim()) {
      if (!newTodo.content?.trim()) { playSound('warn'); toast.warn(t.emptyWarn); }
      return;
    }
    try {
      playSound('add');
      await addDoc(collection(db, "todos"), {
        content: newTodo.content,
        isCompleted: false,
        isArchived: false,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      toast.info(t.addSuccess);
    } catch (e) { toast.error("Hata!"); }
  };

  const removeTodo = async (id) => {
    playSound('delete');
    try { await deleteDoc(doc(db, "todos", id)); toast.error(t.deleteSuccess); } catch (e) { }
  };

  const updateTodo = async (newTodo) => {
    if (!newTodo.content?.trim()) return;
    try {
      await updateDoc(doc(db, "todos", newTodo.id), { content: newTodo.content });
      toast.success(t.updateSuccess);
    } catch (e) { }
  };

  const toggleCompleteTodo = async (id) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    try {
      if (todo.isArchived) {
        playSound('add');
        await updateDoc(doc(db, "todos", id), { isArchived: false, isCompleted: false });
      } else {
        await updateDoc(doc(db, "todos", id), { isCompleted: !todo.isCompleted });
        if (!todo.isCompleted) playSound('add');
      }
    } catch (e) { }
  };

  const clearAllTodos = () => {
    if (todos.length === 0) return;
    Swal.fire({
      title: t.confirmAllDelete,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: lang === 'tr' ? 'Evet, sil!' : 'Yes, delete!',
    }).then(async (result) => {
      if (result.isConfirmed) {
        const batch = writeBatch(db);
        todos.forEach((todo) => batch.delete(doc(db, "todos", todo.id)));
        await batch.commit();
        toast.error(t.deleteSuccess);
      }
    });
  };

  const clearCompletedTodos = () => {
    const completedOnes = todos.filter(todo => todo.isCompleted && !todo.isArchived);
    if (completedOnes.length === 0) return;
    const batch = writeBatch(db);
    completedOnes.forEach(todo => batch.update(doc(db, "todos", todo.id), { isArchived: true }));
    batch.commit();
    toast.info(lang === 'tr' ? "Tamamlananlar arşivlendi." : "Completed archived.");
  };

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

  const filteredTodos = todos.filter(todo => {
    if (filter === "archive") return todo.isArchived;
    if (todo.isArchived) return false;
    if (filter === "active") return !todo.isCompleted;
    if (filter === "completed") return todo.isCompleted;
    return true;
  });

  const sortedTodos = [...filteredTodos].sort((a, b) => (a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1));
  const activeTodosOnly = todos.filter(t => !t.isArchived);
  const progressPercentage = activeTodosOnly.length > 0 ? (activeTodosOnly.filter(t => t.isCompleted).length / activeTodosOnly.length) * 100 : 0;

  if (authLoading) return <div className="loading-screen">Lütfen bekleyin...</div>;

  return (
    <div className='App'>
      <div className="system-controls">
        {user && (
          <div className="user-profile-mini">
            <img
              src={user.providerData?.[0]?.photoURL || user.photoURL || `https://api.dicebear.com/8.x/notionists-neutral/svg?seed=${user.uid}`}
              alt="Avatar"
              className={`user-avatar-small ${user.isAnonymous ? 'is-guest' : ''}`}
              onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=User&background=6c63ff&color=fff` }}
            />
          </div>
        )}

        {/* 3. KONTROL: SETTINGS CONTAINER REF ATAMASI */}
        <div className="settings-container" ref={settingsRef}>
          <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
            <IoMdSettings />
          </button>
          <AnimatePresence>
            {showSettings && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="settings-menu">
                <div className="setting-item">
                  <span>Language</span>
                  <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value)}>
                    <option value="tr">Türkçe 🇹🇷</option>
                    <option value="en">English 🇺🇸</option>
                  </select>
                </div>
                <div className="setting-item">
                  <span>{t.soundEffects}</span>
                  <div className={`switch ${isSoundEnabled ? 'on' : 'off'}`} onClick={() => setIsSoundEnabled(!isSoundEnabled)}>
                    <div className="switch-handle" />
                  </div>
                </div>

                {user && (
                  <>
                    {user.isAnonymous && (
                      <div className="setting-item action" onClick={handleUpgradeAccount}>
                        <span>{lang === 'tr' ? 'Hesabı Google\'a Bağla' : 'Link to Google'}</span>
                        <FaGoogle className="icon-blue" />
                      </div>
                    )}
                    <div className="setting-item action logout" onClick={handleLogout}>
                      <span>{lang === 'tr' ? 'Oturumu Kapat' : 'Logout'}</span>
                      <FaSignOutAlt />
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button className="theme-toggle-btn" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
          {theme === "light" ? <FaMoon /> : <FaSun />}
        </button>
      </div>

      <h1 className='todo-header'>{filter === "archive" ? (lang === 'tr' ? "Arşiv" : "Archive") : t.header}</h1>

      <div className='main'>
        {!user ? (
          <div className="login-container">
            <div className="login-card-mini">
              <p className="login-text">{lang === 'tr' ? "Hedeflerinize ulaşmak için bir yöntem seçin" : "Choose a method"}</p>
              <div className="login-options">
                <div className="login-option-item">
                  <button onClick={handleLogin} className="login-icon-btn google"><FcGoogle /></button>
                  <span>Google</span>
                </div>
                <div className="login-option-item">
                  <button className="login-icon-btn guest" onClick={handleGuestLogin}><div className="guest-icon-placeholder">👤</div></button>
                  <span>{lang === 'tr' ? "Misafir" : "Guest"}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {filter !== "archive" && (
              <>
                <TodoCreate onCreateTodo={handleAddTodo} t={t} playSound={playSound} />
                {activeTodosOnly.length > 0 && <ProgressBar percentage={progressPercentage} t={t} />}
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
                setTodos={setTodos}
                onRemoveTodo={removeTodo}
                onUpdateTodo={updateTodo}
                onToggleComplete={toggleCompleteTodo}
                t={t}
                lang={lang}
                playSound={playSound}
              />
            </DndContext>
          </>
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