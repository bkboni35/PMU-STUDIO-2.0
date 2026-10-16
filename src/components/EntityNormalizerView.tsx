import React, { useState, useMemo } from 'react';
import {
  normalizeEntityName,
  resolveEntityName,
  DEFAULT_CANONICAL_DATABASE,
  generatePythonEncodingScript,
  CanonicalEntity,
  EntityResolutionResult
} from '../utils/entityNormalizer';
import {
  UserCheck,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Code,
  Copy,
  Check,
  Zap,
  Layers,
  Database,
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';

export const EntityNormalizerView: React.FC = () => {
  const [testInput, setTestInput] = useState<string>('A. Orani');
  const [selectedType, setSelectedType] = useState<'JOCKEY' | 'DRIVER' | 'ENTRAINEUR'>('JOCKEY');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [customDatabase, setCustomDatabase] = useState<CanonicalEntity[]>(DEFAULT_CANONICAL_DATABASE);

  // Exemple de variations à tester rapidement
  const sampleVariants = [
    'A. Orani',
    'A Orani',
    'A.ORANI',
    'a. orani',
    'A. ORANI',
    'Antoine Orani',
    'A. Oraní',
    'M. Abrivard',
    'M.ABRIVARD',
    'JM BAZIRE',
    'J.M. BAZIRE',
    'C. Soumillon',
    'Nouvel Inconnu Test'
  ];

  const resolution: EntityResolutionResult = useMemo(() => {
    return resolveEntityName(testInput, selectedType, customDatabase);
  }, [testInput, selectedType, customDatabase]);

  const batchResults = useMemo(() => {
    return sampleVariants.map(v => ({
      original: v,
      resolution: resolveEntityName(v, selectedType, customDatabase)
    }));
  }, [selectedType, customDatabase]);

  const pythonScript = useMemo(() => generatePythonEncodingScript(), []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pythonScript);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* HEADER PRINCIPAL */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  Normalisation & Référentiel Canonique Entourage PMU
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    Anti-Crash Scikit-learn
                  </span>
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Rapprochement flou (Levenshtein), lissage bayésien et encodage sécurisé avec <code className="text-indigo-300 bg-slate-800 px-1.5 py-0.5 rounded">handle_unknown="infrequent_if_exist"</code>.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setSelectedType('JOCKEY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                selectedType === 'JOCKEY'
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🏇 Jockeys
            </button>
            <button
              onClick={() => setSelectedType('DRIVER')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                selectedType === 'DRIVER'
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🏎️ Drivers
            </button>
            <button
              onClick={() => setSelectedType('ENTRAINEUR')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                selectedType === 'ENTRAINEUR'
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              👔 Entraîneurs
            </button>
          </div>
        </div>
      </div>

      {/* SECTION INTERACTIVE : TESTEUR DE RAPPROCHEMENT EN TEMPS RÉEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CARTE TESTEUR INTERACTIF */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-400" />
              Testeur de Résolution Floue (Live)
            </h3>
            <span className="text-xs text-slate-400">Levenshtein + Alias Map</span>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Saisir ou coller un nom brut (variante Geny / PMU / Equidia) :
            </label>
            <div className="relative">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Ex: A. ORANI, a. orani, Antoine Orani..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Variantes de test rapide :</label>
            <div className="flex flex-wrap gap-1.5">
              {sampleVariants.map((v, idx) => (
                <button
                  key={idx}
                  onClick={() => setTestInput(v)}
                  className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded text-xs text-slate-300 transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* RÉSULTAT DU RESOLVER */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Statut de correspondance :</span>
              {resolution.matchType === 'EXACT' && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> EXACT MATCH 100%
                </span>
              )}
              {resolution.matchType === 'ALIAS' && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> ALIAS RECONNU (98%)
                </span>
              )}
              {resolution.matchType === 'FUZZY' && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> RAPPROCHEMENT FLOU ({resolution.confidenceScore}%)
                </span>
              )}
              {resolution.matchType === 'NEW_UNKNOWN' && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> ENTITÉ INÉDITE (PRIOR LISSÉ)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-900">
              <div>
                <span className="text-slate-500 block">Nom Normalisé Clean :</span>
                <span className="font-mono font-bold text-indigo-300 text-sm">
                  {resolution.normalizedInputName}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">ID Canonique Métier :</span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {resolution.canonicalId}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-900">
              <div>
                <span className="text-slate-500 block">Nom Canonique Officiel :</span>
                <span className="font-semibold text-white">
                  {resolution.displayName}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Gestion Inconnus Scikit-Learn :</span>
                <span className="font-mono text-slate-300 text-[11px]">
                  {resolution.handleUnknownFlag}
                </span>
              </div>
            </div>

            {/* Statistiques Bayésiennes Lissées */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded p-3 mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Victoires (Bayes) :</span>
                  <span className="font-bold text-emerald-400 text-sm">{resolution.bayesianWinRate}%</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Top 4 (Bayes) :</span>
                  <span className="font-bold text-blue-400 text-sm">{resolution.bayesianTop4Rate}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARTE TABLEAU DE DÉMONSTRATION SUR PLUSIEURS VARIANTES */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Audit de Rapprochement sur Échantillon
            </h3>
            <span className="text-xs text-slate-400">Variantes Geny → ID Canonique</span>
          </div>

          <div className="overflow-x-auto max-h-[310px] overflow-y-auto pr-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                  <th className="py-2 px-2.5">Saisie Brute</th>
                  <th className="py-2 px-2.5">Normalisé</th>
                  <th className="py-2 px-2.5">ID Canonique</th>
                  <th className="py-2 px-2.5 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {batchResults.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-2.5 text-slate-200 font-sans font-medium">{item.original}</td>
                    <td className="py-2 px-2.5 text-indigo-300">{item.resolution.normalizedInputName}</td>
                    <td className="py-2 px-2.5 text-amber-300">{item.resolution.canonicalId}</td>
                    <td className="py-2 px-2.5 text-right font-sans">
                      {item.resolution.matchType === 'EXACT' && (
                        <span className="text-emerald-400 font-semibold">100% (Exact)</span>
                      )}
                      {item.resolution.matchType === 'ALIAS' && (
                        <span className="text-blue-400 font-semibold">98% (Alias)</span>
                      )}
                      {item.resolution.matchType === 'FUZZY' && (
                        <span className="text-amber-400 font-semibold">{item.resolution.confidenceScore}% (Flou)</span>
                      )}
                      {item.resolution.matchType === 'NEW_UNKNOWN' && (
                        <span className="text-rose-400 font-semibold">Inédit (Cluster)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION RÉFÉRENTIEL CANONIQUE ACTIF */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            Référentiel Canonique des Entourages ({customDatabase.length} Entités Enregistrées)
          </h3>
          <span className="text-xs text-slate-400">Statistiques Lissées (m=10, prior win=12%, prior top4=35%)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customDatabase.map((entity) => (
            <div key={entity.canonicalId} className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{entity.displayName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                  {entity.canonicalId}
                </span>
              </div>

              <div className="text-xs text-slate-400 font-mono">
                Alias ({entity.aliases.length}) : {entity.aliases.slice(0, 3).join(', ')}...
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Courses / Victoires :</span>
                  <span className="text-slate-200 font-semibold">{entity.careerStats.totalRaces} / {entity.careerStats.careerWins}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Victoires (Bayes) :</span>
                  <span className="text-emerald-400 font-semibold">{entity.careerStats.bayesianSmoothedWinRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION CODE PYTHON EXPORTABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Code className="w-4 h-4 text-amber-400" />
            Script Python Scikit-learn (OneHotEncoder + TargetEncoder + handle_unknown)
          </h3>

          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedCode ? 'Copié !' : 'Copier le script Python'}
          </button>
        </div>

        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-80 leading-relaxed">
          <code>{pythonScript}</code>
        </pre>
      </div>
    </div>
  );
};
