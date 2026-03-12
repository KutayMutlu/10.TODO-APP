import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCK1aq2GaPA2X7rEBSWRgk9IbXmWJn66Dw",
    authDomain: "to-do-app-km.firebaseapp.com",
    projectId: "to-do-app-km",
    storageBucket: "to-do-app-km.appspot.com",
    messagingSenderId: "1017407276608",
    appId: "1:1017407276608:web:10545b99d298a7b218c1a5"
};

const app = initializeApp(firebaseConfig);

// Bazı mobil tarayıcılarda (iOS Safari, Samsung Internet vb.)
// WebSocket bağlantıları sorun çıkarabildiği için bu cihazlarda
// long polling'e geçiyoruz. Diğerlerinde varsayılan (daha hızlı) bağlantı kullanılır.
let firestoreSettings = {};

if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent || "";
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    const isAndroid = /Android/.test(ua);
    const isSamsungBrowser = /SamsungBrowser/.test(ua);

    if ((isIOS && isSafari) || isSamsungBrowser || isAndroid) {
        firestoreSettings = {
            experimentalForceLongPolling: true,
            useFetchStreams: false,
        };
    }
}

export const db = initializeFirestore(app, firestoreSettings);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();