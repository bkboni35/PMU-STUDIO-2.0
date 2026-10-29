import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  setLogLevel,
  Firestore
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, Auth, signInWithPopup, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Silence internal Firestore connection retry logs so harmless offline retries don't trip console.error
try {
  setLogLevel('silent');
} catch {}

// Singleton pattern for Firebase initialization
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const dbId = (firebaseConfig as any).firestoreDatabaseId;
  const targetDbId = dbId && dbId !== '(default)' ? dbId : undefined;
  
  db = targetDbId ? getFirestore(app, targetDbId) : getFirestore(app);
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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const msg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: msg,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || false,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  const isNetworkOrOffline = 
    msg.includes('Could not reach Cloud Firestore backend') ||
    msg.includes('client is offline') ||
    msg.includes('unavailable') ||
    msg.includes('deadline-exceeded') ||
    msg.includes('network-request-failed') ||
    msg.includes('Fetching auth token failed') ||
    msg.includes('auth/network-request-failed') ||
    msg.includes("Backend didn't respond");

  if (isNetworkOrOffline) {
    // Mode hors-ligne ou attente réseau normale dans l'environnement d'aperçu
    return errInfo;
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Utility to test the Firestore connection (optional and non-blocking)
 */
export async function testFirestoreConnection() {
  if (!db || !(db as any).type) return false;
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
    return true;
  } catch (error) {
    // Offline or network waiting is expected and non-fatal
    return false;
  }
}

/**
 * Persist user favorite race to Firestore
 */
export async function saveUserFavoriteToFirestore(userId: string, favorite: any) {
  if (!db || !userId) return;
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const cleanId = String(favorite.id || favorite.raceId || Date.now()).replace(/[^a-zA-Z0-9_\-]/g, '_');
    const favRef = doc(db, 'users', userId, 'favorites', cleanId);
    await setDoc(favRef, {
      ...favorite,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/favorites`);
  }
}

/**
 * Persist race data to Firestore
 */
export async function saveRaceToFirestore(raceId: string, courseData: any) {
  if (!db || !raceId) return;
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const cleanId = String(raceId).replace(/[^a-zA-Z0-9_\-]/g, '_');
    const raceRef = doc(db, 'live_races', cleanId);
    await setDoc(raceRef, {
      id: cleanId,
      courseData,
      arriveeOfficielle: courseData.arriveeOfficielle || null,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `live_races/${raceId}`);
  }
}

