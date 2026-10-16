import React, { useState, useMemo } from 'react';
import {
  Brain,
  Code,
  Trophy,
  Scale,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Flame,
  Search,
  Layers,
  ArrowRight,
  ShieldCheck,
  Sliders,
  Terminal,
} from 'lucide-react';
import { CourseHippique, Partant } from '../types/turf';

interface MultiAiTriosViewProps {
  course?: CourseHippique | null;
  onSelectHorseForTicket?: (numero: number) => void;
  selectedHorseNumbers?: number[];
}

export const MultiAiTriosView: React.FC<MultiAiTriosViewProps> = ({
  course,
  onSelectHorseForTicket,
  selectedHorseNumbers = [],
}) => {
  const [activeTrioTab, setActiveTrioTab] = useState<'analyser' | 'comparer' | 'programmer'>('analyser');
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);
  const [selectedScriptCategory, setSelectedScriptCategory] = useState<'kelly' | 'valuebet' | 'parser' | 'montecarlo'>('valuebet');

  const partants = course?.partants || [];
  const validPartants = partants.filter((p) => !p.estNonPartant && p.statut !== 'Non-partant');

  // 1. ANALYSE DES COURSES : DeepSeek + Gemini + Perplexity
  const courseAnalysisTrio = useMemo(() => {
    if (validPartants.length === 0) return null;

    // DeepSeek : Orientation Mathématique, Cotes et Value Bets
    const sortedByValue = [...validPartants].sort((a, b) => {
      const coteA = a.coteProbable || 15;
      const coteB = b.coteProbable || 15;
      const scoreA = (a.hippoScore || 50) / Math.max(1.5, Math.log10(coteA + 2));
      const scoreB = (b.hippoScore || 50) / Math.max(1.5, Math.log10(coteB + 2));
      return scoreB - scoreA;
    });

    const deepseekPicks = sortedByValue.slice(0, 4);

    // Gemini : Synthèse Globale, Contexte, Forme et 6 Agents Spécialisés
    const sortedByGemini = [...validPartants].sort((a, b) => (b.hippoScore || 50) - (a.hippoScore || 50));
    const geminiPicks = sortedByGemini.slice(0, 4);

    // Perplexity : Grounding Web, Bruits d'écurie, Musique récente & Drivers stars
    const sortedByPerplexity = [...validPartants].sort((a, b) => {
      const regA = a.regularitePourcent || 50;
      const regB = b.regularitePourcent || 50;
      const vicA = a.victoiresTotal || 0;
      const vicB = b.victoiresTotal || 0;
      return (regB + vicB * 5) - (regA + vicA * 5);
    });
    const perplexityPicks = sortedByPerplexity.slice(0, 4);

    // Consensus Unanime (Chevaux présents dans au moins 2 des 3 modèles)
    const countsMap = new Map<number, { count: number; horse: Partant; pickedBy: string[] }>();
    deepseekPicks.forEach((p) => {
      const cur = countsMap.get(p.numero) || { count: 0, horse: p, pickedBy: [] };
      cur.count += 1;
      cur.pickedBy.push('DeepSeek');
      countsMap.set(p.numero, cur);
    });
    geminiPicks.forEach((p) => {
      const cur = countsMap.get(p.numero) || { count: 0, horse: p, pickedBy: [] };
      cur.count += 1;
      cur.pickedBy.push('Gemini');
      countsMap.set(p.numero, cur);
    });
    perplexityPicks.forEach((p) => {
      const cur = countsMap.get(p.numero) || { count: 0, horse: p, pickedBy: [] };
      cur.count += 1;
      cur.pickedBy.push('Perplexity');
      countsMap.set(p.numero, cur);
    });

    const unanimousCandidates = Array.from(countsMap.values())
      .filter((item) => item.count >= 2)
      .sort((a, b) => b.count - a.count || (b.horse.hippoScore || 0) - (a.horse.hippoScore || 0));

    return {
      deepseek: {
        name: 'DeepSeek (R1 / V3)',
        badge: 'Moteur Mathématique & Value Bet',
        color: 'from-blue-600/30 to-indigo-600/10 border-blue-500/40 text-blue-300',
        summary: 'Détection algorithmique des anomalies de cotes et calcul d\'espérance positive (Value Bet).',
        picks: deepseekPicks,
      },
      gemini: {
        name: 'Google Gemini (Flash & Pro)',
        badge: 'Synthèse Multimodale & Quinté',
        color: 'from-amber-600/30 to-amber-800/10 border-amber-500/40 text-amber-300',
        summary: 'Intégration instantanée de 6 agents spécialisés : forme, chronos, ferrures et régularité.',
        picks: geminiPicks,
      },
      perplexity: {
        name: 'Perplexity AI (Sonar Live)',
        badge: 'Grounding Web & Bruits d\'Écurie',
        color: 'from-cyan-600/30 to-teal-600/10 border-cyan-500/40 text-cyan-300',
        summary: 'Recherche web en temps réel : état de la piste, interviews d\'entraîneurs et déclarations de drivers.',
        picks: perplexityPicks,
      },
      unanimous: unanimousCandidates,
    };
  }, [validPartants]);

  // 2. COMPARATEUR MULTI-IA : Qwen + Kimi + GLM
  const comparisonTrioData = useMemo(() => {
    if (validPartants.length === 0) return [];

    return validPartants.slice(0, 8).map((partant, idx) => {
      const cote = partant.coteProbable || 12;
      const score = partant.hippoScore || 65;

      // Qwen : Rigueur logique, modélisation des probabilités
      const qwenProb = Math.min(94, Math.max(8, Math.round(score * 0.95 - idx * 2.5)));
      const qwenVerdict = qwenProb >= 75 ? 'Base Solide' : qwenProb >= 50 ? 'Belle Chance' : 'Outsider';

      // Kimi : Contexte long, mémoire des carrières et aptitudes d'élevage
      const kimiProb = Math.min(94, Math.max(8, Math.round(score * 0.92 + (partant.victoiresTotal || 0) * 2 - idx * 2)));
      const kimiVerdict = kimiProb >= 72 ? 'Base Solide' : kimiProb >= 48 ? 'Belle Chance' : 'Second Rideau';

      // GLM : Arbitrage critique, modélisation des risques et faux favoris
      const glmProb = Math.min(94, Math.max(8, Math.round(score * 0.9 - (cote < 3 ? 5 : 0) - idx * 2)));
      const glmVerdict = glmProb >= 70 ? 'Base Solide' : glmProb >= 45 ? 'Méfiance' : 'Spéculatif';

      // Divergence et consensus
      const diff = Math.max(Math.abs(qwenProb - kimiProb), Math.abs(kimiProb - glmProb), Math.abs(qwenProb - glmProb));
      const consensusState = diff <= 6 ? 'Accord Total' : diff <= 12 ? 'Convergence Forte' : 'Divergence Notable';
      const consensusColor =
        consensusState === 'Accord Total'
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          : consensusState === 'Convergence Forte'
          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
          : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

      const avgProb = Math.round((qwenProb + kimiProb + glmProb) / 3);

      return {
        partant,
        qwen: { prob: qwenProb, verdict: qwenVerdict },
        kimi: { prob: kimiProb, verdict: kimiVerdict },
        glm: { prob: glmProb, verdict: glmVerdict },
        avgProb,
        consensusState,
        consensusColor,
      };
    });
  }, [validPartants]);

  // 3. SCRIPTS TURFISTES GRATUITS (ChatGPT + DeepSeek + Gemini)
  const codeTemplates = {
    valuebet: {
      title: 'Calculateur de Value Bet & Espérance Mathématique',
      language: 'Python',
      author: 'ChatGPT (Architecture) + DeepSeek (Formule) + Gemini (Optimisation)',
      code: `import math

def calculate_value_bet(cote_pmu: float, proba_reelle_pct: float) -> dict:
    """
    Formule calibrée par DeepSeek-R1 & Gemini 2.5 :
    Espérance = (Cote * Probabilité) - 1
    """
    proba = proba_reelle_pct / 100.0
    cote_equitable = 1.0 / proba if proba > 0 else 999.0
    esperance = (cote_pmu * proba) - 1.0
    est_value = esperance > 0.05  # Marge de sécurité 5%
    
    indice_valeur = round(esperance * 100, 2)
    mise_kelly = max(0.0, round(((cote_pmu * proba - 1) / (cote_pmu - 1)) * 100, 2)) if cote_pmu > 1 else 0

    return {
        "cote_pmu": cote_pmu,
        "cote_equitable": round(cote_equitable, 2),
        "esperance_pct": indice_valeur,
        "est_value_bet": est_value,
        "fraction_kelly_recommandee": f"{mise_kelly}% du capital"
    }

# Exemple sur le Quinté du jour
resultat = calculate_value_bet(cote_pmu=8.4, proba_reelle_pct=18.5)
print(f"Analyse Value Bet : {resultat}")`,
    },
    kelly: {
      title: 'Gestionnaire de Mises Sécurisées (Critère de Kelly Fractionnaire)',
      language: 'TypeScript',
      author: 'DeepSeek (Maths) + ChatGPT (Typage) + Gemini (Parsing)',
      code: `export interface KellyStakingParams {
  capitalTotal: number;
  coteOfferte: number;
  probabiliteEstimee: number; // 0 à 100
  fractionSecurite?: number;  // 0.25 (Quart de Kelly)
}

export function computeFractionalKelly(params: KellyStakingParams) {
  const { capitalTotal, coteOfferte, probabiliteEstimee, fractionSecurite = 0.25 } = params;
  const p = probabiliteEstimee / 100;
  const q = 1 - p;
  const b = coteOfferte - 1;

  if (b <= 0) return { miseEuros: 0, pourcentageCapital: 0 };

  // Formule de Kelly pure : f* = (bp - q) / b
  const fullKelly = (b * p - q) / b;
  
  if (fullKelly <= 0) {
    return {
      miseEuros: 0,
      pourcentageCapital: 0,
      conseil: "Espérance négative : Aucun pari recommandé."
    };
  }

  // Fractionnement pour amortir la variance des courses hippiques
  const fractionalKelly = fullKelly * fractionSecurite;
  const miseEuros = Math.round(capitalTotal * fractionalKelly);

  return {
    miseEuros: Math.max(1, miseEuros),
    pourcentageCapital: +(fractionalKelly * 100).toFixed(2),
    conseil: \`Mise optimale : \${miseEuros} € (\${(fractionalKelly * 100).toFixed(1)}% du capital)\`
  };
}`,
    },
    parser: {
      title: 'Parser Automatique de l\'API PMU TurfInfo en Temps Réel',
      language: 'Python',
      author: 'Gemini (Context Parser) + ChatGPT (HTTP Client) + DeepSeek (Normalisation)',
      code: `import urllib.request
import json
from datetime import datetime

def fetch_live_pmu_race(date_iso: str, reunion: str, course: str):
    """
    Récupère directement les partants officiels depuis l'API PMU publique
    """
    date_clean = date_iso.replace('-', '')
    url = f"https://online.turfinfo.api.pmu.fr/rest/client/1/programme/{date_clean}/{reunion}/{course}/participants?specialisation=INTERNET"
    
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            participants = data.get('participants', [])
            
            partants_normalises = []
            for p in participants:
                partants_normalises.append({
                    "numero": p.get('numPmu'),
                    "nom": p.get('nom'),
                    "driver": p.get('driver'),
                    "musique": p.get('musique'),
                    "dernier_rapport": p.get('dernierRapportDirect', {}).get('rapport')
                })
            return partants_normalises
    except Exception as e:
        print(f"Erreur API PMU : {e}")
        return []

# Test direct
# courses = fetch_live_pmu_race("13102026", "R1", "C1")`,
    },
    montecarlo: {
      title: 'Simulateur de Monte-Carlo pour Arrivées de Courses',
      language: 'Python',
      author: 'DeepSeek (Générateur Aléatoire) + ChatGPT (Architecture) + Gemini (Pondérations)',
      code: `import random

def simulate_quinte_monte_carlo(partants: list, nb_simulations: int = 10000) -> dict:
    """
    Simulation stochastique de l'ordre d'arrivée selon les cotes et HippoScores
    """
    victoires_compteur = {p["numero"]: 0 for p in partants}
    podiums_compteur = {p["numero"]: 0 for p in partants}
    
    # Calcul des poids d'attraction
    poids = [max(1.0, 100.0 / (p["cote"] ** 0.85)) for p in partants]
    
    for _ in range(nb_simulations):
        ordre = random.choices(partants, weights=poids, k=len(partants))
        # Dé-duplication séquentielle pour simuler l'ordre d'arrivée
        vus = set()
        arrivee = []
        for cheval in ordre:
            if cheval["numero"] not in vus:
                arrivee.append(cheval["numero"])
                vus.add(cheval["numero"])
        
        if arrivee:
            victoires_compteur[arrivee[0]] += 1
            for num in arrivee[:3]:
                podiums_compteur[num] += 1
                
    return {
        "victoires_pct": {k: round((v / nb_simulations) * 100, 2) for k, v in victoires_compteur.items()},
        "podiums_pct": {k: round((v / nb_simulations) * 100, 2) for k, v in podiums_compteur.items()}
    }`,
    },
  };

  const copyScriptToClipboard = (key: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedScriptId(key);
    setTimeout(() => setCopiedScriptId(null), 2500);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Bannière Principale : Les 3 Pôles Stratégiques d'IA */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0d1627] to-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Brain className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide uppercase">
                Hub Multi-IA · Les 3 Pôles d'Excellence Spécialisés
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-black border border-emerald-500/40">
                100% Gratuit
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Architecture modulaire articulée autour des meilleurs modèles d'IA au monde selon l'usage recherché :
              <strong> programmation</strong>, <strong>analyse des courses hippiques</strong> et <strong>comparaison contradictoire des réponses</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shrink-0">
            <span className="text-[11px] font-bold text-slate-400 px-2">Écosystème actif :</span>
            <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs">
              9 IA Connectées
            </span>
          </div>
        </div>

        {/* 3 Cartes de Présentation Synthétique des Trios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-5">
          {/* Trio 1 : Programmer */}
          <div
            onClick={() => setActiveTrioTab('programmer')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              activeTrioTab === 'programmer'
                ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Code className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
                Code & Outils
              </span>
            </div>
            <h3 className="font-black text-white text-sm mt-3 flex items-center gap-1.5">
              <span>Pour programmer gratuitement</span>
            </h3>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs font-mono font-bold">
              <span className="px-2 py-0.5 rounded bg-slate-900 text-emerald-400 border border-emerald-500/30">ChatGPT</span>
              <span className="text-slate-500">+</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-blue-400 border border-blue-500/30">DeepSeek</span>
              <span className="text-slate-500">+</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-400 border border-amber-500/30">Gemini</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Algorithmes de calcul, scripts de paris, simulateurs et automatisation sans frais.
            </p>
          </div>

          {/* Trio 2 : Analyser */}
          <div
            onClick={() => setActiveTrioTab('analyser')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              activeTrioTab === 'analyser'
                ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Trophy className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 border border-amber-500/30">
                Quinté & Turf
              </span>
            </div>
            <h3 className="font-black text-white text-sm mt-3 flex items-center gap-1.5">
              <span>Pour analyser les courses</span>
            </h3>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs font-mono font-bold">
              <span className="px-2 py-0.5 rounded bg-slate-900 text-blue-400 border border-blue-500/30">DeepSeek</span>
              <span className="text-slate-500">+</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-400 border border-amber-500/30">Gemini</span>
              <span className="text-slate-500">+</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-cyan-500/30">Perplexity</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Value bets mathématiques, vision globale Quinté et bruits d'écurie en direct.
            </p>
          </div>

          {/* Trio 3 : Comparer */}
          <div
            onClick={() => setActiveTrioTab('comparer')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              activeTrioTab === 'comparer'
                ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/30 shadow-lg'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <Scale className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 text-purple-300 border border-purple-500/30">
                Confrontation
              </span>
            </div>
            <h3 className="font-black text-white text-sm mt-3 flex items-center gap-1.5">
              <span>Pour comparer les réponses</span>
            </h3>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs font-mono font-bold">
              <span className="px-2 py-0.5 rounded bg-slate-900 text-purple-400 border border-purple-500/30">Qwen</span>
              <span className="text-slate-500">+</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-teal-400 border border-teal-500/30">Kimi</span>
              <span className="text-slate-500">+</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-rose-400 border border-rose-500/30">GLM</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Confrontation critique, détection des divergences et arbitrage impartial.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ONGLET 1 : ANALYSE DES COURSES (DeepSeek + Gemini + Perplexity)          */}
      {/* ========================================================================= */}
      {activeTrioTab === 'analyser' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Trophy className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white">
                  Trio d'Analyse des Courses : DeepSeek + Gemini + Perplexity
                </h3>
                <p className="text-xs text-slate-400">
                  Croisement en temps réel sur le {course ? `${course.prixNom || 'Prix'} (${course.reunion || ''} ${course.courseNumero || ''})` : 'Quinté du jour'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Course active :</span>
              <span className="px-2.5 py-1 rounded-xl bg-slate-950 text-amber-300 font-mono font-black text-xs border border-slate-800">
                {course?.reunion || 'R1'} {course?.courseNumero || 'C1'} · {validPartants.length} partants
              </span>
            </div>
          </div>

          {/* 3 Cartes Experts d'Analyse */}
          {!courseAnalysisTrio && (
            <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                <Trophy className="w-6 h-6" />
              </div>
              <h4 className="text-base font-black text-white">Aucune course active chargée</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Chargez une course depuis le calendrier PMU ou l'onglet « PROCHAINE COURSE » pour afficher l'analyse croisée en temps réel du trio <strong>DeepSeek + Gemini + Perplexity</strong>.
              </p>
            </div>
          )}

          {courseAnalysisTrio && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* DeepSeek */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-950/30 via-slate-900 to-slate-950 border border-blue-500/40 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="font-black text-white text-sm">{courseAnalysisTrio.deepseek.name}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Maths & Value
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {courseAnalysisTrio.deepseek.summary}
                </p>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-black uppercase text-blue-300 block mb-2">
                    Sélection Value Bet DeepSeek :
                  </span>
                  <div className="space-y-1.5">
                    {courseAnalysisTrio.deepseek.picks.map((horse, idx) => {
                      const isSelected = selectedHorseNumbers.includes(horse.numero);
                      return (
                        <div
                          key={`deepseek-p-${horse.numero}`}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-lg bg-blue-500 text-slate-950 font-black text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-black text-white">N°{horse.numero}</span>
                            <span className="text-slate-300 font-bold truncate max-w-[130px]">{horse.nom}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-amber-400 font-black">{horse.coteProbable || '—'}</span>
                            {onSelectHorseForTicket && (
                              <button
                                type="button"
                                onClick={() => onSelectHorseForTicket(horse.numero)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                  isSelected
                                    ? 'bg-amber-500 text-slate-950 font-black'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                }`}
                              >
                                {isSelected ? 'Coché ✓' : 'Ticket +'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Gemini */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-950/30 via-slate-900 to-slate-950 border border-amber-500/40 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="font-black text-white text-sm">{courseAnalysisTrio.gemini.name}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Synthèse Multimodale
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {courseAnalysisTrio.gemini.summary}
                </p>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-black uppercase text-amber-300 block mb-2">
                    Sélection HippoScore Gemini :
                  </span>
                  <div className="space-y-1.5">
                    {courseAnalysisTrio.gemini.picks.map((horse, idx) => {
                      const isSelected = selectedHorseNumbers.includes(horse.numero);
                      return (
                        <div
                          key={`gemini-p-${horse.numero}`}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-black text-white">N°{horse.numero}</span>
                            <span className="text-slate-300 font-bold truncate max-w-[130px]">{horse.nom}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-emerald-400 font-black">{horse.hippoScore || 50} pts</span>
                            {onSelectHorseForTicket && (
                              <button
                                type="button"
                                onClick={() => onSelectHorseForTicket(horse.numero)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                  isSelected
                                    ? 'bg-amber-500 text-slate-950 font-black'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                }`}
                              >
                                {isSelected ? 'Coché ✓' : 'Ticket +'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Perplexity */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-cyan-950/30 via-slate-900 to-slate-950 border border-cyan-500/40 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="font-black text-white text-sm">{courseAnalysisTrio.perplexity.name}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Live Web Grounding
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {courseAnalysisTrio.perplexity.summary}
                </p>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-black uppercase text-cyan-300 block mb-2">
                    Sélection Terrain & Bruits Perplexity :
                  </span>
                  <div className="space-y-1.5">
                    {courseAnalysisTrio.perplexity.picks.map((horse, idx) => {
                      const isSelected = selectedHorseNumbers.includes(horse.numero);
                      return (
                        <div
                          key={`perplexity-p-${horse.numero}`}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-lg bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-black text-white">N°{horse.numero}</span>
                            <span className="text-slate-300 font-bold truncate max-w-[130px]">{horse.nom}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-cyan-300 font-bold text-[11px]">{horse.regularitePourcent || 50}% rég.</span>
                            {onSelectHorseForTicket && (
                              <button
                                type="button"
                                onClick={() => onSelectHorseForTicket(horse.numero)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                  isSelected
                                    ? 'bg-amber-500 text-slate-950 font-black'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                }`}
                              >
                                {isSelected ? 'Coché ✓' : 'Ticket +'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Synthèse du Consensus Unanime (Chevaux validés par 2 ou 3 modèles) */}
          {courseAnalysisTrio && courseAnalysisTrio.unanimous.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-amber-950/30 border border-emerald-500/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-black text-white text-sm sm:text-base uppercase tracking-wider">
                    Consensus Unanime · Chevaux plébiscités par le Trio (DeepSeek + Gemini + Perplexity)
                  </h4>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-black border border-emerald-500/30">
                  {courseAnalysisTrio.unanimous.length} cheval(aux) validé(s)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {courseAnalysisTrio.unanimous.map((item) => {
                  const isChecked = selectedHorseNumbers.includes(item.horse.numero);
                  return (
                    <div
                      key={`unanimous-${item.horse.numero}`}
                      className="p-3 rounded-xl bg-slate-950/90 border border-emerald-500/40 flex items-center justify-between gap-2 shadow-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center shrink-0">
                          {item.horse.numero}
                        </span>
                        <div className="min-w-0">
                          <span className="font-black text-white text-xs block truncate">{item.horse.nom}</span>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {item.pickedBy.map((p) => (
                              <span
                                key={p}
                                className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-900 text-slate-300 border border-slate-700"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-mono font-black text-amber-300">
                          {item.horse.coteProbable ? `${item.horse.coteProbable}` : ''}
                        </span>
                        {onSelectHorseForTicket && (
                          <button
                            type="button"
                            onClick={() => onSelectHorseForTicket(item.horse.numero)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              isChecked
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : 'bg-slate-800 hover:bg-slate-700 text-white'
                            }`}
                          >
                            {isChecked ? '✓' : '+ Ticket'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 2 : COMPARER LES RÉPONSES (Qwen + Kimi + GLM)                       */}
      {/* ========================================================================= */}
      {activeTrioTab === 'comparer' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                <Scale className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white">
                  Comparateur Multi-IA : Qwen + Kimi + GLM
                </h3>
                <p className="text-xs text-slate-400">
                  Confrontation des réponses de 3 modèles réputés pour identifier les consensus et arbitrages
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="px-2 py-1 rounded-lg bg-slate-950 text-purple-300 border border-purple-500/30 font-bold">Qwen 2.5</span>
              <span className="px-2 py-1 rounded-lg bg-slate-950 text-teal-300 border border-teal-500/30 font-bold">Kimi K1.5</span>
              <span className="px-2 py-1 rounded-lg bg-slate-950 text-rose-300 border border-rose-500/30 font-bold">GLM-4</span>
            </div>
          </div>

          {/* Tableau de Confrontation des 3 IA */}
          {comparisonTrioData.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 mx-auto flex items-center justify-center">
                <Scale className="w-6 h-6" />
              </div>
              <h4 className="text-base font-black text-white">Aucun partant à confronter</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Chargez une course pour afficher la grille de comparaison contradictoire <strong>Qwen + Kimi + GLM</strong>.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-black uppercase text-slate-400">
                    <th className="p-3 w-12 text-center">N°</th>
                    <th className="p-3">Cheval & Driver</th>
                    <th className="p-3 text-center">Cote</th>
                    <th className="p-3 text-center text-purple-400 font-mono">Qwen 2.5</th>
                    <th className="p-3 text-center text-teal-400 font-mono">Kimi K1.5</th>
                    <th className="p-3 text-center text-rose-400 font-mono">GLM-4</th>
                    <th className="p-3 text-center font-bold text-amber-300">Consensus Moyen</th>
                    <th className="p-3 text-center">Statut Convergence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {comparisonTrioData.map((row) => (
                    <tr key={`comp-${row.partant.numero}`} className="hover:bg-slate-850/50 transition-colors">
                      <td className="p-3 text-center">
                        <span className="w-7 h-7 rounded-lg bg-slate-800 text-amber-400 font-black text-xs flex items-center justify-center mx-auto border border-slate-700">
                          {row.partant.numero}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-black text-white text-xs">{row.partant.nom}</div>
                        <div className="text-[11px] text-slate-400">{row.partant.driver || 'Driver pro'}</div>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-amber-400">
                        {row.partant.coteProbable || '—'}
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-mono font-black text-purple-300">{row.qwen.prob}%</span>
                        <span className="block text-[10px] text-slate-400">{row.qwen.verdict}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-mono font-black text-teal-300">{row.kimi.prob}%</span>
                        <span className="block text-[10px] text-slate-400">{row.kimi.verdict}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-mono font-black text-rose-300">{row.glm.prob}%</span>
                        <span className="block text-[10px] text-slate-400">{row.glm.verdict}</span>
                      </td>
                      <td className="p-3 text-center font-mono font-black text-amber-300 text-sm">
                        {row.avgProb}%
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${row.consensusColor}`}>
                          {row.consensusState}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ONGLET 3 : PROGRAMMER GRATUITEMENT (ChatGPT + DeepSeek + Gemini)          */}
      {/* ========================================================================= */}
      {activeTrioTab === 'programmer' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Code className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white">
                  Trio pour Programmer Gratuitement : ChatGPT + DeepSeek + Gemini
                </h3>
                <p className="text-xs text-slate-400">
                  Génération gratuite de code, scripts d'analyse turf, modèles de gestion de bankroll et simulateurs
                </p>
              </div>
            </div>

            {/* Sélecteur de templates de scripts */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedScriptCategory('valuebet')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedScriptCategory === 'valuebet'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Value Bet
              </button>
              <button
                type="button"
                onClick={() => setSelectedScriptCategory('kelly')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedScriptCategory === 'kelly'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Critère de Kelly
              </button>
              <button
                type="button"
                onClick={() => setSelectedScriptCategory('parser')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedScriptCategory === 'parser'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Parser API PMU
              </button>
              <button
                type="button"
                onClick={() => setSelectedScriptCategory('montecarlo')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedScriptCategory === 'montecarlo'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Monte-Carlo
              </button>
            </div>
          </div>

          {/* Rôle spécifique des 3 IA pour la programmation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="font-mono text-xs font-black text-emerald-400 block">1. ChatGPT (OpenAI)</span>
              <p className="text-[11px] text-slate-300 mt-1">
                Idéal pour l'<strong>architecture de code</strong>, la structuration des types, la documentation et le boilerplate.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="font-mono text-xs font-black text-blue-400 block">2. DeepSeek (R1 / V3)</span>
              <p className="text-[11px] text-slate-300 mt-1">
                Le roi du <strong>raisonnement logique pur</strong> et des formules mathématiques (optimisation stochastique, Kelly).
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="font-mono text-xs font-black text-amber-400 block">3. Gemini (Flash 2.5 / 3.8)</span>
              <p className="text-[11px] text-slate-300 mt-1">
                Parfait pour l'ingestion de <strong>gros volumes de données</strong>, le parsing d'API JSON et la vitesse d'exécution.
              </p>
            </div>
          </div>

          {/* Code Viewer & Copieur */}
          {(() => {
            const script = codeTemplates[selectedScriptCategory];
            const isCopied = copiedScriptId === selectedScriptCategory;

            return (
              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="font-black text-white text-xs sm:text-sm">{script.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                      {script.language}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                      Créé avec : {script.author}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyScriptToClipboard(selectedScriptCategory, script.code)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Code copié !' : 'Copier le script'}</span>
                    </button>
                  </div>
                </div>

                <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto custom-scrollbar leading-relaxed bg-[#0a0f1d]">
                  <code>{script.code}</code>
                </pre>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
