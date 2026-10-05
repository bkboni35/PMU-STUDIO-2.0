import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Laptop, Check, Wand2, Sparkles } from 'lucide-react';
import {
  ThemeMode,
  getStoredThemeMode,
  setStoredThemeMode,
  getEffectiveTheme,
} from '../utils/themeManager';
import {
  NanoBananaPalette,
  getStoredPalette,
  setStoredPalette,
  PALETTES,
} from './GeminiNanoBananaPaletteSelector';

export const ThemeToggleWidget: React.FC = () => {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>('dark');
  const [activePalette, setActivePalette] = useState<NanoBananaPalette>('jaune');
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentMode = getStoredThemeMode();
    setMode(currentMode);
    setEffectiveTheme(getEffectiveTheme(currentMode));
    setActivePalette(getStoredPalette());

    const handleThemeChange = (e: Event) => {
      const customEv = e as CustomEvent<{ mode: ThemeMode; effective: 'dark' | 'light' }>;
      if (customEv?.detail) {
        setMode(customEv.detail.mode);
        setEffectiveTheme(customEv.detail.effective);
      }
    };

    const handlePaletteChange = (e: Event) => {
      const customEv = e as CustomEvent<{ palette: NanoBananaPalette }>;
      if (customEv?.detail?.palette) {
        setActivePalette(customEv.detail.palette);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('hippoanalyse-theme-changed', handleThemeChange);
    window.addEventListener('nanobanana-palette-changed', handlePaletteChange);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('hippoanalyse-theme-changed', handleThemeChange);
      window.removeEventListener('nanobanana-palette-changed', handlePaletteChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectMode = (newMode: ThemeMode) => {
    const effective = setStoredThemeMode(newMode);
    setMode(newMode);
    setEffectiveTheme(effective);
    setIsOpen(false); // Ferme et revient à l'état initial
  };

  const handleSelectPalette = (palette: NanoBananaPalette) => {
    setStoredPalette(palette);
    setActivePalette(palette);
    setIsOpen(false); // Ferme et revient à l'état initial
  };

  const currentPaletteInfo = PALETTES.find(p => p.id === activePalette) || PALETTES[0];

  return (
    <div className="relative" ref={widgetRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-black transition-all shadow-md active:scale-95"
        title="Thème automatique, sombre/clair et palettes Gemini Nano Banana"
      >
        <Wand2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        {effectiveTheme === 'dark' ? (
          <Moon className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        )}
        <span className="hidden sm:inline text-white">
          {mode === 'system' ? 'Auto' : mode === 'dark' ? 'Sombre' : 'Clair'} · {currentPaletteInfo.name.split(' ')[1]}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-3xl bg-slate-900 border-2 border-amber-500/50 shadow-2xl p-3 z-50 animate-fadeIn space-y-3">
          {/* Section 1 : Thème d'affichage (Système / Sombre / Clair) */}
          <div>
            <div className="px-2 py-1 text-[10px] uppercase font-black text-amber-400 tracking-wider flex items-center gap-1">
              <Sun className="w-3 h-3" />
              <span>1. Mode d'Affichage Automatique</span>
            </div>
            <div className="grid grid-cols-3 gap-1 mt-1">
              <button
                type="button"
                onClick={() => handleSelectMode('system')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-bold transition-all ${
                  mode === 'system'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 mb-1" />
                <span>Auto</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMode('dark')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-bold transition-all ${
                  mode === 'dark'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Moon className="w-3.5 h-3.5 mb-1" />
                <span>Sombre</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMode('light')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-[11px] font-bold transition-all ${
                  mode === 'light'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Sun className="w-3.5 h-3.5 mb-1" />
                <span>Clair</span>
              </button>
            </div>
          </div>

          {/* Section 2 : Palettes Gemini Image / Nano Banana */}
          <div className="pt-2 border-t border-slate-800">
            <div className="px-2 py-1 text-[10px] uppercase font-black text-amber-400 tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>2. Palettes de Couleurs Gemini Nano Banana</span>
            </div>
            <div className="space-y-1 mt-1">
              {PALETTES.map((p) => {
                const isSelected = p.id === activePalette;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPalette(p.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-200 border-amber-500/60 shadow-md'
                        : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full ${p.colorClass} shrink-0 shadow-sm`} />
                      <span>{p.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
