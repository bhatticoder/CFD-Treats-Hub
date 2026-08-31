import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let app: App | null = null;

function getAdminApp(): App {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      app = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      // Pass projectId to prevent Admin SDK from hanging on metadata server requests in CLI emulator
      // Pass serviceAccountId to allow createSessionCookie to sign tokens using the App Engine service account
      app = initializeApp({ 
        projectId: projectId || "cfd-treats-hub",
        serviceAccountId: "cfd-treats-hub@appspot.gserviceaccount.com"
      });
    }
  } else {
    app = getApps()[0];
  }
  return app;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

// Keep backward-compatible named exports as lazy getters
export const adminAuth = new Proxy({} as Auth, {
  get(_, prop) {
    const auth = getAdminAuth();
    const value = (auth as any)[prop];
    if (typeof value === 'function') {
      return value.bind(auth);
    }
    return value;
  },
});

export const adminDb = new Proxy({} as Firestore, {
  get(_, prop) {
    const db = getAdminDb();
    const value = (db as any)[prop];
    if (typeof value === 'function') {
      return value.bind(db);
    }
    return value;
  },
});
