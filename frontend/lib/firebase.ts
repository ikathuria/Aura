import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const hasConfig = Object.values(firebaseConfig).every(Boolean);

const app = hasConfig
  ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig))
  : null;

export const firebaseReady = Boolean(app);

export const auth = app ? getAuth(app) : null;
const useLongPolling = process.env.NEXT_PUBLIC_FIRESTORE_LONG_POLLING === 'true';
export const db = app
  ? useLongPolling
    ? initializeFirestore(app, { experimentalForceLongPolling: true })
    : getFirestore(app)
  : null;
export const storage = app ? getStorage(app) : null;
export const functions = app ? getFunctions(app) : null;

if (functions && process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR) {
  const [host, portString] = process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR.split(':');
  const port = Number(portString || 5001);
  connectFunctionsEmulator(functions, host, port);
}
