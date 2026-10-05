import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  CheckCircle2,
  X,
  ShieldCheck,
  Sparkles,
  LogOut,
  Trophy,
  ArrowRight,
  UserCheck,
  Smartphone,
  Globe,
  Users,
  UserPlus,
  Trash2,
  Key,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { UserProfile } from '../types/userAuth';
import {
  loginWithEmail,
  loginWithFirebaseUser,
  registerNewUser,
  getAllRegisteredUsers,
  switchUserAccount,
  deleteRegisteredUser,
  validateEmail,
  clearUserSession,
} from '../utils/userAuthStorage';
import { signInWithGoogle, logOutFirebase } from '../firebase';

interface UserSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLoginSuccess: (user: UserProfile) => void;
  onLogout: () => void;
  promptMessage?: string | null;
}

type ActiveTab = 'login' | 'register' | 'accounts' | 'profile';

export const UserSpaceModal: React.FC<UserSpaceModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
  promptMessage,
}) => {
  // Afficher directement la page de connexion par défaut
  const [activeTab, setActiveTab] = useState<ActiveTab>('login');

  // Formulaire de Connexion
  const [loginEmailInput, setLoginEmailInput] = useState('');

  // Formulaire d'Inscription
  const [regNom, setRegNom] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regTelephone, setRegTelephone] = useState('');
  const [regPays, setRegPays] = useState('Côte d\'Ivoire (LONACI)');
  const [regStatut, setRegStatut] = useState<UserProfile['statutMembre']>('Turfiste Certifié');

  const [savedUsers, setSavedUsers] = useState<UserProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger les utilisateurs et forcer l'affichage direct de la connexion en haut
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessNotice(null);
      const users = getAllRegisteredUsers();
      setSavedUsers(users);

      // Ouvrir directement la page de connexion
      setActiveTab('login');
      if (currentUser?.email) {
        setLoginEmailInput(currentUser.email);
      }
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // ================= HANDLERS =================

  // 1. Connexion par e-mail
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = loginEmailInput.trim();
    if (!clean) {
      setError('Veuillez renseigner votre adresse e-mail.');
      return;
    }

    if (!validateEmail(clean)) {
      setError('Format d\'adresse e-mail invalide (ex: turfiste@gmail.com).');
      return;
    }

    setIsSubmitting(true);

    try {
      const loggedUser = loginWithEmail(clean);
      setSuccessNotice(`Connexion réussie ! Bienvenue ${loggedUser.nom || loggedUser.email}.`);
      setSavedUsers(getAllRegisteredUsers());
      setTimeout(() => {
        setIsSubmitting(false);
        onLoginSuccess(loggedUser);
        onClose();
      }, 400);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || 'Une erreur est survenue lors de la connexion.');
    }
  };

  // 2. Inscription d'un nouvel utilisateur
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!regNom.trim()) {
      setError('Veuillez saisir votre Nom et Prénom.');
      return;
    }

    if (!regEmail.trim()) {
      setError('Veuillez renseigner votre adresse e-mail.');
      return;
    }

    if (!validateEmail(regEmail)) {
      setError('Format d\'adresse e-mail invalide (ex: turfiste@gmail.com).');
      return;
    }

    setIsSubmitting(true);

    try {
      const newUser = registerNewUser({
        nom: regNom,
        email: regEmail,
        telephone: regTelephone,
        pays: regPays,
        statutMembre: regStatut,
      });

      setSuccessNotice(`🎉 Inscription réussie ! Bienvenue ${newUser.nom}.`);
      setSavedUsers(getAllRegisteredUsers());

      setRegNom('');
      setRegEmail('');
      setRegTelephone('');

      setTimeout(() => {
        setIsSubmitting(false);
        onLoginSuccess(newUser);
        onClose();
      }, 400);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || 'Erreur lors de l\'inscription.');
    }
  };

  // 3. Connexion Google Popup / Firebase
  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const googleUser = await signInWithGoogle();
      if (!googleUser) {
        setIsSubmitting(false);
        return;
      }
      const profile = await loginWithFirebaseUser(googleUser);
      setSuccessNotice(`Connexion Google réussie ! Bienvenue ${profile.nom || profile.email}.`);
      setSavedUsers(getAllRegisteredUsers());
      setTimeout(() => {
        setIsSubmitting(false);
        onLoginSuccess(profile);
        onClose();
      }, 400);
    } catch (err: any) {
      setIsSubmitting(false);
      console.error('Erreur connexion Google:', err);
      const rawMsg = err?.message || '';
      if (rawMsg.includes('pop-up') || rawMsg.includes('popup') || rawMsg.includes('bloquée') || rawMsg.includes('unauthorized-domain')) {
        setError(`${rawMsg} Vous pouvez vous connecter directement en saisissant votre adresse Gmail dans le champ ci-dessous.`);
      } else {
        setError(rawMsg || 'La connexion avec Google a échoué. Utilisez la saisie d\'e-mail directe ci-dessous.');
      }
    }
  };

  // 4. Basculer vers un compte mémorisé
  const handleSwitchAccount = (userId: string) => {
    setError(null);
    const switched = switchUserAccount(userId);
    if (switched) {
      setSuccessNotice(`Session activée pour ${switched.nom || switched.email}.`);
      setSavedUsers(getAllRegisteredUsers());
      setTimeout(() => {
        onLoginSuccess(switched);
        onClose();
      }, 350);
    }
  };

  // 5. Supprimer un compte enregistré
  const handleDeleteUser = (userId: string, userName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Voulez-vous retirer le compte "${userName}" de cet appareil ?`)) {
      const updated = deleteRegisteredUser(userId);
      setSavedUsers(updated);
      if (currentUser && currentUser.id === userId) {
        onLogout();
        setActiveTab('login');
      }
    }
  };

  // 6. Déconnexion
  const handleLogoutClick = async () => {
    try {
      await logOutFirebase();
    } catch {}
    clearUserSession();
    onLogout();
    setActiveTab('login');
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-slate-900 border-2 border-amber-500/50 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-2xl text-slate-100 my-1 sm:my-2 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors z-20 cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header Compact - sans espace vide */}
        <div className="flex items-center gap-2.5 mb-2.5 pr-8">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl text-slate-950 font-black shadow-md shadow-amber-500/20 shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider">
                Espace Membres PMU-STUDIO
              </span>
              {currentUser?.estConnecte && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                  ● Connecté
                </span>
              )}
            </div>
            <h2 className="text-sm sm:text-base font-black text-white mt-0.5 truncate">
              {currentUser?.estConnecte ? `Compte : ${currentUser.nom || currentUser.email}` : 'Connexion & Inscription Turfiste'}
            </h2>
          </div>
        </div>

        {/* Navigation Tabs Compact */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 p-1 bg-slate-950/90 rounded-xl border border-slate-800 mb-2.5">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(null); }}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Connexion</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('register'); setError(null); }}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Inscription</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('accounts'); setError(null); }}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'accounts'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Comptes ({savedUsers.length})</span>
          </button>

          {currentUser?.estConnecte && (
            <button
              type="button"
              onClick={() => { setActiveTab('profile'); setError(null); }}
              className={`col-span-3 sm:col-span-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 shadow-md font-black'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/50'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profil</span>
            </button>
          )}
        </div>

        {/* Global Error / Success Messages */}
        {error && (
          <div className="mb-2.5 p-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {successNotice && (
          <div className="mb-2.5 p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successNotice}</span>
          </div>
        )}

        {/* Prompt Message */}
        {promptMessage && activeTab === 'login' && (
          <div className="mb-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-bold text-[11px]">Connexion requise :</strong>
              <span className="text-[11px]">{promptMessage}</span>
            </div>
          </div>
        )}

        {/* ================= TAB 1 : CONNEXION (AFFICHÉE DIRECTEMENT EN HAUT) ================= */}
        {activeTab === 'login' && (
          <div className="space-y-2.5">
            {/* Google Sign-In with Firebase Auth */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Option 1 : Authentification Google / Gmail
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                style={{ color: '#090d16', backgroundColor: '#ffffff' }}
                className="w-full py-2 px-3 rounded-xl hover:bg-slate-100 font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md active:scale-98 transition-all border border-slate-300 cursor-pointer disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span style={{ color: '#090d16' }} className="font-black text-slate-950">
                  {isSubmitting ? 'Connexion en cours...' : 'Continuer avec Google / Gmail'}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 my-1">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Option 2 : Connexion directe par e-mail
              </span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Direct Email Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-200 mb-1">
                  Votre adresse e-mail <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={loginEmailInput}
                    onChange={(e) => setLoginEmailInput(e.target.value)}
                    placeholder="ex: turfiste@gmail.com ou abonne@yahoo.fr"
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-white placeholder-slate-500 text-xs outline-none transition-all"
                  />
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Connexion...' : 'Se connecter'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Quick Access Badges for saved users */}
            {savedUsers.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span className="font-bold">⚡ Connexion rapide 1-Clic :</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('accounts')}
                    className="text-amber-400 hover:underline text-[10px] font-bold cursor-pointer"
                  >
                    Voir tous ({savedUsers.length})
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {savedUsers.slice(0, 2).map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSwitchAccount(user.id)}
                      className="p-1.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 flex items-center justify-between gap-2 text-left transition-all hover:bg-slate-800/60 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{user.nom || user.email}</div>
                        <div className="text-[9px] text-amber-300/80 truncate">{user.email}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold shrink-0">
                        Activer
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Switch to Register */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => { setActiveTab('register'); setError(null); }}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
              >
                + Inscrire un nouvel utilisateur avec nom complet et coordonnées
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 2 : NOUVELLE INSCRIPTION ================= */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-200 mb-1">
                Nom et Prénom <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={regNom}
                  onChange={(e) => setRegNom(e.target.value)}
                  placeholder="ex: Paul KOUAME, Marie DUPONT..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 text-white placeholder-slate-500 text-xs outline-none transition-all"
                />
                <User className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-200 mb-1">
                Adresse e-mail <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="ex: turfiste2026@gmail.com"
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 text-white placeholder-slate-500 text-xs outline-none transition-all"
                />
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Téléphone / WhatsApp <span className="text-slate-500 text-[9px]">(Optionnel)</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={regTelephone}
                    onChange={(e) => setRegTelephone(e.target.value)}
                    placeholder="ex: +225 07 08 09 10 11"
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 text-white placeholder-slate-500 text-xs outline-none transition-all"
                  />
                  <Smartphone className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Zone de paris / Pays
                </label>
                <div className="relative">
                  <select
                    value={regPays}
                    onChange={(e) => setRegPays(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 text-white text-xs outline-none transition-all cursor-pointer"
                  >
                    <option value="Côte d'Ivoire (LONACI)">Côte d'Ivoire (LONACI)</option>
                    <option value="France & Europe (PMU.FR)">France & Europe (PMU.FR)</option>
                    <option value="Sénégal (LONASE)">Sénégal (LONASE)</option>
                    <option value="Cameroun (PMUC)">Cameroun (PMUC)</option>
                    <option value="Burkina Faso (LONAB)">Burkina Faso (LONAB)</option>
                    <option value="Mali (PMU-MALI)">Mali (PMU-MALI)</option>
                    <option value="Gabon & Congo">Gabon & Congo</option>
                    <option value="Belgique / Suisse">Belgique / Suisse</option>
                    <option value="International / Autre">International / Autre</option>
                  </select>
                  <Globe className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Profil & Statut turfiste
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 'Turfiste Certifié', label: 'Certifié' },
                  { value: 'Abonné VIP', label: 'VIP' },
                  { value: 'Pronostiqueur Pro', label: 'Pro IA' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setRegStatut(item.value as any)}
                    className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer text-xs ${
                      regStatut === item.value
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Register */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all disabled:opacity-50 cursor-pointer mt-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Création...' : 'Créer mon compte & Me connecter'}</span>
            </button>
          </form>
        )}

        {/* ================= TAB 3 : COMPTES MÉMORISÉS ================= */}
        {activeTab === 'accounts' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-300 pb-1 border-b border-slate-800">
              <span>Comptes sur cet appareil ({savedUsers.length}) :</span>
              <button
                type="button"
                onClick={() => { setActiveTab('register'); setError(null); }}
                className="text-amber-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ Inscrire</span>
              </button>
            </div>

            {savedUsers.length === 0 ? (
              <div className="p-4 text-center text-slate-400 bg-slate-950/50 rounded-2xl border border-slate-800">
                <Users className="w-5 h-5 text-slate-600 mx-auto mb-1" />
                <p className="text-xs">Aucun compte mémorisé.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="mt-2 px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Créer un compte
                </button>
              </div>
            ) : (
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {savedUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id || ((currentUser?.email || '').toLowerCase() === (u.email || '').toLowerCase());
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleSwitchAccount(u.id)}
                      className={`p-1.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/60 ring-1 ring-emerald-500/30'
                          : 'bg-slate-950/70 border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                          isCurrent
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950'
                        }`}>
                          {u.nom ? u.nom[0].toUpperCase() : u.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-white truncate">{u.nom || u.email}</span>
                            {isCurrent && (
                              <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[8px] font-black uppercase">
                                Actif
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-amber-300/90 truncate flex items-center gap-1">
                            <Mail className="w-2.5 h-2.5" />
                            {u.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSwitchAccount(u.id)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow'
                          }`}
                        >
                          {isCurrent ? 'En cours' : '⚡ Activer'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteUser(u.id, u.nom || u.email, e)}
                          title="Supprimer ce compte"
                          className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4 : MON PROFIL ACTIF (SI CONNECTÉ) ================= */}
        {activeTab === 'profile' && currentUser && (
          <div className="space-y-2">
            {/* Header Profil */}
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-600 to-amber-700 flex items-center justify-center text-slate-950 font-black text-base shadow-md border border-amber-300">
                  {currentUser.nom ? currentUser.nom[0].toUpperCase() : 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-500 rounded-full text-slate-950 ring-2 ring-slate-900">
                  <CheckCircle2 className="w-2.5 h-2.5 text-slate-950" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase tracking-wider">
                    {currentUser.statutMembre || 'Membre Actif'}
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-extrabold text-white truncate mt-0.5">
                  {currentUser.nom || 'Turfiste HippoAnalyse'}
                </h3>
                <p className="text-[10px] text-amber-300/90 truncate flex items-center gap-1">
                  <Mail className="w-2.5 h-2.5 text-amber-400" />
                  {currentUser.email}
                </p>
              </div>
            </div>

            {/* Statistiques Profil */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2">
                <div className="p-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Trophy className="w-3 h-3" />
                </div>
                <div>
                  <div className="text-[9px] text-slate-400">Analyses effectuées</div>
                  <div className="text-xs font-black text-white">{currentUser.analysesEffectuees || 1} courses</div>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2">
                <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                </div>
                <div>
                  <div className="text-[9px] text-slate-400">Accès aux Pronostics</div>
                  <div className="text-xs font-black text-emerald-400">Illimité & Actif</div>
                </div>
              </div>
            </div>

            {/* Barre d'Actions Profil */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => { setActiveTab('accounts'); setError(null); }}
                className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Changer de compte</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('register'); setError(null); }}
                className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ Inscrire</span>
              </button>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Continuer vers les Analyses</span>
              </button>

              <button
                type="button"
                onClick={handleLogoutClick}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/50 hover:text-rose-400 text-slate-400 font-bold text-xs border border-slate-700/60 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Se déconnecter"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        )}

        {/* Pied de page Compact */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3 h-3" />
            <span>Multi-comptes sécurisé local & Firestore</span>
          </div>
          <span className="text-amber-400 font-semibold">PMU-STUDIO 2.0</span>
        </div>
      </div>
    </div>
  );
};
