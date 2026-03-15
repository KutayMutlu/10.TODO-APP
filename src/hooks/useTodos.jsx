import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
  where,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { toast } from 'react-toastify';
import confetti from 'canvas-confetti';
import { formatFirebaseDate } from '../utils/date';

function fireCompleteConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.75 },
    colors: ['#6c63ff', '#4ade80', '#fbbf24', '#38bdf8'],
  });
}

/** Sıra belgesindeki id listesine göre todo listesini sıralar. Listede olmayan id'ler en sonda (createdAt desc) kalır. */
function sortTodosByOrder(todosArray, orderIds) {
  if (!orderIds || orderIds.length === 0) return todosArray;
  const byId = new Map(todosArray.map((t) => [t.id, t]));
  const ordered = [];
  const seen = new Set();
  for (const id of orderIds) {
    const todo = byId.get(id);
    if (todo) {
      ordered.push(todo);
      seen.add(id);
    }
  }
  const rest = todosArray.filter((t) => !seen.has(t.id));
  return [...ordered, ...rest];
}

export function useTodos({ user, t, playSound }) {
  const [rawTodos, setRawTodos] = useState([]);
  const [orderIds, setOrderIds] = useState([]);

  useEffect(() => {
    if (!user) {
      setRawTodos([]);
      setOrderIds([]);
      return;
    }

    const q = query(
      collection(db, 'todos'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubTodos = onSnapshot(
      q,
      (querySnapshot) => {
        const todosArray = [];
        querySnapshot.forEach((snapshotDoc) => {
          const data = snapshotDoc.data();
          todosArray.push({
            ...data,
            id: snapshotDoc.id,
            displayDate: formatFirebaseDate(data.createdAt),
          });
        });
        setRawTodos(todosArray);
      },
      (error) => {
        console.error('Firestore Hatası:', error);
      }
    );

    return () => unsubTodos();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const orderRef = doc(db, 'users', user.uid, 'prefs', 'order');
    const unsubOrder = onSnapshot(
      orderRef,
      (snap) => {
        setOrderIds(snap.data()?.todoIds ?? []);
      },
      () => setOrderIds([])
    );
    return () => unsubOrder();
  }, [user]);

  const todos = useMemo(
    () => sortTodosByOrder(rawTodos, orderIds),
    [rawTodos, orderIds]
  );

  const saveTodoOrder = useCallback(
    async (orderedIds) => {
      if (!user || !Array.isArray(orderedIds) || orderedIds.length === 0) return;
      setOrderIds(orderedIds);
      try {
        await setDoc(doc(db, 'users', user.uid, 'prefs', 'order'), {
          todoIds: orderedIds,
        });
      } catch (err) {
        console.error('Sıra kaydedilemedi:', err);
      }
    },
    [user]
  );

  const setTodos = useCallback(
    (fnOrItems) => {
      if (typeof fnOrItems === 'function') {
        const next = fnOrItems(todos);
        if (Array.isArray(next) && next.length > 0) {
          saveTodoOrder(next.map((t) => t.id));
        }
      }
    },
    [todos, saveTodoOrder]
  );

  const handleAddTodo = useCallback(
    async (newTodo) => {
      if (!user || !newTodo.content?.trim()) {
        if (!newTodo.content?.trim()) {
          playSound('warn');
          toast.warn(t.emptyWarn);
        }
        return;
      }
      try {
        playSound('add');
        const deadlineTimestamp = newTodo.deadline
          ? Timestamp.fromDate(new Date(newTodo.deadline))
          : null;
        await addDoc(collection(db, 'todos'), {
          content: newTodo.content,
          isCompleted: false,
          isArchived: false,
          userId: user.uid,
          createdAt: serverTimestamp(),
          ...(deadlineTimestamp && { deadline: deadlineTimestamp }),
        });
        toast.info(t.addSuccess);
      } catch {
        toast.error('Hata!');
      }
    },
    [playSound, t, user]
  );

  const removeTodo = useCallback(
    async (id) => {
      const deletedTodo = todos.find((item) => item.id === id);
      if (!deletedTodo) return;
      playSound('delete');
      try {
        await deleteDoc(doc(db, 'todos', id));
        const restorePayload = {
          content: deletedTodo.content,
          isCompleted: deletedTodo.isCompleted ?? false,
          isArchived: deletedTodo.isArchived ?? false,
          userId: user.uid,
          createdAt: serverTimestamp(),
          ...(deletedTodo.deadline != null && { deadline: deletedTodo.deadline }),
          ...(deletedTodo.completedAt != null && { completedAt: deletedTodo.completedAt }),
        };
        const performUndo = () => {
          addDoc(collection(db, 'todos'), restorePayload)
            .then(() => toast.info(t.undoSuccess))
            .catch(() => toast.error('Hata!'));
        };
        toast(
          ({ closeToast }) => (
            <div className="toast-undo-wrap">
              <p className="toast-undo-message">{t.deleteSuccess}</p>
              <button
                type="button"
                className="toast-undo-btn"
                onClick={() => {
                  performUndo();
                  closeToast?.();
                }}
              >
                {t.undo}
              </button>
            </div>
          ),
          {
            type: 'error',
            toastId: `delete-${id}`,
            autoClose: 5000,
          }
        );
      } catch {
        // sessizce yut
      }
    },
    [playSound, t, todos, user]
  );

  const updateTodo = useCallback(
    async (newTodo) => {
      if (!newTodo.content?.trim()) return;
      try {
        const deadlineValue = newTodo.deadline
          ? Timestamp.fromDate(new Date(newTodo.deadline))
          : null;
        await updateDoc(doc(db, 'todos', newTodo.id), {
          content: newTodo.content,
          deadline: deadlineValue,
        });
        toast.success(t.updateSuccess);
      } catch {
        // sessizce yut
      }
    },
    [t]
  );

  const toggleCompleteTodo = useCallback(
    async (id) => {
      const todo = todos.find((tItem) => tItem.id === id);
      if (!todo) return;
      try {
        if (todo.isArchived) {
          playSound('add');
          await updateDoc(doc(db, 'todos', id), {
            isArchived: false,
            isCompleted: false,
            completedAt: null,
          });
          toast.info(t.restoreInfo);
        } else {
          const newCompleted = !todo.isCompleted;
          await updateDoc(doc(db, 'todos', id), {
            isCompleted: newCompleted,
            completedAt: newCompleted ? serverTimestamp() : null,
          });
          if (newCompleted) {
            playSound('complete');
            fireCompleteConfetti();
          }
        }
      } catch {
        // sessizce yut
      }
    },
    [playSound, t, todos]
  );

  const clearAllTodos = useCallback(() => {
    const nonArchived = todos.filter((todo) => !todo.isArchived);
    if (nonArchived.length === 0) {
      playSound('warn');
      toast.warn(t.noDeletableTodos);
      return;
    }
    // Swal kullanımı App seviyesinde kalıyor, burada sadece batch işlemi var
    playSound('delete');
    const batch = writeBatch(db);
    nonArchived.forEach((todo) => batch.delete(doc(db, 'todos', todo.id)));
    batch.commit();
    toast.error(t.deleteSuccess);
  }, [playSound, t, todos]);

  const clearCompletedTodos = useCallback(() => {
    const completedOnes = todos.filter(
      (todo) => todo.isCompleted && !todo.isArchived
    );
    if (completedOnes.length === 0) {
      playSound('warn');
      toast.warn(t.noArchivableSelected);
      return;
    }
    playSound('add');
    const batch = writeBatch(db);
    completedOnes.forEach((todo) =>
      batch.update(doc(db, 'todos', todo.id), { isArchived: true })
    );
    batch.commit();
    toast.info(t.archiveCompletedInfo);
  }, [playSound, t, todos]);

  const archiveSelected = useCallback(
    (ids) => {
      const toArchive = todos.filter(
        (todo) => ids.includes(todo.id) && !todo.isArchived
      );
      if (toArchive.length === 0) return;
      playSound('add');
      const batch = writeBatch(db);
      toArchive.forEach((todo) =>
        batch.update(doc(db, 'todos', todo.id), { isArchived: true })
      );
      batch.commit();
      toast.info(t.archiveCompletedInfo);
    },
    [playSound, t, todos]
  );

  const completeSelected = useCallback(
    (ids) => {
      const toComplete = todos.filter(
        (todo) => ids.includes(todo.id) && !todo.isArchived && !todo.isCompleted
      );
      if (toComplete.length === 0) return;
      playSound('complete');
      fireCompleteConfetti();
      const batch = writeBatch(db);
      toComplete.forEach((todo) =>
        batch.update(doc(db, 'todos', todo.id), { isCompleted: true, completedAt: serverTimestamp() })
      );
      batch.commit();
      toast.success(t.updateSuccess);
    },
    [playSound, t, todos]
  );

  const deleteSelected = useCallback(
    (ids) => {
      const toDelete = todos.filter((todo) => ids.includes(todo.id));
      if (toDelete.length === 0) return;
      playSound('delete');
      const batch = writeBatch(db);
      toDelete.forEach((todo) => batch.delete(doc(db, 'todos', todo.id)));
      batch.commit();
      toast.error(t.deleteSuccess);
    },
    [playSound, t, todos]
  );

  const activeTodosOnly = useMemo(
    () => todos.filter((tItem) => !tItem.isArchived),
    [todos]
  );

  const progressPercentage = useMemo(() => {
    if (activeTodosOnly.length === 0) return 0;
    const completedCount = activeTodosOnly.filter((tItem) => tItem.isCompleted)
      .length;
    return (completedCount / activeTodosOnly.length) * 100;
  }, [activeTodosOnly]);

  return {
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
  };
}
