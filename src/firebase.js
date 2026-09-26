import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Supply your own project's web configuration; no shared backend is bundled.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig)
  .every(value => typeof value === 'string' && value.trim().length > 0);

// Without a backend, rounds and certificate downloads still work locally.
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const database = app ? getDatabase(app) : null;
export const auth = app ? getAuth(app) : null;
