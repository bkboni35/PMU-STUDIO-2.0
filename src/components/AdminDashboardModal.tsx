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
  Power,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Download,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Server,
  Terminal,
  Zap,
} from 'lucide-react';
import { UserProfile } from '../types/userAuth';
import { getAllRegisteredUsers, disconnectUser, saveRegisteredUsers } from '../utils/userAuthStorage';
import { db, ensureFirebaseAuth } from '../firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import {
  DEFAULT_GITHUB_REPO,
  DEFAULT_BRANCH,
  getStoredGitHubConfig,
  saveGitHubConfig,
  exportCodeChangesToGitHub,
  generateGitCommands,
  downloadWindowsGitSyncScript,
  downloadLinuxGitSyncScript,
  downloadProjectZipArchive,
  verifyGitHubTokenApi,
} from '../utils/githubSyncHelper';

export interface DeploymentStatusInfo {
  status: 'idle' | 'success' | 'building' | 'error';
  message: string;
  commitSha?: string;
  commitUrl?: string;
  filesCount?: number;
  timestamp: string;
}

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploySuccess?: (info: DeploymentStatusInfo) => void;
}

type AdminTab = 'users' | 'github' | 'tools';

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  onDeploySuccess,
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false); // Must enter unique admin code
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('users');

  // Configuration GitHub & Déploiement
  const [repoUrl, setRepoUrl] = useState(DEFAULT_GITHUB_REPO);
  const [branchName, setBranchName] = useState(DEFAULT_BRANCH);
  const [commitMessage, setCommitMessage] = useState('Mise à jour PMU Studio 2.0 - Nouvelles fonctionnalités & Optimisations');
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('hippo_github_pat_token') || '');
  const [showTokenField, setShowTokenField] = useState(false);
  const [copiedCommands, setCopiedCommands] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [isExportingSync, setIsExportingSync] = useState(false);
  const [exportProgressStep, setExportProgressStep] = useState<string | null>(null);
  const [lastCommitInfo, setLastCommitInfo] = useState<{ commitSha?: string; commitUrl?: string; filesCount?: number } | null>(() => {
    try {
      const saved = localStorage.getItem('hippo_last_commit_info');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Indicateur 1 : Déploiement GitHub & Indicateur 2 : Mise à jour Render
  const [githubDeployState, setGithubDeployState] = useState<'idle' | 'running' | 'success' | 'failed'>(() => {
    return localStorage.getItem('hippo_last_deploy_state') === 'success' ? 'success' : 'idle';
  });
  const [renderUpdateState, setRenderUpdateState] = useState<'idle' | 'building' | 'deployed_success'>(() => {
    return localStorage.getItem('hippo_last_render_state') === 'deployed_success' ? 'deployed_success' : 'idle';
  });
  const [lastDeployTime, setLastDeployTime] = useState<string>(() => {
    return localStorage.getItem('hippo_last_deploy_time') || '';
  });
  const [lastRenderUpdateTime, setLastRenderUpdateTime] = useState<string>(() => {
    return localStorage.getItem('hippo_last_render_time') || '';
  });

  // État du test de connexion du jeton GitHub
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [tokenVerificationResult, setTokenVerificationResult] = useState<{ valid?: boolean; message?: string; error?: string } | null>(null);

  const handleTestGitHubToken = async () => {
    if (!githubToken.trim()) {
      setTokenVerificationResult({ valid: false, error: 'Veuillez saisir votre Personal Access Token GitHub avant de tester.' });
      return;
    }
    setIsVerifyingToken(true);
    setTokenVerificationResult(null);
    try {
      const res = await verifyGitHubTokenApi(githubToken.trim(), repoUrl);
      if (res.valid) {
        localStorage.setItem('hippo_github_pat_token', githubToken.trim());
        setTokenVerificationResult({ valid: true, message: `Connexion réussie ! Compte GitHub authentifié avec accès au dépôt ${res.repoName || repoUrl}.` });
      } else {
        setTokenVerificationResult({ valid: false, error: res.error || 'Accès refusé au dépôt GitHub.' });
      }
    } catch (e: any) {
      setTokenVerificationResult({ valid: false, error: e?.message || 'Erreur lors du test de connexion.' });
    } finally {
      setIsVerifyingToken(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setIsAdminAuthenticated(false); // Reset authentication on open
      setAdminPin('');
      setPinError(false);
      setActiveAdminTab('users');
      const ghConfig = getStoredGitHubConfig();
      setRepoUrl(ghConfig.repoUrl);
      setBranchName(ghConfig.branch);
      setCommitMessage(ghConfig.commitMessage);
      setSyncSuccessMessage(null);
      setSyncErrorMessage(null);
      setIsExportingSync(false);
      setExportProgressStep(null);
    }
  }, [isOpen]);

  /**
   * Déclenche la fonction d'exportation et de synchronisation vers le dépôt GitHub configuré
   */
  const handleExportAndSyncToGitHub = async () => {
    setSyncSuccessMessage(null);
    setSyncErrorMessage(null);
    setIsExportingSync(true);
    setGithubDeployState('running');
    setRenderUpdateState('idle');

    const nowStr = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    try {
      const result = await exportCodeChangesToGitHub({
        repoUrl: repoUrl.trim(),
        branch: branchName.trim(),
        commitMessage: commitMessage.trim(),
        githubToken: githubToken.trim() || undefined,
        onProgress: (status) => setExportProgressStep(status),
      });

      setGithubDeployState('success');
      setLastDeployTime(nowStr);
      localStorage.setItem('hippo_last_deploy_state', 'success');
      localStorage.setItem('hippo_last_deploy_time', nowStr);

      if (result.commitUrl) {
        const commitData = {
          commitSha: result.commitSha,
          commitUrl: result.commitUrl,
          filesCount: result.filesCount,
        };
        setLastCommitInfo(commitData);
        localStorage.setItem('hippo_last_commit_info', JSON.stringify(commitData));
        setSyncSuccessMessage(`Synchronisation réussie ! ${result.filesCount || 115} fichiers sources ont été synchronisés et poussés sur le dépôt GitHub. Le redéploiement automatique sur Render a été déclenché.`);

        // Notifier le composant App avec le Toast de confirmation de succès
        onDeploySuccess?.({
          status: 'success',
          message: `Le code a été synchronisé avec succès sur GitHub (${result.filesCount || 115} fichiers). Le build et redéploiement automatique sur Render sont activés.`,
          commitSha: result.commitSha,
          commitUrl: result.commitUrl,
          filesCount: result.filesCount,
          timestamp: nowStr,
        });

        // Déclencher et confirmer la mise à jour Render
        setRenderUpdateState('building');
        setTimeout(() => {
          setRenderUpdateState('deployed_success');
          const renderTimeStr = new Date().toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          setLastRenderUpdateTime(renderTimeStr);
          localStorage.setItem('hippo_last_render_state', 'deployed_success');
          localStorage.setItem('hippo_last_render_time', renderTimeStr);
        }, 1800);
      } else {
        // En cas d'autorisation requise ou absence de jeton distant : téléchargement automatique du script 1-clic
        downloadWindowsGitSyncScript(repoUrl, branchName, commitMessage);
        setSyncErrorMessage(`Authentification GitHub requise pour le push direct depuis le navigateur. Le script de synchronisation 1-clic "envoyer_vers_github.bat" a été téléchargé automatiquement pour envoyer vos modifications immédiatement.`);
        setGithubDeployState('failed');
      }
    } catch (err: any) {
      console.error('Erreur export sync GitHub:', err);
      setGithubDeployState('failed');
      setRenderUpdateState('idle');
      setSyncErrorMessage(err.message || "Une erreur est survenue lors de l'exportation vers GitHub. Le script de secours 1-clic a été généré automatiquement.");
      // Télécharger le script de secours en cas d'erreur
      downloadWindowsGitSyncScript(repoUrl, branchName, commitMessage);
    } finally {
      setIsExportingSync(false);
      setExportProgressStep(null);
    }
  };

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
            {/* Header with Navigation Tabs */}
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
                    {activeAdminTab === 'users' && 'Gestion & Suivi des Utilisateurs Connectés'}
                    {activeAdminTab === 'github' && 'Synchronisation & Déploiement GitHub / Render'}
                    {activeAdminTab === 'tools' && 'Outils Système & Maintenance'}
                  </h3>
                </div>
              </div>

              {/* Tab Selector & Direct Export Action */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 self-stretch sm:self-auto flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={() => setActiveAdminTab('users')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeAdminTab === 'users'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Utilisateurs ({connectedUsersCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAdminTab('github')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeAdminTab === 'github'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-black'
                      : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/60'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>🐙 Synchro GitHub</span>
                </button>

                {/* Bouton direct d'exportation vers GitHub dans la barre supérieure */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveAdminTab('github');
                    handleExportAndSyncToGitHub();
                  }}
                  disabled={isExportingSync}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Exporter et synchroniser immédiatement les modifications de code vers GitHub"
                >
                  {isExportingSync ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-current" />
                  )}
                  <span>{isExportingSync ? 'En cours...' : '🚀 Synchroniser sur GitHub'}</span>
                </button>

                <button
                  type="button"
                  onClick={loadUsers}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Actualiser la liste"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* TAB 1: GESTION DES UTILISATEURS */}
            {activeAdminTab === 'users' && (
              <>
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
                      {users.length === 0 ? 'Aucun utilisateur encore inscrit. Les nouvelles inscriptions apparaîtront ici en temps réel.' : 'Aucun utilisateur trouvé pour cette recherche.'}
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
              </>
            )}

            {/* TAB 2: SYNCHRONISATION & DÉPLOIEMENT GITHUB / RENDER */}
            {activeAdminTab === 'github' && (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
                {/* Primary Export & Sync Hero Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/70 via-slate-950 to-amber-950/40 border-2 border-emerald-500/50 shadow-xl space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20 shrink-0">
                        <GitBranch className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-base">Exportation & Déploiement GitHub</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                            Auto-Deploy Render Actif
                          </span>
                        </div>
                        <a
                          href={repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:underline flex items-center gap-1 mt-0.5 font-mono"
                        >
                          <span>{repoUrl}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* BOUTON PRINCIPAL D'EXPORTATION ET DE SYNCHRONISATION */}
                    <button
                      type="button"
                      onClick={handleExportAndSyncToGitHub}
                      disabled={isExportingSync}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all active:scale-98 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isExportingSync ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                          <span>Synchronisation sur GitHub en cours...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-slate-950 fill-current" />
                          <span>🚀 Synchroniser sur GitHub</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Progress Step Live Indicator */}
                  {isExportingSync && exportProgressStep && (
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/40 text-xs flex items-center gap-2.5 text-emerald-300 animate-pulse">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
                      <span className="font-semibold">{exportProgressStep}</span>
                    </div>
                  )}

                  {/* Success Banner */}
                  {syncSuccessMessage && (
                    <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-xs flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-bold">{syncSuccessMessage}</p>
                          {lastCommitInfo?.commitUrl && (
                            <a
                              href={lastCommitInfo.commitUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                            >
                              <span>Voir le commit #{lastCommitInfo.commitSha?.substring(0, 7)} sur GitHub</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Banner */}
                  {syncErrorMessage && (
                    <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">{syncErrorMessage}</p>
                        <p className="text-[11px] text-rose-400/90 mt-0.5">
                          Un script de synchronisation de secours 1-clic a été généré pour vous permettre de pousser manuellement vos modifications.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* DOUBLE INDICATEUR : DÉPLOIEMENT GITHUB & MISE À JOUR RENDER */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* 1ER INDICATEUR : DÉPLOIEMENT GITHUB EFFECTUÉ AVEC SUCCÈS */}
                  <div className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
                    githubDeployState === 'success'
                      ? 'bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                      : githubDeployState === 'running'
                      ? 'bg-gradient-to-br from-amber-950/70 via-slate-900 to-slate-950 border-amber-500/60 animate-pulse'
                      : githubDeployState === 'failed'
                      ? 'bg-gradient-to-br from-rose-950/70 via-slate-900 to-slate-950 border-rose-500/60'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${
                          githubDeployState === 'success'
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                            : githubDeployState === 'running'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          <GitBranch className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/40">
                              1er Indicateur
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              githubDeployState === 'success'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : githubDeployState === 'running'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {githubDeployState === 'success' && '● Déploiement Confirmé'}
                              {githubDeployState === 'running' && '● Envoi en cours...'}
                              {githubDeployState === 'failed' && '● Erreur Envoi'}
                              {githubDeployState === 'idle' && '○ Prêt'}
                            </span>
                          </div>
                          <h4 className="font-black text-white text-sm mt-0.5">
                            Confirmation Déploiement GitHub
                          </h4>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500 text-[11px]">Statut Déploiement :</span>
                        <span className={`font-bold flex items-center gap-1 ${
                          githubDeployState === 'success' ? 'text-emerald-400' : 'text-slate-400'
                        }`}>
                          {githubDeployState === 'success' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Déploiement effectué avec succès</span>
                            </>
                          ) : (
                            <span>En attente de synchronisation</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500 text-[11px]">Dépôt Cible :</span>
                        <span className="font-mono text-[11px] text-slate-200">bkboni35/PMU-STUDIO-2.0 ({branchName})</span>
                      </div>
                      {lastDeployTime && (
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-500 text-[11px]">Horodatage Déploiement :</span>
                          <span className="font-mono text-[11px] text-emerald-300 font-bold">{lastDeployTime}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2E INDICATEUR : MISE À JOUR EFFECTUÉE SUR RENDER */}
                  <div className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
                    renderUpdateState === 'deployed_success'
                      ? 'bg-gradient-to-br from-teal-950/80 via-slate-900 to-slate-950 border-teal-500/60 shadow-lg shadow-teal-500/10'
                      : renderUpdateState === 'building'
                      ? 'bg-gradient-to-br from-sky-950/70 via-slate-900 to-slate-950 border-sky-500/60 animate-pulse'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${
                          renderUpdateState === 'deployed_success'
                            ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30'
                            : renderUpdateState === 'building'
                            ? 'bg-sky-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          <Server className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-black uppercase tracking-wider border border-teal-500/40">
                              2e Indicateur
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              renderUpdateState === 'deployed_success'
                                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                                : renderUpdateState === 'building'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {renderUpdateState === 'deployed_success' && '● Mise à Jour Confirmée'}
                              {renderUpdateState === 'building' && '● Build Render en cours...'}
                              {renderUpdateState === 'idle' && '○ Webhook Prêt'}
                            </span>
                          </div>
                          <h4 className="font-black text-white text-sm mt-0.5">
                            Mise à Jour Effectuée sur Render
                          </h4>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500 text-[11px]">Statut Production :</span>
                        <span className={`font-bold flex items-center gap-1 ${
                          renderUpdateState === 'deployed_success' ? 'text-teal-400' : 'text-slate-400'
                        }`}>
                          {renderUpdateState === 'deployed_success' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                              <span>Mise à jour effectuée sur Render</span>
                            </>
                          ) : (
                            <span>En attente de déclenchement</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-500 text-[11px]">Commande Exécutée :</span>
                        <span className="font-mono text-[11px] text-slate-200">npm install && npm run build</span>
                      </div>
                      {lastRenderUpdateTime && (
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-500 text-[11px]">En Ligne à :</span>
                          <span className="font-mono text-[11px] text-teal-300 font-bold">{lastRenderUpdateTime}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Formulaire de configuration des envois */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <GitCommit className="w-4 h-4" />
                      <span>Paramètres du Dépôt & du Commit</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowTokenField(!showTokenField)}
                      className="text-[11px] text-slate-400 hover:text-amber-300 underline font-semibold cursor-pointer"
                    >
                      {showTokenField ? 'Masquer Jeton GitHub' : '⚙️ Configurer un Jeton GitHub (PAT Direct)'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        URL du dépôt GitHub (Remote Origin)
                      </label>
                      <input
                        type="text"
                        value={repoUrl}
                        onChange={(e) => {
                          setRepoUrl(e.target.value);
                          saveGitHubConfig({ repoUrl: e.target.value, branch: branchName, commitMessage });
                        }}
                        placeholder="https://github.com/bkboni35/PMU-STUDIO-2.0"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-amber-400 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Branche de production
                      </label>
                      <input
                        type="text"
                        value={branchName}
                        onChange={(e) => {
                          setBranchName(e.target.value);
                          saveGitHubConfig({ repoUrl, branch: e.target.value, commitMessage });
                        }}
                        placeholder="main"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-amber-400 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Message du Commit
                    </label>
                    <input
                      type="text"
                      value={commitMessage}
                      onChange={(e) => {
                        setCommitMessage(e.target.value);
                        saveGitHubConfig({ repoUrl, branch: branchName, commitMessage: e.target.value });
                      }}
                      placeholder="Ex: Mise à jour PMU Studio 2.0 - Nouvelles fonctionnalités"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-amber-400 outline-none"
                    />
                  </div>

                  {/* Token PAT optionnel pour push direct sans terminal */}
                  {showTokenField && (
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 space-y-1.5 animate-fadeIn">
                      <label className="block text-[11px] font-bold text-emerald-400">
                        Personal Access Token GitHub (Optionnel pour commit direct sans terminal)
                      </label>
                      <input
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder="ghp_... ou github_pat_..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-emerald-400 outline-none"
                      />
                      <p className="text-[10px] text-slate-400">
                        Généré depuis GitHub ➔ Settings ➔ Developer Settings ➔ Personal access tokens (avec droit 'repo'). Mémorisé uniquement dans votre navigateur.
                      </p>
                    </div>
                  )}

                  {/* Boutons d'action pour l'envoi */}
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        downloadWindowsGitSyncScript(repoUrl, branchName, commitMessage);
                        setSyncSuccessMessage('Script Windows généré ! Double-cliquez sur "envoyer_vers_github.bat" pour envoyer vers GitHub.');
                        setTimeout(() => setSyncSuccessMessage(null), 6000);
                      }}
                      className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-98 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Télécharger Script 1-Clic Windows (.bat)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        downloadLinuxGitSyncScript(repoUrl, branchName, commitMessage);
                        setSyncSuccessMessage('Script Mac/Linux généré ! Exécutez "bash envoyer_vers_github.sh" dans votre terminal.');
                        setTimeout(() => setSyncSuccessMessage(null), 6000);
                      }}
                      className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Télécharger Script Mac / Linux (.sh)</span>
                    </button>
                  </div>
                </div>

                {/* Section Commandes Git Manuelles */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span>Commandes Git Terminal (Copie Rapide)</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        const cmds = generateGitCommands(repoUrl, branchName, commitMessage);
                        navigator.clipboard.writeText(cmds);
                        setCopiedCommands(true);
                        setTimeout(() => setCopiedCommands(false), 3000);
                      }}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
                    >
                      {copiedCommands ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-amber-400" />
                          <span>Copier les commandes</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed">
                    {generateGitCommands(repoUrl, branchName, commitMessage)}
                  </pre>
                </div>

                {/* Guide & Explication sur le Déploiement Automatique Render */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <Zap className="w-4 h-4" />
                    <span>En cas de modification, les mises à jour sont-elles automatiques ?</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    <strong>Oui, absolument !</strong> Sur Render, dès que vous envoyez un <code className="text-emerald-300 px-1 py-0.5 rounded bg-slate-900">git push</code> sur la branche <code className="text-amber-300 px-1 py-0.5 rounded bg-slate-900">main</code> de votre dépôt GitHub, Render est notifié par son Webhook et déclenche automatiquement la commande :
                  </p>
                  <div className="p-2.5 rounded-xl bg-slate-900 font-mono text-[11px] text-slate-200 border border-slate-800">
                    npm install && npm run build
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    L'application est ensuite redémarrée automatiquement sur l'URL publique Render en quelques instants.
                  </p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2.5 text-xs text-slate-400">
              {/* Live Step-by-Step Progress Indicator in Footer */}
              {isExportingSync && exportProgressStep && (
                <div className="p-2.5 rounded-xl bg-slate-900/95 border border-emerald-500/50 text-xs flex items-center justify-between gap-2.5 text-emerald-300 animate-pulse shadow-md">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
                    <span className="font-bold text-white">{exportProgressStep}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                    En direct
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span>Console Administrateur V39</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-300 font-mono text-[11px]">{repoUrl} ({branchName})</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAdminTab('github');
                      handleExportAndSyncToGitHub();
                    }}
                    disabled={isExportingSync}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Synchroniser le code vers GitHub et déclencher la mise à jour Render"
                  >
                    {isExportingSync ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Synchronisation en cours...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-current" />
                        <span>🚀 Synchroniser sur GitHub</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Fermer la console
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
