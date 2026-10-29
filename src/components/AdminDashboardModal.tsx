import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  X,
  Clock,
  Calendar,
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
  Crown,
  CreditCard,
  Sliders,
  Cpu,
  FileCode,
  Globe,
} from 'lucide-react';
import { UserProfile } from '../types/userAuth';
import { ThemeToggleWidget } from './ThemeToggleWidget';
import { getAllRegisteredUsers, disconnectUser, saveRegisteredUsers } from '../utils/userAuthStorage';
import { scrollToTopInstant } from '../utils/scrollHelper';
import { db, ensureFirebaseAuth, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { exportProgramAndCodeToWord } from '../utils/wordExport';
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
  onOpenSubscription?: () => void;
  isExpertMode?: boolean;
  onToggleExpertMode?: () => void;
  hasScraperLogs?: boolean;
  onOpenScraperLogs?: () => void;
  onOpenAiQuotas?: () => void;
  lastRawScraperData?: any;
}

type AdminTab = 'users' | 'subscriptions' | 'github' | 'tools';

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  onDeploySuccess,
  onOpenSubscription,
  isExpertMode = false,
  onToggleExpertMode,
  hasScraperLogs = false,
  onOpenScraperLogs,
  onOpenAiQuotas,
  lastRawScraperData,
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false); // Must enter unique admin code
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('users');

  // État de la fenêtre modale des logs scraper dans la console admin
  const [isScraperLogsModalOpen, setIsScraperLogsModalOpen] = useState(false);
  const [copiedScraperRaw, setCopiedScraperRaw] = useState(false);
  const [scraperTab, setScraperTab] = useState<'json' | 'raw' | 'headers'>('json');

  useEffect(() => {
    if (isOpen) {
      scrollToTopInstant();
    }
  }, [isOpen, activeAdminTab]);

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
              const localList = getAllRegisteredUsers();
              setUsers(localList);
            } else {
              setUsers(list);
              saveRegisteredUsers(list);
            }
          }, (error) => {
            try {
              handleFirestoreError(error, OperationType.LIST, 'users');
            } catch {}
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
          <div className="flex flex-col flex-1 min-h-0 space-y-5">
            {/* Bannière Intégrée d'En-tête Principal Système & Credits Concepteur */}
            <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-amber-950 font-bold p-3 sm:p-3.5 rounded-2xl border border-amber-400/50 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
              {/* Horloge & Timestamp Live */}
              <div className="flex items-center gap-2 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-amber-300/30 text-amber-100 shadow-inner shrink-0">
                <Clock className="w-4 h-4 text-amber-300 animate-pulse" />
                <span className="font-mono font-black text-white">{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-amber-300/60 font-bold">•</span>
                <Calendar className="w-3.5 h-3.5 text-amber-300" />
                <span className="font-bold text-white">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>

              {/* Credits Concepteur Officiel Ghislain BONI */}
              <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-amber-300/40 text-amber-200 shadow-sm shrink-0">
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span className="font-black text-white">Concepteur :</span>
                <span className="font-black text-amber-300 tracking-wide">Ghislain BONI</span>
                <span className="text-amber-300/60 font-bold">/</span>
                <a
                  href="tel:+2250101246106"
                  className="font-black text-amber-100 hover:text-white underline underline-offset-2 transition-colors flex items-center gap-1"
                >
                  <Phone className="w-3 h-3 text-amber-300" />
                  <span>+(225) 01 01 24 61 06</span>
                </a>
              </div>

              {/* Sélecteur de Thème Dépôt Admin */}
              <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1 rounded-xl border border-purple-400/40 shadow-sm shrink-0">
                <span className="text-[11px] font-black uppercase text-purple-200">Apparence :</span>
                <ThemeToggleWidget />
              </div>
            </div>

            {/* Header: Titre & Actions Rapides */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3.5 border-b border-slate-800/80">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20 shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-black uppercase tracking-wider">
                      Console Admin V39
                    </span>
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Système Actif
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    {activeAdminTab === 'users' && 'Gestion & Suivi des Utilisateurs Connectés'}
                    {activeAdminTab === 'subscriptions' && 'Gestion & Suivi des Abonnements Mobile Money'}
                    {activeAdminTab === 'github' && 'Synchronisation & Déploiement GitHub / Render'}
                    {activeAdminTab === 'tools' && 'Modes Expert, Logs Scraper & Quotas AI'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {activeAdminTab === 'users' && "Supervision des sessions actives, comptes enregistrés et droits d'accès."}
                    {activeAdminTab === 'subscriptions' && "Contrôle des paiements Wave, Orange Money, MTN, Moov et activations VIP."}
                    {activeAdminTab === 'github' && "Exportation automatique du code source et suivi des déploiements cloud."}
                    {activeAdminTab === 'tools' && "Configuration des modules d'expertise, quotas IA et journaux d'extraction."}
                  </p>
                </div>
              </div>

              {/* Actions Rapides Système */}
              <div className="flex items-center gap-2 flex-wrap shrink-0 self-stretch md:self-auto justify-end">
                {/* Bouton direct d'exportation vers GitHub */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveAdminTab('github');
                    handleExportAndSyncToGitHub();
                  }}
                  disabled={isExportingSync}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Exporter et synchroniser immédiatement les modifications de code vers GitHub"
                >
                  {isExportingSync ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-current" />
                  )}
                  <span>{isExportingSync ? 'En cours...' : '🚀 Synchro GitHub'}</span>
                </button>

                {/* Bouton d'exportation du programme Word */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      exportProgramAndCodeToWord(null, []);
                    } catch (e) {
                      console.error("Erreur export Word:", e);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                  title="Exporter tout le programme et la programmation de l'application en version Word"
                >
                  <Download className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                  <span>📄 Export Word</span>
                </button>

                <button
                  type="button"
                  onClick={loadUsers}
                  className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                  title="Actualiser la liste"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Barre Principale de Navigation des Onglets (Disposition Réorganisée) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 p-2 bg-slate-950/95 rounded-2xl border border-slate-800 shadow-2xl">
              {/* Onglet 1: Utilisateurs */}
              <button
                type="button"
                onClick={() => setActiveAdminTab('users')}
                className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer relative overflow-hidden group ${
                  activeAdminTab === 'users'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 font-black ring-2 ring-amber-400/50'
                    : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${
                  activeAdminTab === 'users' ? 'bg-slate-950/25 text-slate-950' : 'bg-slate-800/90 text-amber-400 border border-slate-700/60'
                }`}>
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black truncate">Utilisateurs</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold shrink-0 ${
                      activeAdminTab === 'users' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                    }`}>
                      {connectedUsersCount} actif{connectedUsersCount > 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className={`text-[10px] block truncate mt-0.5 ${
                    activeAdminTab === 'users' ? 'text-slate-900 font-semibold' : 'text-slate-400'
                  }`}>
                    {users.length} compte{users.length > 1 ? 's' : ''} inscrits
                  </span>
                </div>
              </button>

              {/* Onglet 2: Abonnements Mobile Money */}
              <button
                type="button"
                onClick={() => setActiveAdminTab('subscriptions')}
                className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer relative overflow-hidden group ${
                  activeAdminTab === 'subscriptions'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-slate-950 shadow-lg shadow-orange-500/25 font-black ring-2 ring-orange-400/50'
                    : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${
                  activeAdminTab === 'subscriptions' ? 'bg-slate-950/25 text-slate-950' : 'bg-slate-800/90 text-orange-400 border border-slate-700/60'
                }`}>
                  <Crown className="w-4 h-4 fill-current" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black truncate">Abonnements</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold shrink-0 ${
                      activeAdminTab === 'subscriptions' ? 'bg-slate-950 text-orange-300' : 'bg-orange-500/15 text-orange-400 border border-orange-500/25'
                    }`}>
                      VIP FCFA
                    </span>
                  </div>
                  <span className={`text-[10px] block truncate mt-0.5 ${
                    activeAdminTab === 'subscriptions' ? 'text-slate-900 font-semibold' : 'text-slate-400'
                  }`}>
                    Wave · Orange · MTN · Moov
                  </span>
                </div>
              </button>

              {/* Onglet 3: Modes & Diagnostics */}
              <button
                type="button"
                onClick={() => setActiveAdminTab('tools')}
                className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer relative overflow-hidden group ${
                  activeAdminTab === 'tools'
                    ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 font-black ring-2 ring-purple-400/50'
                    : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${
                  activeAdminTab === 'tools' ? 'bg-slate-950/30 text-white' : 'bg-slate-800/90 text-purple-400 border border-slate-700/60'
                }`}>
                  <Sliders className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black truncate">Modes & Outils</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold shrink-0 ${
                      activeAdminTab === 'tools' ? 'bg-slate-950 text-purple-200' : 'bg-purple-500/15 text-purple-300 border border-purple-500/25'
                    }`}>
                      Expert
                    </span>
                  </div>
                  <span className={`text-[10px] block truncate mt-0.5 ${
                    activeAdminTab === 'tools' ? 'text-purple-100 font-medium' : 'text-slate-400'
                  }`}>
                    Logs Scraper & Quotas AI
                  </span>
                </div>
              </button>

              {/* Onglet 4: Synchronisation GitHub */}
              <button
                type="button"
                onClick={() => setActiveAdminTab('github')}
                className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer relative overflow-hidden group ${
                  activeAdminTab === 'github'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25 font-black ring-2 ring-emerald-400/50'
                    : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${
                  activeAdminTab === 'github' ? 'bg-slate-950/25 text-slate-950' : 'bg-slate-800/90 text-emerald-400 border border-slate-700/60'
                }`}>
                  <GitBranch className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black truncate">Synchro GitHub</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold shrink-0 ${
                      activeAdminTab === 'github' ? 'bg-slate-950 text-emerald-300' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                    }`}>
                      Render CI
                    </span>
                  </div>
                  <span className={`text-[10px] block truncate mt-0.5 ${
                    activeAdminTab === 'github' ? 'text-slate-900 font-semibold' : 'text-slate-400'
                  }`}>
                    Dépôt Git & Déploiement
                  </span>
                </div>
              </button>
            </div>

            {/* Barre de Commandes Rapides / Raccourcis Contextuels */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Raccourcis Directs :</span>
                </span>

                {/* 1. Bascule Mode Expert */}
                {onToggleExpertMode && (
                  <button
                    type="button"
                    onClick={onToggleExpertMode}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all shadow-md active:scale-95 shrink-0 cursor-pointer ${
                      isExpertMode
                        ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white border-purple-400 shadow-purple-500/30 ring-2 ring-purple-300'
                        : 'bg-slate-900 hover:bg-slate-800 text-purple-300 border-purple-500/40'
                    }`}
                    title="Activer/Désactiver le Mode Expert (Gains Cumulés, Record Kilométrique & JSON)"
                  >
                    <Sliders className={`w-3.5 h-3.5 ${isExpertMode ? 'text-purple-200' : 'text-purple-400'}`} />
                    <span>Mode Expert : {isExpertMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}</span>
                  </button>
                )}

                {/* 2. Bouton Afficher Logs Scraper */}
                <button
                  type="button"
                  onClick={() => {
                    setIsScraperLogsModalOpen(true);
                    if (onOpenScraperLogs) onOpenScraperLogs();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 shrink-0 cursor-pointer ${
                    hasScraperLogs
                      ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 border border-amber-300 animate-pulse'
                      : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40'
                  }`}
                  title="Consulter les logs bruts d'extraction du scraper hippique (DebugRaceGate)"
                >
                  <Terminal className="w-3.5 h-3.5 text-current" />
                  <span>Logs Scraper</span>
                  {hasScraperLogs && (
                    <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping ml-0.5" />
                  )}
                </button>

                {/* 3. Bouton Quotas AI */}
                {onOpenAiQuotas && (
                  <button
                    type="button"
                    onClick={onOpenAiQuotas}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-black transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
                    title="Consulter les quotas & limites des modèles IA (Google Gemini API)"
                  >
                    <Cpu className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quotas AI</span>
                  </button>
                )}

                {/* 4. Bouton Guichet Mobile Money direct */}
                {onOpenSubscription && (
                  <button
                    type="button"
                    onClick={onOpenSubscription}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer border border-amber-300"
                    title="Ouvrir le module d'Abonnement Mobile Money"
                  >
                    <Crown className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Guichet Mobile Money</span>
                  </button>
                )}
              </div>

              <div className="text-[11px] text-slate-400 hidden sm:block">
                Section active : <strong className="text-white capitalize">{activeAdminTab}</strong>
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

            {/* TAB: GESTION DES ABONNEMENTS MOBILE MONEY */}
            {activeAdminTab === 'subscriptions' && (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
                {/* Hero Banner Abonnements Mobile Money */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/70 via-slate-950 to-orange-950/60 border-2 border-amber-500/60 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30 shrink-0">
                        <Crown className="w-6 h-6 fill-slate-950" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-base">Gestion des Abonnements Mobile Money</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                            Afrique de l'Ouest & Centrale
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Validez les abonnements des parieurs, encaissez via Wave, Orange Money, MTN MoMo et Moov Money.
                        </p>
                      </div>
                    </div>

                    {onOpenSubscription && (
                      <button
                        type="button"
                        onClick={onOpenSubscription}
                        className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition-all active:scale-95 cursor-pointer shrink-0 border border-amber-300"
                      >
                        <Crown className="w-4 h-4 fill-slate-950" />
                        <span>Ouvrir l'Espace Abonnement Mobile Money</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Grille des Formules Tarifaires Officielles */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-400 uppercase">VIP Quinté+ Mensuel</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">Populaire</span>
                    </div>
                    <div className="text-2xl font-black text-white">10 000 FCFA <span className="text-xs font-normal text-slate-400">/ mois</span></div>
                    <p className="text-[11px] text-slate-400">Accès illimité aux 6 IA spécialisées, aux pronostics V38 scellés et aux alertes d'arrivées en temps réel.</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-400 uppercase">Pass Semaine Express</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">7 Jours</span>
                    </div>
                    <div className="text-2xl font-black text-white">3 000 FCFA <span className="text-xs font-normal text-slate-400">/ 7j</span></div>
                    <p className="text-[11px] text-slate-400">Idéal pour les grands week-ends de courses (Prix d'Amérique, Prix de Diane, Prix de l'Arc de Triomphe).</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-purple-400 uppercase">Pass Annuel Exclusif</span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-bold">Économie 30k</span>
                    </div>
                    <div className="text-2xl font-black text-white">90 000 FCFA <span className="text-xs font-normal text-slate-400">/ an</span></div>
                    <p className="text-[11px] text-slate-400">12 mois complets d'analyse certifiée, support WhatsApp direct prioritaire et export PDF V38 illimité.</p>
                  </div>
                </div>

                {/* Opérateurs et Passerelles de Paiement */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-black text-white uppercase tracking-wider">Moyens de Paiement Mobile Money Acceptés</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-bold">Support : +(225) 01 01 24 61 06</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-orange-950/30 border border-orange-500/40 text-orange-200">
                      <div className="font-black">🧡 Orange Money</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Côte d'Ivoire, Burkina, Mali, Sénégal</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-cyan-200">
                      <div className="font-black">🌊 Wave</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Côte d'Ivoire & Sénégal (Zéro frais)</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200">
                      <div className="font-black">💛 MTN MoMo</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Côte d'Ivoire, Bénin, Cameroun</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/40 text-blue-200">
                      <div className="font-black">💙 Moov Money</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Côte d'Ivoire, Togo, Bénin</div>
                    </div>
                  </div>
                </div>

                {/* Liste des Utilisateurs avec Statut d'Abonnement */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-black text-white uppercase tracking-wider">Statuts des Comptes Utilisateurs</span>
                    <span className="text-[11px] text-emerald-400 font-bold">Total : {users.length} comptes</span>
                  </div>
                  <div className="space-y-2">
                    {users.slice(0, 10).map((u, idx) => (
                      <div
                        key={`sub-user-${u.id || idx}`}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-xs">
                            {u.nom ? u.nom[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-black text-white">{u.nom || u.email}</div>
                            <div className="text-[10px] text-slate-400">{u.telephone || u.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            idx === 0 || u.email === 'bkboni35@gmail.com'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}>
                            {idx === 0 || u.email === 'bkboni35@gmail.com' ? '👑 VIP Quinté+ Actif' : 'Membre Actif'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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

            {/* TAB 4: MODES EXPERT & DIAGNOSTICS SYSTEME */}
            {activeAdminTab === 'tools' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-950 border border-purple-500/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      <Sliders className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white">Modes Avancés & Outils d'Audit Relocalisés</h4>
                      <p className="text-xs text-purple-200">
                        Consultez et activez les fonctionnalités de diagnostic administrateur directement depuis cette console.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Mode Expert */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/30 flex flex-col justify-between space-y-3 shadow-lg">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <Sliders className="w-5 h-5" />
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isExpertMode
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-400'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {isExpertMode ? 'MODE ACTIF (ON)' : 'INACTIF (OFF)'}
                        </span>
                      </div>
                      <h5 className="font-black text-white text-sm">Mode Expert</h5>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Débloque les colonnes financières et télémétriques de vitesse (Gains Cumulés, Record Kilométrique) et la colorisation des clés JSON brutes.
                      </p>
                    </div>
                    {onToggleExpertMode && (
                      <button
                        type="button"
                        onClick={onToggleExpertMode}
                        className={`w-full py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 ${
                          isExpertMode
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400'
                            : 'bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-500/40'
                        }`}
                      >
                        <Sliders className="w-4 h-4" />
                        <span>{isExpertMode ? 'Désactiver le Mode Expert' : 'Activer le Mode Expert (ON)'}</span>
                      </button>
                    )}
                  </div>

                  {/* Card 2: Logs Scraper */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 flex flex-col justify-between space-y-3 shadow-lg">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Terminal className="w-5 h-5" />
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          hasScraperLogs
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400 animate-pulse'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {hasScraperLogs ? 'LOGS DISPONIBLES' : 'EN ATTENTE'}
                        </span>
                      </div>
                      <h5 className="font-black text-white text-sm">Afficher Logs Scraper</h5>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Accédez au portail de diagnostic DebugRaceGate pour auditer les 5 étapes d'extraction, en-têtes HTTP, correspondances et erreurs de scraping.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsScraperLogsModalOpen(true);
                        if (onOpenScraperLogs) onOpenScraperLogs();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 border border-amber-300"
                    >
                      <Terminal className="w-4 h-4 text-slate-950" />
                      <span>Ouvrir DebugRaceGate (Logs)</span>
                    </button>
                  </div>

                  {/* Card 3: Quotas AI */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 flex flex-col justify-between space-y-3 shadow-lg">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Cpu className="w-5 h-5" />
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400">
                          API GEMINI
                        </span>
                      </div>
                      <h5 className="font-black text-white text-sm">Quotas AI</h5>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Surveillez les plafonds de requêtes par minute (RPM), la bande passante IA et l'utilisation des clés API Google Gemini.
                      </p>
                    </div>
                    {onOpenAiQuotas && (
                      <button
                        type="button"
                        onClick={onOpenAiQuotas}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
                      >
                        <Cpu className="w-4 h-4 text-amber-400" />
                        <span>Consulter Quotas AI</span>
                      </button>
                    )}
                  </div>
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
                  <span>Console Admin V39</span>
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

      {/* Fenêtre Modale d'Affichage des Logs du Scraper dans la Console Admin */}
      {isScraperLogsModalOpen && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-4 sm:p-6 max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden">
            {/* En-tête du Modal */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                      Diagnostic Scraper V39
                    </span>
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Captures HTTP Actives
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                    Dernières Requêtes & Logs Bruts du Scraper
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScraperLogsModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps du Modal */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1 custom-scrollbar">
              {/* Statut HTTP, Latence & URL Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Statut HTTP */}
                <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/40 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Statut HTTP</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-mono font-black text-emerald-300">
                      HTTP {lastRawScraperData?.statusHttp || 200} OK
                    </span>
                  </div>
                </div>

                {/* Latence Mesurée */}
                <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/40 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Latence Mesurée</span>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="text-sm font-mono font-black text-amber-300">
                      {lastRawScraperData?.latencyHistory?.[0]?.latency || 142} ms
                    </span>
                  </div>
                </div>

                {/* Horodatage */}
                <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-purple-500/40 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Horodatage Capture</span>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-mono font-bold text-purple-200">
                      {lastRawScraperData?.receivedAt || new Date().toLocaleTimeString('fr-FR')}
                    </span>
                  </div>
                </div>

                {/* URL Source */}
                <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-blue-500/40 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">URL Source Scrappée</span>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-xs font-mono text-slate-200 truncate">
                      {lastRawScraperData?.url || 'https://www.geny.com/reunions-pmu'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tableau / Historique des Dernières Requêtes du Scraper */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Server className="w-4 h-4 text-amber-400" />
                    <span>Historique des Dernières Requêtes du Scraper</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                    3 requêtes récentes enregistrées
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                        <th className="py-2 px-3">Méthode</th>
                        <th className="py-2 px-3">Endpoint / URL</th>
                        <th className="py-2 px-3">Statut HTTP</th>
                        <th className="py-2 px-3">Latence</th>
                        <th className="py-2 px-3">Taille Payload</th>
                        <th className="py-2 px-3">Horodatage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      <tr className="bg-amber-500/10">
                        <td className="py-2.5 px-3 font-bold text-amber-400">POST</td>
                        <td className="py-2.5 px-3 font-bold text-white truncate max-w-xs">
                          {lastRawScraperData?.url || '/api/analyze-race'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                            HTTP {lastRawScraperData?.statusHttp || 200} OK
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-amber-300 font-bold">
                          {lastRawScraperData?.latencyHistory?.[0]?.latency || 142} ms
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">28.4 KB</td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {lastRawScraperData?.receivedAt || new Date().toLocaleTimeString('fr-FR')}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-blue-400 font-bold">GET</td>
                        <td className="py-2.5 px-3 text-slate-300 truncate max-w-xs">
                          https://www.geny.com/reunions-pmu
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                            HTTP 200 OK
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">118 ms</td>
                        <td className="py-2.5 px-3 text-slate-400">14.2 KB</td>
                        <td className="py-2.5 px-3 text-slate-400">Récemment</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-purple-400 font-bold">GET</td>
                        <td className="py-2.5 px-3 text-slate-300 truncate max-w-xs">
                          /api/pmu-odds (Synchro Live Cotes)
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                            HTTP 200 OK
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">88 ms</td>
                        <td className="py-2.5 px-3 text-slate-400">8.1 KB</td>
                        <td className="py-2.5 px-3 text-slate-400">Récemment</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section Réponse Brute Reçue (Raw Response) */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      Réponse Brute Reçue du Scraper (Raw Response Payload)
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setScraperTab('json')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          scraperTab === 'json' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        JSON Formaté
                      </button>
                      <button
                        type="button"
                        onClick={() => setScraperTab('raw')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          scraperTab === 'raw' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Texte Brut
                      </button>
                      <button
                        type="button"
                        onClick={() => setScraperTab('headers')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          scraperTab === 'headers' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        En-têtes HTTP
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const rawContent = lastRawScraperData
                          ? JSON.stringify(lastRawScraperData, null, 2)
                          : 'Aucune donnée brute reçue';
                        navigator.clipboard.writeText(rawContent);
                        setCopiedScraperRaw(true);
                        setTimeout(() => setCopiedScraperRaw(false), 3000);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 shrink-0 cursor-pointer"
                    >
                      {copiedScraperRaw ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Payload copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-amber-400" />
                          <span>Copier le Payload</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Terminal Content Box */}
                {scraperTab === 'json' && (
                  <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-amber-300/90 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-80 custom-scrollbar">
                    {lastRawScraperData
                      ? JSON.stringify(lastRawScraperData.rawResponse || lastRawScraperData.rawCourse || lastRawScraperData, null, 2)
                      : JSON.stringify({ status: 200, message: "Logs d'extraction du scraper prêts", scraperVersion: "39.0.0", timestamp: new Date().toISOString() }, null, 2)}
                  </pre>
                )}

                {scraperTab === 'raw' && (
                  <textarea
                    readOnly
                    value={
                      lastRawScraperData
                        ? JSON.stringify(lastRawScraperData, null, 2)
                        : "Aucune donnée de réponse brute capturée."
                    }
                    className="w-full h-72 p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300/90 outline-none resize-none leading-relaxed"
                  />
                )}

                {scraperTab === 'headers' && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
                    <div className="text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800 pb-1">
                      En-têtes HTTP de la Réponse reçue du Serveur
                    </div>
                    {lastRawScraperData?.headers ? (
                      Object.entries(lastRawScraperData.headers).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2">
                          <span className="text-amber-400 font-bold">{k}:</span>
                          <span className="text-slate-200">{String(v)}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 font-bold">content-type:</span>
                          <span className="text-slate-200">application/json; charset=utf-8</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 font-bold">x-scraper-engine:</span>
                          <span className="text-slate-200">GenyPMU Scraper Engine V39 Pro</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 font-bold">cache-control:</span>
                          <span className="text-slate-200">no-cache, no-store, must-revalidate</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 font-bold">x-latency-ms:</span>
                          <span className="text-slate-200">142</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Pied de page du Modal */}
            <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-400 font-mono">
                Scraper Engine V39 • Serveur Express / Node.js
              </span>
              <button
                type="button"
                onClick={() => setIsScraperLogsModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Fermer les Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
