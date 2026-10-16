import React from 'react';
import {
  Brain,
  Sparkles,
  TableProperties,
  Calculator,
  Target,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';

export type MainTabType = 'synthese' | 'propositions' | 'partants' | 'gemini' | 'tickets';

interface AndroidBottomNavProps {
  activeTab: MainTabType;
  onChangeTab: (tab: MainTabType) => void;
  onOpenInstallModal: () => void;
  isInstallable?: boolean;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenInstallModal,
}) => {
  const tabs: { id: MainTabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'synthese', label: 'Synthèse', icon: Target },
    { id: 'partants', label: 'Partants', icon: TableProperties },
    { id: 'propositions', label: 'Jeux IA', icon: Sparkles },
    { id: 'gemini', label: '6 IA', icon: Brain },
    { id: 'tickets', label: 'Tickets', icon: Calculator },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/98 backdrop-blur-2xl border-t border-slate-800/80 pb-[env(safe-area-inset-bottom)] sm:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      <div className="grid grid-cols-6 items-center justify-around px-1 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onChangeTab(tab.id);
                if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                  try {
                    navigator.vibrate(10);
                  } catch {}
                }
              }}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all relative ${
                isActive
                  ? 'text-amber-400 font-black'
                  : 'text-slate-400 active:scale-95 active:bg-slate-900/50'
              }`}
            >
              <div
                className={`p-1.5 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'bg-amber-500/15 shadow-inner scale-110'
                    : 'group-hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'text-amber-400 scale-110' : 'text-slate-500'}`} />
              </div>
              <span className={`text-[9px] font-bold tracking-tighter mt-1 leading-none uppercase ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse" />
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenInstallModal}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all text-emerald-400 active:scale-95 active:bg-emerald-950/30"
          title="Installer l'application"
        >
          <div className="p-1.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Smartphone className="w-5 h-5 animate-bounce" />
          </div>
          <span className="text-[9px] font-black tracking-tighter mt-1 leading-none uppercase opacity-80">
            Install
          </span>
        </button>
      </div>
    </nav>
  );
};
