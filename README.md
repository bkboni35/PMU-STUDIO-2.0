# 🐎 Remix HippoAnalyse — Suite d'Analyse Intelligente de Courses Hippiques (PMU, Quinté+, Geny & Paris-Turf)

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC.svg)](https://tailwindcss.com/)
[![Google Gemini API](https://img.shields.io/badge/Gemini_API-3.8_Flash_%2F_3.1_Pro-4285F4.svg)](https://ai.google.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28.svg)](https://firebase.google.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-purple.svg)](https://web.dev/progressive-web-apps/)

**Remix HippoAnalyse** est une application web et mobile de pointe dédiée aux turfistes, pronostiqueurs et passionnés de courses hippiques. Elle combine des algorithmes mathématiques déterministes (HippoScore V38) avec la puissance de modèles d'IA de dernière génération (**Google Gemini 3.8 & 3.1 Pro avec Fact-Checking en temps réel**) pour disséquer, classer et optimiser les sélections de jeu sur l'ensemble des courses du programme PMU, Geny et Paris-Turf.

---

## 🌟 Points Forts & Fonctionnalités Majeures

### 1. 🔍 Ingestion Multi-Sources & Fact-Checking en Temps Réel
- **Saisie par URL officielle** : Ingestion directe depuis les fiches de courses [geny.com](https://www.geny.com), [paristurf.com](https://www.paris-turf.com), PMU.fr ou PMU Afrique (Lonaci).
- **Importation par Copier-Coller & Fichiers PDF** : Analyse instantanée des textes bruts de partants ou des programmes officiels en format PDF (jusqu'à 100 Mo).
- **Certificat d'Intégrité & Fact-Checker IA** : Vérification Google Search en temps réel pour valider les conditions réelles de course (hippodrome, météo, état du terrain, discipline exacte, peloton officiel et non-partants déclarés).

### 2. 🧠 Algorithme Mathématique HippoScore V38 & Collège IA Gemini
- **HippoScore V38 déterministe (sur 100)** :
  - Forme récente & dynamique (25%)
  - Régularité de la musique chiffrée (20%)
  - Aptitude au tracé, distance et corde (15%)
  - Réussite jockey / driver & entraîneur (15%)
  - Cotes probables et flux financiers récents (15%)
  - Configuration de ferrure (D4, DP, DA, Fers) (10%)
- **Hiérarchie Quinté+ V38** :
  - 👑 **Bases Incontournables** (Socle du ticket)
  - 🟢 **Chances Sérieuses** (Priorités régulières)
  - 🔴 **Tocards Spéculatifs** (Gros rapports)
  - 🟣 **Surprises du Parcours** (Outsiders dangereux)
  - ⚪ **Délaissés** (Chevaux en méforme ou mal engagés)
- **Collège d'Experts Multi-Modèles** :
  - *Gemini 3.1 Flash-Lite* : Décodage ultra-rapide des musiques et détection des allures.
  - *Gemini 3.8 Flash* : Synthèse stratégique globale et projection tactique du peloton.
  - *Gemini 3.1 Pro* : Fact-checking strict, confrontation des données et élimination des incohérences.

### 3. 📊 Tableau des Partants Interactif & Outils d'Analyse Poussés
- **Gestion des Cotes PMU en Direct (30s)** :
  - Détection automatique des fortes baisses (argent frais / bruits d'écurie).
  - Graphiques interactifs de fluctuation temporelle des cotes avec Recharts.
- **Filtrage Personnalisé par Seuil de Cotes** :
  - Masquage interactif des chevaux dont la cote dépasse un seuil défini (slider de 5/1 à 150/1, presets 20, 30, 50, 70, 100).
- **🎯 Détection & Mise en Évidence des Grands Écarts** :
  - Calcul déterministe de l'écart à la gagne (courses consécutives sans victoire) et de l'écart placé (courses consécutives sans podium 1er/2e/3e).
  - Surlignage visuel des partants atteignant le seuil d'écart critique.
  - **Tri par colonne dédié** : bascule immédiate en un clic (`↘ Max` pour les plus grands écarts, `↗ Min` pour la forme récente).
- **Segmentation Avancée du Peloton** :
  - Répartition par groupes de numéros (G1 : 1-6, G2 : 7-10, G3 : 11+).
  - Répartition par groupes de cordes pour le plat (CA : 1-5, CB : 6-8, CC : 9+).
  - **Mode Expert** : affichage optionnel des gains cumulés (€) et de la réduction kilométrique officielle.

### 4. 🏟️ Analyse « Tracé & Facteurs de Course »
- **Profil du Parcours** : Configuration de la piste, sens de la corde (droite/gauche), nature du sol (herbe, sable fibré, mâchefer), longueur de la ligne droite finale.
- **Conditions Météorologiques** : Température, vent, humidité et indice de pénétromètre.
- **Classement des Chevaux par Cote dans le Tracé** : Vue ordonnée identifiant immédiatement les favoris, secondes chances et outsiders adaptés aux pièges du tracé.

### 5. 🎫 Propositions de Jeux Algorithmiques & Calculateur de Mises
- **Propositions Clés en Main** :
  - Quinté+ (Ordre & Désordre, Formules champ réduit et combiné).
  - Quarté+, Tiercé, Multi (en 4, 5, 6, 7), 2 sur 4, Couplé Gagnant / Placé, Simple.
- **Calculateur de Ticket Turf** :
  - Calcul automatique des combinaisons mathématiques $n! / (k!(n-k)!)$.
  - Grille tarifaire officielle en **FCFA** (300 FCFA Quinté/Tiercé, 350 FCFA Multi, 400 FCFA Trio, 500 FCFA Couplé/Simple) et en **Euros (€)**.

### 6. 📅 Calendrier des Réunions & Audit de Concordance
- **Calendrier Interactif PMU** : Navigation par date sur l'ensemble des réunions de France et d'Afrique.
- **Audit des Arrivées Réelles** : Vérification automatisée après course par Grounding Search des rapports officiels et calcul du taux de réussite des pronostics.

### 7. 📄 Exportations Professionnelles
- **Export Excel (.xlsx)** : Tableur complet structuré de tous les partants avec cotes, scores et statistiques.
- **Export PDF Haute Définition** : Fiches d'impression professionnelles (format A4 optimisé pour le terrain, Quinté+ seul ou réunion entière).

---

## 🛠️ Architecture Technique

L'application est construite sur une stack moderne, légère et réactive :

```
remix-hippoanalyse/
├── server.ts                   # Serveur backend Express + intégration Vite dev + API Gemini
├── src/
│   ├── components/             # Composants d'interface React 19 (PartantsTable, HeroCard, etc.)
│   ├── data/                   # Données témoins, réunions officielles et structures modèles
│   ├── types/turf.ts           # Types TypeScript exhaustifs du domaine hippique
│   ├── utils/
│   │   ├── geminiMultiModelEngine.ts # Pipeline du collège multi-modèles Gemini
│   │   ├── v38Helper.ts        # Algorithme HippoScore V38, cordes et cotes Geny
│   │   ├── turfExtractor.ts    # Parseur et extracteur HTML/PDF/JSON de courses
│   │   ├── turfCalculations.ts # Décodeur de musique, combinaisons, tarifs FCFA/EUR
│   │   ├── raceCountdown.ts    # Horloge temps réel et calcul du départ
│   │   ├── excelExport.ts      # Générateur de classeurs Excel SheetJS
│   │   └── pdfExport.ts        # Générateur de fiches PDF jsPDF + autoTable
│   ├── App.tsx                 # Composant racine, navigation principale et gestion d'état
│   └── main.tsx                # Point d'entrée React SPA
├── public/                     # Manifeste PWA, icônes et assets statiques
├── vite.config.ts              # Configuration de build Vite + PWA + Tailwind
└── metadata.json               # Métadonnées et permissions applicatives
```

---

## 🚀 Démarrage Rapide

### Prérequis
- [Node.js](https://nodejs.org/) (version 20+ ou 22 LTS recommandée)
- [npm](https://www.npmjs.com/) ou [pnpm](https://pnpm.io/)
- Une clé API Google Gemini ([Google AI Studio](https://aistudio.google.com/))

### Installation

1. **Cloner le projet ou ouvrir l'espace de travail :**
   ```bash
   git clone <url-du-depot>
   cd remix-hippoanalyse
   ```

2. **Installer les dépendances :**
   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement :**
   Créez un fichier `.env` à la racine :
   ```env
   PORT=3000
   GEMINI_API_KEY=votre_cle_api_gemini_ici
   ```

4. **Lancer en mode développement :**
   ```bash
   npm run dev
   ```
   L'application est accessible à l'adresse : `http://localhost:3000`

5. **Compiler pour la production :**
   ```bash
   npm run build
   npm start
   ```

---

## 📱 Installation PWA (Progressive Web App)

Remix HippoAnalyse est entièrement certifié **PWA** :
- **Sur Android (Chrome / Brave / Edge)** : Cliquez sur le bouton *« Installer sur Android »* ou sélectionnez *« Ajouter à l'écran d'accueil »* dans le menu du navigateur pour l'utiliser comme une application native.
- **Sur iOS (Safari)** : Appuyez sur le bouton de partage, puis sur *« Sur l'écran d'accueil »*.
- **Sur PC / Mac (Chrome / Edge)** : Cliquez sur l'icône d'installation dans la barre d'adresse pour lancer l'application en fenêtre autonome hors du navigateur.

---

## 🔐 Sécurité & Intégrité des Données

- **Zéro Invention Numérique** : Les cotes, partants et conditions de courses sont systématiquement vérifiés auprès des flux officiels PMU.fr et Geny.
- **Clé API Protégée** : Les appels vers l'API Gemini sont sécurisés côté serveur via Express (`/api/gemini/*`) sans exposition des secrets dans le client.
- **Persistance Sécurisée** : Sauvegarde des historiques et favoris via Firebase Firestore avec règles de sécurité strictes.

---

## 📜 Licence & Droits

Projet développé avec passion pour la communauté hippique. Tous droits réservés.  
Les marques *PMU*, *Geny Courses*, *Paris-Turf* et *Lonaci* sont des marques déposées appartenant à leurs propriétaires respectifs.
