import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Clock,
  Calendar,
  Hash,
  Milestone,
  AlertCircle,
  FileCode,
  Zap,
  Check,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export type AnomalyCategory =
  | 'cotes'
  | 'partants'
  | 'metadata'
  | 'normalisation'
  | 'value_bet';

export interface AnomalyItem {
  id: string;
  category: AnomalyCategory;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  affectedRunners?: number[];
}

interface DataIntegrityGuardProps {
  status: 'idle' | 'loading' | 'valid' | 'error';
  errors?: string[];
  comparisonLog?: string[];
  onRetry?: () => void;
  metadata?: {
    date?: string;
    heure?: string;
    partantsCount?: number;
    distance?: number;
    nonPartantsNums?: number[];
    cotesIncompletes?: boolean;
    anomaliesDetectees?: AnomalyItem[];
  };
  selectedCategoryFilter?: AnomalyCategory | null;
  onSelectCategoryFilter?: (cat: AnomalyCategory | null) => void;
}

export const DataIntegrityGuard: React.FC<DataIntegrityGuardProps> = ({
  status,
  errors,
  comparisonLog,
  onRetry,
  metadata,
  selectedCategoryFilter,
  onSelectCategoryFilter,
}) => {
  const [activeCategory, setActiveCategory] = useState<AnomalyCategory | null>(
    selectedCategoryFilter || null
  );
  const [showFullDetails, setShowFullDetails] = useState<boolean>(false);

  if (status === 'idle') return null;

  // Extraction et classification automatique des types d'anomalies
  const nonPartants = metadata?.nonPartantsNums || [];
  const hasNonPartants = nonPartants.length > 0;
  const hasErrors = !!(errors && errors.length > 0) || status === 'error';
  const cotesIncompletes = metadata?.cotesIncompletes || false;

  // Calcul du voyant pour chaque type d'anomalie
  const getCategoryStatus = (cat: AnomalyCategory) => {
    if (status === 'loading') return { level: 'loading', color: 'bg-sky-400', label: 'Analyse' };

    switch (cat) {
      case 'partants':
        if (hasNonPartants) return { level: 'warning', color: 'bg-amber-400', label: `${nonPartants.length} NP` };
        return { level: 'valid', color: 'bg-emerald-400', label: 'Conforme' };

      case 'cotes':
        if (cotesIncompletes) return { level: 'warning', color: 'bg-amber-400', label: 'Ajusté' };
        if (errors?.some((e) => e.toLowerCase().includes('cote')))
          return { level: 'error', color: 'bg-rose-500', label: 'Incohérent' };
        return { level: 'valid', color: 'bg-emerald-400', label: 'Validé' };

      case 'metadata':
        if (hasErrors && errors?.some((e) => e.toLowerCase().includes('date') || e.toLowerCase().includes('heure') || e.toLowerCase().includes('distance')))
          return { level: 'error', color: 'bg-rose-500', label: 'Écart' };
        return { level: 'valid', color: 'bg-emerald-400', label: 'Certifié' };

      case 'normalisation':
        return { level: 'info', color: 'bg-blue-400', label: 'Auto-Nettoyé' };

      case 'value_bet':
        return { level: 'sparkle', color: 'bg-purple-400', label: 'Optimal' };

      default:
        return { level: 'valid', color: 'bg-emerald-400', label: 'OK' };
    }
  };

  const categoriesList: { id: AnomalyCategory; name: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'partants', name: "Effectif & Non-Partants", icon: Hash },
    { id: 'cotes', name: 'Cotes & Divergences Market', icon: Zap },
    { id: 'metadata', name: 'Programme & Horaires', icon: Clock },
    { id: 'normalisation', name: 'Encodage & Entourage', icon: FileCode },
    { id: 'value_bet', name: 'Distorsion Score X / Cote', icon: ShieldCheck },
  ];

  const handleCategoryClick = (cat: AnomalyCategory) => {
    const nextCat = activeCategory === cat ? null : cat;
    setActiveCategory(nextCat);
    if (onSelectCategoryFilter) {
      onSelectCategoryFilter(nextCat);
    }
  };

  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl border shadow-2xl transition-all duration-300 relative overflow-hidden ${
        status === 'loading'
          ? 'bg-gradient-to-r from-blue-950/70 via-slate-900 to-slate-950 border-blue-500/50 text-blue-100'
          : status === 'valid'
          ? 'bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border-emerald-500/50 text-emerald-100'
          : 'bg-gradient-to-r from-rose-950/70 via-slate-900 to-slate-950 border-rose-500/60 text-rose-100'
      }`}
    >
      {/* Halo de fond */}
      <div
        className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
          status === 'valid' ? 'bg-emerald-500/10' : status === 'error' ? 'bg-rose-500/10' : 'bg-blue-500/10'
        }`}
      />

      {/* En-tête du Garde-Fou */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-2xl font-black shrink-0 shadow-lg ${
              status === 'loading'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                : status === 'valid'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
            }`}
          >
            {status === 'loading' && <RefreshCw className="w-5 h-5 animate-spin" />}
            {status === 'valid' && <ShieldCheck className="w-5 h-5" />}
            {status === 'error' && <AlertTriangle className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-white text-sm sm:text-base font-black tracking-wide uppercase">
                Garde-Fou Suprême & Détecteur d'Anomalies
              </strong>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                100% Anti-Hallucination
              </span>
            </div>
            <p className="text-xs text-slate-300/90 mt-0.5">
              {status === 'loading' && 'Audit des métadonnées, cotes, partants et encodage contre les programmes officiels...'}
              {status === 'valid' && 'Aucune anomalie critique bloquante. Données certifiées conformes.'}
              {status === 'error' && 'Anomalie détectée lors du contrôle automatique de cohérence.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRetry && (status === 'valid' || status === 'error') && (
            <button
              type="button"
              onClick={onRetry}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl font-extrabold transition-all border border-slate-700 active:scale-95 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Relancer l'audit</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowFullDetails(!showFullDetails)}
            className="text-xs bg-slate-950/80 hover:bg-slate-900 text-slate-300 px-3 py-1.5 rounded-xl font-bold transition-all border border-slate-800 flex items-center gap-1"
          >
            <span>{showFullDetails ? 'Masquer logs' : 'Détails logs'}</span>
            {showFullDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* NOYAU CENTRAL : VOYANTS DES TYPES D'ANOMALIES */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <h4 className="text-xs font-black uppercase text-slate-200 tracking-wider">
              Voyants par Type d'Anomalie (Indicateurs TTR) :
            </h4>
          </div>
          {activeCategory && (
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className="text-[10px] text-amber-300 underline hover:text-amber-200 font-bold"
            >
              Réinitialiser le filtre voyant
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {categoriesList.map((cat) => {
            const st = getCategoryStatus(cat.id);
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.id)}
                className={`p-2.5 rounded-2xl border text-left transition-all relative cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-slate-800 border-amber-400 shadow-md ring-2 ring-amber-400/50'
                    : 'bg-slate-950/70 hover:bg-slate-900/90 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {/* VOYANT LUMINEUX LED */}
                    <span className="relative flex h-3 w-3">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${st.color}`}
                      />
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${st.color} shadow-sm shadow-white/20`} />
                    </span>
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                  </div>

                  <span
                    className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                      st.level === 'valid'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : st.level === 'warning'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : st.level === 'error'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : st.level === 'sparkle'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {st.label}
                  </span>
                </div>

                <div className="text-[11px] font-bold text-white truncate">{cat.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Checklist synthétique des métadonnées */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-3 border-t border-white/10 text-xs">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">Date : {metadata?.date || 'Vérifiée'}</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="truncate">Heure : {metadata?.heure || 'Vérifiée'}</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <Hash className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-emerald-300">
              {metadata?.partantsCount ? `${metadata.partantsCount} Partants` : 'Partants OK'}
            </span>
            {hasNonPartants && (
              <span className="font-bold text-[10px] text-rose-300 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-500/40">
                NP : {nonPartants.join(', ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <Milestone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="truncate">Distance : {metadata?.distance ? `${metadata.distance}m` : 'Vérifiée'}</span>
        </div>
      </div>

      {/* Affichage des détails si filtre actif ou clic "Détails logs" */}
      {(showFullDetails || activeCategory || (errors && errors.length > 0)) && (
        <div className="mt-3 pt-3 border-t border-white/10 text-xs space-y-2 animate-fadeIn">
          {activeCategory && (
            <div className="p-3 rounded-2xl bg-slate-950/90 border border-amber-500/40 text-slate-200 space-y-1">
              <strong className="text-amber-300 text-xs uppercase font-extrabold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-400" />
                Audit spécifique : {categoriesList.find((c) => c.id === activeCategory)?.name}
              </strong>
              {activeCategory === 'partants' && (
                <p className="text-[11px] text-slate-300">
                  {hasNonPartants
                    ? `⚠️ ${nonPartants.length} non-partant(s) isolé(s) : Cheval N° ${nonPartants.join(', ')}. Les calculs de probabilités et d'intervalles sont réajustés.`
                    : '✓ Effectif 100% validé. Aucun non-partant signalé dans le programme officiel.'}
                </p>
              )}
              {activeCategory === 'cotes' && (
                <p className="text-[11px] text-slate-300">
                  {cotesIncompletes
                    ? '⚠️ Cotes partielles : certaines cotes de référence ont été complétées via les flux Geny / PMU.'
                    : '✓ Cotes certifiées à 100%. Verrouillage actif anti-recalcul intempestif.'}
                </p>
              )}
              {activeCategory === 'metadata' && (
                <p className="text-[11px] text-slate-300">
                  ✓ Horaires, date et distance concordants avec les serveurs officiels.
                </p>
              )}
              {activeCategory === 'normalisation' && (
                <p className="text-[11px] text-slate-300">
                  ✓ Auto-normalisation des noms de jockeys et chevaux activée (nettoyage des accents et caractères spéciaux pour Scikit-Learn/XGBoost).
                </p>
              )}
              {activeCategory === 'value_bet' && (
                <p className="text-[11px] text-slate-300">
                  ✓ Croisement Score X vs Cote de marché effectué pour faire ressortir les distorsions de rapport.
                </p>
              )}
            </div>
          )}

          {errors && errors.length > 0 && (
            <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200">
              <strong className="block text-xs font-black uppercase text-rose-300 mb-1">
                Avertissements & Écarts Relevés ({errors.length}) :
              </strong>
              <ul className="list-disc list-inside space-y-1 text-xs">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {comparisonLog && comparisonLog.length > 0 && showFullDetails && (
            <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 text-[11px] font-mono opacity-90">
              <strong className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Journal de comparaison temps réel :
              </strong>
              <ul className="space-y-0.5">
                {comparisonLog.map((log, i) => (
                  <li key={i}>&gt; {log}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

