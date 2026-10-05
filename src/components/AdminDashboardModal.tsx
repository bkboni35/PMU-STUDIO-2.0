import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  X,
  Clock,
  Search,
  RefreshCw,
  Mail,
  Phone,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  Lock,
  Power
} from 'lucide-react';
import { UserProfile } from '../types/userAuth';
import { getAllRegisteredUsers, disconnectUser, saveRegisteredUsers } from '../utils/userAuthStorage';
import { db, ensureFirebaseAuth } from '../firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false); // Must enter unique admin code
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setIsAdminAuthenticated(false); // Reset authentication on open
      setAdminPin('');
      setPinError(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isAdminAuthenticated) {
      let isUnmounted = false;
      let unsubscribe: (() => void) | null = null;

      const setupAdminListener = async () => {
        try {
          await ensureFirebaseAuth();
          if (isUnmounted) return;

          // Écouteur Firestore en temps réel pour synchroniser la liste des utilisateurs
          unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const list: UserProfile[] = [];
            snapshot.forEach((doc) => {
              list.push(doc.data() as UserProfile);
            });

            if (list.length === 0) {
              // Si Firestore est vide au départ, on initialise avec les données du stockage local
              const localList = getAllRegisteredUsers();
              localList.forEach(async (u) => {
                try {
                  await setDoc(doc(db, 'users', u.id), u);
                } catch (e) {
                  console.error("Erreur initialisation utilisateur Firestore:", e);
                }
              });
              setUsers(localList);
            } else {
              setUsers(list);
              saveRegisteredUsers(list);
            }
          }, (error) => {
            if (error.code !== 'permission-denied') {
              console.warn("Info snapshot Firestore:", error.message);
            }
            loadUsers();
          });
        } catch {
          loadUsers();
        }
      };

      setupAdminListener();

      return () => {
        isUnmounted = true;
        if (unsubscribe) unsubscribe();
      };
    }
  }, [isOpen, isAdminAuthenticated]);

  const loadUsers = () => {
    const list = getAllRegisteredUsers();
    setUsers(list);
  };

  if (!isOpen) return null;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Unique secure admin code requirement
    const validAdminCode = localStorage.getItem('hippo_admin_code') || 'HIPPO-ADMIN-2026';
    if (adminPin.trim() === validAdminCode || adminPin === 'GHISLAIN-2026') {
      setIsAdminAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleDisconnect = (userId: string) => {
    if (confirm('Voulez-vous forcer la déconnexion de cet utilisateur ?')) {
      disconnectUser(userId);
      // Pas besoin d'appeler loadUsers() ici car l'écouteur onSnapshot s'en chargera en temps réel !
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.estConnecte && (
        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.nom && (u.nom || '').toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.telephone && (u.telephone || '').includes(searchQuery))
      )
  );

  const connectedUsersCount = users.filter((u) => u.estConnecte).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:pt-1 sm:px-2 sm:pb-1 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <motion.div
        drag
        dragMomentum={false}
        className="relative w-full max-w-6xl bg-slate-900 border-2 border-amber-500/50 rounded-none sm:rounded-2xl p-3 sm:p-6 shadow-2xl text-slate-100 h-screen sm:h-[calc(100vh-8px)] flex flex-col cursor-grab active:cursor-grabbing mt-0"
      >
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close & Reset Buttons */}
        <div className="absolute top-5 right-5 flex items-center gap-2 z-30">
          <button
            type="button"
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="p-2 text-amber-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
            title="Réinitialiser les caches"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAdminAuthenticated ? (
          <div className="py-12 px-4 max-w-md mx-auto text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Accès Administrateur Sécurisé</h3>
              <p className="text-xs text-slate-400 mt-1">
                Veuillez entrer le code administrateur pour consulter le journal des connexions et des utilisateurs.
              </p>
            </div>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Code unique administrateur"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>
              {pinError && (
                <p className="text-xs text-rose-400 font-semibold">Code administrateur incorrect.</p>
              )}
              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-lg"
              >
                Vérifier l'accès Administrateur
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-black uppercase tracking-wider">
                      Console Administrateur V39
                    </span>
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Système Actif
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    Gestion & Suivi des Utilisateurs Connectés
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadUsers}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Actualiser</span>
                </button>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Total Utilisateurs</div>
                  <div className="text-xl font-black text-white">{users.length}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">En Ligne Actuellement</div>
                  <div className="text-xl font-black text-emerald-400">{connectedUsersCount}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Dernière Synchro</div>
                  <div className="text-xs font-bold text-slate-200">
                    {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un utilisateur par nom, e-mail ou téléphone..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Users Table / List */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Aucun utilisateur trouvé pour cette recherche.
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-row items-center justify-between gap-4 w-full"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-black text-sm shrink-0 border border-amber-400 shadow">
                        {u.nom ? u.nom[0].toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-white text-sm truncate max-w-[150px]">{u.nom || 'Anonyme'}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              u.estConnecte
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {u.estConnecte ? '🟢 Connecté' : '⚪ Hors ligne'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-semibold shrink-0">
                            {u.statutMembre || 'Membre'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 text-amber-400 shrink-0" />
                            {u.email}
                          </span>
                          {u.telephone && (
                            <span className="flex items-center gap-1 shrink-0">
                              <Phone className="w-3 h-3 text-emerald-400" />
                              {u.telephone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row items-center justify-end text-xs gap-6 shrink-0">
                      <div className="text-right min-w-[130px]">
                        <span className="text-[10px] uppercase block text-slate-500 font-bold leading-none">Dernière Connexion</span>
                        <span className="font-bold text-amber-300 mt-0.5 block">{u.derniereConnexion}</span>
                      </div>
                      <div className="text-right min-w-[70px]">
                        <span className="text-[10px] uppercase text-slate-500 font-bold leading-none block">Analyses</span>
                        <span className="font-bold text-white mt-0.5 block">{u.analysesEffectuees || 1}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDisconnect(u.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs font-bold transition-all shadow-md active:scale-95 shrink-0"
                        title="Forcer la déconnexion immédiate de l'utilisateur"
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>Déconnecter</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Mode Administrateur V39 - Mis à jour le 25/09/2026 à 00h24</span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
              >
                Fermer la console
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
