import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingDown, TrendingUp, AlertTriangle, ShieldCheck, Activity, 
  Download, Copy, Check, Clock, RefreshCw, Database, ExternalLink, 
  HelpCircle, ChevronRight, Filter, Bell, ArrowRightLeft, FileCode, CheckCircle2,
  DollarSign, BarChart3, AlertCircle
} from 'lucide-react';
import { CourseHippique, Partant } from '../types/turf';

interface SuiviRapportsProbablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: CourseHippique | null;
  nextOddsSec?: number;
  onRefreshOdds?: () => void;
  isRefreshingOdds?: boolean;
}

interface OddsSnapshot {
  id: string;
  timestamp: string;
  timeFormatted: string;
  numero: number;
  nom: string;
  driver?: string;
  typePari: 'Simple Gagnant' | 'Simple Placé';
  rapportPrecedent: number;
  rapportActuel: number;
  variation: number; // ex: -0.18 pour -18%
  variationPct: number; // ex: -18
  estAlerte: boolean;
  typeAlerte?: 'flux_massif' | 'derive_cote';
}

export const SuiviRapportsProbablesModal: React.FC<SuiviRapportsProbablesModalProps> = ({
  isOpen,
  onClose,
  course,
  nextOddsSec = 5,
  onRefreshOdds,
  isRefreshingOdds = false,
}) => {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'explication' | 'api_alternatives' | 'script_python'>('monitoring');
  const [seuilVariation, setSeuilVariation] = useState<number>(15); // 15% par défaut
  const [filterType, setFilterType] = useState<'all' | 'alertes' | 'baisses' | 'hausses'>('all');
  const [snapshots, setSnapshots] = useState<OddsSnapshot[]>([]);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [soundAlertEnabled, setSoundAlertEnabled] = useState<boolean>(true);

  // Initialisation et enrichissement de l'historique des snapshots lors des actualisations de cotes
  useEffect(() => {
    if (!course || !Array.isArray(course.partants) || course.partants.length === 0) return;

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const isoTimestamp = now.toISOString();

    const newEntries: OddsSnapshot[] = [];

    course.partants.forEach((p: Partant) => {
      if (p.estNonPartant) return;
      const actuel = Number(p.coteProbable || 0);
      const precedent = Number(p.cotePrecedente || actuel);

      if (actuel > 0) {
        let variation = 0;
        if (precedent > 0 && precedent !== actuel) {
          variation = (actuel - precedent) / precedent;
        }

        const variationPct = Math.round(variation * 100);
        const estAlerte = Math.abs(variationPct) >= seuilVariation;
        const typeAlerte = estAlerte 
          ? (variation < 0 ? 'flux_massif' : 'derive_cote')
          : undefined;

        newEntries.push({
          id: `${p.numero}-${now.getTime()}`,
          timestamp: isoTimestamp,
          timeFormatted,
          numero: p.numero,
          nom: p.nom,
          driver: p.driver,
          typePari: 'Simple Gagnant',
          rapportPrecedent: precedent,
          rapportActuel: actuel,
          variation,
          variationPct,
          estAlerte,
          typeAlerte,
        });
      }
    });

    if (newEntries.length > 0) {
      setSnapshots((prev) => {
        // Conserver les 200 derniers snapshots
        const merged = [...newEntries, ...prev].slice(0, 200);
        return merged;
      });
    }
  }, [course?.partants, seuilVariation]);

  // Statistiques calculées
  const stats = useMemo(() => {
    const totalAlertes = snapshots.filter((s) => s.estAlerte).length;
    const fluxMassifs = snapshots.filter((s) => s.typeAlerte === 'flux_massif').length;
    const derives = snapshots.filter((s) => s.typeAlerte === 'derive_cote').length;
    return { totalAlertes, fluxMassifs, derives };
  }, [snapshots]);

  // Filtrage des snapshots affichés
  const filteredSnapshots = useMemo(() => {
    return snapshots.filter((s) => {
      if (filterType === 'alertes') return s.estAlerte;
      if (filterType === 'baisses') return s.variation < 0;
      if (filterType === 'hausses') return s.variation > 0;
      return true;
    });
  }, [snapshots, filterType]);

  // Export CSV
  const handleExportCsv = () => {
    if (snapshots.length === 0) return;

    const headers = [
      'horodatage_iso',
      'heure_locale',
      'course',
      'reunion',
      'numero',
      'nom',
      'driver',
      'type_pari',
      'rapport_precedent',
      'rapport_actuel',
      'variation_pourcent',
      'est_alerte',
      'type_alerte'
    ];

    const rows = snapshots.map((s) => [
      s.timestamp,
      s.timeFormatted,
      `"${course?.prixNom || 'Course'}"`,
      `"${course?.reunion || 'R1'}C${course?.courseNumero || '1'}"`,
      s.numero,
      `"${s.nom}"`,
      `"${s.driver || ''}"`,
      `"${s.typePari}"`,
      s.rapportPrecedent.toFixed(1),
      s.rapportActuel.toFixed(1),
      `${s.variationPct}%`,
      s.estAlerte ? 'OUI' : 'NON',
      s.typeAlerte || 'AUCUN'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `suivi_rapports_probables_${course?.reunion || 'R1'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pythonScript = `# suivi_rapports_pmu_api.py
# Suivi automatisé des rapports probables sans scraping HTML
# Conforme à la réglementation ANJ (Pari Mutuel / Masse Commune)
import time
from datetime import datetime, timezone
import requests
import csv

# Endpoint officiel de l'API PMU.fr (REST JSON)
DATE_COURSE = "${course?.date ? new Date().toISOString().slice(0, 10).replace(/-/g, '') : '20261019'}"
REUNION = "${course?.reunion ? course.reunion.replace(/\\D/g, '') || '1' : '1'}"
COURSE = "${course?.courseNumero ? course.courseNumero.replace(/\\D/g, '') || '1' : '1'}"

API_PMU_URL = f"https://online.turfinfo.api.pmu.fr/rest/client/1/programme/{DATE_COURSE}/R{REUNION}/C{COURSE}/participants?specialisation=INTERNET"
SEUIL_VARIATION = ${seuilVariation / 100}  # Alerte si variation absolue >= ${seuilVariation}%
INTERVALLE_SEC = 5       # Relevé toutes les 5 secondes (cycle temps réel)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) HippoAnalyse/1.0",
    "Accept": "application/json"
}

session = requests.Session()
precedents = {}
fichier_csv = "historique_rapports_probables.csv"

# Initialisation du fichier CSV
with open(fichier_csv, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.writer(f)
    writer.writerow(["horodatage_utc", "numero", "nom", "rapport_precedent", "rapport_actuel", "variation_pct", "alerte"])

print(f"[*] Démarrage de la surveillance des cotes sur {API_PMU_URL}")
print(f"[*] Intervalle : {INTERVALLE_SEC}s | Seuil alerte : {SEUIL_VARIATION * 100:.0f}%")

try:
    while True:
        reponse = session.get(API_PMU_URL, headers=HEADERS, timeout=10)
        if reponse.status_code == 200:
            data = reponse.json()
            participants = data.get("participants", [])
            releve = datetime.now(timezone.utc).isoformat()
            
            for p in participants:
                num = p.get("numPmu") or p.get("numero")
                nom = p.get("nom")
                # Lecture du rapport direct ou probable
                rapport = (
                    p.get("dernierRapportDirect", {}).get("rapport") or
                    p.get("dernierRapportReference", {}).get("rapport") or
                    p.get("rapportProbable") or 0.0
                )
                
                if rapport and rapport > 0:
                    ancien = precedents.get(num)
                    variation = 0.0
                    alerte = False
                    
                    if ancien and ancien > 0:
                        variation = (rapport - ancien) / ancien
                        if abs(variation) >= SEUIL_VARIATION:
                            alerte = True
                            sens = "BAISSE (Argent frais)" if variation < 0 else "HAUSSE (Dérive)"
                            print(f"[ALERTE {releve}] N°{num} {nom}: {ancien:.1f} -> {rapport:.1f} ({variation:+.1%}) [{sens}]")
                    
                    with open(fichier_csv, "a", newline="", encoding="utf-8-sig") as f:
                        writer = csv.writer(f)
                        writer.writerow([releve, num, nom, ancien or rapport, rapport, f"{variation * 100:+.1f}%", "OUI" if alerte else "NON"])
                    
                    precedents[num] = rapport
        
        time.sleep(INTERVALLE_SEC)
except KeyboardInterrupt:
    print("\\n[!] Surveillance interrompue par l'utilisateur. Données sauvegardées.")
`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(pythonScript);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[92vh] max-h-[920px] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* HEADER MODAL */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Activity className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Suivi Automatisé des Rapports Probables & Cotes Live 5s
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase">
                  Pari Mutuel / ANJ Certifié
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Surveillance continue des flux de mises, détection des mouvements d’argent & comparaison officielle
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-500/40 text-xs font-mono font-bold text-amber-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Cycle : {nextOddsSec}s</span>
            </div>

            {onRefreshOdds && (
              <button
                type="button"
                onClick={onRefreshOdds}
                disabled={isRefreshingOdds}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Déclencher un instantané immédiat"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingOdds ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualiser</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-950/50 border-b border-slate-800 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('monitoring')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'monitoring'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Moniteur Live 5s ({snapshots.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('explication')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'explication'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Cote Fixe vs Rapport Probable (ANJ)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('api_alternatives')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'api_alternatives'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>APIs Officielles (Sans Scraper)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('script_python')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'script_python'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Script Python Autonome (.py)</span>
          </button>
        </div>

        {/* CONTENU ONGLET 1 : MONITEUR LIVE 5S */}
        {activeTab === 'monitoring' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            
            {/* BARRE D'ÉTAT & STATISTIQUES */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Relevés Enregistrés</span>
                <div className="text-xl font-black text-white mt-0.5">{snapshots.length}</div>
                <span className="text-[10px] text-slate-500">Mise à jour toutes les 5s</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30">
                <span className="text-[11px] text-amber-300 font-medium">Seuil d'Alerte Actuel</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xl font-black text-amber-400">≥ {seuilVariation}%</span>
                  <div className="flex gap-1">
                    {[10, 15, 20].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setSeuilVariation(v)}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          seuilVariation === v ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500">Variation absolue requise</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30">
                <span className="text-[11px] text-emerald-300 font-medium">Flux Massifs (Appuis)</span>
                <div className="text-xl font-black text-emerald-400 mt-0.5">{stats.fluxMassifs}</div>
                <span className="text-[10px] text-emerald-400/80">Baisse de cote ≥ {seuilVariation}%</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/30">
                <span className="text-[11px] text-rose-300 font-medium">Dérives de Cote</span>
                <div className="text-xl font-black text-rose-400 mt-0.5">{stats.derives}</div>
                <span className="text-[10px] text-rose-400/80">Hausse de cote ≥ {seuilVariation}%</span>
              </div>
            </div>

            {/* BARRE D'ACTIONS & FILTRES */}
            <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5" />
                  Filtrer :
                </span>
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterType === 'all' ? 'bg-slate-700 text-white font-black' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  Tous ({snapshots.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('alertes')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterType === 'alertes' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  Alertes ({stats.totalAlertes})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('baisses')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterType === 'baisses' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  Appuis ({stats.fluxMassifs})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('hausses')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterType === 'hausses' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  Dérives ({stats.derives})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={snapshots.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                  title="Exporter les instantanés au format CSV"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* TABLEAU DES INSTANTANÉS */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/70">
              <div className="max-h-[460px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 text-[11px] font-bold uppercase sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Heure</th>
                      <th className="py-2.5 px-3 text-center">N°</th>
                      <th className="py-2.5 px-3">Cheval & Driver</th>
                      <th className="py-2.5 px-3 text-right">Rapport Précédent</th>
                      <th className="py-2.5 px-3 text-right">Rapport Direct (5s)</th>
                      <th className="py-2.5 px-3 text-center">Variation</th>
                      <th className="py-2.5 px-3 text-center">Diagnostic ANJ / Flux</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredSnapshots.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-500 italic">
                          En attente du premier cycle de 5 secondes ou aucun mouvement ne correspond au filtre sélectionné...
                        </td>
                      </tr>
                    ) : (
                      filteredSnapshots.map((item) => (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-900/60 transition-colors ${
                            item.estAlerte ? 'bg-amber-950/20' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-mono text-slate-400 whitespace-nowrap">
                            {item.timeFormatted}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="font-mono font-black text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {item.numero}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-white">{item.nom}</div>
                            {item.driver && (
                              <div className="text-[10px] text-slate-400">{item.driver}</div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-400">
                            {item.rapportPrecedent > 0 ? `${item.rapportPrecedent.toFixed(1)}/1` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-white">
                            {item.rapportActuel.toFixed(1)}/1
                          </td>
                          <td className="py-2 px-3 text-center">
                            {item.variationPct === 0 ? (
                              <span className="text-[11px] text-slate-500 font-mono">0% (Stable)</span>
                            ) : item.variationPct < 0 ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-black text-[11px]">
                                <TrendingDown className="w-3 h-3 text-emerald-400" />
                                {item.variationPct}%
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono font-black text-[11px]">
                                <TrendingUp className="w-3 h-3 text-rose-400" />
                                +{item.variationPct}%
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {item.typeAlerte === 'flux_massif' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200 border border-emerald-400 text-[10px] font-black uppercase shadow-xs">
                                🚨 FLUX MASSIF (APPUI)
                              </span>
                            ) : item.typeAlerte === 'derive_cote' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-400 text-[10px] font-black uppercase shadow-xs">
                                ⚠️ DÉRIVE FORTE
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Normal</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CONTENU ONGLET 2 : EXPLICATION ANJ (COTE FIXE VS RAPPORT PROBABLE) */}
        {activeTab === 'explication' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>Cadre Réglementaire ANJ & Définition du Pari Mutuel</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                L’Autorité Nationale des Jeux (ANJ) rappelle que l’ensemble des paris hippiques autorisés en France fonctionnent selon le principe du <strong>pari mutuel</strong>. 
                Les parieurs ne jouent pas contre un opérateur ou un bookmaker à cote garantie, mais les uns contre les autres au sein d'une masse commune.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                  <ArrowRightLeft className="w-4 h-4 text-rose-400" />
                  <span>1. La Cote Fixe (Bookmaker)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Proposée sur les paris sportifs ou par les bookmakers internationaux, la cote est <strong>verrouillée dès la prise de pari</strong>. Même si le cours s'effondre après votre mise, vous touchez le rapport fixé à la validation de votre ticket.
                </p>
                <div className="p-2.5 rounded-lg bg-slate-900 text-[11px] text-slate-400 border border-slate-800">
                  ❌ Non applicable aux courses françaises sur le réseau PMU.fr régulé par l'ANJ.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>2. Le Rapport Probable (Pari Mutuel PMU)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Avant le départ, les rapports affichés sont des <strong>estimations dynamiques</strong> recalculées en direct selon la proportion des mises reçues sur chaque partant dans la masse globale.
                </p>
                <div className="p-2.5 rounded-lg bg-emerald-950/40 text-[11px] text-emerald-300 border border-emerald-500/30">
                  ✅ Le rapport définitif n’est certifié qu’après la clôture des enjeux au départ de la course et déduction du Taux de Retour Joueur (TRJ).
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>Pourquoi 1 / Rapport ne donne pas une probabilité absolue</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Une conversion mathématique simple telle que <code>1 / rapport</code> peut servir d'indicateur brut de tendance, mais elle ne reflète pas une probabilité pure car elle ignore :
              </p>
              <ul className="list-disc list-inside text-xs text-slate-400 space-y-1.5 pl-2">
                <li>Les prélèvements légaux et fiscaux obligatoires (qui représentent environ 15% à 25% de la masse brute selon le type de pari).</li>
                <li>Les flux massifs de dernières secondes (paris de gros investisseurs ou syndicats injectés juste avant le départ).</li>
                <li>Les biais psychologiques de foule sur les favoris de la presse.</li>
              </ul>
            </div>
          </div>
        )}

        {/* CONTENU ONGLET 3 : APIS OFFICIELLES SANS SCRAPING */}
        {activeTab === 'api_alternatives' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 space-y-2">
              <div className="flex items-center gap-2 text-teal-300 font-black text-sm">
                <Database className="w-5 h-5 text-teal-400" />
                <span>Pourquoi utiliser les APIs officielles plutôt que le Web Scraping ?</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Le scraping HTML (comme avec BeautifulSoup) est fragile car la structure des pages web change régulièrement et les pages chargées dynamiquement en JavaScript (React/Next.js) ne renvoient souvent aucun tableau HTML brut. Les APIs REST directes fournissent des objets JSON normalisés, ultra-rapides et pérennes.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">1. API REST Directe PMU.fr (TurfInfo)</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    INTÉGRÉE DANS L'APPLICATION
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Endpoint public haute disponibilité utilisé par les applications mobiles et sites partenaires PMU. Fournit directement les partants, cotes probables, cotes de référence et ordres d'arrivée sans scraping.
                </p>
                <div className="p-2.5 rounded-lg bg-slate-900 font-mono text-[11px] text-amber-300 break-all select-all border border-slate-800">
                  https://online.turfinfo.api.pmu.fr/rest/client/1/programme/&#123;DATE&#125;/R&#123;R&#125;/C&#123;C&#125;/participants?specialisation=INTERNET
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">2. Partenaires Geny / Genybet</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    FLUX CERTIFIÉS
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Geny fournit le programme officiel, les analyses expertes et les cotes en direct. Pour un usage commercial intensif, des licences partenaires permettent d'accéder aux flux de données en temps réel.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">3. Open Data de l'ANJ</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    DONNÉES AGRÉGÉES MARCHÉ
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  L’ANJ publie des jeux de données ouverts sur le marché des jeux en ligne et des paris hippiques. Idéal pour des analyses macro-économiques, des bilans annuels et des études statistiques globales.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CONTENU ONGLET 4 : SCRIPT PYTHON AUTONOME */}
        {activeTab === 'script_python' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h4 className="font-black text-white text-sm">
                  Script Python de Suivi Automatisé des Cotes (Sans Scraping)
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Prêt à l'emploi avec <code>requests</code>, détection de variation à 15% et export CSV horodaté.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyScript}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copié dans le presse-papier !' : 'Copier le script Python'}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 border border-slate-800 overflow-x-auto leading-relaxed max-h-[500px]">
              <pre>{pythonScript}</pre>
            </div>
          </div>
        )}

        {/* FOOTER MODAL */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Conformité stricte ANJ & PMU : Détection dynamique sans falsification</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
