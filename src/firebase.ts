import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyC4RK6aUvQXXVRzbazlFXbcAZa704bcUyI",
  authDomain: "rtofficial2026.firebaseapp.com",
  projectId: "rtofficial2026",
  storageBucket: "rtofficial2026.firebasestorage.app",
  messagingSenderId: "963136259655",
  appId: "1:963136259655:web:774e0281bf465c5fe75362",
  measurementId: "G-VGWMNCKWKE"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Analytics conditionally (only in supported browser environments)
export const analyticsPromise = isSupported().then((supported) => {
  return supported ? getAnalytics(app) : null;
}).catch(() => null);
