import React, { useState, useEffect } from 'react';
import { Sparkles, Palette, Check, Wand2 } from 'lucide-react';

export type NanoBananaPalette = 
  | 'vert-clair' 
  | 'blanc' 
  | 'dark' 
  | 'bleu-clair' 
  | 'bleu-fonce' 
  | 'violet' 
  | 'orange' 
  | 'rouge' 
  | 'jaune';

export interface ThemeColors {
  id: NanoBananaPalette;
  name: string;
  bg: string;
  text: string;
  secondary: string;
  title: string;
  colorClass: string;
  badgeBg: string;
}

export const THEME_PALETTES: ThemeColors[] = [
  { id: 'vert-clair', name: '🟢 Vert clair', bg: '#E8F5E9', text: '#173B2D', secondary: '#466057', title: '#0B6B43', colorClass: 'bg-emerald-400', badgeBg: 'bg-emerald-500/20 text-emerald-800 border-emerald-500/40' },
  { id: 'blanc', name: '⚪ Blanc', bg: '#FFFFFF', text: '#17202A', secondary: '#52606D', title: '#006B4F', colorClass: 'bg-slate-300', badgeBg: 'bg-slate-200 text-slate-800 border-slate-300' },
  { id: 'dark', name: '🌑 Noir / Dark', bg: '#121826', text: '#F5F7FA', secondary: '#B8C1CC', title: '#66D19E', colorClass: 'bg-slate-900', badgeBg: 'bg-slate-800 text-slate-200 border-slate-700' },
  { id: 'bleu-clair', name: '🔵 Bleu clair', bg: '#EAF4FF', text: '#172B4D', secondary: '#52677D', title: '#075985', colorClass: 'bg-blue-400', badgeBg: 'bg-blue-500/20 text-blue-900 border-blue-500/40' },
  { id: 'bleu-fonce', name: '🟦 Bleu foncé', bg: '#0F172A', text: '#F8FAFC', secondary: '#CBD5E1', title: '#7DD3FC', colorClass: 'bg-blue-600', badgeBg: 'bg-blue-600/30 text-blue-200 border-blue-500/40' },
  { id: 'violet', name: '🟣 Violet', bg: '#F3EEFF', text: '#2E2147', secondary: '#665A7A', title: '#6D28D9', colorClass: 'bg-purple-400', badgeBg: 'bg-purple-500/20 text-purple-900 border-purple-500/40' },
  { id: 'orange', name: '🟠 Orange', bg: '#FFF4E5', text: '#3B2A1A', secondary: '#6B5B45', title: '#C2410C', colorClass: 'bg-orange-400', badgeBg: 'bg-orange-500/20 text-orange-900 border-orange-500/40' },
  { id: 'rouge', name: '🔴 Rouge', bg: '#FFF0F0', text: '#3B1717', secondary: '#6B4A4A', title: '#B91C1C', colorClass: 'bg-red-400', badgeBg: 'bg-red-500/20 text-red-900 border-red-500/40' },
  { id: 'jaune', name: '🟡 Jaune', bg: '#FFFBEA', text: '#332B00', secondary: '#665F32', title: '#92400E', colorClass: 'bg-amber-400', badgeBg: 'bg-amber-500/20 text-amber-900 border-amber-500/40' },
];

export const PALETTES = THEME_PALETTES;

const PALETTE_STORAGE_KEY = 'hippoanalyse_nanobanana_palette_v2';

export function getStoredPalette(): NanoBananaPalette {
  try {
    const raw = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (THEME_PALETTES.some(p => p.id === raw)) {
      return raw as NanoBananaPalette;
    }
  } catch {}
  return 'bleu-fonce';
}

export function setStoredPalette(palette: NanoBananaPalette): void {
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, palette);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-nanobanana-palette', palette);
      const themeConfig = THEME_PALETTES.find(p => p.id === palette) || THEME_PALETTES[2];
      document.documentElement.style.setProperty('--theme-bg', themeConfig.bg);
      document.documentElement.style.setProperty('--theme-text', themeConfig.text);
      document.documentElement.style.setProperty('--theme-secondary', themeConfig.secondary);
      document.documentElement.style.setProperty('--theme-title', themeConfig.title);
      window.dispatchEvent(new CustomEvent('nanobanana-palette-changed', { detail: { palette } }));
    }
  } catch (e) {
    console.error('Erreur sauvegarde palette Nano Banana:', e);
  }
}

export function initNanoBananaPalette(): void {
  if (typeof document === 'undefined') return;
  const current = getStoredPalette();
  document.documentElement.setAttribute('data-nanobanana-palette', current);
  const themeConfig = THEME_PALETTES.find(p => p.id === current) || THEME_PALETTES[2];
  document.documentElement.style.setProperty('--theme-bg', themeConfig.bg);
  document.documentElement.style.setProperty('--theme-text', themeConfig.text);
  document.documentElement.style.setProperty('--theme-secondary', themeConfig.secondary);
  document.documentElement.style.setProperty('--theme-title', themeConfig.title);
}

export const GeminiNanoBananaPaletteSelector: React.FC = () => {
  const [activePalette, setActivePalette] = useState<NanoBananaPalette>('dark');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setActivePalette(getStoredPalette());
    initNanoBananaPalette();

    const handlePaletteChange = (e: Event) => {
      const customEv = e as CustomEvent<{ palette: NanoBananaPalette }>;
      if (customEv?.detail?.palette) {
        setActivePalette(customEv.detail.palette);
      }
    };

    window.addEventListener('nanobanana-palette-changed', handlePaletteChange);
    return () => window.removeEventListener('nanobanana-palette-changed', handlePaletteChange);
  }, []);

  const currentInfo = THEME_PALETTES.find(p => p.id === activePalette) || THEME_PALETTES[2];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/20 hover:from-amber-500/30 hover:to-slate-800 text-amber-300 border border-amber-500/40 text-xs font-black transition-all shadow-md active:scale-95"
        title="Choisir le thème et la palette de couleurs"
      >
        <Wand2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span className="hidden sm:inline">Thème :</span>
        <span className="text-white font-extrabold">{currentInfo.name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-3xl bg-slate-900 border-2 border-amber-500/50 shadow-2xl p-3 z-50 animate-fadeIn space-y-2 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Thèmes & Couleurs d'Interface
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-extrabold">
              9 Styles
            </span>
          </div>

          <div className="space-y-1.5">
            {THEME_PALETTES.map((p) => {
              const isSelected = p.id === activePalette;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setStoredPalette(p.id);
                    setActivePalette(p.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold transition-all border ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-200 border-amber-500/60 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/30'
                      : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="w-4 h-4 rounded-full shadow-sm shrink-0 border border-white/20" 
                      style={{ backgroundColor: p.bg }} 
                    />
                    <div className="text-left">
                      <div className="font-extrabold text-white text-xs">{p.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                        <span style={{ color: p.title }}>Titres</span> · <span style={{ color: p.text }}>Texte</span>
                      </div>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-slate-400 text-center pt-1 border-t border-slate-800">
            Design Engine & Contrast Optimization
          </p>
        </div>
      )}
    </div>
  );
};
