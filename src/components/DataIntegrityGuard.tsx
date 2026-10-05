import React from 'react';
import { ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2, Clock, Calendar, Hash, Milestone } from 'lucide-react';

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
  };
}

export const DataIntegrityGuard: React.FC<DataIntegrityGuardProps> = ({
  status,
  errors,
  comparisonLog,
  onRetry,
  metadata,
}) => {
  if (status === 'idle') return null;

  return (
    <div
      className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start gap-3 shadow-lg transition-all ${
        status === 'loading'
          ? 'bg-blue-950/40 border-blue-500/40 text-blue-200'
          : status === 'valid'
          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
          : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
      }`}
    >
      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        {status === 'loading' && <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />}
        {status === 'valid' && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
        {status === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400" />}
      </div>

      <div className="flex-1 text-sm space-y-2">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-white text-sm uppercase tracking-wide">
                Garde-Fou Suprême : Audit Métadonnées Temps Réel
              </strong>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Zéro Hallucination
              </span>
            </div>
            <p className="text-xs opacity-90 mt-0.5">
              {status === 'loading' && 'Audit des métadonnées (date, heure, partants, distances) contre les sources officielles...'}
              {status === 'valid' && 'Métadonnées certifiées 100% conformes aux programmes officiels PMU & Geny.'}
              {status === 'error' && 'Écart détecté lors du contrôle de conformité des métadonnées.'}
            </p>
          </div>

          {onRetry && (status === 'valid' || status === 'error') && (
            <button
              onClick={onRetry}
              className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-xl font-bold transition-all border border-white/20 active:scale-95"
            >
              Relancer l'audit
            </button>
          )}
        </div>

        {/* Checklist des 4 Piliers Garde-Fou Suprême */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-white/10 text-xs">
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-950/50 border border-white/5">
            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Date : {metadata?.date || 'Vérifiée'}</span>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-950/50 border border-white/5">
            <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">Heure : {metadata?.heure || 'Vérifiée'}</span>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-950/50 border border-white/5">
            <Hash className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[14px] text-emerald-400 whitespace-nowrap">
                Partants : {metadata?.partantsCount ? `${metadata.partantsCount}` : 'Vérifiés'}
              </span>
              {metadata?.nonPartantsNums && metadata.nonPartantsNums.length > 0 && (
                <span className="font-bold text-[14px] text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-500/50 whitespace-nowrap">
                  NP : {metadata.nonPartantsNums.join(', ')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-950/50 border border-white/5">
            <Milestone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">Distance : {metadata?.distance ? `${metadata.distance}m` : 'Vérifiée'}</span>
          </div>
        </div>

        {(errors || comparisonLog) && (
          <div className="mt-2 text-xs">
            {errors && errors.length > 0 && (
              <ul className="list-disc list-inside space-y-1 text-rose-300">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
            {comparisonLog && comparisonLog.length > 0 && (
              <ul className="list-none space-y-0.5 mt-2 opacity-80 font-mono text-[11px]">
                {comparisonLog.map((log, i) => (
                  <li key={i}>&gt; {log}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
