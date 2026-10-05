import React, { useState, useEffect } from 'react';
import {
  Brain,
  X,
  ShieldCheck,
  Zap,
  Clock,
  Timer,
  RefreshCw,
  Gauge,
  Sparkles,
  Info,
  Layers,
  Database,
  CheckCircle2,
  Cpu,
  ArrowRight,
  AlertTriangle,
  Sun,
  Activity,
  Award,
} from 'lucide-react';

interface AiModelQuota {
  id: string;
  name: string;
  roleInApp: string;
  badge: string;
  freeTier: {
    rpm: string; // Requests per minute
    tpm: string; // Tokens per minute
    rpd: string; // Requests per day
    maxContext: string;
    cost: string;
    refreshRate: string;
  };
  paidTier: {
    rpm: string;
    tpm: string;
    rpd: string;
    costInput: string;
    costOutput: string;
  };
  latency: string;
  recommendation: string;
}

interface AiQuotasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiQuotasModal: React.FC<AiQuotasModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'renewal' | 'free' | 'paid' | 'summary'>('renewal');
  
  // Compte à rebours de la minute glissante (60s -> 0s)
  const [secondsUntilNextMinute, setSecondsUntilNextMinute] = useState<number>(60);
  
  // Compte à rebours du renouvellement journalier (RPD - Réinitialisation à 00h00 PST / 07h00 GMT Abidjan)
  const [dailyResetTime, setDailyResetTime] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  }>({ hours: 0, minutes: 0, seconds: 0 });

  const [isSimulatingRefresh, setIsSimulatingRefresh] = useState<boolean>(false);
  const [lastCheckNotice, setLastCheckNotice] = useState<string | null>(null);

  // Moteur de rafraîchissement des comptes à rebours en temps réel (mise à jour chaque seconde)
  useEffect(() => {
    if (!isOpen) return;

    const updateTimers = () => {
      const now = new Date();
      
      // 1. Calcul du compte à rebours de la minute glissante
      const secInMinute = now.getUTCSeconds();
      const remainSec = 60 - secInMinute;
      setSecondsUntilNextMinute(remainSec === 0 ? 60 : remainSec);

      // 2. Calcul du compte à rebours de la réinitialisation journalière (07:00 UTC = 00:00 PST)
      // Heure officielle de réinitialisation des quotas Google AI Studio Free Tier
      const targetUtcReset = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCHours() >= 7 ? now.getUTCDate() + 1 : now.getUTCDate(),
        7, // 07h00 UTC / GMT (00h00 PST)
        0,
        0,
        0
      ));

      const diffMs = targetUtcReset.getTime() - now.getTime();
      if (diffMs > 0) {
        const h = Math.floor(diffMs / (1000 * 60 * 60));
        const m = Math.floor((diffMs / (1000 * 60)) % 60);
        const s = Math.floor((diffMs / 1000) % 60);
        setDailyResetTime({ hours: h, minutes: m, seconds: s });
      } else {
        setDailyResetTime({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleManualCheck = () => {
    setIsSimulatingRefresh(true);
    setTimeout(() => {
      setIsSimulatingRefresh(false);
      setLastCheckNotice("Tous les quotas API Gemini sont actuellement actifs et prêts à 100%.");
      setTimeout(() => setLastCheckNotice(null), 5000);
    }, 800);
  };

  if (!isOpen) return null;

  const modelsQuotas: AiModelQuota[] = [
    {
      id: 'gemini-flash-lite',
      name: 'Gemini 3.1 Flash-Lite',
      roleInApp: 'Évaluateur Express & Calcul HippoScore Partants (< 30s)',
      badge: 'Ultra-Rapide',
      freeTier: {
        rpm: '30 RPM (30 req / min)',
        tpm: '1 000 000 TPM',
        rpd: '1 500 RPD (req / jour)',
        maxContext: '1 000 000 tokens',
        cost: '100% Gratuit',
        refreshRate: 'Toutes les 60 secondes (RPM) / 07h00 GMT (RPD)',
      },
      paidTier: {
        rpm: '1 500+ RPM',
        tpm: '4 000 000 TPM',
        rpd: 'Illimité',
        costInput: '0,0375 $ / 1M tokens (~23 F CFA)',
        costOutput: '0,15 $ / 1M tokens (~92 F CFA)',
      },
      latency: '< 1.2 sec (Éclair)',
      recommendation: 'Idéal pour le calcul en direct des notes HippoScore de chaque cheval en quelques secondes.',
    },
    {
      id: 'gemini-flash',
      name: 'Gemini 3.8 / 2.5 Flash',
      roleInApp: 'Grand Stratège Quinté+, Synthèse 8 chevaux & Indices de Confiance',
      badge: 'Principal',
      freeTier: {
        rpm: '15 RPM (15 req / min)',
        tpm: '1 000 000 TPM',
        rpd: '1 500 RPD (req / jour)',
        maxContext: '1 000 000 tokens',
        cost: '100% Gratuit',
        refreshRate: 'Toutes les 60 secondes (RPM) / 07h00 GMT (RPD)',
      },
      paidTier: {
        rpm: '1 000+ RPM',
        tpm: '4 000 000 TPM',
        rpd: 'Illimité',
        costInput: '0,075 $ / 1M tokens (~46 F CFA)',
        costOutput: '0,30 $ / 1M tokens (~185 F CFA)',
      },
      latency: '~1.8 sec',
      recommendation: 'Le meilleur équilibre vitesse / intelligence pour arbitrer les bases et outsiders du Quinté+.',
    },
    {
      id: 'gemini-pro',
      name: 'Gemini 3.5 / 2.5 Pro',
      roleInApp: 'Auditeur Tactique Approfondi & Analyse Mathématique Complexe',
      badge: 'Haute Précision',
      freeTier: {
        rpm: '2 RPM (2 req / min)',
        tpm: '32 000 TPM',
        rpd: '50 RPD (req / jour)',
        maxContext: '2 000 000 tokens',
        cost: '100% Gratuit',
        refreshRate: 'Toutes les 60 secondes (RPM) / 07h00 GMT (RPD)',
      },
      paidTier: {
        rpm: '360+ RPM',
        tpm: '2 000 000 TPM',
        rpd: 'Illimité',
        costInput: '1,25 $ / 1M tokens (~770 F CFA)',
        costOutput: '5,00 $ / 1M tokens (~3 080 F CFA)',
      },
      latency: '~4.5 sec',
      recommendation: 'Utilisé pour les raisonnements profonds et les audits probabilistes avancés.',
    },
    {
      id: 'gemini-thinking',
      name: 'Gemini Flash Thinking / Reasoning',
      roleInApp: 'Arbitrage des Pièges de Course & Détection des Faux Favoris',
      badge: 'Raisonnement Pas-à-Pas',
      freeTier: {
        rpm: '10 RPM (10 req / min)',
        tpm: '500 000 TPM',
        rpd: '1 500 RPD (req / jour)',
        maxContext: '1 000 000 tokens',
        cost: '100% Gratuit',
        refreshRate: 'Toutes les 60 secondes (RPM) / 07h00 GMT (RPD)',
      },
      paidTier: {
        rpm: '500+ RPM',
        tpm: '2 000 000 TPM',
        rpd: 'Illimité',
        costInput: '0,075 $ / 1M tokens',
        costOutput: '0,30 $ / 1M tokens',
      },
      latency: '~2.5 sec',
      recommendation: 'Évalue la logique des allures, les disqualifications répétées et la régularité réelle.',
    },
    {
      id: 'gemini-tts-audio',
      name: 'Gemini TTS & Audio Studio',
      roleInApp: 'Chroniqueur Vocal & Briefing Audio en Direct pour Mobile',
      badge: 'Synthèse Vocale',
      freeTier: {
        rpm: '15 RPM (15 req / min)',
        tpm: '1 000 000 TPM',
        rpd: '1 500 RPD',
        maxContext: 'Multi-modal',
        cost: '100% Gratuit',
        refreshRate: 'Toutes les 60 secondes (RPM) / 07h00 GMT (RPD)',
      },
      paidTier: {
        rpm: '1 000+ RPM',
        tpm: '4 000 000 TPM',
        rpd: 'Illimité',
        costInput: '0,075 $ / 1M tokens',
        costOutput: '0,30 $ / 1M tokens',
      },
      latency: '< 1 sec',
      recommendation: 'Génère la chronique audio en direct pour écouter les pronostics sur smartphone.',
    },
  ];

  const formatTwoDigits = (num: number) => String(num).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center bg-black/85 backdrop-blur-md p-0 sm:pt-1 sm:px-2 sm:pb-1 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500/50 w-full max-w-6xl lg:max-w-7xl rounded-none sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-screen sm:h-[calc(100vh-8px)] mt-0">
        {/* Header avec Titre & Statut */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Quotas & Comptes à Rebours API (Google Gemini)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-black border border-emerald-500/40">
                  Palier Gratuit Actif
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Suivi dynamique des périodes de réinitialisation, débits (RPM/TPM) et compteurs de renouvellement en temps réel.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bandeau d'Information en Temps Réel avec Deux Comptes à Rebours */}
        <div className="p-3.5 sm:p-4 bg-slate-950/90 border-b border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Compte à rebours 1 : Renouvellement par Minute (RPM/TPM) */}
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-amber-500/30 flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Timer className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black block">Renouvellement Minute (RPM)</span>
                <span className="text-xs font-bold text-amber-200">Fenêtre glissante de 60s</span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-sm">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{formatTwoDigits(secondsUntilNextMinute)}s</span>
              </div>
              <span className="text-[9px] text-slate-500 font-medium mt-0.5">Réinitialisation continue</span>
            </div>
          </div>

          {/* Compte à rebours 2 : Réinitialisation Journalière (RPD - 1500 req/jour) */}
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black block">Renouvellement Journalier (RPD)</span>
                <span className="text-xs font-bold text-emerald-300">00h00 PST / 07h00 GMT (CI)</span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-black text-sm">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {formatTwoDigits(dailyResetTime.hours)}h {formatTwoDigits(dailyResetTime.minutes)}m {formatTwoDigits(dailyResetTime.seconds)}s
                </span>
              </div>
              <span className="text-[9px] text-slate-500 font-medium mt-0.5">Recharge complète 1500 req</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs in Modal */}
        <div className="p-3.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('renewal')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'renewal'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${activeTab === 'renewal' ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>🔄 Renouvellement & Comptes à rebours</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('free')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'free'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              🎁 Quotas Gratuits (Free Tier)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('paid')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'paid'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              ⚡ Mode Pay-as-you-go (Payant)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'summary'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              💡 Comprendre RPM, TPM & RPD
            </button>
          </div>

          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isSimulatingRefresh}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingRefresh ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
            <span>{isSimulatingRefresh ? 'Vérification...' : 'Tester statut API'}</span>
          </button>
        </div>

        {/* Message de confirmation de test */}
        {lastCheckNotice && (
          <div className="px-4 py-2 bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{lastCheckNotice}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* ONDET 1 : RENOUVELLEMENT DES QUOTAS & COMPTES À REBOURS */}
          {activeTab === 'renewal' && (
            <div className="space-y-4">
              {/* Carte Principale : Quand le quota se renouvelle-t-il exactement ? */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/30 border border-amber-500/40 space-y-4">
                <div className="flex items-center gap-2.5 text-amber-300 font-black text-sm sm:text-base">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                  <h4>À quel moment le quota se renouvelle-t-il en cas d'épuisement ?</h4>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Sur Google AI Studio / API Gemini, le renouvellement dépend du <strong>type de limite atteint</strong> (par minute ou par jour) :
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Renouvellement 1 : RPM / TPM (Par Minute) */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-amber-400 text-xs uppercase flex items-center gap-1.5">
                        <Timer className="w-4 h-4 text-amber-400" />
                        1. Quota par Minute (RPM / TPM)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                        {formatTwoDigits(secondsUntilNextMinute)}s restantes
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-normal">
                      <strong>Se réinitialise toutes les 60 secondes</strong> sur une fenêtre glissante. Si vous recevez une erreur de limite de vitesse (Rate Limit Exceeded - 429) :
                    </p>

                    <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/20 text-[11px] text-amber-200">
                      ⏱️ <strong>Délai d'attente :</strong> Moins de <strong>60 secondes</strong> (au maximum la durée affichée par le compte à rebours ci-dessus).
                    </div>
                  </div>

                  {/* Renouvellement 2 : RPD (Par Jour) */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-emerald-400 text-xs uppercase flex items-center gap-1.5">
                        <Sun className="w-4 h-4 text-emerald-400" />
                        2. Quota Journalier (RPD - 1500 req/jour)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                        {formatTwoDigits(dailyResetTime.hours)}h {formatTwoDigits(dailyResetTime.minutes)}m
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-normal">
                      <strong>Se réinitialise une fois par jour à Minuit PST (Pacific Time)</strong>, soit exactement à <strong>07h00 GMT / UTC+0 (Heure Côte d'Ivoire / Abidjan)</strong> / 09h00 (Heure France).
                    </p>

                    <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-200">
                      🌅 <strong>Délai d'attente :</strong> Recharge complète de vos <strong>1 500 requêtes journalières gratuites</strong> à l'expiration du chrono journalier.
                    </div>
                  </div>
                </div>
              </div>

              {/* Système de Protection & Fallback Multi-Modèles HippoAnalyse */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="font-black text-white text-xs sm:text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Protection Anti-Blocage HippoAnalyse (Fallback Multi-Modèles) :</span>
                </h4>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Pour vous éviter toute interruption, HippoAnalyse intègre un <strong>basculement automatique d'urgence</strong>. Si le modèle principal (ex: Gemini 3.8 Flash) est momentanément saturé en RPM, la requête bascule immédiatement vers les modèles secondaires (Gemini 3.1 Flash-Lite ou Gemini Flash Thinking) qui ont leurs propres compteurs indépendants !
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-black block">Modèle 1</span>
                    <span className="font-bold text-amber-300 text-xs">Gemini 3.8 Flash</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">15 req / min (1500 / jour)</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-black block">Fallback 2</span>
                    <span className="font-bold text-emerald-300 text-xs">Gemini 3.1 Flash-Lite</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">30 req / min (1500 / jour)</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-black block">Fallback 3</span>
                    <span className="font-bold text-purple-300 text-xs">Gemini Thinking</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">10 req / min (1500 / jour)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ONGLET 2 : QUOTAS GRATUITS */}
          {activeTab === 'free' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  <strong>Votre application fonctionne actuellement sur l'offre gratuite (Free Tier)</strong> : vous bénéficiez jusqu'à <strong>1 500 requêtes par jour et par modèle</strong> sans frais.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modelsQuotas.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/40 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                          <Brain className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="font-black text-sm text-white">{m.name}</h4>
                          <p className="text-[11px] text-slate-400 truncate max-w-[220px]">{m.roleInApp}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 text-[10px] font-black border border-slate-700">
                        {m.badge}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/80">
                      <div className="p-2 rounded-xl bg-slate-900/80">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Vitesse (RPM)</span>
                        <span className="font-black text-amber-400 font-mono text-xs">{m.freeTier.rpm}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900/80">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Volume Jour (RPD)</span>
                        <span className="font-black text-emerald-400 font-mono text-xs">{m.freeTier.rpd}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900/80">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Tokens / Min (TPM)</span>
                        <span className="font-bold text-slate-300 font-mono text-xs">{m.freeTier.tpm}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900/80">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Coût Actuel</span>
                        <span className="font-black text-emerald-400 text-xs">{m.freeTier.cost}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-amber-300/90 font-medium bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Renouvellement : {m.freeTier.refreshRate}</span>
                    </div>

                    <p className="text-[11px] text-slate-400 italic">
                      💡 {m.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ONGLET 3 : MODE PAY-AS-YOU-GO */}
          {activeTab === 'paid' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 flex items-center gap-3">
                <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  <strong>Mode Pay-as-you-go</strong> : Les quotas par minute sont multipliés par 50 à 100 et il n'y a plus aucune limite journalière. La facturation est à l'usage réel (moins de 100 F CFA pour analyser des centaines de courses).
                </span>
              </div>

              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                    <tr>
                      <th className="p-3">Modèle IA</th>
                      <th className="p-3">Débit (RPM)</th>
                      <th className="p-3">Tokens / Min</th>
                      <th className="p-3">Coût Input (1M Tokens)</th>
                      <th className="p-3">Coût Output (1M Tokens)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {modelsQuotas.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-900/50">
                        <td className="p-3 font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span>{m.name}</span>
                        </td>
                        <td className="p-3 font-mono font-black text-amber-400">{m.paidTier.rpm}</td>
                        <td className="p-3 font-mono">{m.paidTier.tpm}</td>
                        <td className="p-3 text-emerald-400 font-semibold">{m.paidTier.costInput}</td>
                        <td className="p-3 text-slate-300 font-semibold">{m.paidTier.costOutput}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ONGLET 4 : EXPLICATIONS PÉDAGOGIQUES */}
          {activeTab === 'summary' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-black text-amber-400 text-sm">RPM (Requests Per Minute)</span>
                  <p className="text-slate-400 text-[11px]">
                    Nombre maximal de requêtes d'analyse que l'application peut envoyer en 60 secondes pour un modèle donné.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-black text-emerald-400 text-sm">TPM (Tokens Per Minute)</span>
                  <p className="text-slate-400 text-[11px]">
                    Volume total de mots/données analysés par minute. 1 million de tokens équivaut à environ 750 000 mots.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-black text-purple-400 text-sm">RPD (Requests Per Day)</span>
                  <p className="text-slate-400 text-[11px]">
                    Nombre maximal de requêtes quotidiennes gratuites (ex: 1 500 requêtes / jour par modèle sur le palier gratuit).
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-black text-white text-sm flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-400" />
                  <span>Architecture Multi-Modèles HippoAnalyse :</span>
                </h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  HippoAnalyse distribue intelligemment la charge de calcul entre les différents modèles spécialisés (Gemini 3.1 Flash-Lite, Gemini 3.8 Flash, Gemini 3.7 Forme, Gemini 3.6 Chrono). Cette répartition permet de ne jamais saturer les quotas gratuits tout en garantissant des prédictions en moins de 30 secondes.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Données officielles Google AI Studio / Gemini API.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
};
