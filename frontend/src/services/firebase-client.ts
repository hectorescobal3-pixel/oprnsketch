import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { Firestore, doc, getFirestore, setDoc } from 'firebase/firestore';

export interface FirebaseSessionUser {
  uid: string;
  email: string;
  name: string;
  idToken?: string;
}

export function getFirebaseWebConfig() {
  const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
  const apiKey = env.VITE_FIREBASE_API_KEY;
  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) return null;
  return {
    apiKey,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: env.VITE_FIREBASE_APP_ID || '',
  };
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;
let lastIdToken: string | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (cachedApp) return cachedApp;
  const cfg = getFirebaseWebConfig();
  if (!cfg) return null;
  cachedApp = getApps().length > 0 ? getApps()[0] : initializeApp(cfg);
  return cachedApp;
}

export function getFirebaseAuthClient(): Auth | null {
  if (cachedAuth) return cachedAuth;
  const app = getFirebaseApp();
  if (!app) return null;
  cachedAuth = getAuth(app);
  onAuthStateChanged(cachedAuth, async (user) => {
    if (user) {
      try {
        lastIdToken = await user.getIdToken();
      } catch {
        lastIdToken = null;
      }
    } else {
      lastIdToken = null;
    }
  });
  return cachedAuth;
}

export function getFirebaseFirestoreDb(): Firestore | null {
  if (cachedDb) return cachedDb;
  const app = getFirebaseApp();
  if (!app) return null;
  cachedDb = getFirestore(app);
  return cachedDb;
}

export async function getCurrentFirebaseIdToken(): Promise<string | null> {
  const auth = getFirebaseAuthClient();
  if (auth?.currentUser) {
    try {
      lastIdToken = await auth.currentUser.getIdToken();
      return lastIdToken;
    } catch {
      return lastIdToken;
    }
  }
  return lastIdToken;
}

export function subscribeFirebaseAuthState(
  onUser: (user: FirebaseSessionUser | null) => void
): () => void {
  const auth = getFirebaseAuthClient();
  if (!auth) return () => {};
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      lastIdToken = null;
      onUser(null);
      return;
    }
    try {
      const idToken = await user.getIdToken();
      lastIdToken = idToken;
      onUser({
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || user.email?.split('@')[0] || 'Usuário',
        idToken,
      });
    } catch {
      onUser({
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || user.email?.split('@')[0] || 'Usuário',
      });
    }
  });
}

export async function signInWithGoogleFirebase(): Promise<FirebaseSessionUser> {
  const auth = getFirebaseAuthClient();
  if (!auth) {
    throw new Error('FIREBASE_NOT_CONFIGURED');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  const idToken = await cred.user.getIdToken();
  lastIdToken = idToken;
  return {
    uid: cred.user.uid,
    email: cred.user.email || '',
    name: cred.user.displayName || cred.user.email?.split('@')[0] || 'Usuário',
    idToken,
  };
}

export async function signInWithEmailFirebase(
  email: string,
  password: string
): Promise<FirebaseSessionUser> {
  const auth = getFirebaseAuthClient();
  if (!auth) {
    throw new Error('FIREBASE_NOT_CONFIGURED');
  }
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  const idToken = await cred.user.getIdToken();
  lastIdToken = idToken;
  return {
    uid: cred.user.uid,
    email: cred.user.email || email.trim(),
    name: cred.user.displayName || email.trim().split('@')[0],
    idToken,
  };
}

export async function registerWithEmailFirebase(
  name: string,
  email: string,
  password: string
): Promise<FirebaseSessionUser> {
  const auth = getFirebaseAuthClient();
  if (!auth) {
    throw new Error('FIREBASE_NOT_CONFIGURED');
  }
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name.trim()) {
    await updateProfile(cred.user, { displayName: name.trim() });
  }
  const idToken = await cred.user.getIdToken();
  lastIdToken = idToken;
  return {
    uid: cred.user.uid,
    email: cred.user.email || email.trim(),
    name: name.trim() || cred.user.email?.split('@')[0] || 'Usuário',
    idToken,
  };
}

export async function sendPasswordResetFirebase(email: string): Promise<void> {
  const auth = getFirebaseAuthClient();
  if (!auth) {
    throw new Error('FIREBASE_NOT_CONFIGURED');
  }
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutFirebase(): Promise<void> {
  lastIdToken = null;
  const auth = getFirebaseAuthClient();
  if (auth) {
    await signOut(auth);
  }
}

export async function syncWorkspaceSummaryToFirestore(
  uid: string,
  scope: 'PERSONAL' | 'CORPORATE',
  payload: Record<string, unknown>
): Promise<void> {
  const db = getFirebaseFirestoreDb();
  if (!db || !uid) return;
  try {
    await setDoc(
      doc(db, 'users', uid, 'workspaces', scope.toLowerCase()),
      {
        ...payload,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch {
    // Regras de segurança ou modo offline tratados silenciosamente
  }
}
