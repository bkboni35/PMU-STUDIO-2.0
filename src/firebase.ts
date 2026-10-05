import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore,
  FirestoreSettings
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, Auth, signInWithPopup, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Singleton pattern for Firebase initialization
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  (db as any).type = 'firestore';
  auth = getAuth(app);
} catch (error) {
  console.error("Firebase initialization fatal error:", error);
  // Fallback to a mock-like state if initialization fails completely to prevent app crash
  app = {} as any;
  db = {} as any;
  auth = {
    currentUser: null,
    onAuthStateChanged: (cb: any) => { cb(null); return () => {}; }
  } as any;
}

const googleProvider = new GoogleAuthProvider();
// Scopes standards pour authentification Google / Gmail
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Caching du token d'accès OAuth en mémoire (Sécurisé)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export { app, db, auth, googleProvider };

export async function signInWithGoogle() {
  if (!auth) return null;
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      console.log("OAuth Access Token récupéré et mis en cache.");
    }
    
    return result.user;
  } catch (error: any) {
    console.error("Error signing in with Google:", error);
    // Erreurs courantes de popup / iframe / domaine
    if (error?.code === 'auth/popup-blocked') {
      throw new Error("La fenêtre pop-up Google a été bloquée par votre navigateur. Autorisez les pop-ups ou utilisez la connexion directe par e-mail.");
    } else if (error?.code === 'auth/popup-closed-by-user') {
      throw new Error("La fenêtre de connexion Google a été fermée avant la fin de l'authentification.");
    } else if (error?.code === 'auth/unauthorized-domain') {
      throw new Error("Domaine non autorisé pour l'authentification Firebase. Vous pouvez vous connecter directement avec votre adresse Gmail.");
    } else if (error?.code === 'auth/cancelled-popup-request') {
      throw new Error("Une tentative de connexion est déjà en cours.");
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
}

export async function getAccessToken(): Promise<string | null> {
  return cachedAccessToken;
}

export async function logOutFirebase() {
  if (!auth) return;
  try {
    await signOut(auth);
    cachedAccessToken = null;
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

export async function ensureFirebaseAuth(): Promise<void> {
  // Authentication is now optional and managed via standard Google Login
  return Promise.resolve();
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    uid: string | null;
    isAnonymous: boolean;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      uid: auth.currentUser?.uid || null,
      isAnonymous: auth.currentUser?.isAnonymous || false,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't throw here to avoid crashing the UI, but we log it
  return errInfo;
}

/**
 * Utility to test the Firestore connection
 */
export async function testFirestoreConnection() {
  if (!db || !(db as any).type) return false;
  try {
    const testDoc = doc(db, '_connection_test_', 'ping');
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
    await Promise.race([getDocFromServer(testDoc), timeout]);
    console.log("Firestore connection successful");
    return true;
  } catch (error: any) {
    console.warn("Firestore connection check notice:", error?.message || error);
    return false;
  }
}
