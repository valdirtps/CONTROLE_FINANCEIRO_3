import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import config from "../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || config.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || config.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || config.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || config.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || config.appId,
};

// Prioritize config.firestoreDatabaseId and filter out NEXT_PUBLIC_FIREBASE_DATABASE_ID if it looks like an App ID
const databaseId = 
  config.firestoreDatabaseId || 
  (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID && !process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID.includes(":") 
    ? process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID 
    : "(default)");

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use experimentalForceLongPolling and disable fetch streams to ensure connectivity in the preview iframe
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    experimentalAutoDetectLongPolling: true,
  }, databaseId);
} catch (e) {
  dbInstance = getFirestore(app, databaseId);
}

export const db = dbInstance;
export const auth = getAuth(app);
