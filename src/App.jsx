import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react'
import './App.css'
import { ToastContainer, toast } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
const TodoCreate = lazy(() => import('./components/TodoCreate'));
const TodoList = lazy(() => import('./components/TodoList'));
const ProgressBar = lazy(() => import('./components/ProgressBar'));
const TodoFilter = lazy(() => import('./components/TodoFilter'));
import Swal from 'sweetalert2';
import { translations } from './constants';
import SystemControls from './components/SystemControls';
import AuthChoiceCard from './components/AuthChoiceCard';

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
  const [initialAuthChecked, setInitialAuthChecked] = useState(false);

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
      if (!isMounted) return;
      setUser(currentUser);
      setAuthLoading(false); // Kullanıcıyı gördüğün an (veya null ise) içeri al
      setInitialAuthChecked(true); // İlk auth kontrolü tamam
    });

    // Redirect sonucunu sessizce arka planda hallet
    getRedirectResult(auth).then((res) => {
      if (isMounted && res?.user) {
        toast.success(t.authSuccess);
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
    } catch (error) { toast.error(t.loginError); }
  };

  const handleGuestLogin = async () => {
    if (authLoading) return;
    try {
      setAuthLoading(true);
      let currentUser = auth.currentUser;
      if (!currentUser) {
        const result = await signInAnonymously(auth);
        currentUser = result.user;
        toast.info(t.guestStarted);
      } else {
        toast.info(t.guestRestored);
      }
      setUser(currentUser);
      setTimeout(() => {
        toast.warning(t.guestUpgradeWarning, { autoClose: 5000, position: "top-center", className: 'wide-toast' });
      }, 500);
    } finally { setAuthLoading(false); }
  };

  const handleUpgradeAccount = async () => {
    if (authLoading) return;
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
      toast.success(t.accountLinked);
    } catch (error) {
      if (error.code === 'auth/credential-already-in-use') {
        Swal.fire({ title: t.accountExistsTitle, text: t.accountExistsText, icon: 'warning' });
      }
    } finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    if (!user) return;
    setShowSettings(false);
    if (!user.isAnonymous) {
      await signOut(auth);
      setUser(null);
      toast.info(t.loggedOut);
      return;
    }
    Swal.fire({
      title: t.logoutTitle,
      text: t.logoutQuestion,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: t.logoutConfirmDelete,
      cancelButtonText: t.logoutCancelKeep,
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
          toast.error(t.dataCleared);
        } catch (e) { console.error(e); }
      } else if (swalResult.dismiss === Swal.DismissReason.cancel) {
        setUser(null);
        toast.info(t.dataSaved);
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
      confirmButtonText: t.confirmDeleteYes,
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
    toast.info(t.archiveCompletedInfo);
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

  const filteredTodos = useMemo(() => {
    return todos.filter(todo => {
      if (filter === "archive") return todo.isArchived;
      if (todo.isArchived) return false;
      if (filter === "active") return !todo.isCompleted;
      if (filter === "completed") return todo.isCompleted;
      return true;
    });
  }, [todos, filter]);

  const sortedTodos = useMemo(
    () => [...filteredTodos].sort((a, b) => (a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1)),
    [filteredTodos]
  );

  const activeTodosOnly = useMemo(
    () => todos.filter(t => !t.isArchived),
    [todos]
  );

  const progressPercentage = useMemo(() => {
    if (activeTodosOnly.length === 0) return 0;
    const completedCount = activeTodosOnly.filter(t => t.isCompleted).length;
    return (completedCount / activeTodosOnly.length) * 100;
  }, [activeTodosOnly]);

  // Uygulama ilk açılırken (Firebase auth durumu henüz belli değilken) tam ekran yükleme göster
  if (!initialAuthChecked) return <div className="loading-screen">{t.loading}</div>;

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
        {!user ? (
          <AuthChoiceCard
            lang={lang}
            t={t}
            onLogin={handleLogin}
            onGuestLogin={handleGuestLogin}
            authLoading={authLoading}
          />
        ) : (
          <>
            <Suspense fallback={null}>
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
            </Suspense>
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