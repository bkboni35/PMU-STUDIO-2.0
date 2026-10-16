import React, { useState, useMemo } from 'react';
import {
  GenyParsedRunner,
  GenyStandardizedRaceJSON,
  GenyImportSourceMode,
  CourseHippique,
  Discipline
} from '../types/turf';
import {
  parseGenyText,
  getSampleGenyPartants,
  normalizeGenyRaceToStandardJSON,
  convertGenyStandardJSONToCourseHippique,
  calculerFormeMusiquePonderee,
  calculateSmoothedBayesianRate
} from '../utils/genyDataPipeline';
import { computeTabularEnsembleAnalysis } from '../utils/tabularRankingEngine';
import { TabularEnsembleModelView } from './TabularEnsembleModelView';
import { NameNormalizationAuditorView } from './NameNormalizationAuditorView';
import {
  FileText,
  Upload,
  CheckCircle2,
  Code,
  Sparkles,
  Edit3,
  Trash2,
  Plus,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Copy,
  Check,
  Info,
  Database,
  Layers,
  Cpu
} from 'lucide-react';

interface GenyImportPipelineViewProps {
  onRaceAnalyzed?: (course: CourseHippique) => void;
}

export const GenyImportPipelineView: React.FC<GenyImportPipelineViewProps> = ({ onRaceAnalyzed }) => {
  // Mode d'importation
  const [importMode, setImportMode] = useState<GenyImportSourceMode>('copier_coller');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Méta-données de la course
  const [discipline, setDiscipline] = useState<Discipline>('Plat');
  const [hippodrome, setHippodrome] = useState<string>('Lyon-La-Soie');
  const [distanceM, setDistanceM] = useState<number>(1800);
  const [surface, setSurface] = useState<string>('PSF');
  const [corde, setCorde] = useState<'GAUCHE' | 'DROITE'>('DROITE');
  const [reunion, setReunion] = useState<string>('R6');
  const [numeroCourse, setNumeroCourse] = useState<string>('C1');

  // Texte brut collé
  const [rawText, setRawText] = useState<string>(
`1\tArturo\t2\tH7\t60,5\tA. Orani\tF.-X. Weissmeier\t2p4p1p3p\t29,5\t2,2
2\tBluff\t5\tH5\t58,0\tM. Guyon\tP. Decouz\t1p3p2p5p\t31,0\t4,5
3\tIffrocta Fal\t1\tF6\t56,5\tC. Soumillon\tJ.-P. Gauvin\t3p1p4p2p\t28,0\t6,8
4\tSi Capo Si\t8\tM4\t57,0\tT. Piccone\tH.-A. Pantall\t5p2p1p6p\t27,5\t9,2
5\tLord of War\t4\tH6\t59,0\tS. Pasquier\tN. Clément\t4p2p3p1p\t30,0\t11,5
6\tSweet Sunshine\t3\tF5\t55,0\tA. Madamet\tC. Ferland\t1p1p2p3p\t32,5\t3,8
7\tGolden Flash\t7\tH8\t54,5\tE. Hardouin\tM. Delcher Sanchez\t7p5p4p8p\t25,0\t24,0
8\tEl Patron\t6\tM5\t56,0\tI. Mendizabal\tF. Chappet\t8p0p6p5p\t24,0\t38,0`
  );

  // Partants analysés et modifiables
  const [parsedPartants, setParsedPartants] = useState<GenyParsedRunner[]>(getSampleGenyPartants());
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Génération du JSON standardisé
  const standardizedJSON: GenyStandardizedRaceJSON = useMemo(() => {
    return normalizeGenyRaceToStandardJSON(
      {
        course_id: `20261012_${reunion}_${numeroCourse}`,
        date: new Date().toISOString().split('T')[0],
        reunion,
        numero_course: numeroCourse,
        hippodrome,
        discipline,
        distance_m: distanceM,
        surface,
        corde,
        terrain: surface,
        mode_import: importMode,
      },
      parsedPartants
    );
  }, [reunion, numeroCourse, hippodrome, discipline, distanceM, surface, corde, importMode, parsedPartants]);

  // Conversion vers CourseHippique pour le moteur ML
  const analyzedCourse: CourseHippique = useMemo(() => {
    const course = convertGenyStandardJSONToCourseHippique(standardizedJSON);
    return {
      ...course,
      tabularEnsemble: computeTabularEnsembleAnalysis(course),
    };
  }, [standardizedJSON]);

  // Analyse initiale du texte
  const handleParseText = () => {
    try {
      setErrorMessage(null);
      const runners = parseGenyText(rawText);
      setParsedPartants(runners);
      setStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de l\'analyse du tableau.');
    }
  };

  // Chargement de l'exemple pré-rempli (Arturo, Bluff, Iffrocta Fal, Si Capo Si)
  const handleLoadSample = () => {
    setParsedPartants(getSampleGenyPartants());
    setStep(2);
  };

  // Modification d'un champ d'un partant dans la table
  const handleUpdateRunner = (index: number, field: keyof GenyParsedRunner, value: any) => {
    setParsedPartants(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Suppression d'un partant
  const handleRemoveRunner = (index: number) => {
    setParsedPartants(prev => prev.filter((_, i) => i !== index));
  };

  // Ajout d'un partant manuel
  const handleAddRunner = () => {
    const newNum = parsedPartants.length + 1;
    setParsedPartants(prev => [
      ...prev,
      {
        numero: newNum,
        cheval: `Nouveau Cheval ${newNum}`,
        corde: newNum,
        sexe: 'H',
        age: 5,
        poids: 57.0,
        jockey: 'N. Jockey',
        entraineur: 'N. Entraîneur',
        musique: '1p2p3p',
        valeur: 28.0,
        cote: 10.0,
        statut: 'PARTANT',
      }
    ]);
  };

  // Copie du JSON Standardisé
  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(standardizedJSON, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 text-slate-100 shadow-2xl space-y-6">
      
      {/* 1. HEADER ET WORKFLOW PIPELINE EN 4 ÉTAPES */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950/80 to-slate-950 border border-indigo-500/30 rounded-xl p-5 relative overflow-hidden space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 inline-flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              Pipeline d'Intégration Structurée Geny / Genybet
            </span>
            <h2 className="text-xl md:text-2xl font-black text-white">
              Saisie → Normalisation JSON → Feature Engineering → Modèle ML
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              Convertit les tableaux ou captures de partants Geny en schéma JSON universel avant d'alimenter les modèles CatBoost et LightGBM LambdaRank.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSample}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg border border-indigo-400/30 transition flex items-center gap-1.5 shadow"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Charger l'Exemple Geny (Arturo, Bluff, Iffrocta Fal...)
            </button>
          </div>
        </div>

        {/* WORKFLOW PIPELINE INDICATORS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-indigo-500/20 text-xs">
          <button
            onClick={() => setStep(1)}
            className={`p-2.5 rounded-lg border font-semibold transition text-left flex items-center gap-2 ${
              step === 1
                ? 'bg-indigo-600 text-white border-indigo-400'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
            <div>
              <div className="font-bold">1. Importation</div>
              <div className="text-[10px] opacity-80">Texte / Captures</div>
            </div>
          </button>

          <button
            onClick={() => setStep(2)}
            className={`p-2.5 rounded-lg border font-semibold transition text-left flex items-center gap-2 ${
              step === 2
                ? 'bg-indigo-600 text-white border-indigo-400'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
            <div>
              <div className="font-bold">2. Validation OCR</div>
              <div className="text-[10px] opacity-80">{parsedPartants.length} Partants détectés</div>
            </div>
          </button>

          <button
            onClick={() => setStep(3)}
            className={`p-2.5 rounded-lg border font-semibold transition text-left flex items-center gap-2 ${
              step === 3
                ? 'bg-indigo-600 text-white border-indigo-400'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
            <div>
              <div className="font-bold">3. Normalisation JSON</div>
              <div className="text-[10px] opacity-80">Variables Feature Eng.</div>
            </div>
          </button>

          <button
            onClick={() => setStep(4)}
            className={`p-2.5 rounded-lg border font-semibold transition text-left flex items-center gap-2 ${
              step === 4
                ? 'bg-indigo-600 text-white border-indigo-400'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 text-[10px] font-bold flex items-center justify-center shrink-0">4</span>
            <div>
              <div className="font-bold">4. Prédiction ML</div>
              <div className="text-[10px] opacity-80">CatBoost & LambdaRank</div>
            </div>
          </button>
        </div>
      </div>

      {/* ÉTAPE 1 : IMPORTATION DU TEXTE OU SÉLECTION DE MODE */}
      {step === 1 && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Mode d'Importation & Saisie des Partants
              </h3>
              <p className="text-xs text-slate-400">
                Collez le tableau complet depuis la page Geny/Genybet ou importez les métadonnées.
              </p>
            </div>

            {/* SÉLECTEUR DE MODE D'IMPORT */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setImportMode('copier_coller')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                  importMode === 'copier_coller' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Copier-Coller Tableau
              </button>
              <button
                onClick={() => setImportMode('image_ocr')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                  importMode === 'image_ocr' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Capture / OCR
              </button>
              <button
                onClick={() => setImportMode('api_licenciee')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                  importMode === 'api_licenciee' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                API Licenciée
              </button>
            </div>
          </div>

          {/* PARAMÈTRES DE LA COURSE */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Discipline</label>
              <select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value as Discipline)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white font-bold"
              >
                <option value="Plat">Plat</option>
                <option value="Trot Attelé">Trot Attelé</option>
                <option value="Trot Monté">Trot Monté</option>
                <option value="Obstacle">Obstacle</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Hippodrome</label>
              <input
                type="text"
                value={hippodrome}
                onChange={(e) => setHippodrome(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Distance (m)</label>
              <input
                type="number"
                value={distanceM}
                onChange={(e) => setDistanceM(parseInt(e.target.value) || 1800)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Surface / Terrain</label>
              <input
                type="text"
                value={surface}
                onChange={(e) => setSurface(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Corde</label>
              <select
                value={corde}
                onChange={(e) => setCorde(e.target.value as 'GAUCHE' | 'DROITE')}
                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white font-bold"
              >
                <option value="DROITE">Droite</option>
                <option value="GAUCHE">Gauche</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Réunion & Course</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={reunion}
                  onChange={(e) => setReunion(e.target.value)}
                  className="w-1/2 bg-slate-950 border border-slate-700 rounded p-1.5 text-white text-center font-mono font-bold"
                />
                <input
                  type="text"
                  value={numeroCourse}
                  onChange={(e) => setNumeroCourse(e.target.value)}
                  className="w-1/2 bg-slate-950 border border-slate-700 rounded p-1.5 text-white text-center font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* TEXTAREA COPIER-COLLER TABLEAU */}
          {importMode === 'copier_coller' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Collez les lignes du tableau des partants Geny ou Genybet :
              </label>
              <textarea
                rows={8}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="N° Cheval Corde SA Poids Jockey Entraîneur Musique Valeur Cote..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-indigo-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>
          )}

          {/* SIMULATION OCR CAPTURE IMAGE */}
          {importMode === 'image_ocr' && (
            <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500 rounded-xl p-8 text-center bg-slate-900/50 space-y-3 cursor-pointer transition">
              <Upload className="w-8 h-8 text-indigo-400 mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-white">Glissez une capture de tableau Geny (Arturo, Bluff...)</h4>
                <p className="text-xs text-slate-400">Format PNG, JPG ou PDF. OCR automatique activé.</p>
              </div>
              <button
                onClick={handleLoadSample}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition"
              >
                Exécuter l'OCR sur la Capture Démo
              </button>
            </div>
          )}

          {/* MODE API LICENCIÉE */}
          {importMode === 'api_licenciee' && (
            <div className="bg-slate-900 p-4 rounded-xl border border-indigo-500/30 text-xs space-y-2">
              <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Connecteur Official Licensed Geny API (Partner Integration)
              </div>
              <p className="text-slate-300">
                Utilise le flux JSON sécurisé via jeton OAuth Bearer conformément aux CGU Geny/Matchem pour usage institutionnel.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-lg text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleParseText}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg border border-indigo-400/30 transition flex items-center gap-2 shadow"
            >
              <span>Extraire & Valider les Partants</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ÉTAPE 2 : TABLE DE VALIDATION ET CORRECTION INTERACTIVE */}
      {step === 2 && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                Étape 2 — Validation & Correction des Données Détectées
              </h3>
              <p className="text-xs text-slate-400">
                Vérifiez les valeurs de chaque partant avant le calcul du Feature Engineering et la prédiction.
              </p>
            </div>

            <button
              onClick={handleAddRunner}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold border border-slate-700 transition flex items-center gap-1 self-start"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              Ajouter un Partant
            </button>
          </div>

          {/* TABLEAU ÉDITABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] uppercase text-slate-400 bg-slate-900">
                <tr>
                  <th className="p-2 text-center">N°</th>
                  <th className="p-2">Cheval</th>
                  <th className="p-2 text-center">Corde</th>
                  <th className="p-2 text-center">S/A</th>
                  <th className="p-2 text-center">Poids (kg)</th>
                  <th className="p-2">Jockey</th>
                  <th className="p-2">Entraîneur</th>
                  <th className="p-2 text-center">Musique</th>
                  <th className="p-2 text-center">Valeur</th>
                  <th className="p-2 text-center">Cote PMU</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {parsedPartants.map((runner, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/60">
                    <td className="p-1.5 text-center font-bold">
                      <input
                        type="number"
                        value={runner.numero}
                        onChange={(e) => handleUpdateRunner(idx, 'numero', parseInt(e.target.value) || 1)}
                        className="w-10 bg-slate-900 border border-slate-700 rounded text-center p-1 text-amber-400 font-bold"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        value={runner.cheval}
                        onChange={(e) => handleUpdateRunner(idx, 'cheval', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white font-sans font-bold"
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <input
                        type="number"
                        value={runner.corde || ''}
                        onChange={(e) => handleUpdateRunner(idx, 'corde', parseInt(e.target.value) || null)}
                        className="w-12 bg-slate-900 border border-slate-700 rounded text-center p-1 text-slate-200"
                      />
                    </td>
                    <td className="p-1.5 text-center font-sans">
                      <input
                        type="text"
                        value={`${runner.sexe || 'H'}${runner.age || 5}`}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateRunner(idx, 'sexe', val.charAt(0).toUpperCase());
                          handleUpdateRunner(idx, 'age', parseInt(val.slice(1)) || 5);
                        }}
                        className="w-12 bg-slate-900 border border-slate-700 rounded text-center p-1 text-slate-300"
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <input
                        type="number"
                        step="0.5"
                        value={runner.poids || ''}
                        onChange={(e) => handleUpdateRunner(idx, 'poids', parseFloat(e.target.value) || null)}
                        className="w-14 bg-slate-900 border border-slate-700 rounded text-center p-1 text-slate-200"
                      />
                    </td>
                    <td className="p-1.5 font-sans">
                      <input
                        type="text"
                        value={runner.jockey}
                        onChange={(e) => handleUpdateRunner(idx, 'jockey', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-indigo-300 font-medium"
                      />
                    </td>
                    <td className="p-1.5 font-sans">
                      <input
                        type="text"
                        value={runner.entraineur}
                        onChange={(e) => handleUpdateRunner(idx, 'entraineur', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-slate-400"
                      />
                    </td>
                    <td className="p-1.5 text-center font-sans">
                      <input
                        type="text"
                        value={runner.musique || ''}
                        onChange={(e) => handleUpdateRunner(idx, 'musique', e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-700 rounded text-center p-1 text-emerald-400 font-bold"
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <input
                        type="number"
                        step="0.5"
                        value={runner.valeur || ''}
                        onChange={(e) => handleUpdateRunner(idx, 'valeur', parseFloat(e.target.value) || null)}
                        className="w-14 bg-slate-900 border border-slate-700 rounded text-center p-1 text-slate-300"
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <input
                        type="number"
                        step="0.1"
                        value={runner.cote || ''}
                        onChange={(e) => handleUpdateRunner(idx, 'cote', parseFloat(e.target.value) || null)}
                        className="w-14 bg-slate-900 border border-slate-700 rounded text-center p-1 text-amber-400 font-bold"
                      />
                    </td>
                    <td className="p-1.5 text-right font-sans">
                      <button
                        onClick={() => handleRemoveRunner(idx)}
                        className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition"
                        title="Supprimer ce partant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AUDITEUR DE NORMALISATION DES NOMS */}
          <div className="pt-2">
            <NameNormalizationAuditorView initialTestName={parsedPartants[0]?.jockey || 'A. Orani'} />
          </div>

          <div className="flex justify-between pt-3">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition"
            >
              Retour à la Saisie
            </button>

            <button
              onClick={() => setStep(3)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg border border-indigo-400/30 transition flex items-center gap-2 shadow"
            >
              <span>Normaliser vers Schéma JSON</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ÉTAPE 3 : JSON STANDARDISE ET FEATURE ENGINEERING */}
      {step === 3 && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-amber-400" />
                Étape 3 — Format JSON Standardisé & Feature Engineering
              </h3>
              <p className="text-xs text-slate-400">
                Schéma JSON unique prêt pour l'entraînement et la prédiction Scikit-learn / CatBoost.
              </p>
            </div>

            <button
              onClick={handleCopyJSON}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow self-start"
            >
              {copiedJson ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  JSON Copié !
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-indigo-200" />
                  Copier le JSON Standardisé
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* CODE VIEWER JSON */}
            <div className="lg:col-span-7 bg-slate-900 p-4 rounded-xl border border-slate-800 overflow-y-auto max-h-96 font-mono text-xs text-indigo-200 leading-relaxed">
              <pre>{JSON.stringify(standardizedJSON, null, 2)}</pre>
            </div>

            {/* APERÇU FEATURE ENGINEERING (SCI-KIT LEARN COLUMNS) */}
            <div className="lg:col-span-5 bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
              <h4 className="font-bold text-white flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Variables Calculées par Partant (Feature Vector)
              </h4>

              <div className="space-y-2 overflow-y-auto max-h-80 pr-1">
                {parsedPartants.map((p, idx) => {
                  const formePonderee = calculerFormeMusiquePonderee(p.musique);
                  const bayesWinRate = calculateSmoothedBayesianRate(Math.floor((p.valeur || 25) * 0.4), 30);
                  return (
                    <div key={idx} className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between font-bold text-white">
                        <span>N°{p.numero} {p.cheval}</span>
                        <span className="text-amber-400 font-mono">{p.cote}/1</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                        <div>Forme Musique Decay : <strong className="text-emerald-400">{formePonderee}</strong></div>
                        <div>Jockey Bayes Win : <strong className="text-indigo-300">{(bayesWinRate * 100).toFixed(1)}%</strong></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-3">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition"
            >
              Retour à la Validation
            </button>

            <button
              onClick={() => {
                setStep(4);
                if (onRaceAnalyzed) onRaceAnalyzed(analyzedCourse);
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg border border-indigo-400/30 transition flex items-center gap-2 shadow"
            >
              <Cpu className="w-4 h-4 text-indigo-200" />
              <span>Exécuter la Prédiction ML (CatBoost & LambdaRank)</span>
            </button>
          </div>
        </div>
      )}

      {/* ÉTAPE 4 : RÉSULTATS DU MOTEUR ML TABULAIRE ET CLASSEMENT */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-indigo-500/30">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Étape 4 — Résultats de Prédiction ML sur Données Geny Normalisées
              </h3>
              <p className="text-xs text-slate-300">
                Course de {analyzedCourse.discipline} à {analyzedCourse.hippodrome} ({analyzedCourse.distance}m) • {analyzedCourse.partants.length} partants analysés.
              </p>
            </div>

            <button
              onClick={() => setStep(1)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
            >
              Nouvel Import Geny
            </button>
          </div>

          {/* COMPOSANT VISUEL D'ANALYSE TABULAIRE COMPLET */}
          <TabularEnsembleModelView course={analyzedCourse} />
        </div>
      )}
    </div>
  );
};
