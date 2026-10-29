import React from 'react';

interface Systeme74RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Systeme74RulesModal: React.FC<Systeme74RulesModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border-2 border-cyan-500/50 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-slate-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md px-5 py-4 border-b border-slate-800 flex items-center justify-between z-20">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⚡</span>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide">
                Règles du Système 74 & Positionnement Tactique
              </h3>
              <p className="text-xs text-cyan-400 font-medium">
                Guide détaillé des règles par groupe et des critères d'ordonnancement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-colors border border-slate-700"
            title="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-6 text-xs sm:text-sm">
          
          {/* Section 1: Formule de Calcul du Score X */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <h4 className="font-black text-cyan-300 uppercase text-xs tracking-wider flex items-center gap-2">
              <span>📐</span> Formule du Score X & Seuil Minimal
            </h4>
            <div className="p-3 bg-slate-900 rounded-lg border border-cyan-500/30 text-center font-mono font-bold text-cyan-200">
              Score(X) = (73 + N° du Cheval) - Côte Probable (PMU / Geny)
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              <strong>Filtre de Seuil Minimal (par défaut : 20 pts) :</strong> Si le filtre est actif, tout cheval ayant un <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">Score(X) &lt; Seuil</code> est exclu ou remplacé par un emplacement vide (<span className="text-rose-400 font-bold">—</span>).
            </p>
          </div>

          {/* Section 2: Musique des 3 Dernières Courses */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <h4 className="font-black text-emerald-300 uppercase text-xs tracking-wider flex items-center gap-2">
              <span>🎵</span> Performance par la Musique (3 Dernières Courses)
            </h4>
            <p className="text-slate-300 text-xs leading-relaxed">
              Pour chaque groupe, l'attribution initiale s'effectue en calculant le cumul des points de musique sur les <strong>3 dernières courses courues</strong> :
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs pl-2">
              <li>Positions 1 à 9 = valeur numérique de la place (ex: 1er = 1 pt, 5e = 5 pts).</li>
              <li>Au-delà de la 9e place, Disqualifiés (Da, Dm...), Incidents ou Inédits = <strong>10 pts par course</strong>.</li>
              <li><strong>Règle d'or :</strong> Plus le total de points est PETIT, meilleure est la performance passée du cheval.</li>
            </ul>
          </div>

          {/* Section 3: Règles Spécifiques par Groupe */}
          <div className="space-y-4">
            <h4 className="font-black text-amber-300 uppercase text-xs tracking-wider flex items-center gap-2">
              <span>🎯</span> Répartition & Spécificités par Groupe
            </h4>

            {/* Groupe A */}
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2.5">
              <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
                <span className="font-black text-emerald-400 uppercase text-xs tracking-wider">GROUPE A (Numéros 1 à 6 — Max 6 partants)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-500/30">Max 6 retenus (3+3)</span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-bold text-white block">1ère Ligne (3 numéros max) :</span>
                  <ul className="list-disc list-inside text-slate-300 pl-2 space-y-1">
                    <li><strong>Attribution :</strong> Les 3 meilleures performances passées du Groupe A (cumul 3 dernières musiques).</li>
                    <li><strong>Ordonnancement :</strong> Classés entre eux par <strong>Score(X) DÉCROISSANT</strong> (du plus grand au plus petit Score X).</li>
                    <li><strong>Filtrage par Seuil :</strong> Remplacement par un emplacement vide (—) si Score(X) &lt; seuil minimal.</li>
                  </ul>
                </div>
                <div>
                  <span className="font-bold text-white block">2e Ligne (3 numéros max) :</span>
                  <ul className="list-disc list-inside text-slate-300 pl-2 space-y-1">
                    <li><strong>Sélection :</strong> Retient les 3 numéros restants du Groupe A (pour un total de 6 chevaux retenus dans la grille 3×2).</li>
                    <li><strong>Exclusion par Seuil :</strong> Élimine tout numéro ayant un Score(X) inférieur au seuil minimal si le filtre est actif.</li>
                    <li><strong>Ordonnancement :</strong> Ordonnés par ordre <strong>DÉCROISSANT</strong> en fonction du Système 74 (du plus grand au plus petit Score X).</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Groupe B */}
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2.5">
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                <span className="font-black text-amber-400 uppercase text-xs tracking-wider">GROUPE B (Numéros 7 à 10)</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold border border-amber-500/30">Max 6 retenus (3+3)</span>
              </div>
              <div className="space-y-2 text-xs">
                <ul className="list-disc list-inside text-slate-300 pl-2 space-y-1">
                  <li><strong>1ère Ligne (3 numéros) :</strong> Les 3 meilleures performances passées du groupe, classés entre eux par <strong>Score(X) DÉCROISSANT</strong>.</li>
                  <li><strong>2e Ligne (3 numéros) :</strong> Les 3 candidats suivants en performance, classés entre eux par <strong>Score(X) DÉCROISSANT</strong>.</li>
                  <li><strong>Filtrage par Seuil :</strong> Exclusion des chevaux ayant un Score(X) inférieur au seuil si le filtre est actif.</li>
                </ul>
              </div>
            </div>

            {/* Groupe C */}
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-2.5">
              <div className="flex items-center justify-between border-b border-rose-500/30 pb-2">
                <span className="font-black text-rose-400 uppercase text-xs tracking-wider">GROUPE C (Numéros 11 et +)</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-bold border border-rose-500/30">Max 6 retenus (3+3)</span>
              </div>
              <div className="space-y-2 text-xs">
                <ul className="list-disc list-inside text-slate-300 pl-2 space-y-1">
                  <li><strong>Attribution :</strong> Les 6 chevaux les mieux classés dans l'addition des 3 dernières musiques.</li>
                  <li><strong>1ère Ligne (3 numéros) :</strong> Classés entre eux par <strong>Score(X) DÉCROISSANT</strong> du Système 74.</li>
                  <li><strong>2e Ligne (3 numéros) :</strong> Classés entre eux par <strong>Score(X) DÉCROISSANT</strong> du Système 74.</li>
                  <li><strong>Filtrage par Seuil :</strong> Remplacement ou exclusion des chevaux sous le seuil minimal de Score(X).</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 4: Récapitulatif Synthétique */}
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
            <h4 className="font-black text-cyan-300 uppercase text-xs tracking-wider flex items-center gap-2">
              <span>📊</span> Synthèse des Critères d'Ordonnancement
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="font-bold text-cyan-400 block mb-1">Cotes PMU / Geny :</span>
                <p className="text-slate-300">
                  Utilisées pour calculer le Score(X) et pour isoler les 2 plus petites cotes candidates sur la 2e ligne du Groupe A.
                </p>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="font-bold text-amber-400 block mb-1">Score(X) Système 74 :</span>
                <p className="text-slate-300">
                  Sert de critère d'ordonnancement principal (par ordre décroissant) sur la 1ère et 2e ligne de chaque groupe.
                </p>
              </div>
            </div>
          </div>

          {/* Section 5: Tableau de Synthèse Tactique */}
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
            <h4 className="font-black text-purple-300 uppercase text-xs tracking-wider flex items-center gap-2">
              <span>📋</span> Formules du Tableau de Synthèse Tactique
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-xs pl-2">
              <li><strong>🏆 BASE :</strong> Les 2 premiers numéros de la 1ère ligne globale (ordonnés par Score X décroissant).</li>
              <li><strong>🟢 CHANCE RÉGULIÈRE :</strong> Les chevaux restants de la Sélection 1 (hors BASE) devant obligatoirement appartenir aux 10 premiers du classement Score(X) du Système 74 (rangScoreX $\le$ 10) ET aux 10 meilleures performances (rangPerf $\le$ 10). Ventilés en 2 Vecteurs (Vecteur 1 : N° 1 à 9 ; Vecteur 2 : N° 10 et +), classés par Somme des Rangs ($\sigma$ rangs) croissante.</li>
              <li><strong>⚡ OUTSIDERS SÉDUISANTS :</strong> Regroupe la Ligne 2 du Groupe A, les 1er &amp; 2e numéros de L2 du Groupe C, ainsi que la L2 du Groupe B (non retenus en Base ni en Chance Régulière et au seuil Diff(X) actif). Retient jusqu'à 4 chevaux max présentant la plus petite Somme des Rangs ($\sigma$ rangs).</li>
              <li><strong>🔍 À SUIVRE :</strong> Tous les autres chevaux restants de la course (non retenus en Base, Chance Régulière ou Outsiders) respectant le seuil Diff(X) actif, classés par performance croissante (meilleurs rangs de musique en premier).</li>
            </ul>
          </div>

          {/* Section 6: Le Carré Magique (6 Lignes x 3 Colonnes) */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
            <h4 className="font-black text-amber-300 uppercase text-xs tracking-wider flex items-center gap-2">
              <span>✨</span> Structure du Carré Magique (6 Lignes × 3 Colonnes)
            </h4>
            <p className="text-slate-300 text-xs leading-relaxed">
              Le Carré Magique classe les partants en fonction de leur position (Rang dans le Système 74 ordonné par Score X décroissant) sur une grille de 6 lignes et 3 colonnes :
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-xs pl-2">
              <li><strong>🟢 Colonne 1 (Badge Vert - 6 N°) :</strong> Les 6 premiers chevaux du classement (Rangs 1 à 6), occupant les lignes 1 à 6.</li>
              <li><strong>🟠 Colonne 2 (Badge Orange - 4 N°) :</strong> Les 4 chevaux suivants (Rangs 7 à 10), occupant les lignes 1 à 4. Les lignes 5 et 6 sont hachurées (non attribuées).</li>
              <li><strong>🔴 Colonne 3 (Badge Rouge - 4 N°) :</strong> Les 4 chevaux suivants (Rangs 11 à 14), occupant les lignes 1 à 4. Les lignes 5 et 6 sont hachurées (non attribuées).</li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-md px-5 py-3 border-t border-slate-800 flex items-center justify-between z-20">
          <span className="text-[11px] text-slate-400 italic">
            Système 74 — Positionnement Tactique & Synthèse de Jeu
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
