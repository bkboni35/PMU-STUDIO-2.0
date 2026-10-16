import React, { useState, useMemo } from 'react';
import {
  normaliserNom,
  resoudrePersonneApproximative,
  DEFAULT_REFERENTIEL,
  ReferentielPersonnes,
  PersonneCanonicalInfo
} from '../utils/normalisationNoms';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Plus,
  RefreshCw,
  Info,
  UserCheck,
  Database
} from 'lucide-react';

interface NameNormalizationAuditorViewProps {
  initialTestName?: string;
}

export const NameNormalizationAuditorView: React.FC<NameNormalizationAuditorViewProps> = ({
  initialTestName = 'A. Orani'
}) => {
  const [testName, setTestName] = useState<string>(initialTestName);
  const [category, setCategory] = useState<'jockeys' | 'drivers' | 'entraineurs'>('jockeys');
  const [referentiel, setReferentiel] = useState<ReferentielPersonnes>(DEFAULT_REFERENTIEL);
  const [newAliasName, setNewAliasName] = useState<string>('');
  const [selectedEntityIdForAlias, setSelectedEntityIdForAlias] = useState<string>('JOCKEY_0001');

  // Test de résolution dynamique
  const resolutionResult: PersonneCanonicalInfo = useMemo(() => {
    return resoudrePersonneApproximative(testName, category, 85, referentiel);
  }, [testName, category, referentiel]);

  // Ajouter un nouvel alias à une entité existante
  const handleAddAlias = () => {
    if (!newAliasName.trim()) return;

    setReferentiel(prev => {
      const updated = { ...prev };
      const categoryEntities = { ...updated[category] };

      for (const [key, entry] of Object.entries(categoryEntities)) {
        if (entry.id === selectedEntityIdForAlias) {
          categoryEntities[key] = {
            ...entry,
            aliases: [...entry.aliases, newAliasName.trim()]
          };
          break;
        }
      }

      updated[category] = categoryEntities;
      return updated;
    });

    setNewAliasName('');
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-6 text-slate-100 shadow-2xl">
      
      {/* 1. EN-TÊTE DU MODULE DE NORMALISATION CANONIQUE */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            Normalisation Canonique des Jockeys & Entraîneurs
          </span>
          <h3 className="text-lg font-black text-white">
            Prévention des Erreurs d'Encodage & Fuzzy Resolution Engine
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl">
            Associe les différentes variantes orthographiques (<code className="text-amber-300">A. Orani</code>, <code className="text-amber-300">A.ORANI</code>, <code className="text-amber-300">A. Oraní</code>) à un ID unique sans multiplier les catégories dans Scikit-learn.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setReferentiel(DEFAULT_REFERENTIEL)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold border border-slate-700 transition flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            Réinitialiser Référentiel
          </button>
        </div>
      </div>

      {/* 2. TESTEUR EN TEMPS RÉEL D'ALIGNEMENT DES NOMS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-900 p-4 rounded-xl border border-slate-800">
        
        {/* CHAMP DE SAISIE */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
            <Search className="w-4 h-4 text-indigo-400" />
            Saisissez un nom de jockey ou entraîneur à tester :
          </label>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="ex: A. Orani, Mlle M. Vélon, A. Oram..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-bold text-slate-200"
            >
              <option value="jockeys">Jockeys</option>
              <option value="drivers">Drivers</option>
              <option value="entraineurs">Entraîneurs</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 self-center">Essais rapides :</span>
            {['A. Orani', 'A.ORANI', 'A. Oraní', 'Mlle M. Vélon', 'A. Oram'].map(sample => (
              <button
                key={sample}
                onClick={() => setTestName(sample)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono border border-slate-700 transition"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* CARTE DE RÉSULTAT DE LA RÉSOLUTION */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400 text-[11px] uppercase font-bold">Résultat de la Résolution</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              resolutionResult.source === 'REFERENTIEL'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : resolutionResult.source === 'CORRESPONDANCE_APPROXIMATIVE'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}>
              {resolutionResult.source}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-300">
            <div>
              <span className="text-slate-500 block text-[10px]">Nom Brut :</span>
              <strong className="text-white">{testName || 'Vide'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Nom Normalisé (Unicode) :</span>
              <strong className="text-indigo-300">{normaliserNom(testName)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Identifiant Canonique :</span>
              <strong className="text-amber-400 font-bold">{resolutionResult.id}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Nom Affiché Officiel :</span>
              <strong className="text-emerald-400 font-bold">{resolutionResult.nom_affiche}</strong>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
            <span>Score de Confiance : <strong className="text-sky-400">{(resolutionResult.confiance * 100).toFixed(0)}%</strong></span>
            {resolutionResult.alias_detecte && (
              <span className="text-slate-400">Alias proche : <strong className="text-indigo-300">{resolutionResult.alias_detecte}</strong></span>
            )}
          </div>
        </div>
      </div>

      {/* 3. TABLE DU RÉFÉRENTIEL ET AJOUT D'ALIAS */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Database className="w-4 h-4 text-indigo-400" />
            Référentiel des Entités & Alias Enregistrés ({Object.keys(referentiel[category]).length} {category})
          </h4>

          {/* AJOUTER UN ALIAS */}
          <div className="flex items-center gap-2">
            <select
              value={selectedEntityIdForAlias}
              onChange={(e) => setSelectedEntityIdForAlias(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded text-xs p-1.5 text-white font-bold"
            >
              {Object.values(referentiel[category]).map(entry => (
                <option key={entry.id} value={entry.id}>{entry.nom_affiche} ({entry.id})</option>
              ))}
            </select>

            <input
              type="text"
              value={newAliasName}
              onChange={(e) => setNewAliasName(e.target.value)}
              placeholder="Nouvel Alias (ex: A. ORANI)"
              className="bg-slate-950 border border-slate-700 rounded text-xs p-1.5 text-white font-mono w-36"
            />

            <button
              onClick={handleAddAlias}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-xs transition flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter
            </button>
          </div>
        </div>

        {/* LISTE DES ENTITÉS ET ALIAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.values(referentiel[category]).map((entry) => (
            <div key={entry.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-white">
                <span className="text-sm">{entry.nom_affiche}</span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono">{entry.id}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Alias enregistrés :</span>
                <div className="flex flex-wrap gap-1">
                  {entry.aliases.map((alias, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[10px] font-mono text-slate-300">
                      {alias}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
