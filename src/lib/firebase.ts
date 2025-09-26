// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCmj_y8i71yqFMCBR0OD53pDgnf4_Otvyc",
  authDomain: "js-glow.firebaseapp.com",
  projectId: "js-glow",
  storageBucket: "js-glow.appspot.com",
  messagingSenderId: "484339923512",
  appId: "1:484339923512:web:7110db22ea8898a24984cd"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
