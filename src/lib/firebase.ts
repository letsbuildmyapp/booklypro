import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY ?? 'demo-api-key',
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN ?? 'booklypro-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FB_PROJECT_ID ?? 'demo-booklypro',
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET ?? 'booklypro-demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FB_MSG_SENDER_ID ?? '0',
  appId: import.meta.env.VITE_FB_APP_ID ?? 'demo',
};

const useEmulator = import.meta.env.VITE_USE_EMULATOR !== 'false';

export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const functions: Functions = getFunctions(app);

let connected = false;
if (useEmulator && !connected && typeof window !== 'undefined') {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    connected = true;
    console.info('[BooklyPro] Connected to Firebase emulators');
  } catch (e) {
    console.warn('[BooklyPro] Could not connect to emulators', e);
  }
}
