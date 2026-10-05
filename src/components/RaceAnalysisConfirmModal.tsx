import React from 'react';
import {
  Sparkles,
  Trophy,
  MapPin,
  Calendar,
  Clock,
  Coins,
  ShieldCheck,
  CheckCircle2,
  X,
  ArrowRight,
  Target,
  Zap,
  Flame,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Award,
  AlertTriangle,
  UserX
} from 'lucide-react';
import { CourseHippique } from '../types/turf';
import { convertToUTC } from '../utils/timeConversion';

interface RaceAnalysisConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: CourseHippique | null;
  onConfirmAnalyze: (course: CourseHippique) => void;
  isLoggedIn?: boolean;
}

export const RaceAnalysisConfirmModal: React.FC<RaceAnalysisConfirmModalProps> = ({
  isOpen,
  onClose,
  course,
  onConfirmAnalyze,
  isLoggedIn = false,
}) => {
  if (!isOpen || !course) return null;

  const partants = course.partants || [];
  const nonPartants = partants.filter((p) => p.estNonPartant || p.statut === 'Non-partant');
  const nonPartantsCount = nonPartants.length;
  const partantsValides = partants.length - nonPartantsCount;

  // Calcul estimation FCFA (1 € = 655.957 FCFA)
  const rawAlloc = typeof course.allocation === 'number'
    ? course.allocation
    : parseFloat(String(course.allocation || '0').replace(/[^0-9.]/g, '')) || 0;
  const allocationFcfa = Math.round(rawAlloc * 655.957);

  const isQuinte = course.estQuinte;
  const isPick5 = course.estPick5;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:pt-1 sm:px-2 sm:pb-1 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-amber-500/50 rounded-none sm:rounded-2xl p-4 sm:p-6 shadow-2xl overflow-hidden text-slate-100 mt-0">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors z-10"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-3 pr-8">
          <span className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20">
            {course.reunion} {course.course}
          </span>

          {isQuinte ? (
            <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md">
              <Trophy className="w-3.5 h-3.5" />
              Événement Quinté+ National
            </span>
          ) : isPick5 ? (
            <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md">
              <Target className="w-3.5 h-3.5" />
              Course Intermédiaire · Pick5
            </span>
          ) : (
            <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-amber-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              Course Intermédiaire (Multi / Trio)
            </span>
          )}

          <span className="px-2.5 py-0.5 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700 text-xs font-semibold">
            {course.discipline}
          </span>
        </div>

        {/* Race Title & Hippodrome */}
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>{course.prixNom || course.titre}</span>
          </h2>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 mt-1 flex-wrap">
            <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-bold text-slate-200">Hippodrome de {course.hippodrome}</span>
            <span>•</span>
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{course.date}</span>
            <span>•</span>
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-black text-amber-300">Départ à {convertToUTC(course.heure, course.date)}</span>
          </div>
        </div>

        {/* Detailed Reference Grid */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 mb-4 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80 text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Références Officielles de l'Épreuve
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
              {course.statutCourse || 'Partants validés'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Distance & Corde</span>
              <span className="font-extrabold text-white text-sm">
                {course.distance}m
              </span>
              <span className="text-[10px] text-amber-400 block font-medium">
                Corde à {course.corde || 'Gauche'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Partants déclarés</span>
              <span className="font-extrabold text-white text-sm">
                {partantsValides} partants réels
              </span>
              {nonPartantsCount > 0 ? (
                <span className="text-[10px] text-rose-400 block font-bold">
                  {nonPartantsCount} non-partant(s)
                </span>
              ) : (
                <span className="text-[10px] text-emerald-400 block font-medium">
                  Peloton complet (0 NP)
                </span>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Allocation Globale</span>
              <span className="font-extrabold text-amber-300 text-sm">
                {rawAlloc > 0 ? `${rawAlloc.toLocaleString('fr-FR')} €` : (String(course.allocation || '—'))}
              </span>
              <span className="text-[10px] text-slate-400 block">
                ≈ {!isNaN(allocationFcfa) && allocationFcfa > 0 ? `${allocationFcfa.toLocaleString('fr-FR')} FCFA` : '— FCFA'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Nature du Terrain</span>
              <span className="font-extrabold text-slate-200 text-xs line-clamp-1">
                {course.terrain || 'Standard'}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {convertToUTC(course.heure, course.date)}
              </span>
            </div>
          </div>

          {/* Conditions */}
          {course.conditions && (
            <div className="pt-2 text-[11px] text-slate-300 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/60">
              <span className="font-bold text-amber-400">Conditions : </span>
              {course.conditions}
            </div>
          )}
        </div>

        {/* SECTION DÉDIÉE : ÉTAT DES NON-PARTANTS DÉCLARÉS */}
        <div className="mb-5">
          {nonPartantsCount > 0 ? (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-black">
                <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>🚨 Chevaux déclarés NON-PARTANTS ({nonPartantsCount}) :</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {nonPartants.map((np, idx) => (
                  <div
                    key={`modal-np-${np.numero}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-rose-500/30 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black flex items-center justify-center text-xs line-through">
                        {np.numero}
                      </span>
                      <div>
                        <span className="font-bold text-rose-200 line-through">{np.nom}</span>
                        <span className="text-[10px] text-slate-400 block">Driver: {np.driver}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-black border border-rose-500/30">
                      FORFAIT / NP
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>✅ Tous les chevaux sont partants confirmés (aucun non-partant déclaré à cette heure).</span>
            </div>
          )}
        </div>

        {/* User Approval Prompt Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 border border-amber-500/30 mb-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">
                Voulez-vous lancer l'analyse complète de cette course ?
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                L'algorithme va calculer les HippoScores, la sélection Quinté+ en 8 chevaux, les 2 bases solides, les outsiders, et élaborer les combinaisons de paris optimales.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={() => onConfirmAnalyze(course)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-600 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Approuver et Lancer l'Analyse</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
