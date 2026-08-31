"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();

const firebaseConfig = {
  apiKey: apiKey || "",
  authDomain: "cfd-treats-hub.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || "cfd-treats-hub",
  storageBucket: "cfd-treats-hub.firebasestorage.app",
  messagingSenderId: "42357304413",
};

const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

function requireApiKey() {
  if (!apiKey) {
    throw new Error(
      "Firebase client configuration is incomplete: NEXT_PUBLIC_FIREBASE_API_KEY is not set."
    );
  }
}

export function getFirebaseAuth(): Auth {
  requireApiKey();
  return (auth ??= getAuth(app));
}

export function getFirebaseDb(): Firestore {
  return (db ??= getFirestore(app));
}

export function getFirebaseStorage(): FirebaseStorage {
  return (storage ??= getStorage(app));
}

export const firebaseAuth = new Proxy({} as Auth, {
  get(_target, property) {
    const service = getFirebaseAuth();
    const value = Reflect.get(service, property);

    return typeof value === "function" ? value.bind(service) : value;
  },
});

export const firebaseDb = new Proxy({} as Firestore, {
  get(_target, property) {
    return Reflect.get(getFirebaseDb(), property);
  },
});

export const firebaseStorage = new Proxy({} as FirebaseStorage, {
  get(_target, property) {
    return Reflect.get(getFirebaseStorage(), property);
  },
});

export default app;