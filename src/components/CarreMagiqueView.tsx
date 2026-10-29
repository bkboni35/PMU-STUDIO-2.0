import React, { useMemo } from 'react';
import { CourseHippique } from '../types/turf';
import {
  computeCarreMagique,
  computeCarreMagiqueExploitation,
  formatCote,
  CarreMagiqueHorseItem,
} from '../utils/v38Helper';
import { useSysteme74 } from '../utils/systeme74Store';
import { getHorseBadgeTheme } from '../utils/horseBadgeTheme';

interface CarreMagiqueViewProps {
  course: CourseHippique;
  onSelectHorse?: (numero: number) => void;
  selectedHorseNumbers?: number[];
}

export const CarreMagiqueView: React.FC<CarreMagiqueViewProps> = ({
  course,
  onSelectHorse,
  selectedHorseNumbers = [],
}) => {
  const { threshold: diffXThreshold, mode: diffXMode } = useSysteme74();
  const filterMinScoreX = diffXMode === 'EXCLUDE';

  // Calcul du Carré Magique avec répartition stricte par couleur de badge
  const carreResult = useMemo(() => {
    return computeCarreMagique(course, {
      filterMinScoreX,
      minScoreXThreshold: diffXThreshold,
    });
  }, [course, filterMinScoreX, diffXThreshold]);

  const { col1Vert, col2Orange, col3Rouge, extraHorses } = carreResult;

  // Exploitation tactique issue du Carré Magique (Zone Gagnant, Coup de cœur, Outsiders, Rang 4e, Délaissés)
  const exploitation = useMemo(() => {
    return computeCarreMagiqueExploitation(carreResult, course);
  }, [carreResult, course]);

  const renderHorseRow = (
    item: CarreMagiqueHorseItem | undefined,
    colIndex: number,
    rowIndex: number,
    isFirst: boolean = false
  ) => {
    if (!item) return null;

    const p = item.partant;
    const formattedCote = formatCote(item.cote);
    const formattedScore = item.scoreX.toFixed(1).replace('.', ',');
    const isSelected = selectedHorseNumbers?.includes(item.num);

    const isTopScoreInMeforme = colIndex === 2 && isFirst && (item.scoreX >= 60 || item.cote <= 15);

    const groupHint = colIndex === 0 ? 'favoris' : colIndex === 1 ? 'outsiders' : 'surprises';
    const badge = getHorseBadgeTheme(item.num, course, groupHint, item.scoreX, item.cote);

    const dotColor =
      item.badgeColor === 'VERT'
        ? '#10b981'
        : item.badgeColor === 'ORANGE'
        ? '#eab308'
        : '#ef4444';

    // Mise en forme conditionnelle de la ligne
    const rowBgClass = isSelected
      ? 'bg-emerald-950/70 text-white ring-2 ring-inset ring-emerald-400'
      : colIndex === 2 && isFirst
      ? isTopScoreInMeforme
        ? 'bg-gradient-to-r from-rose-950/70 via-[#1d142c]/90 to-amber-950/40 hover:bg-[#251a3a]'
        : 'bg-gradient-to-r from-rose-950/60 via-[#181226]/80 to-[#101726] hover:bg-[#1e1730]'
      : 'bg-[#0f1728] hover:bg-[#162238]';

    return (
      <div
        key={`horse-${item.num}-${rowIndex}`}
        onClick={() => onSelectHorse && onSelectHorse(item.num)}
        className={`w-full h-[44px] sm:h-[48px] px-2.5 sm:px-3 flex items-center justify-between gap-2 group cursor-pointer transition-colors ${rowBgClass}`}
        title={`N°${item.num} ${p.nom} | Score X: ${item.scoreX} | Cote: ${formattedCote} | Rang 74: ${item.rangSysteme74}e (Cliquer pour sélectionner)`}
      >
        {/* Partie Gauche : Badge Numéro 3D + Dot Forme + Nom du Cheval + Badge Conditionnel */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Badge Numéro 3D biseauté et brillant (comme dans image_fead3651.png) */}
          <span
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-mono font-black text-xs sm:text-sm flex items-center justify-center shrink-0 border-2 ${badge.textColor} relative overflow-hidden`}
            style={{
              background: badge.background,
              borderColor: badge.borderColor,
              boxShadow: badge.boxShadow,
              textShadow: '0 1px 2px rgba(0,0,0,0.85)',
            }}
          >
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none rounded-t" />
            <span className="z-10">{item.num}</span>
          </span>

          {/* Pastille Ronde Forme (🟢 Vert, 🟡 Orange/Jaune, 🔴 Rouge) */}
          <span
            className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/50 shadow-xs"
            style={{ backgroundColor: dotColor }}
            title={`Badge Forme : ${item.badgeLabel}`}
          />

          {/* Nom du cheval en lettres capitales grasses */}
          <span className="font-black text-white uppercase text-xs sm:text-[13px] tracking-wide truncate min-w-0 group-hover:text-cyan-300 transition-colors">
            {p.nom}
          </span>
        </div>

        {/* Partie Droite : Score X + Séparateur + Cote */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Score X dans son encadré sombre ou conditionnel */}
          <span
            className={`px-1.5 sm:px-2 py-0.5 rounded-lg border text-[10px] sm:text-[11px] font-mono font-bold ${
              isTopScoreInMeforme
                ? 'bg-emerald-950/80 border-emerald-400/60 text-emerald-300 font-black'
                : 'bg-[#182337] border-[#2d3d5c] text-slate-200'
            }`}
          >
            {formattedScore}
          </span>

          {/* Barre de séparation verticale */}
          <div className="w-px h-3.5 bg-slate-700/80 shrink-0 mx-0.5" />

          {/* Cote officielle */}
          <span
            className={`text-xs sm:text-[13px] font-mono font-black shrink-0 min-w-[34px] text-right ${
              isTopScoreInMeforme ? 'text-amber-300' : 'text-white'
            }`}
          >
            {formattedCote}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4 animate-fadeIn">
      {/* En-tête Spécial CARRÉ MAGIQUE - Centré avec hauteur réduite */}
      <div className="py-2 sm:py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-amber-950/30 to-rose-950/40 border-2 border-amber-400/50 shadow-lg flex items-center justify-center relative">
        <div className="flex items-center justify-center gap-2 text-center">
          <span className="text-xl sm:text-2xl">✨</span>
          <h4 className="text-white font-black uppercase text-sm sm:text-base tracking-wider">
            CARRÉ MAGIQUE (SYSTÈME 74)
          </h4>
        </div>

        <span className="hidden md:inline-flex absolute right-4 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-amber-400/30 text-amber-300 text-[11px] font-bold">
          Total : {col1Vert.length + col2Orange.length + col3Rouge.length} N°
        </span>
      </div>

      {/* GRILLE DU CARRÉ MAGIQUE AVEC BORDURES GROUPÉES SELON RÈGLES SYSTÈME 74 */}
      <div className="w-full p-3 sm:p-5 rounded-3xl bg-[#090e1a] border-2 border-sky-400/50 shadow-2xl overflow-x-auto">
        <div className="min-w-[720px]">
          {/* En-têtes des 3 Colonnes */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-3">
            {/* Colonne 1 Header */}
            <div className="p-2.5 rounded-2xl bg-emerald-950/70 border-2 border-emerald-500/50 text-center shadow-lg">
              <span className="text-emerald-400 font-black text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-1.5">
                <span>🟢</span> EN FORME
              </span>
              <div className="text-xs font-mono font-black text-white mt-1.5">
                {col1Vert.map((h) => h.num).join(' - ')}
              </div>
            </div>

            {/* Colonne 2 Header */}
            <div className="p-2.5 rounded-2xl bg-amber-950/70 border-2 border-amber-500/50 text-center shadow-lg">
              <span className="text-amber-400 font-black text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-1.5">
                <span>🟡</span> FORME MOYENNE
              </span>
              <div className="text-xs font-mono font-black text-white mt-1.5">
                {col2Orange.map((h) => h.num).join(' - ')}
              </div>
            </div>

            {/* Colonne 3 Header */}
            <div className="p-2.5 rounded-2xl bg-rose-950/70 border-2 border-rose-500/50 text-center shadow-lg">
              <span className="text-rose-400 font-black text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-1.5">
                <span>🔴</span> MEFORME
              </span>
              <div className="text-xs font-mono font-black text-white mt-1.5">
                {col3Rouge.map((h) => h.num).join(' - ')}
              </div>
            </div>
          </div>

          {/* Les 3 Colonnes avec groupement de bordures conforme aux consignes */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 items-start">
            {/* ============================================================ */}
            {/* COLONNE 1 (🟢 EN FORME) :                                    */}
            {/* Encadrement spécial pour les 3 premiers N° (groupés ensemble) */}
            {/* 4e et 5e N° NON encadrés (sans bordure)                       */}
            {/* 6e N° encadré seul dans sa propre bordure                     */}
            {/* ============================================================ */}
            <div className="space-y-3">
              {/* Groupe 1 : Les 3 premiers N° encadrés ensemble */}
              {col1Vert.slice(0, 3).length > 0 ? (
                <div className="rounded-2xl border-2 border-emerald-500/70 bg-[#0c1424] shadow-xl overflow-hidden divide-y divide-emerald-500/25">
                  {col1Vert.slice(0, 3).map((horse, idx) => renderHorseRow(horse, 0, idx))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-dashed border-emerald-500/30 text-center text-xs text-emerald-400/60 font-mono">
                  Aucun N° En Forme
                </div>
              )}

              {/* 4e N° non encadré (sans bordure) */}
              {col1Vert[3] && (
                <div className="rounded-2xl bg-[#0a0f1d]/40 hover:bg-[#0f172a]/70 transition-colors overflow-hidden border-0">
                  {renderHorseRow(col1Vert[3], 0, 3)}
                </div>
              )}

              {/* 5e N° non encadré (sans bordure) */}
              {col1Vert[4] && (
                <div className="rounded-2xl bg-[#0a0f1d]/40 hover:bg-[#0f172a]/70 transition-colors overflow-hidden border-0">
                  {renderHorseRow(col1Vert[4], 0, 4)}
                </div>
              )}

              {/* 6e N° encadré seul dans sa propre bordure verte */}
              {col1Vert[5] && (
                <div className="rounded-2xl border-2 border-emerald-500/70 bg-[#0c1424] shadow-xl overflow-hidden">
                  {renderHorseRow(col1Vert[5], 0, 5)}
                </div>
              )}
            </div>

            {/* ============================================================ */}
            {/* COLONNE 2 (🟡 FORME MOYENNE) :                               */}
            {/* 3 premiers N° ensemble dans une bordure +                    */}
            {/* 4e N° laissé seul                                            */}
            {/* ============================================================ */}
            <div className="space-y-3">
              {/* Groupe 1 : Les 3 premiers N° ensemble */}
              {col2Orange.slice(0, 3).length > 0 ? (
                <div className="rounded-2xl border-2 border-amber-500/70 bg-[#0c1424] shadow-xl overflow-hidden divide-y divide-amber-500/25">
                  {col2Orange.slice(0, 3).map((horse, idx) => renderHorseRow(horse, 1, idx))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-dashed border-amber-500/30 text-center text-xs text-amber-400/60 font-mono">
                  Aucun N° Forme Moyenne
                </div>
              )}

              {/* 4e N° non encadré (sans bordure) */}
              {col2Orange[3] && (
                <div className="rounded-2xl bg-[#0a0f1d]/40 hover:bg-[#0f172a]/70 transition-colors overflow-hidden border-0">
                  {renderHorseRow(col2Orange[3], 1, 3)}
                </div>
              )}
            </div>

            {/* ============================================================ */}
            {/* COLONNE 3 (🔴 MEFORME) :                                     */}
            {/* Style conditionnel : Encadrer UNIQUEMENT le 1er et le 4e N°   */}
            {/* Les 2e et 3e N° ne sont PAS encadrés (aucune bordure)         */}
            {/* ============================================================ */}
            <div className="space-y-3">
              {col3Rouge.length > 0 ? (
                col3Rouge.map((horse, idx) => {
                  const isFirst = idx === 0;
                  const isFourth = idx === 3;
                  const isTopScoreInMeforme = isFirst && (horse.scoreX >= 60 || horse.cote <= 15);

                  // Style conditionnel du rectangle :
                  // 1er N° : Encadré avec mise en forme conditionnelle (ambre/or si top score, ou rose illuminé)
                  // 4e N°  : Encadré (bordure rouge/rose dédiée)
                  // 2e & 3e N° : NON encadrés (aucune bordure / sans cadre)
                  let containerClass = 'rounded-2xl bg-[#0a0f1d]/40 hover:bg-[#0f172a]/70 transition-colors overflow-hidden border-0';

                  if (isFirst) {
                    containerClass = isTopScoreInMeforme
                      ? 'rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-rose-950/90 via-[#1c132b] to-amber-950/60 shadow-xl shadow-amber-950/40 ring-2 ring-amber-400/40 overflow-hidden'
                      : 'rounded-2xl border-2 border-rose-400 bg-gradient-to-r from-rose-950/80 via-[#181326] to-[#0f1728] shadow-xl shadow-rose-950/40 ring-1 ring-rose-400/40 overflow-hidden';
                  } else if (isFourth) {
                    containerClass = 'rounded-2xl border-2 border-rose-500/70 bg-[#0c1424] shadow-xl overflow-hidden';
                  }

                  return (
                    <div
                      key={`col3-solo-${horse.num}-${idx}`}
                      className={containerClass}
                    >
                      {renderHorseRow(horse, 2, idx, isFirst)}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 rounded-2xl border border-dashed border-rose-500/30 text-center text-xs text-rose-400/60 font-mono">
                  Aucun N° Méforme
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SYNTHÈSE ET EXPLOITATION TACTIQUE DU CARRÉ MAGIQUE */}
      <div className="w-full p-4 sm:p-5 rounded-3xl bg-[#090e1a] border-2 border-amber-400/60 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-400/20 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl sm:text-3xl">✨</span>
            <div>
              <h3 className="text-white font-black uppercase text-base sm:text-lg tracking-wider">
                SYNTHÈSE ET EXPLOITATION DU CARRÉ MAGIQUE
              </h3>
              <p className="text-xs text-amber-300/80 font-semibold mt-0.5">
                Rubriques d'exploitation calculées automatiquement à la suite du Carré Magique
              </p>
            </div>
          </div>
        </div>

        {/* GRILLE DES 4 RUBRIQUES PRINCIPALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. ZONE DU GAGNANT (3 N°) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-amber-950/40 via-[#0e1628] to-[#090e1a] border-2 border-amber-400/70 shadow-xl space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 border-b border-amber-400/30 pb-2 mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <span>👑</span> ZONE DU GAGNANT
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/50 text-[10px] font-black font-mono">
                  3 N°
                </span>
              </div>

              {/* Bandes de résumé type image exemple : [ 5 | 1 | 4 ] */}
              <div className="p-2 rounded-xl bg-slate-950/80 border border-amber-400/40 text-center font-mono text-sm font-black text-amber-300 mb-2.5 flex items-center justify-center gap-2 shadow-inner">
                <span className="text-[10px] uppercase font-sans text-slate-400 font-bold">Sélection :</span>
                <span>
                  [ {exploitation.zoneGagnant.length > 0 ? exploitation.zoneGagnant.map((z) => z.item.num).join(' | ') : '—'} ]
                </span>
              </div>

              {/* Cartes détaillées */}
              <div className="space-y-1.5">
                {exploitation.zoneGagnant.map((z) => {
                  const badge = getHorseBadgeTheme(z.item.num, course, 'favoris', z.item.scoreX, z.item.cote);
                  const formattedScore = z.item.scoreX.toFixed(1).replace('.', ',');
                  const formattedCote = formatCote(z.item.cote);
                  return (
                    <div
                      key={`zg-${z.item.num}`}
                      onClick={() => onSelectHorse && onSelectHorse(z.item.num)}
                      className="p-2 rounded-xl bg-[#121a2c] border border-amber-500/30 hover:border-amber-400 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className={`w-6 h-6 rounded-lg font-mono font-black text-xs flex items-center justify-center shrink-0 border ${badge.textColor}`}
                          style={{ background: badge.background, borderColor: badge.borderColor }}
                        >
                          {z.item.num}
                        </span>
                        <span className="text-[11px] font-black text-white uppercase truncate group-hover:text-amber-300">
                          {z.item.partant.nom}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="px-1.5 py-0.5 rounded-md bg-[#182337] border border-[#2d3d5c] text-[10px] font-mono font-bold text-slate-200" title="Score X">
                          {formattedScore}
                        </span>
                        <span className="text-xs font-mono font-black text-amber-300 min-w-[32px] text-right" title="Cote">
                          {formattedCote}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. 1 COUP DE CŒUR (1 N°) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-rose-950/40 via-[#0e1628] to-[#090e1a] border-2 border-rose-400/70 shadow-xl space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 border-b border-rose-400/30 pb-2 mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                  <span>❤️</span> COUP DE CŒUR
                </span>
                <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-400/50 text-[10px] font-black font-mono">
                  1 N°
                </span>
              </div>

              {/* Bandes de résumé type image exemple : [ 18 ] */}
              <div className="p-2 rounded-xl bg-slate-950/80 border border-rose-400/40 text-center font-mono text-sm font-black text-rose-300 mb-2.5 flex items-center justify-center gap-2 shadow-inner">
                <span className="text-[10px] uppercase font-sans text-slate-400 font-bold">Sélection :</span>
                <span>
                  [ {exploitation.coupDeCoeur ? exploitation.coupDeCoeur.item.num : '—'} ]
                </span>
              </div>

              {/* Carte détaillée */}
              {exploitation.coupDeCoeur && (() => {
                const item = exploitation.coupDeCoeur.item;
                const formattedScore = item.scoreX.toFixed(1).replace('.', ',');
                const formattedCote = formatCote(item.cote);
                return (
                  <div
                    onClick={() => onSelectHorse && onSelectHorse(item.num)}
                    className="p-2 rounded-xl bg-[#121a2c] border border-rose-500/30 hover:border-rose-400 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-6 h-6 rounded-lg font-mono font-black text-xs flex items-center justify-center shrink-0 border border-rose-300 bg-rose-600 text-white">
                        {item.num}
                      </span>
                      <span className="text-[11px] font-black text-white uppercase truncate group-hover:text-rose-300">
                        {item.partant.nom}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="px-1.5 py-0.5 rounded-md bg-[#182337] border border-[#2d3d5c] text-[10px] font-mono font-bold text-slate-200" title="Score X">
                        {formattedScore}
                      </span>
                      <span className="text-xs font-mono font-black text-rose-300 min-w-[32px] text-right" title="Cote">
                        {formattedCote}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 3. OUTSIDERS (4 N°) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-orange-950/40 via-[#0e1628] to-[#090e1a] border-2 border-orange-400/70 shadow-xl space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 border-b border-orange-400/30 pb-2 mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-orange-300 flex items-center gap-1.5">
                  <span>💥</span> OUTSIDERS
                </span>
                <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 border border-orange-400/50 text-[10px] font-black font-mono">
                  4 N°
                </span>
              </div>

              {/* Bandes de résumé type image exemple : [ 13 | 8 | 2 | 3 ] */}
              <div className="p-2 rounded-xl bg-slate-950/80 border border-orange-400/40 text-center font-mono text-sm font-black text-orange-300 mb-2.5 flex items-center justify-center gap-2 shadow-inner">
                <span className="text-[10px] uppercase font-sans text-slate-400 font-bold">Sélection :</span>
                <span>
                  [ {exploitation.outsiders.length > 0 ? exploitation.outsiders.map((o) => o.item.num).join(' | ') : '—'} ]
                </span>
              </div>

              {/* Cartes détaillées */}
              <div className="space-y-1.5">
                {exploitation.outsiders.map((o) => {
                  const badge = getHorseBadgeTheme(o.item.num, course, 'outsiders', o.item.scoreX, o.item.cote);
                  const formattedScore = o.item.scoreX.toFixed(1).replace('.', ',');
                  const formattedCote = formatCote(o.item.cote);
                  return (
                    <div
                      key={`out-${o.item.num}`}
                      onClick={() => onSelectHorse && onSelectHorse(o.item.num)}
                      className="p-2 rounded-xl bg-[#121a2c] border border-orange-500/30 hover:border-orange-400 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className={`w-6 h-6 rounded-lg font-mono font-black text-xs flex items-center justify-center shrink-0 border ${badge.textColor}`}
                          style={{ background: badge.background, borderColor: badge.borderColor }}
                        >
                          {o.item.num}
                        </span>
                        <span className="text-[11px] font-black text-white uppercase truncate group-hover:text-orange-300">
                          {o.item.partant.nom}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="px-1.5 py-0.5 rounded-md bg-[#182337] border border-[#2d3d5c] text-[10px] font-mono font-bold text-slate-200" title="Score X">
                          {formattedScore}
                        </span>
                        <span className="text-xs font-mono font-black text-orange-300 min-w-[32px] text-right" title="Cote">
                          {formattedCote}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. PROBABLE 4e / RANG 4e (1 N°) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-sky-950/40 via-[#0e1628] to-[#090e1a] border-2 border-sky-400/70 shadow-xl space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 border-b border-sky-400/30 pb-2 mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                  <span>🎯</span> RANG 4ᵉ (PROBABLE 4ᵉ)
                </span>
                <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-400/50 text-[10px] font-black font-mono">
                  1 N°
                </span>
              </div>

              {/* Bandes de résumé type image exemple : [ 14 ] */}
              <div className="p-2 rounded-xl bg-slate-950/80 border border-sky-400/40 text-center font-mono text-sm font-black text-sky-300 mb-2.5 flex items-center justify-center gap-2 shadow-inner">
                <span className="text-[10px] uppercase font-sans text-slate-400 font-bold">Sélection :</span>
                <span>
                  [ {exploitation.probableQuatrieme ? exploitation.probableQuatrieme.item.num : '—'} ]
                </span>
              </div>

              {/* Carte détaillée */}
              {exploitation.probableQuatrieme && (() => {
                const item = exploitation.probableQuatrieme.item;
                const formattedScore = item.scoreX.toFixed(1).replace('.', ',');
                const formattedCote = formatCote(item.cote);
                return (
                  <div
                    onClick={() => onSelectHorse && onSelectHorse(item.num)}
                    className="p-2 rounded-xl bg-[#121a2c] border border-sky-500/30 hover:border-sky-400 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-6 h-6 rounded-lg font-mono font-black text-xs flex items-center justify-center shrink-0 border border-sky-300 bg-sky-600 text-white">
                        {item.num}
                      </span>
                      <span className="text-[11px] font-black text-white uppercase truncate group-hover:text-sky-300">
                        {item.partant.nom}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="px-1.5 py-0.5 rounded-md bg-[#182337] border border-[#2d3d5c] text-[10px] font-mono font-bold text-slate-200" title="Score X">
                        {formattedScore}
                      </span>
                      <span className="text-xs font-mono font-black text-sky-300 min-w-[32px] text-right" title="Cote">
                        {formattedCote}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* 5. DÉLAISSÉS = Tous les autres N° non retenus dans les sélections du haut, classés par cotes */}
        <div className="p-3.5 rounded-2xl bg-[#0e1628] border border-slate-700/80 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                DÉLAISSÉS (Classés par Cotes)
              </h4>
              <span className="text-[10px] text-slate-400 font-semibold">
                — Tous les autres N° non retenus ci-dessus
              </span>
            </div>

            {/* Bandeau au format de l'exemple : Délaissés = 9 - 16 - 15 - 6 - 12 */}
            <div className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-black text-slate-300">
              Délaissés = {exploitation.delaisses.length > 0 ? exploitation.delaisses.map((d) => d.num).join(' - ') : 'Aucun'}
            </div>
          </div>

          {/* Grille détaillée des Délaissés */}
          {exploitation.delaisses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
              {exploitation.delaisses.map((item) => {
                const formattedCote = formatCote(item.cote);
                const formattedScore = item.scoreX.toFixed(1).replace('.', ',');
                const badge = getHorseBadgeTheme(item.num, course, 'tocards', item.scoreX, item.cote);
                const dotColor =
                  item.badgeColor === 'VERT'
                    ? '#10b981'
                    : item.badgeColor === 'ORANGE'
                    ? '#eab308'
                    : '#ef4444';

                return (
                  <div
                    key={`delaisso-${item.num}`}
                    onClick={() => onSelectHorse && onSelectHorse(item.num)}
                    className="h-[44px] px-2.5 rounded-2xl bg-[#121a2c] border border-slate-700/80 hover:border-slate-500 transition-all cursor-pointer flex items-center justify-between gap-2 group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={`w-7 h-7 rounded-xl font-mono font-black text-xs flex items-center justify-center shrink-0 border-2 ${badge.textColor} relative overflow-hidden`}
                        style={{
                          background: badge.background,
                          borderColor: badge.borderColor,
                          boxShadow: badge.boxShadow,
                        }}
                      >
                        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none rounded-t" />
                        <span className="z-10">{item.num}</span>
                      </span>
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/50"
                        style={{ backgroundColor: dotColor }}
                      />
                      <span className="font-bold text-white uppercase text-xs truncate min-w-0 group-hover:text-cyan-300">
                        {item.partant.nom}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 text-xs font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-[#182337] border border-[#2d3d5c] text-[10px] text-slate-200 font-bold">
                        {formattedScore}
                      </span>
                      <span className="text-white font-black">{formattedCote}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic p-2 text-center">
              Tous les chevaux de la course sont déjà retenus dans les rubriques principales.
            </p>
          )}
        </div>
      </div>

      {/* SECTION COMPLÉMENTAIRE : CHEVAUX HORS QUOTAS OU NON PLACÉS */}
      {extraHorses.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <span>📋</span> CHEVAUX HORS QUOTA DU CARRÉ MAGIQUE
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {extraHorses.length} {extraHorses.length > 1 ? 'partants' : 'partant'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
            {extraHorses.map((item) => {
              const formattedCote = formatCote(item.cote);
              const formattedScore = item.scoreX.toFixed(1).replace('.', ',');
              const badge = getHorseBadgeTheme(item.num, course, 'tocards', item.scoreX, item.cote);
              const dotColor =
                item.badgeColor === 'VERT'
                  ? '#10b981'
                  : item.badgeColor === 'ORANGE'
                  ? '#eab308'
                  : '#ef4444';

              return (
                <div
                  key={`extra-horse-${item.num}`}
                  onClick={() => onSelectHorse && onSelectHorse(item.num)}
                  className="h-[44px] px-2.5 rounded-2xl bg-[#101726] border border-[#222f49] hover:border-slate-600 transition-all cursor-pointer flex items-center justify-between gap-2 group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`w-7 h-7 rounded-xl font-mono font-black text-xs flex items-center justify-center shrink-0 border-2 ${badge.textColor} relative overflow-hidden`}
                      style={{
                        background: badge.background,
                        borderColor: badge.borderColor,
                        boxShadow: badge.boxShadow,
                      }}
                    >
                      <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none rounded-t" />
                      <span className="z-10">{item.num}</span>
                    </span>
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/50"
                      style={{ backgroundColor: dotColor }}
                    />
                    <span className="font-bold text-white uppercase text-xs truncate min-w-0 group-hover:text-cyan-300">
                      {item.partant.nom}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-xs font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-[#182337] border border-[#2d3d5c] text-[10px] text-slate-200 font-bold">
                      {formattedScore}
                    </span>
                    <span className="text-white font-black">{formattedCote}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
