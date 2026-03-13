import { useState, useEffect, useCallback } from 'react';
import { auth, provider, db } from '../firebase';
import {
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  getRedirectResult,
  signInAnonymously,
  linkWithPopup,
} from 'firebase/auth';
import { writeBatch, doc } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';

export function useAuth({ t, lang, onAccountLinked }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [initialAuthChecked, setInitialAuthChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!isMounted) return;
      setUser(currentUser);
      setAuthLoading(false);
      setInitialAuthChecked(true);
    });

    getRedirectResult(auth)
      .then((res) => {
        if (isMounted && res?.user) {
          toast.success(t.authSuccess);
        }
      })
      .catch(console.error);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [t, lang]);

  const handleLogin = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) setUser(result.user);
    } catch {
      toast.error(t.loginError);
    }
  }, [t]);

  const handleGuestLogin = useCallback(async () => {
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
        toast.warning(t.guestUpgradeWarning, {
          autoClose: 5000,
          position: 'top-center',
          className: 'wide-toast',
        });
      }, 500);
    } finally {
      setAuthLoading(false);
    }
  }, [authLoading, t]);

  const handleUpgradeAccount = useCallback(async () => {
    if (authLoading) return;
    try {
      setAuthLoading(true);
      const result = await linkWithPopup(auth.currentUser, provider);
      const upgradedUser = result.user;
      const googleProfile = upgradedUser.providerData.find(
        (p) => p.providerId === 'google.com'
      );

      setUser({
        ...upgradedUser,
        photoURL: googleProfile?.photoURL || upgradedUser.photoURL,
        displayName: googleProfile?.displayName || upgradedUser.displayName,
        isAnonymous: false,
      });

      if (onAccountLinked) {
        onAccountLinked();
      }

      toast.success(t.accountLinked);
    } catch (error) {
      if (error.code === 'auth/credential-already-in-use') {
        Swal.fire({
          title: t.accountExistsTitle,
          text: t.accountExistsText,
          icon: 'warning',
        });
      }
    } finally {
      setAuthLoading(false);
    }
  }, [authLoading, onAccountLinked, t]);

  const handleLogout = useCallback(
    async (todos) => {
      if (!user) return;

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
            todos.forEach((todo) => batch.delete(doc(db, 'todos', todo.id)));
            await batch.commit();
            await signOut(auth);
            setUser(null);
            toast.error(t.dataCleared);
          } catch (e) {
            console.error(e);
          }
        } else if (swalResult.dismiss === Swal.DismissReason.cancel) {
          setUser(null);
          toast.info(t.dataSaved);
        }
      });
    },
    [t, user]
  );

  return {
    user,
    authLoading,
    initialAuthChecked,
    handleLogin,
    handleGuestLogin,
    handleUpgradeAccount,
    handleLogout,
  };
}

