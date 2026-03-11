import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase Console > Project Settings > General kısmındaki bilgileri buraya yapıştır
const firebaseConfig = {
    apiKey: "AIzaSyCK1aq2GaPA2X7rEBSWRgk9IbXmWJn66Dw", // Burayı kendi anahtarınla doldur
    authDomain: "to-do-app-km.firebaseapp.com",
    projectId: "to-do-app-km",
    storageBucket: "to-do-app-km.appspot.com",
    messagingSenderId: "1017407276608",
    appId: "1:1017407276608:web:10545b99d298a7b218c1a5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);