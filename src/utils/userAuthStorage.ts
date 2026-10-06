import { UserProfile } from '../types/userAuth';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const STORAGE_KEY = 'hippoanalyse_user_session_v1';
const USERS_DB_KEY = 'hippoanalyse_registered_users_v1';

export function getStoredUserSession(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as UserProfile;
    return user.estConnecte ? user : null;
  } catch (err) {
    console.error('Erreur lecture session utilisateur:', err);
    return null;
  }
}

export function saveUserSession(user: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Erreur sauvegarde session utilisateur:', err);
  }
}

export function clearUserSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Erreur suppression session utilisateur:', err);
  }
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim().toLowerCase());
}

export function loginWithEmail(
  email: string,
  nom?: string,
  telephone?: string,
  pays?: string,
  statutMembre?: UserProfile['statutMembre']
): UserProfile {
  const cleanEmail = email.trim().toLowerCase();
  const existingUsers = getAllRegisteredUsers();
  
  const nowStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let user = existingUsers.find(u => (u.email || '').toLowerCase() === cleanEmail);

  if (user) {
    user.estConnecte = true;
    user.derniereConnexion = nowStr;
    if (nom && nom.trim()) user.nom = nom.trim();
    if (telephone && telephone.trim()) user.telephone = telephone.trim();
    if (pays && pays.trim()) user.pays = pays.trim();
    if (statutMembre) user.statutMembre = statutMembre;
  } else {
    let defaultNom = nom && nom.trim() ? nom.trim() : cleanEmail.split('@')[0];
    if (cleanEmail === 'bkboni35@gmail.com' || cleanEmail === 'ghislain.boni@hippoanalyse.com') {
      defaultNom = 'Ghislain BONI';
    }
    const isSpecialAdmin = cleanEmail.includes('boni') || cleanEmail.includes('admin');
    const newUser: UserProfile = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: cleanEmail,
      nom: defaultNom,
      telephone: telephone?.trim() || (isSpecialAdmin ? '+225 01 01 24 61 06' : ''),
      estConnecte: true,
      dateInscription: nowStr,
      derniereConnexion: nowStr,
      statutMembre: statutMembre || (isSpecialAdmin ? 'Membre Administrateur / VIP' : 'Turfiste Certifié'),
      analysesEffectuees: 1,
      pays: pays?.trim() || 'PMU France / FCFA International',
    };
    user = newUser;
    existingUsers.push(user);
  }

  saveRegisteredUsers(existingUsers);
  saveUserSession(user);

  // Synchronisation Firestore asynchrone (arrière-plan)
  try {
    const docRef = doc(db, 'users', user.id);
    setDoc(docRef, user, { merge: true }).catch(err => console.error("Erreur d'écriture Firestore sur connexion:", err));
  } catch (e) {
    console.error("Erreur d'initialisation Firestore sur connexion:", e);
  }

  return user;
}

/**
 * Inscription explicite d'un nouvel utilisateur
 */
export function registerNewUser(params: {
  email: string;
  nom: string;
  telephone?: string;
  pays?: string;
  statutMembre?: UserProfile['statutMembre'];
}): UserProfile {
  const cleanEmail = params.email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('L\'adresse e-mail est obligatoire.');
  }
  if (!validateEmail(cleanEmail)) {
    throw new Error('Format d\'adresse e-mail invalide (ex: turfiste@gmail.com).');
  }
  if (!params.nom || !params.nom.trim()) {
    throw new Error('Le nom et prénom sont obligatoires.');
  }

  const existingUsers = getAllRegisteredUsers();
  const existing = existingUsers.find(u => (u.email || '').toLowerCase() === cleanEmail);

  const nowStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (existing) {
    // Si le compte existe déjà, on met à jour ses coordonnées et on le connecte
    existing.nom = params.nom.trim();
    if (params.telephone) existing.telephone = params.telephone.trim();
    if (params.pays) existing.pays = params.pays.trim();
    if (params.statutMembre) existing.statutMembre = params.statutMembre;
    existing.estConnecte = true;
    existing.derniereConnexion = nowStr;

    saveRegisteredUsers(existingUsers);
    saveUserSession(existing);

    try {
      const docRef = doc(db, 'users', existing.id);
      setDoc(docRef, existing, { merge: true }).catch(() => {});
    } catch {}

    return existing;
  }

  const newUser: UserProfile = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: cleanEmail,
    nom: params.nom.trim(),
    telephone: params.telephone?.trim() || '',
    estConnecte: true,
    dateInscription: nowStr,
    derniereConnexion: nowStr,
    statutMembre: params.statutMembre || (cleanEmail.includes('boni') ? 'Membre Administrateur / VIP' : 'Turfiste Certifié'),
    analysesEffectuees: 1,
    pays: params.pays?.trim() || 'PMU France / FCFA International',
  };

  existingUsers.push(newUser);
  saveRegisteredUsers(existingUsers);
  saveUserSession(newUser);

  try {
    const docRef = doc(db, 'users', newUser.id);
    setDoc(docRef, newUser, { merge: true }).catch(() => {});
  } catch {}

  return newUser;
}

/**
 * Basculer rapidement vers un compte déjà enregistré
 */
export function switchUserAccount(userId: string): UserProfile | null {
  const users = getAllRegisteredUsers();
  const target = users.find(u => u.id === userId);
  if (!target) return null;

  const nowStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Déconnecter les autres et connecter la cible
  users.forEach(u => {
    u.estConnecte = u.id === userId;
    if (u.id === userId) {
      u.derniereConnexion = nowStr;
    }
  });

  saveRegisteredUsers(users);
  target.estConnecte = true;
  saveUserSession(target);

  return target;
}

/**
 * Supprimer un compte enregistré localement
 */
export function deleteRegisteredUser(userId: string): UserProfile[] {
  const users = getAllRegisteredUsers();
  const filtered = users.filter(u => u.id !== userId);
  saveRegisteredUsers(filtered);

  const current = getStoredUserSession();
  if (current && current.id === userId) {
    clearUserSession();
  }

  return filtered;
}

export async function loginWithFirebaseUser(firebaseUser: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null; phoneNumber?: string | null }): Promise<UserProfile> {
  const cleanEmail = (firebaseUser.email || '').trim().toLowerCase();
  const existingUsers = getAllRegisteredUsers();
  
  const nowStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let user = existingUsers.find(u => u.id === firebaseUser.uid || (cleanEmail && (u.email || '').toLowerCase() === cleanEmail));

  if (user) {
    user.estConnecte = true;
    user.derniereConnexion = nowStr;
    if (firebaseUser.displayName) user.nom = firebaseUser.displayName;
    if (firebaseUser.photoURL) user.avatar = firebaseUser.photoURL;
    if (firebaseUser.phoneNumber) user.telephone = firebaseUser.phoneNumber;
  } else {
    let defaultNom = firebaseUser.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'Turfiste Google');
    if (cleanEmail === 'bkboni35@gmail.com') {
      defaultNom = 'Ghislain BONI';
    }
    const newUser: UserProfile = {
      id: firebaseUser.uid,
      email: cleanEmail,
      nom: defaultNom,
      avatar: firebaseUser.photoURL || undefined,
      telephone: firebaseUser.phoneNumber || (cleanEmail.includes('boni') ? '+225 01 01 24 61 06' : ''),
      estConnecte: true,
      dateInscription: nowStr,
      derniereConnexion: nowStr,
      statutMembre: cleanEmail.includes('boni') ? 'Membre Administrateur / VIP' : 'Turfiste Certifié',
      analysesEffectuees: 1,
      pays: 'Côte d\'Ivoire / France / Zone Franc CFA',
    };
    user = newUser;
    existingUsers.push(user);
    saveRegisteredUsers(existingUsers);
  }

  saveUserSession(user);

  // Synchronisation avec Firestore
  try {
    const docRef = doc(db, 'users', user.id);
    await setDoc(docRef, user, { merge: true });
  } catch (err) {
    console.error('Erreur persistance Firestore:', err);
  }

  return user;
}

export function incrementUserAnalysesCount(userId?: string): void {
  try {
    const current = getStoredUserSession();
    if (!current) return;
    
    current.analysesEffectuees = (current.analysesEffectuees || 0) + 1;
    saveUserSession(current);

    const users = getAllRegisteredUsers();
    const idx = users.findIndex(u => u.id === current.id || u.email === current.email);
    if (idx !== -1) {
      users[idx].analysesEffectuees = current.analysesEffectuees;
      saveRegisteredUsers(users);
    }

    // Synchronisation Firestore asynchrone (arrière-plan)
    try {
      const docRef = doc(db, 'users', current.id);
      setDoc(docRef, { ...current, analysesEffectuees: current.analysesEffectuees }, { merge: true })
        .catch(err => console.warn("Notice synchronisation analyses sur Firestore:", err?.message || err));
    } catch (e) {
      console.warn("Erreur d'accès Firestore pour les analyses:", e);
    }
  } catch (e) {
    console.error('Erreur incrémentation analyses:', e);
  }
}

export function getAllRegisteredUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function disconnectUser(userId: string): void {
  try {
    const users = getAllRegisteredUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx].estConnecte = false;
      saveRegisteredUsers(users);
    }
    
    // Synchronisation Firestore asynchrone (arrière-plan)
    try {
      const docRef = doc(db, 'users', userId);
      setDoc(docRef, { estConnecte: false }, { merge: true })
        .catch(err => console.warn("Notice déconnexion sur Firestore:", err?.message || err));
    } catch (e) {
      console.warn("Erreur d'accès Firestore pour la déconnexion:", e);
    }
    
    const currentSession = getStoredUserSession();
    if (currentSession && currentSession.id === userId) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  } catch (e) {
    console.error('Erreur déconnexion utilisateur:', e);
  }
}

export function saveRegisteredUsers(users: UserProfile[]): void {
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Erreur sauvegarde base utilisateurs:', e);
  }
}

function getRegisteredUsers(): UserProfile[] {
  return getAllRegisteredUsers();
}
