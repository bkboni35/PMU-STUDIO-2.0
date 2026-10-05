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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 pb-[env(safe-area-inset-bottom)] sm:hidden shadow-2xl">
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
                // Optional haptic vibration on Android devices
                if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                  try {
                    navigator.vibrate(15);
                  } catch {}
                }
              }}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all relative ${
                isActive
                  ? 'text-amber-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 active:scale-95'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive
                    ? 'bg-amber-500/20 shadow-sm shadow-amber-500/20'
                    : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400 scale-110' : 'text-slate-400'}`} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 leading-none">
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute bottom-0.5" />
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenInstallModal}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all text-emerald-400 hover:text-emerald-300 active:scale-95"
          title="Installer l'application sur Windows ou Android"
        >
          <div className="p-1 rounded-xl bg-emerald-500/20 text-emerald-300">
            <Smartphone className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-black tracking-tight mt-0.5 leading-none">
            Installer
          </span>
        </button>
      </div>
    </nav>
  );
};
