import React, { useState, useMemo, useEffect } from 'react';
import { CourseHippique, Partant } from '../types/turf';
import { computeV38Hierarchy, getHorseGenyOdds, computeSysteme74TacticalGroups } from '../utils/v38Helper';
import { classerChevauxFormeEtPoints } from '../utils/turfCalculations';
import { TableScrollWrapper } from './TableScrollWrapper';
import { parseHorseCordeNumber } from '../utils/cordeExtractor';
import { useSysteme74 } from '../utils/systeme74Store';
import { Systeme74ThresholdControlBar } from './Systeme74ThresholdControlBar';
import { TableauSyntheseTactique } from './TableauSyntheseTactique';
import { Systeme74RulesModal } from './Systeme74RulesModal';
import { CarreMagiqueView } from './CarreMagiqueView';

interface TableauHierarchieGroupesProps {
  course: CourseHippique;
  onSelectHorse?: (numero: number) => void;
}

export type ColumnMode = 'GROUPS_ABC' | 'FORME' | 'DEFERRAGE' | 'CORDE' | 'P_TACTIQUE' | 'CARRE_MAGIQUE';

export const TableauHierarchieGroupes: React.FC<TableauHierarchieGroupesProps> = ({
  course,
  onSelectHorse,
}) => {
  const [columnMode, setColumnMode] = useState<ColumnMode>('GROUPS_ABC');
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const { threshold: diffXThreshold, mode: diffXMode } = useSysteme74();

  // Groupes tactiques Système 74 pour la vue P_TACTIQUE
  const { groupA, groupB, groupC } = useMemo(() => {
    return computeSysteme74TacticalGroups(course.partants || [], {
      filterMinScoreX: diffXMode === 'EXCLUDE',
      minScoreXThreshold: diffXThreshold,
    });
  }, [course.partants, diffXMode, diffXThreshold]);

  const allPartantsWithX = useMemo(() => {
    return (course.partants || [])
      .filter((p) => !p.estNonPartant && p.statut !== 'Non-partant')
      .map((p) => {
        const num = Number(p.numero);
        const cote = getHorseGenyOdds(p);
        const scoreX = Math.round(((73 + num) - cote) * 10) / 10;
        return { num, scoreX };
      });
  }, [course.partants]);

  // Détection de la discipline
  const disciplineStr = (course.discipline || '').toLowerCase();
  const hasFerrureData = (course.partants || []).some(
    (p) => p.ferrure === 'D4' || p.ferrure === 'DP' || p.ferrure === 'DA'
  );
  const hasCordeData = (course.partants || []).some(
    (p) => (p.corde != null && Number(p.corde) > 0) || (p as any).stalle != null
  );

  const isTrotCourse =
    disciplineStr.includes('trot') ||
    disciplineStr.includes('attel') ||
    disciplineStr.includes('mont') ||
    (hasFerrureData && !disciplineStr.includes('plat'));

  const isPlatCourse =
    disciplineStr.includes('plat') ||
    disciplineStr.includes('galop') ||
    (hasCordeData && !isTrotCourse);

  // Synchronisation contextuelle : si l'utilisateur est en mode Déferrage et bascule sur du Plat, on bascule sur Corde
  useEffect(() => {
    if (isPlatCourse && columnMode === 'DEFERRAGE') {
      setColumnMode('CORDE');
    } else if (isTrotCourse && columnMode === 'CORDE') {
      setColumnMode('DEFERRAGE');
    }
  }, [isPlatCourse, isTrotCourse]);

  // Extraction du numéro de corde pour une course de plat
  const getPartantCordeNumber = (p: Partant): number => {
    if (typeof p.corde === 'number' && !isNaN(p.corde) && p.corde > 0) {
      return p.corde;
    }
    const extracted = parseHorseCordeNumber(p);
    return extracted.cordeNumber || Number(p.numero) || 1;
  };

  // Catégorie de déferrage pour le Trot Attelé & Trot Monté
  const getShoeingCategory = (p: Partant): 'D4' | 'DA_DP' | 'FERRE' => {
    const f = String(p.ferrure || (p as any).fer || (p as any).ferr || '').toUpperCase().trim();
    if (f === 'D4' || f.includes('D4')) return 'D4';
    if (f === 'DP' || f === 'DA' || f.includes('DP') || f.includes('DA')) return 'DA_DP';
    return 'FERRE';
  };

  // Calcul v38 (Favoris, Outsiders, Tocards, Surprises)
  const v38 = useMemo(() => computeV38Hierarchy(course), [course]);

  // Forme des chevaux (🟢, 🟡, ⚡, 🔴)
  const formClassification = useMemo(() => {
    return classerChevauxFormeEtPoints(course.partants || []);
  }, [course.partants]);

  const formMap = useMemo(() => {
    const map = new Map<number, { icon: string; label: string; key: string }>();
    formClassification.allClassified.forEach((item) => {
      let icon = '🟢';
      let label = 'EN FORME';
      let key = 'EN_FORME';
      if (item.categorie === 'FORME_MOYENNE') {
        icon = '🟡';
        label = 'MOYENNE';
        key = 'FORME_MOYENNE';
      } else if (item.categorie === 'CAPABLE_EXPLOIT') {
        icon = '⚡';
        label = 'EXPLOIT';
        key = 'CAPABLE_EXPLOIT';
      } else if (item.categorie === 'MEFORME') {
        icon = '🔴';
        label = 'MÉFORME';
        key = 'MEFORME';
      }
      map.set(Number(item.partant.numero), { icon, label, key });
    });
    return map;
  }, [formClassification]);

  // Calcul du Score X pour chaque partant
  const getScoreX = (p: Partant): number => {
    const num = Number(p.numero);
    const cote = getHorseGenyOdds(p);
    return (73 + num) - cote;
  };

  // Définition des Lignes de la Hiérarchie (Favoris, Outsiders, Tocards, Surprises)
  const rows = useMemo(() => {
    return [
      {
        id: 'FAVORIS',
        title: 'FAVORIS',
        badge: '🥇',
        subLabel: '(3 N° : 1e - 3e)',
        partants: v38.favoris,
        textColor: 'text-amber-300',
        tileBg: 'from-emerald-500 to-emerald-700 border-emerald-300',
      },
      {
        id: 'OUTSIDERS',
        title: 'OUTSIDERS',
        badge: '🥈',
        subLabel: '(3 N° : 4e - 6e)',
        partants: v38.outsiders,
        textColor: 'text-cyan-300',
        tileBg: 'from-amber-400 to-amber-600 border-amber-200',
      },
      {
        id: 'TOCARDS',
        title: 'TOCARDS',
        badge: '🥉',
        subLabel: '(4 N° : 7e - 10e)',
        partants: v38.tocardsSpeculatifs,
        textColor: 'text-orange-300',
        tileBg: 'from-orange-500 to-orange-700 border-orange-300',
      },
      {
        id: 'SURPRISES',
        title: 'SURPRISES',
        badge: '⚡',
        subLabel: '(4 N° : petites cotes)',
        partants: v38.surprises,
        textColor: 'text-rose-300',
        tileBg: 'from-rose-600 to-rose-800 border-rose-300',
      },
    ];
  }, [v38]);

  // Définition des Colonnes selon le Mode choisi (GROUPE A-B-C, FORME, DEFERRAGE, CORDE)
  const columns = useMemo(() => {
    if (columnMode === 'GROUPS_ABC') {
      return [
        {
          id: 'GROUPE_A',
          title: 'GROUPE A (1-6)',
          match: (p: Partant) => {
            const num = Number(p.numero);
            return num >= 1 && num <= 6;
          },
        },
        {
          id: 'GROUPE_B',
          title: 'GROUPE B (7-10)',
          match: (p: Partant) => {
            const num = Number(p.numero);
            return num >= 7 && num <= 10;
          },
        },
        {
          id: 'GROUPE_C',
          title: 'GROUPE C (11+)',
          match: (p: Partant) => {
            const num = Number(p.numero);
            return num >= 11;
          },
        },
      ];
    }

    if (columnMode === 'FORME') {
      return [
        {
          id: 'EN_FORME',
          title: '🟢 EN FORME',
          match: (p: Partant) => formMap.get(Number(p.numero))?.key === 'EN_FORME',
        },
        {
          id: 'MOYENNE',
          title: '🟡 MOYENNE',
          match: (p: Partant) => formMap.get(Number(p.numero))?.key === 'FORME_MOYENNE',
        },
        {
          id: 'EXPLOIT',
          title: '⚡ EXPLOIT',
          match: (p: Partant) => {
            const k = formMap.get(Number(p.numero))?.key;
            return k === 'CAPABLE_EXPLOIT' || k === 'MEFORME';
          },
        },
      ];
    }

    if (columnMode === 'DEFERRAGE') {
      return [
        {
          id: 'D4',
          title: '👟 D4 (4 FERS)',
          match: (p: Partant) => getShoeingCategory(p) === 'D4',
        },
        {
          id: 'DA_DP',
          title: '⚡ DA / DP (2 FERS)',
          match: (p: Partant) => getShoeingCategory(p) === 'DA_DP',
        },
        {
          id: 'FERRE',
          title: '⚪ FERRÉ / P',
          match: (p: Partant) => getShoeingCategory(p) === 'FERRE',
        },
      ];
    }

    // Mode CORDE (Courses de Plat)
    return [
      {
        id: 'CORDE_1_5',
        title: '🟢 CORDES 1 à 5',
        match: (p: Partant) => {
          const c = getPartantCordeNumber(p);
          return c >= 1 && c <= 5;
        },
      },
      {
        id: 'CORDE_6_8',
        title: '🟡 CORDES 6 à 8',
        match: (p: Partant) => {
          const c = getPartantCordeNumber(p);
          return c >= 6 && c <= 8;
        },
      },
      {
        id: 'CORDE_9_PLUS',
        title: '⚪ CORDES 9+',
        match: (p: Partant) => {
          const c = getPartantCordeNumber(p);
          return c >= 9;
        },
      },
    ];
  }, [columnMode, formMap]);

  // Style de rendu d'une Tuile
  const renderTile = (p: Partant, defaultTileBg: string) => {
    const num = Number(p.numero);
    const scoreX = getScoreX(p);
    const formInfo = formMap.get(num);
    const passThreshold = diffXMode === 'OFF' || scoreX >= diffXThreshold;
    const cordeNumber = getPartantCordeNumber(p);

    // Gradient dynamique haute qualité
    let gradientStyle = `bg-gradient-to-b ${defaultTileBg}`;
    if (!passThreshold && diffXMode === 'GREY') {
      gradientStyle = 'bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-red-500/80 opacity-50';
    } else if (formInfo?.key === 'EN_FORME' || scoreX >= 70) {
      gradientStyle = 'bg-gradient-to-b from-teal-400 to-emerald-600 border-2 border-emerald-200 shadow-emerald-950/60';
    } else if (formInfo?.key === 'FORME_MOYENNE' || (scoreX >= 55 && scoreX < 70)) {
      gradientStyle = 'bg-gradient-to-b from-amber-400 to-amber-600 border-2 border-amber-200 shadow-amber-950/60';
    } else if (formInfo?.key === 'CAPABLE_EXPLOIT') {
      gradientStyle = 'bg-gradient-to-b from-orange-500 to-orange-700 border-2 border-orange-300 shadow-orange-950/60';
    } else if (formInfo?.key === 'MEFORME' || scoreX < 45) {
      gradientStyle = 'bg-gradient-to-b from-rose-600 to-rose-800 border-2 border-rose-300 shadow-rose-950/60';
    }

    return (
      <button
        key={`hier-tile-${num}`}
        type="button"
        onClick={() => onSelectHorse && onSelectHorse(num)}
        className={`relative flex flex-col items-center justify-center px-2 py-1.5 rounded-xl ${gradientStyle} shadow-md hover:scale-105 transition-all duration-200 cursor-pointer min-w-[54px] min-h-[46px]`}
      >
        <div className="flex items-center gap-1 leading-none">
          <span className="text-xs shrink-0 leading-none drop-shadow-xs" title={`Performance / Forme : ${formInfo?.label || 'Inconnue'}`}>
            {formInfo?.icon || '🟢'}
          </span>
          <span className="text-sm font-extrabold text-white drop-shadow-md leading-none">
            {num}
          </span>
        </div>
        <div className="flex items-center gap-1 leading-none mt-0.5">
          <span className="text-[9px] font-mono font-black text-white/95 italic tracking-tight leading-none">
            {scoreX.toFixed(1).replace('.', ',')}
          </span>
          {columnMode === 'DEFERRAGE' && (
            <span
              className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-black/40 text-amber-300 leading-none"
              title={`Ferrure : ${p.ferrure || 'Ferré'}`}
            >
              {p.ferrure || 'F'}
            </span>
          )}
          {columnMode === 'CORDE' && (
            <span
              className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-black/40 text-cyan-200 leading-none"
              title={`Stalle à la corde : Corde ${cordeNumber}`}
            >
              C{cordeNumber}
            </span>
          )}
        </div>
        {!passThreshold && diffXMode === 'GREY' && (
          <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-red-600 text-[7px] font-black text-white border border-white">
            &lt;{diffXThreshold}
          </span>
        )}
      </button>
    );
  };

  // Rendu d'une case de positionnement tactique Système 74 (Vue P_TACTIQUE)
  const renderTacticalCell = (item: any | undefined) => {
    if (!item) {
      return (
        <div className="w-11 h-11 sm:w-12 sm:h-12 bg-[#060a14] border border-slate-800/80 rounded-xl flex items-center justify-center text-slate-600 font-bold text-sm shadow-inner">
          —
        </div>
      );
    }

    const cat = item.classified?.categorie;
    let perfColor = 'bg-slate-700';
    let perfDot = '';

    if (cat === 'EN_FORME') {
      perfColor = 'bg-emerald-600';
      perfDot = '';
    } else if (cat === 'FORME_MOYENNE') {
      perfColor = 'bg-amber-500';
      perfDot = '🟡';
    } else if (cat === 'CAPABLE_EXPLOIT') {
      perfColor = 'bg-blue-600';
      perfDot = '⚡';
    } else if (cat === 'MEFORME') {
      perfColor = 'bg-rose-600';
      perfDot = '🔴';
    }

    // Rang global Score(X) Système 74 pour la bordure
    const globalRankX = [...allPartantsWithX]
      .sort((a, b) => b.scoreX - a.scoreX)
      .findIndex((h) => h.num === item.num) + 1;

    let s74Color = 'border-slate-500';
    if (globalRankX <= 3) s74Color = 'border-emerald-400';
    else if (globalRankX <= 6) s74Color = 'border-amber-400';
    else if (globalRankX <= 10) s74Color = 'border-orange-500';
    else s74Color = 'border-rose-500';

    const isBelowThreshold = item.scoreX < diffXThreshold;

    return (
      <button
        type="button"
        onClick={() => onSelectHorse?.(item.num)}
        className={`w-11 h-11 sm:w-12 sm:h-12 flex flex-col items-center justify-center rounded-xl border-2 ${s74Color} ${perfColor} relative overflow-hidden transition-transform hover:scale-110 cursor-pointer shadow-[0_4px_6px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.3)]`}
        title={`N°${item.num} | Score X: ${item.scoreX} | Performance: ${item.classified?.categorieLabel || 'N/A'}`}
      >
        {/* Reflet 3D */}
        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

        <div className="flex items-center justify-center gap-0.5 z-10 leading-none">
          <span className="text-[14px] sm:text-[15px] font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">
            {item.num}
          </span>
          {perfDot && (
            <span className="text-[8px] sm:text-[9px] drop-shadow-sm leading-none">
              {perfDot}
            </span>
          )}
        </div>
        <span
          className={`text-[8px] sm:text-[9px] font-mono font-black z-10 drop-shadow-sm mt-0.5 leading-none ${
            isBelowThreshold && diffXMode === 'GREY'
              ? 'text-red-300 font-extrabold'
              : 'text-white/95'
          }`}
        >
          {item.scoreX.toFixed(1).replace('.', ',')}
        </span>
      </button>
    );
  };

  return (
    <div className="w-full mt-6 rounded-3xl bg-[#090e1a] border-2 border-sky-400/60 shadow-2xl overflow-hidden space-y-4 p-4 sm:p-5">
      {/* Barre de Contrôle Principal */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-sky-500/30">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">⚡</span>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
              HIÉRARCHIE DU SYSTÈME 74
            </h3>
            {columnMode !== 'CARRE_MAGIQUE' && (
              <p className="text-xs text-sky-300 font-medium">
                {columnMode === 'GROUPS_ABC' && 'Structure exacte par Lignes de Sélection et Colonnes de Groupes (A, B, C)'}
                {columnMode === 'FORME' && 'Structure exacte par Lignes de Sélection et Colonnes de Forme (🟢 En forme, 🟡 Moyenne, ⚡ Exploit)'}
                {columnMode === 'DEFERRAGE' && 'Structure exacte par Lignes de Sélection et Colonnes de Déferrage (D4, DA/DP, Ferré) — Trot Attelé & Monté'}
                {columnMode === 'CORDE' && 'Structure exacte par Lignes de Sélection et Colonnes de Positions à la Corde (1-5, 6-8, 9+) — Plat'}
                {columnMode === 'P_TACTIQUE' && 'Positionnement Tactique du Système 74 : Grille Tactique Groupes A, B, C et Synthèse'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
          {/* Sélecteur de Colonnes (GROUPE A-B-C, FORME, DEFERRAGE, CORDE, P_TACTIQUE, CARRE_MAGIQUE) */}
          <div className="flex items-center flex-wrap gap-1 bg-slate-950 p-1 rounded-xl border border-sky-500/40">
            <button
              type="button"
              onClick={() => setColumnMode('GROUPS_ABC')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                columnMode === 'GROUPS_ABC'
                  ? 'bg-sky-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              GROUPE A-B-C
            </button>
            <button
              type="button"
              onClick={() => setColumnMode('FORME')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                columnMode === 'FORME'
                  ? 'bg-sky-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              FORME
            </button>
            <button
              type="button"
              onClick={() => setColumnMode('DEFERRAGE')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                columnMode === 'DEFERRAGE'
                  ? 'bg-sky-400 text-slate-950 shadow-sm'
                  : isTrotCourse
                  ? 'text-emerald-300 hover:text-white hover:bg-emerald-500/20'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Changement colonne par déferrage pour le Trot Attelé et Trot Monté"
            >
              <span>DEFERRAGE</span>
              {isTrotCourse && (
                <span className="text-[8px] font-bold px-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                  Trot
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setColumnMode('CORDE')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                columnMode === 'CORDE'
                  ? 'bg-sky-400 text-slate-950 shadow-sm'
                  : isPlatCourse
                  ? 'text-cyan-300 hover:text-white hover:bg-cyan-500/20'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Changement colonne par corde pour les courses de Plat"
            >
              <span>CORDE</span>
              {isPlatCourse && (
                <span className="text-[8px] font-bold px-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  Plat
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setColumnMode('P_TACTIQUE')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                columnMode === 'P_TACTIQUE'
                  ? 'bg-sky-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Afficher le tableau de positionnement tactique du Système 74"
            >
              <span>P_TACTIQUE</span>
            </button>
            <button
              type="button"
              onClick={() => setColumnMode('CARRE_MAGIQUE')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                columnMode === 'CARRE_MAGIQUE'
                  ? 'bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400 text-slate-950 shadow-md font-black'
                  : 'text-amber-300 hover:text-white hover:bg-amber-500/20'
              }`}
              title="Afficher le Carré Magique du Système 74 (6 lignes x 3 colonnes)"
            >
              <span>✨</span>
              <span>CARRÉ MAGIQUE</span>
            </button>
          </div>
        </div>
      </div>

      {/* BANDEAU INTERACTIF DYNAMIQUE : RÉGLAGE DU SEUIL DIFF(X) SYSTÈME 74 */}
      <Systeme74ThresholdControlBar course={course} />

      {/* VUE CARRÉ MAGIQUE, VUE P_TACTIQUE OU TABLEAU DE HIÉRARCHIE CROISÉ */}
      {columnMode === 'CARRE_MAGIQUE' ? (
        <CarreMagiqueView
          course={course}
          onSelectHorse={onSelectHorse}
        />
      ) : columnMode === 'P_TACTIQUE' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Cadre Positionnement Tactique Système 74 (Exactement selon le visuel image_724a4148.png) */}
          <div className="w-full p-4 sm:p-5 rounded-2xl bg-[#090e1a] border-2 border-sky-400/40 shadow-2xl">
            {/* Titre interne + Bouton Règles Système 74 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-sky-500/20">
              <h4 className="text-white font-black uppercase text-sm sm:text-base tracking-wide flex items-center gap-2">
                <span className="text-amber-400">⚡</span> POSITIONNEMENT TACTIQUE (SYSTÈME 74)
              </h4>
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-sky-900/40 hover:bg-sky-800/60 text-sky-200 border border-sky-400/50 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
                title="Consulter le résumé détaillé des règles du Système 74 (Groupes A, B, C, Cotes, Score X)"
              >
                <span className="w-4 h-4 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                  i
                </span>
                <span>Règles Système 74</span>
              </button>
            </div>

            {/* 3 Cartes Tactiques : GROUPE A (1-6), GROUPE B (7-10), GROUPE C (11+) */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-6">
              {/* GROUPE A (1-6) */}
              <div className="flex flex-col items-center p-3.5 sm:p-4 border-2 border-white rounded-3xl bg-[#0a0f1d] shadow-2xl min-w-[210px]">
                <span className="text-white font-black mb-4 uppercase text-[11px] sm:text-xs tracking-wider px-3.5 py-1 bg-[#050811] rounded-full border border-slate-600 shadow-inner">
                  GROUPE A (1-6)
                </span>
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={`tact-a-${i}`}>{renderTacticalCell(groupA[i])}</div>
                  ))}
                </div>
              </div>

              {/* GROUPE B (7-10) */}
              <div className="flex flex-col items-center p-3.5 sm:p-4 border-2 border-white rounded-3xl bg-[#0a0f1d] shadow-2xl min-w-[210px]">
                <span className="text-white font-black mb-4 uppercase text-[11px] sm:text-xs tracking-wider px-3.5 py-1 bg-[#050811] rounded-full border border-slate-600 shadow-inner">
                  GROUPE B (7-10)
                </span>
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={`tact-b-${i}`}>{renderTacticalCell(groupB[i])}</div>
                  ))}
                </div>
              </div>

              {/* GROUPE C (11+) */}
              <div className="flex flex-col items-center p-3.5 sm:p-4 border-2 border-white rounded-3xl bg-[#0a0f1d] shadow-2xl min-w-[210px]">
                <span className="text-white font-black mb-4 uppercase text-[11px] sm:text-xs tracking-wider px-3.5 py-1 bg-[#050811] rounded-full border border-slate-600 shadow-inner">
                  GROUPE C (11+)
                </span>
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {groupC && groupC.length > 0
                    ? [...Array(6)].map((_, i) => (
                        <div key={`tact-c-${i}`}>{renderTacticalCell(groupC[i])}</div>
                      ))
                    : [...Array(6)].map((_, i) => (
                        <div key={`tact-c-empty-${i}`}>{renderTacticalCell(undefined)}</div>
                      ))}
                </div>
              </div>
            </div>
          </div>

          {/* TABLEAU DE SYNTHÈSE TACTIQUE DU SYSTÈME 74 */}
          <TableauSyntheseTactique
            course={course}
            filterMinScoreX={diffXMode === 'EXCLUDE'}
            minScoreXThreshold={diffXThreshold}
          />
        </div>
      ) : (
        <TableScrollWrapper>
          <div className="rounded-2xl border-2 border-sky-400/60 overflow-hidden bg-[#090e1a] max-w-4xl mx-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              {/* Ligne d'En-tête Bleu Ciel Banderole Exacte */}
              <thead>
                <tr className="bg-gradient-to-r from-sky-400 via-cyan-400 to-sky-400 text-white font-black text-xs sm:text-sm uppercase tracking-wider text-center border-b-2 border-sky-300">
                  <th className="py-2 px-2 text-left w-[17%] min-w-[125px] border-r border-sky-300/60 text-slate-950 font-extrabold">
                    HIÉRARCHIE
                  </th>
                  {columns.map((col) => (
                    <th key={col.id} className="py-2 px-2 text-center border-r border-sky-300/60 text-slate-950 font-extrabold">
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Corps du Tableau */}
              <tbody className="divide-y-2 divide-slate-800/90 text-xs">
                {rows.map((row) => {
                  return (
                    <tr key={row.id} className="hover:bg-slate-900/50 transition-colors">
                      {/* Colonne 1 : HIÉRARCHIE */}
                      <td className="py-2 px-2 bg-[#0a0f1d] border-r-2 border-slate-800 w-[17%] min-w-[125px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base shrink-0">{row.badge}</span>
                          <div className="min-w-0">
                            <span className="font-black text-xs text-white uppercase tracking-wide block truncate">
                              {row.title}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold block truncate">
                              {row.subLabel}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Colonnes Croisées : Groupes A-B-C, Forme, Déferrage, ou Corde */}
                      {columns.map((col) => {
                        const matchingPartants = row.partants.filter((p) => {
                          if (!col.match(p)) return false;
                          if (diffXMode === 'EXCLUDE') {
                            const scoreX = getScoreX(p);
                            return scoreX >= diffXThreshold;
                          }
                          return true;
                        });

                        return (
                          <td
                            key={`${row.id}-${col.id}`}
                            className="py-2 px-2 text-center align-middle border-r-2 border-slate-800 bg-[#060a14]"
                          >
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {matchingPartants.length > 0 ? (
                                matchingPartants.map((p) => renderTile(p, row.tileBg))
                              ) : (
                                <span className="text-base font-mono text-slate-500 font-bold">—</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TableScrollWrapper>
      )}

      {/* Modale Règles Système 74 */}
      <Systeme74RulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </div>
  );
};

