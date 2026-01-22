// Shared Firebase Configuration for X-Sneaker
// This config is used across all modules to ensure consistency

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// Firebase Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBk41iuorgnQF0rbCr-BmlVAfMgVeIRVU8",
  authDomain: "x-sneaker.firebaseapp.com",
  databaseURL: "https://x-sneaker-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "x-sneaker",
  storageBucket: "x-sneaker.firebasestorage.app",
  messagingSenderId: "577198860451",
  appId: "1:577198860451:web:3cf88ce9496c70e3847716",
  measurementId: "G-D43H8ELM22"
};

// Cloudinary Configuration (from .env)
export const cloudinaryConfig = {
  cloudName: 'dvcebine7',
  uploadPreset: 'x-sneaker-upload',
  folder: 'Upload-Preset'
};

// Initialize Firebase App (singleton pattern)
let app;
let auth;
let database;

export function getFirebaseApp() {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth() {
  if (!auth) {
    const firebaseApp = getFirebaseApp();
    auth = getAuth(firebaseApp);
  }
  return auth;
}

export function getFirebaseDatabase() {
  if (!database) {
    const firebaseApp = getFirebaseApp();
    database = getDatabase(firebaseApp);
  }
  return database;
}

// Export initialized instances for convenience
export const initFirebase = () => {
  return {
    app: getFirebaseApp(),
    auth: getFirebaseAuth(),
    database: getFirebaseDatabase()
  };
};

console.log('✅ Firebase config module loaded');
