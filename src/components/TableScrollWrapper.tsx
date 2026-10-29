import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoveHorizontal,
  SlidersHorizontal,
  Compass,
  ArrowLeftRight,
} from 'lucide-react';

interface TableScrollWrapperProps {
  children: React.ReactNode;
  /** Titre optionnel affiché dans la barre de déplacement */
  title?: string;
  /** Description ou colonnes cibles */
  description?: string;
  /** Masquer le bandeau sur très grands écrans si pas de débordement */
  autoHideIfNoOverflow?: boolean;
  /** Afficher également une barre de contrôle collante en bas pour mobile */
  showBottomStickyBar?: boolean;
  /** Classe CSS additionnelle pour le conteneur principal */
  className?: string;
}

export const TableScrollWrapper: React.FC<TableScrollWrapperProps> = ({
  children,
  title = 'Barre de déplacement du tableau',
  description = 'Déplacez la vue vers la droite ou la gauche pour afficher toutes les colonnes',
  autoHideIfNoOverflow = true,
  showBottomStickyBar = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    const currentScroll = el.scrollLeft;
    const overflow = maxScroll > 8;

    setHasOverflow(overflow);
    setScrollWidth(el.scrollWidth);
    setClientWidth(el.clientWidth);
    setCanScrollLeft(currentScroll > 8);
    setCanScrollRight(currentScroll < maxScroll - 8);

    if (maxScroll > 0) {
      const pct = Math.min(100, Math.max(0, Math.round((currentScroll / maxScroll) * 100)));
      setScrollPercentage(pct);
    } else {
      setScrollPercentage(0);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    checkScroll();

    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });

    // Observer pour détecter les ajouts de contenu ou changements de style
    const ro = new ResizeObserver(() => checkScroll());
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const hapticFeedback = (intensity = 10) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(intensity);
      } catch {
        // Fallback silencieux si non supporté
      }
    }
  };

  const scrollByAmount = (offset: number) => {
    if (!containerRef.current) return;
    hapticFeedback(12);
    containerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const scrollToStart = () => {
    if (!containerRef.current) return;
    hapticFeedback(16);
    containerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
  };

  const scrollToEnd = () => {
    if (!containerRef.current) return;
    hapticFeedback(16);
    containerRef.current.scrollTo({ left: containerRef.current.scrollWidth, behavior: 'smooth' });
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!containerRef.current) return;
    const pct = Number(e.target.value);
    const maxScroll = containerRef.current.scrollWidth - containerRef.current.clientWidth;
    if (maxScroll > 0) {
      containerRef.current.scrollLeft = (pct / 100) * maxScroll;
      setScrollPercentage(pct);
    }
  };

  const getPositionLabel = () => {
    if (!hasOverflow) return 'Tableau complet';
    if (scrollPercentage <= 10) return '◀ Côté Gauche (Ticket, N°, Cheval)';
    if (scrollPercentage >= 90) return 'Côté Droit (Avis, HippoScore, Stats) ▶';
    return `Centre (${scrollPercentage}%)`;
  };

  return (
    <div className={`relative flex flex-col w-full ${className}`}>
      {/* 🌟 Barre Supérieure de Déplacement Horizontal Spéciale Mobile & Écrans Larges */}
      {(hasOverflow || !autoHideIfNoOverflow) && (
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-2.5 sm:p-3 mb-2 shadow-lg transition-all animate-fadeIn">
          {/* Ligne 1 : Titre & Statut de Défilement */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </span>
              <div className="truncate">
                <div className="font-extrabold text-white text-[11px] sm:text-xs flex items-center gap-1.5 truncate">
                  <span>{title}</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-950/80 text-amber-300 border border-amber-500/40 shrink-0">
                    ↔ Défilement
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate hidden xs:block">{description}</p>
              </div>
            </div>

            {/* Badge de Position Actuelle */}
            <div className="shrink-0 flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border flex items-center gap-1 ${
                  scrollPercentage >= 85
                    ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                    : scrollPercentage <= 15
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                }`}
                title="Position actuelle dans la largeur totale"
              >
                <Compass className="w-2.5 h-2.5 shrink-0" />
                <span>{scrollPercentage}%</span>
              </span>
            </div>
          </div>

          {/* Ligne 2 : Contrôles Tactiles (Boutons Gauche/Droite + Curseur Linéaire) */}
          <div className="flex items-center gap-1.5 sm:gap-2 pt-2">
            {/* Bouton Tout à Gauche */}
            <button
              type="button"
              onClick={scrollToStart}
              disabled={!canScrollLeft}
              className={`p-1.5 rounded-xl border flex items-center justify-center transition-all shrink-0 active:scale-95 ${
                canScrollLeft
                  ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-amber-500/40 hover:border-amber-400 shadow-xs'
                  : 'bg-slate-950 text-slate-600 border-slate-800/80 cursor-not-allowed opacity-50'
              }`}
              title="Aller tout au début (gauche)"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Bouton Pas à Pas Gauche */}
            <button
              type="button"
              onClick={() => scrollByAmount(-240)}
              disabled={!canScrollLeft}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border flex items-center gap-1 text-xs font-bold transition-all shrink-0 active:scale-95 ${
                canScrollLeft
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black border-amber-400 shadow-md shadow-amber-500/20 hover:brightness-110'
                  : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
              }`}
              title="Déplacer vers la gauche"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Gauche</span>
            </button>

            {/* Curseur de Défilement (Scrubber / Range Slider) */}
            <div className="flex-1 flex flex-col justify-center px-1 sm:px-2 min-w-0">
              <input
                type="range"
                min="0"
                max="100"
                value={scrollPercentage}
                onChange={handleSliderChange}
                aria-label="Position de défilement horizontal du tableau"
                className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-ew-resize accent-amber-400 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 mt-1 px-0.5">
                <span className={scrollPercentage <= 20 ? 'text-amber-400 font-bold' : ''}>◀ Gauche</span>
                <span className="text-slate-400 text-[10px] font-sans font-medium truncate mx-1 hidden xs:inline">
                  {getPositionLabel()}
                </span>
                <span className={scrollPercentage >= 80 ? 'text-amber-400 font-bold' : ''}>Droite ▶</span>
              </div>
            </div>

            {/* Bouton Pas à Pas Droite */}
            <button
              type="button"
              onClick={() => scrollByAmount(240)}
              disabled={!canScrollRight}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border flex items-center gap-1 text-xs font-bold transition-all shrink-0 active:scale-95 ${
                canScrollRight
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black border-amber-400 shadow-md shadow-amber-500/20 hover:brightness-110'
                  : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
              }`}
              title="Déplacer vers la droite"
            >
              <span className="hidden sm:inline">Droite</span>
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Bouton Tout à Droite */}
            <button
              type="button"
              onClick={scrollToEnd}
              disabled={!canScrollRight}
              className={`p-1.5 rounded-xl border flex items-center justify-center transition-all shrink-0 active:scale-95 ${
                canScrollRight
                  ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-amber-500/40 hover:border-amber-400 shadow-xs'
                  : 'bg-slate-950 text-slate-600 border-slate-800/80 cursor-not-allowed opacity-50'
              }`}
              title="Aller tout à la fin (droite)"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 🌟 Conteneur Scrollable avec Défilement Fluide */}
      <div className="relative group w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950">
        {/* Flèche Flottante Rapide Côté Gauche (apparaît si on peut défiler à gauche) */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollByAmount(-280)}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 z-40 w-9 h-14 rounded-xl bg-slate-950/90 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/40 shadow-xl backdrop-blur-md flex items-center justify-center transition-all active:scale-90"
            title="Glisser vers la gauche"
            aria-label="Glisser vers la gauche"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}

        {/* Flèche Flottante Rapide Côté Droit (apparaît si on peut défiler à droite) */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollByAmount(280)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 z-40 w-9 h-14 rounded-xl bg-slate-950/90 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/40 shadow-xl backdrop-blur-md flex items-center justify-center transition-all active:scale-90 animate-pulse"
            title="Glisser vers la droite (autres colonnes disponibles)"
            aria-label="Glisser vers la droite"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}

        {/* Contenu Défilant Réel */}
        <div
          ref={containerRef}
          className="overflow-x-auto w-full scroll-smooth scrollbar-thin scrollbar-thumb-amber-500/40 scrollbar-track-slate-950"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>
      </div>

      {/* 🌟 Barre Inférieure Rapide Collante sur Mobile (si débordement) */}
      {showBottomStickyBar && hasOverflow && (
        <div className="flex items-center justify-between gap-2 mt-2 px-3 py-1.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-slate-400 shadow-md">
          <button
            type="button"
            onClick={() => scrollByAmount(-200)}
            disabled={!canScrollLeft}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
              canScrollLeft
                ? 'bg-slate-900 text-amber-300 border-amber-500/40 active:scale-95'
                : 'bg-slate-950 text-slate-600 border-slate-800/80 opacity-50 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>◀ Voir gauche</span>
          </button>

          <span className="font-mono text-[10px] text-amber-400 font-bold">
            ↔ {scrollPercentage}% défilé
          </span>

          <button
            type="button"
            onClick={() => scrollByAmount(200)}
            disabled={!canScrollRight}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
              canScrollRight
                ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-sm active:scale-95'
                : 'bg-slate-950 text-slate-600 border-slate-800/80 opacity-50 cursor-not-allowed'
            }`}
          >
            <span>Voir droite ▶</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
export default TableScrollWrapper;
