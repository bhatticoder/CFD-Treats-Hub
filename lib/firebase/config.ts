import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "cfd-treats-hub.firebaseapp.com",
  projectId: "cfd-treats-hub",
  storageBucket: "cfd-treats-hub.firebasestorage.app",
  messagingSenderId: "42357304413",
};

// Initialize Firebase only once (prevents duplicate app errors in Next.js)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const firebaseAuth = getAuth(app);
export const firebaseDb = getFirestore(app);
export const firebaseStorage = getStorage(app);
export default app;
