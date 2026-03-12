import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore"; // Değişiklik burada

const firebaseConfig = {
    apiKey: "AIzaSyCK1aq2GaPA2X7rEBSWRgk9IbXmWJn66Dw",
    authDomain: "to-do-app-km.firebaseapp.com",
    projectId: "to-do-app-km",
    storageBucket: "to-do-app-km.appspot.com",
    messagingSenderId: "1017407276608",
    appId: "1:1017407276608:web:10545b99d298a7b218c1a5"
};

const app = initializeApp(firebaseConfig);

// Wi-Fi takılmalarını önleyen kritik yapılandırma
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true, // WebSocket yerine standart HTTP kullanır
    useFetchStreams: false,            // Bazı tarayıcılarda hız artışı sağlar
});

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();