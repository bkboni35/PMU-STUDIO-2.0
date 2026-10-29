import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  TableProperties,
  Calculator,
  Target,
  Smartphone,
  CheckCircle2,
  Crown,
  Layers,
  Menu,
  X,
  Calendar,
  Database,
  History,
  Star,
  FileText,
  RotateCcw,
  User,
  Zap,
  BarChart3,
  Bot,
} from 'lucide-react';

export type MainTabType =
  | 'synthese'
  | 'classification-prono'
  | 'pronostics-jeu'
  | 'partants'
  | 'college-gemini'
  | 'propositions-ia'
  | 'trios-ia'
  | 'ticket'
  | 'stats'
  | 'advisor'
  | 'fiche-pdf-v38';

interface AndroidBottomNavProps {
  activeTab: string;
  onChangeTab: (tab: any) => void;
  onOpenInstallModal: () => void;
  isInstallable?: boolean;
  onOpenCalendar?: () => void;
  onOpenPmuApiHub?: () => void;
  onOpenHistory?: () => void;
  onOpenFavorites?: () => void;
  onResetSession?: () => void;
  onOpenUserSpace?: () => void;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenInstallModal,
  onOpenCalendar,
  onOpenPmuApiHub,
  onOpenHistory,
  onOpenFavorites,
  onResetSession,
  onOpenUserSpace,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Les 4 onglets prioritaires visibles directement
  const primaryTabs = [
    { id: 'synthese', label: 'Synthèse', icon: Target },
    { id: 'classification-prono', label: 'Classif.', icon: Crown },
    { id: 'pronostics-jeu', label: 'Jeux IA', icon: Sparkles },
    { id: 'partants', label: 'Partants', icon: TableProperties },
  ];

  // Est-ce qu'un des onglets secondaires est actif ?
  const isSecondaryActive = !primaryTabs.some((t) => t.id === activeTab);

  // Label dynamique pour le 5e bouton si un onglet secondaire est sélectionné
  const getSecondaryTabInfo = () => {
    switch (activeTab) {
      case 'college-gemini':
        return { label: '6 IA', icon: Brain };
      case 'propositions-ia':
        return { label: 'Prop. IA', icon: Zap };
      case 'trios-ia':
        return { label: 'Trios IA', icon: Bot };
      case 'ticket':
        return { label: 'Tickets', icon: Calculator };
      case 'stats':
        return { label: 'Stats', icon: BarChart3 };
      case 'fiche-pdf-v38':
        return { label: 'Fiche PDF', icon: FileText };
      default:
        return { label: 'Menu', icon: Menu };
    }
  };

  const secondaryInfo = getSecondaryTabInfo();
  const SecondaryIcon = secondaryInfo.icon;

  const handleTabClick = (tabId: string) => {
    onChangeTab(tabId);
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
  };

  return (
    <>
      {/* Barre de Navigation Tactile Inférieure */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/98 backdrop-blur-2xl border-t border-slate-800/80 pb-[env(safe-area-inset-bottom)] sm:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
        <div className="grid grid-cols-5 items-center justify-around px-1 py-1 h-14">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
                  isActive
                    ? 'text-amber-400 font-black'
                    : 'text-slate-400 active:scale-95 active:bg-slate-900/50'
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-amber-500/15 shadow-inner scale-105'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? 'text-amber-400 scale-105' : 'text-slate-400'
                    }`}
                  />
                </div>
                <span
                  className={`text-[9px] font-bold tracking-tighter mt-0.5 leading-none uppercase truncate max-w-full ${
                    isActive ? 'opacity-100 font-black text-amber-300' : 'opacity-70'
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
                )}
              </button>
            );
          })}

          {/* 5e bouton : Menu d'actions rapides / Onglet secondaire actif */}
          <button
            type="button"
            onClick={() => {
              setIsMoreMenuOpen(!isMoreMenuOpen);
              if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                try {
                  navigator.vibrate(10);
                } catch {}
              }
            }}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
              isSecondaryActive || isMoreMenuOpen
                ? 'text-amber-400 font-black'
                : 'text-slate-400 active:scale-95 active:bg-slate-900/50'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all duration-200 ${
                isSecondaryActive || isMoreMenuOpen
                  ? 'bg-amber-500/20 shadow-inner scale-105 border border-amber-500/30'
                  : 'hover:bg-slate-800/50'
              }`}
            >
              <SecondaryIcon
                className={`w-5 h-5 transition-transform duration-200 ${
                  isSecondaryActive || isMoreMenuOpen ? 'text-amber-400 scale-105' : 'text-slate-400'
                }`}
              />
            </div>
            <span
              className={`text-[9px] font-bold tracking-tighter mt-0.5 leading-none uppercase truncate max-w-full ${
                isSecondaryActive || isMoreMenuOpen ? 'opacity-100 font-black text-amber-300' : 'opacity-70'
              }`}
            >
              {secondaryInfo.label}
            </span>
            {(isSecondaryActive || isMoreMenuOpen) && (
              <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            )}
          </button>
        </div>
      </nav>

      {/* Tiroir d'actions rapides et outils (Bottom Sheet) */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden flex flex-col justify-end animate-fadeIn">
          {/* Backdrop sombre */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMoreMenuOpen(false)}
          />

          {/* Tiroir */}
          <div className="relative bg-slate-950 border-t-2 border-amber-500/40 rounded-t-3xl shadow-2xl p-4 max-h-[82vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1rem)] space-y-4">
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto" />

            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Menu & Tous les Outils PMU
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1.5 rounded-full bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grille des Onglets d'Expertise */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Pages d'Analyse & Pronostics
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleTabClick('college-gemini');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                    activeTab === 'college-gemini'
                      ? 'bg-amber-500/20 border-amber-500 text-white font-black'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <Brain className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-black">Collège Gemini</div>
                    <div className="text-[10px] text-slate-400">6 IA Spécialisées</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleTabClick('propositions-ia');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                    activeTab === 'propositions-ia'
                      ? 'bg-amber-500/20 border-amber-500 text-white font-black'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-black">Propositions IA</div>
                    <div className="text-[10px] text-slate-400">Base, T5, Q6, Q7</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleTabClick('trios-ia');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                    activeTab === 'trios-ia'
                      ? 'bg-amber-500/20 border-amber-500 text-white font-black'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <Bot className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-black">Multi-IA Trios</div>
                    <div className="text-[10px] text-slate-400">Tiercés & Trios combinés</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleTabClick('ticket');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                    activeTab === 'ticket'
                      ? 'bg-amber-500/20 border-amber-500 text-white font-black'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <Calculator className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-black">Calculateur Tickets</div>
                    <div className="text-[10px] text-slate-400">Coûts des paris PMU</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleTabClick('stats');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                    activeTab === 'stats'
                      ? 'bg-amber-500/20 border-amber-500 text-white font-black'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <BarChart3 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-black">Statistiques</div>
                    <div className="text-[10px] text-slate-400">Courbes & Historique</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleTabClick('fiche-pdf-v38');
                    setIsMoreMenuOpen(false);
                  }}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                    activeTab === 'fiche-pdf-v38'
                      ? 'bg-amber-500/20 border-amber-500 text-white font-black'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <FileText className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-black">Fiche PDF V38</div>
                    <div className="text-[10px] text-slate-400">Impression & Téléchargement</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Outils & Données Live */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Programme Officiel & Données
              </p>
              <div className="grid grid-cols-2 gap-2">
                {onOpenCalendar && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenCalendar();
                      setIsMoreMenuOpen(false);
                    }}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-850 flex items-center gap-2.5"
                  >
                    <Calendar className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold">Calendrier PMU</span>
                  </button>
                )}

                {onOpenPmuApiHub && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenPmuApiHub();
                      setIsMoreMenuOpen(false);
                    }}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-850 flex items-center gap-2.5"
                  >
                    <Database className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-bold">Hub PMU Live</span>
                  </button>
                )}

                {onOpenHistory && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenHistory();
                      setIsMoreMenuOpen(false);
                    }}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-850 flex items-center gap-2.5"
                  >
                    <History className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold">Historique</span>
                  </button>
                )}

                {onOpenFavorites && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenFavorites();
                      setIsMoreMenuOpen(false);
                    }}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-850 flex items-center gap-2.5"
                  >
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold">Mes Favoris</span>
                  </button>
                )}
              </div>
            </div>

            {/* Actions Rapides Système */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenInstallModal();
                  setIsMoreMenuOpen(false);
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-transform"
              >
                <Smartphone className="w-4 h-4" />
                <span>Installer PWA / Android</span>
              </button>

              {onResetSession && (
                <button
                  type="button"
                  onClick={() => {
                    onResetSession();
                    setIsMoreMenuOpen(false);
                  }}
                  className="py-3 px-3 rounded-2xl bg-slate-900 border border-slate-800 text-rose-400 font-bold text-xs hover:bg-rose-950/40 flex items-center gap-1.5"
                  title="Réinitialiser la session"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Vider</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
