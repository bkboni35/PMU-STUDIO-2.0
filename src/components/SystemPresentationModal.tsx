import React, { useState } from 'react';
import {
  X,
  Presentation,
  Terminal,
  Cpu,
  Layers,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  Workflow,
  Sparkles,
  ShieldCheck,
  Clock,
  Database,
  Code2,
  FileText,
  AlertTriangle,
  PlayCircle,
  BookOpen,
  HelpCircle,
  Award,
} from 'lucide-react';

interface SystemPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemPresentationModal: React.FC<SystemPresentationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'script18' | 'script' | 'architecture' | 'code' | 'prompt' | 'checklist'>('script18');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedSectionIdx, setSelectedSectionIdx] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const executiveSections = [
    {
      num: 0,
      title: 'Introduction — 1 minute',
      duration: '1 min',
      audience: 'Tous publics',
      speech: `« Bonjour à toutes et à tous.\n\nNous allons présenter une architecture d’analyse hippique automatisée capable de suivre une course depuis la collecte des partants jusqu’à la publication de l’arrivée officielle.\n\nLe système est conçu pour les courses de trot attelé, trot monté, plat et obstacles. Il collecte les données disponibles, suit les évolutions des cotes, applique une analyse spécialisée par discipline, compare plusieurs modèles d’intelligence artificielle et contrôle automatiquement la qualité du résultat.\n\nIl ne s’agit pas de promettre un résultat certain. Il s’agit de construire une analyse plus rapide, plus documentée, plus traçable et plus réactive que des recherches manuelles dispersées. »`,
      takeaway: 'Objectif : rapidité, traçabilité et réactivité sans fausse promesse de gain.'
    },
    {
      num: 1,
      title: '1. Le besoin métier — 2 minutes',
      duration: '2 min',
      audience: 'Équipe Métier & Turfistes',
      speech: `« L’analyse d’un Quinté+ ou d’une autre course nécessite de réunir de nombreuses informations :\n- la liste officielle des partants ;\n- les non-partants ;\n- la discipline et les conditions de course ;\n- la forme récente ;\n- l’aptitude à la distance et au parcours ;\n- le jockey, le driver et l’entraîneur ;\n- les cotes et leur évolution ;\n- les commentaires de sources spécialisées ;\n- et enfin le statut exact de l’arrivée.\n\nLe problème n’est pas seulement la quantité d’informations. C’est aussi leur évolution rapide et la nécessité de distinguer une donnée officielle, une opinion éditoriale, une cote momentanée et un résultat provisoire.\n\nL’architecture répond à ce besoin en séparant clairement la collecte, la normalisation, l’analyse, la validation et la diffusion. »`,
      takeaway: 'Découplage strict entre collecte, normalisation, analyse IA et diffusion.'
    },
    {
      num: 2,
      title: '2. Objectifs et principes — 2 minutes',
      duration: '2 min',
      audience: 'Décideurs & Conformité',
      speech: `« Le système poursuit six objectifs :\n1. identifier automatiquement la course du jour ;\n2. collecter les informations à partir de sources autorisées ;\n3. actualiser les cotes avec un horodatage ;\n4. produire une analyse adaptée à la discipline ;\n5. surveiller le résultat jusqu’à l’arrivée officielle ;\n6. conserver un historique qui permet de comprendre chaque décision.\n\nCinq principes sont non négociables :\n- ne jamais inventer une donnée manquante ;\n- ne jamais confondre une source éditoriale avec une source officielle ;\n- ne jamais considérer une cote comme une certitude sportive ;\n- ne jamais considérer une arrivée provisoire comme définitive ;\n- ne jamais contourner une authentification, un CAPTCHA ou une protection technique. »`,
      takeaway: '5 principes non négociables : zéro invention, zéro contournement, respect des statuts.'
    },
    {
      num: 3,
      title: '3. Vue d’ensemble de l’architecture — 2 minutes',
      duration: '2 min',
      audience: 'Équipe Technique & Architectes',
      speech: `« Le point essentiel est la séparation des responsabilités. Le collecteur ne pronostique pas. Le modèle IA ne décide pas seul qu’un résultat est officiel. Le workflow n8n orchestre les étapes, tandis que les règles déterministes contrôlent les quotas, les doublons et les transitions d’état. »`,
      takeaway: 'Séparation totale des rôles : collecteur, orchestrateur, modèles IA, contrôleur déterministe.'
    },
    {
      num: 4,
      title: '4. Les sources et la conformité — 2 minutes',
      duration: '2 min',
      audience: 'Conformité & Juridique',
      speech: `« Les sources sont hiérarchisées selon le type d’information recherché.\n\nPour les partants, les non-partants et le résultat, on privilégie la source officielle de la réunion ou une source opérateur fiable. Pour les cotes PMU, on utilise uniquement un accès officiellement autorisé, une API autorisée ou une page publique dont l’extraction est permise. Geny, Paris-Turf et Equidia peuvent enrichir l’analyse, mais leurs commentaires doivent être identifiés comme des avis ou des données éditoriales.\n\nLe système enregistre pour chaque observation : la source, l’URL, l’heure UTC, le marché concerné, la valeur brute et le statut de vérification.\n\nSi l’accès est refusé ou si la structure de la page change, le système signale une erreur. Il ne tente pas de contourner la protection. »`,
      takeaway: 'Hiérarchisation des sources : Officiel > Opérateur > Média spécialisé.'
    },
    {
      num: 5,
      title: '5. Collecte des partants — 2 minutes',
      duration: '2 min',
      audience: 'Ingénieurs Données',
      speech: `« La première étape opérationnelle consiste à obtenir une liste fiable des partants.\n\nChaque partant est normalisé avec un numéro, un nom, un jockey ou driver, un entraîneur et les données de course disponibles. Les non-partants confirmés sont exclus des quotas et signalés dans une section séparée.\n\nAvant d’analyser, le système vérifie :\n- que le numéro existe ;\n- qu’il n’y a pas de doublon ;\n- que le nombre de chevaux est cohérent ;\n- que la discipline correspond à la course ;\n- et que les informations essentielles sont bien rattachées au bon cheval.\n\nCette étape évite une erreur fréquente : analyser un cheval avec la cote ou la performance d’un autre partant. »`,
      takeaway: 'Verrou de concordance : vérification N° ↔ Nom avant toute transmission aux LLM.'
    },
    {
      num: 6,
      title: '6. Extraction et suivi des cotes — 3 minutes',
      duration: '3 min',
      audience: 'Data Scientists & Analysts',
      speech: `« Le suivi du marché est distinct de l’analyse sportive.\n\nPour chaque cheval, le système stocke la cote, le type de marché, l’heure de consultation et la source. À chaque nouvelle observation, il conserve la valeur précédente et calcule une variation lorsqu’elle est comparable.\n\nUne baisse de cote est interprétée comme un soutien relatif du marché. Une hausse indique un désintérêt relatif. Mais dans les deux cas, il ne s’agit pas d’une preuve de réussite.\n\nLe rapport doit donc afficher une note sportive et un indicator de marché séparés. Un cheval très joué ne devient pas automatiquement une base. Un cheval peu joué ne devient pas automatiquement un délaissé.\n\nLe système doit également détecter : une cote suspendue, une cote non publiée, un marché mal identifié, une variation trop rapide, une réponse vide et une donnée trop ancienne pour être présentée comme actuelle. »`,
      takeaway: 'Séparation fondamentale : Note sportive (/100) vs Tendance de marché (Δ%).'
    },
    {
      num: 7,
      title: '7. Normalisation et stockage — 2 minutes',
      duration: '2 min',
      audience: 'Administrateurs Base de Données',
      speech: `« Toutes les sources ne présentent pas leurs données de la même manière. La normalisation transforme ces réponses en un format commun.\n\nUn relevé de cote contient notamment : course, numéro, cheval, marché, cote, statut, source et heure. Un relevé de résultat contient : course, statut, ordre, enquête éventuelle, photo éventuelle, source et heure.\n\nL’historique est conservé dans SQLite pour un prototype ou PostgreSQL pour une solution plus robuste. On n’écrase jamais un relevé précédent. Cela permet de reconstruire l’évolution du marché et de vérifier quelle information était disponible au moment de l’analyse. »`,
      takeaway: 'Clé composite unique et stockage append-only (aucune destruction de l\'historique).'
    },
    {
      num: 8,
      title: '8. Analyse par discipline — 3 minutes',
      duration: '3 min',
      audience: 'Spécialistes Hippiques',
      speech: `« L’intelligence de l’analyse dépend de la spécialité.\n\nPour le trot attelé, le système examine notamment la régularité, la tenue, le départ, l’engagement, la ferrure lorsqu’elle est vérifiée, les fautes et le driver.\n\nPour le trot monté, il donne un poids particulier aux références dans la spécialité, à la maniabilité et à la fiabilité du jockey. Une bonne performance à l’attelé ne suffit pas à prouver l’aptitude au monté.\n\nPour le plat, il étudie la valeur, le poids, la distance, la corde, le terrain, le rythme et le positionnement tactique.\n\nPour les obstacles, il différencie les haies, le steeple et le cross, et examine la qualité du saut, les fautes, les chutes, le terrain et l’expérience du parcours.\n\nL’agent produit ensuite une note indicative, mais cette note n’est pas une probabilité mathématique garantie. Elle sert à ordonner une analyse documentée. »`,
      takeaway: '4 modèles experts distincts : Trot attelé, Trot monté, Plat, Obstacles.'
    },
    {
      num: 9,
      title: '9. Analyse multi-modèles : GPT et Claude — 3 minutes',
      duration: '3 min',
      audience: 'Ingénieurs IA / Prompt Engineers',
      speech: `« Pour améliorer la robustesse, nous pouvons utiliser plusieurs modèles d’IA avec des rôles différents.\n\nGPT peut produire une première analyse structurée des performances, de la distance et des conditions. Claude peut jouer le rôle d’un lecteur critique : repérer les incohérences, les données manquantes et les risques sous-estimés.\n\nLes deux modèles reçoivent exactement le même paquet normalisé, avec les sources et les horodatages. Ils retournent le même format JSON afin que n8n puisse comparer leurs résultats.\n\nUn modèle arbitre ou un ensemble de règles détermine ensuite les points d’accord et de désaccord. Le système ne choisit pas automatiquement le modèle qui donne le pronostic le plus audacieux. Il privilégie les faits vérifiés et expose les divergences.\n\nLes modèles ne doivent pas être autorisés à inventer une cote, un résultat, un commentaire d’entraîneur ou une source. »`,
      takeaway: 'Architecture Multi-LLM : GPT-4o (analyste) + Claude (critique) + Arbitre déterministe.'
    },
    {
      num: 10,
      title: '10. Construction du pronostic — 2 minutes',
      duration: '2 min',
      audience: 'Équipe Produit & UX',
      speech: `« Le classement final suit une structure fixe :\n- deux BASES ;\n- trois CHANCES ;\n- quatre TOCARDS ;\n- deux SURPRISES ;\n- tous les autres en DÉLAISSÉS.\n\nCes catégories totalisent onze chevaux. Si la course compte moins de onze partants actifs, le système ne réduit pas les quotas en silence. Il signale que la structure est impossible et fournit une sélection adaptée.\n\nUn nœud Code n8n vérifie que les numéros sont distincts, qu’ils existent, qu’ils ne correspondent pas à des non-partants et que les catégories contiennent le bon nombre d’éléments.\n\nSi un contrôle échoue, le rapport n’est pas publié comme définitif. Il est envoyé vers une branche de correction ou de revue. »`,
      takeaway: 'Quotas stricts : 2 Bases, 3 Chances, 4 Tocards, 2 Surprises (= 11 retenus) + Délaissés.'
    },
    {
      num: 11,
      title: '11. Gestion des erreurs et résilience — 3 minutes',
      duration: '3 min',
      audience: 'SRE & DevOps',
      speech: `« Un système automatisé doit savoir échouer proprement.\n\nNous distinguons les erreurs temporaires, les erreurs d’autorisation et les données incohérentes.\n\nPour un timeout, une erreur 429 ou une erreur 503, nous utilisons un nombre limité de tentatives avec un backoff exponentiel et une part d’aléatoire. Pour une erreur 401 ou 403, nous arrêtons la collecte et signalons le problème d’accès. Pour une page 200 mais vide ou modifiée, nous plaçons la réponse en quarantaine et déclenchons une alerte technique.\n\nUn circuit breaker protège la source : après plusieurs échecs consécutifs, les appels sont suspendus pendant une période définie. Le système peut afficher la dernière donnée fiable, mais avec son âge et la mention “donnée périmée”.\n\nIl ne remplace jamais silencieusement une cote actuelle par une ancienne cote.\n\nUne source secondaire peut compléter certaines informations, mais elle ne transforme pas une cote Geny en cote PMU et ne transforme pas un résultat éditorial en arrivée officielle. »`,
      takeaway: 'Résilience : Backoff exponentiel, circuit breaker et gestion des données périmées.'
    },
    {
      num: 12,
      title: '12. Orchestration n8n — 3 minutes',
      duration: '3 min',
      audience: 'Intégrateurs n8n / Low-Code',
      speech: `« n8n joue le rôle d’orchestrateur.\n\nAvant la course, le workflow est déclenché par un Cron. Il appelle la source autorisée, contrôle la réponse, normalise les données, récupère l’historique et lance l’analyse IA si un changement matériel est détecté.\n\nLes principaux nœuds sont :\n1. Cron ;\n2. HTTP Request ;\n3. Code de validation ;\n4. Data Store ou base de données ;\n5. nœuds GPT et Claude ;\n6. Merge ;\n7. Code de validation des quotas ;\n8. notification ;\n9. Error Trigger pour les incidents.\n\nChaque exécution possède un identifiant, une course, une source et un état. Les appels IA ne sont pas répétés à chaque variation mineure : ils sont déclenchés lorsqu’un événement important est détecté. »`,
      takeaway: 'Orchestration n8n résiliente avec nœud Error Trigger dédié.'
    },
    {
      num: 13,
      title: '13. Surveillance après la course — 3 minutes',
      duration: '3 min',
      audience: 'Superviseurs d\'Arrivée',
      speech: `« Après l’heure théorique de départ, le workflow change de mode.\n\nIl ne cherche plus à interpréter les cotes pré-course. Il surveille le résultat.\n\nLe premier état est “Résultat non encore confirmé”.\n\nSi un ordre est publié mais qu’une enquête, une photo ou une validation reste possible, le système affiche exactement “Arrivée provisoire”. Il conserve l’ordre, l’heure et la source, mais ne déclenche pas encore l’analyse finale.\n\nLorsque la source confirme explicitement le caractère officiel, le statut devient “Arrivée officielle”. Le workflow calcule une clé de déduplication, vérifie qu’elle n’a pas déjà été traitée, puis déclenche l’analyse IA post-course.\n\nL’IA compare alors le pronostic avec l’ordre officiel. Elle ne modifie pas l’ordre et ne complète pas les rapports absents. »`,
      takeaway: 'Transitions strictes : Non confirmé → Arrivée provisoire → Arrivée officielle.'
    },
    {
      num: 14,
      title: '14. Workflow n8n de l’arrivée officielle — 2 minutes',
      duration: '2 min',
      audience: 'Intégrateurs n8n',
      speech: `« L’ordre est important : nous enregistrons la clé de résultat avant la notification, afin d’éviter les doubles traitements si le nœud de messagerie échoue. Un mécanisme de reprise peut ensuite relancer uniquement les éléments restés en attente. »`,
      takeaway: 'Enregistrement de la clé de déduplication AVANT l\'envoi de la notification.'
    },
    {
      num: 15,
      title: '15. Exemple de rapport final — 2 minutes',
      duration: '2 min',
      audience: 'Utilisateurs Finaux',
      speech: `« Le rapport montre non seulement la sélection, mais aussi la fraîcheur des données, la distinction entre analyse sportive et marché, ainsi que l’évolution du statut du résultat. »`,
      takeaway: 'Rapport complet : Sélection 11 + Délaissés + Horodatage + Statut dynamique.'
    },
    {
      num: 16,
      title: '16. Sécurité, confidentialité et gouvernance — 2 minutes',
      duration: '2 min',
      audience: 'RSSi & Sécurité',
      speech: `« Les credentials ne doivent jamais apparaître dans les URLs, les prompts, les logs ou les captures d’écran. Ils doivent être conservés dans les credentials n8n ou dans les variables d’environnement protégées.\n\nLe système ne place aucun pari et ne modifie aucun compte. Il se limite à la collecte autorisée, à l’analyse et à la notification.\n\nLes données personnelles ou informations de compte qui ne sont pas nécessaires à l’analyse ne doivent pas être transmises aux modèles. Les prompts envoyés aux IA doivent contenir uniquement les données normalisées utiles à la décision. »`,
      takeaway: 'Zéro credentials dans les logs, aucune prise de pari automatique.'
    },
    {
      num: 17,
      title: '17. Limites et gestion des attentes — 2 minutes',
      duration: '2 min',
      audience: 'Direction & Management',
      speech: `« Cette architecture améliore la qualité du processus, mais elle ne supprime pas l’incertitude des courses hippiques.\n\nLes cotes peuvent évoluer rapidement. Les pages peuvent être indisponibles. Les sources peuvent se contredire. Une arrivée peut changer après enquête. Les modèles d’IA peuvent se tromper ou accorder trop de poids à un signal médiatique.\n\nC’est pourquoi le système affiche les limites, horodate les informations, conserve les divergences et refuse les conclusions définitives lorsque les preuves sont insuffisantes.\n\nLa performance recherchée est une meilleure discipline d’analyse, pas une garantie de gain. »`,
      takeaway: 'Objectif de rigueur d\'analyse, pas de promesse illusoire.'
    },
    {
      num: 18,
      title: '18. Déploiement progressif en 5 phases — 2 minutes',
      duration: '2 min',
      audience: 'Chefs de Projet',
      speech: `« Le déploiement doit être progressif.\n\nPhase 1 — Prototype : saisie manuelle, payload local, SQLite.\nPhase 2 — Collecte autorisée : API/page publique, historique, alertes.\nPhase 3 — Analyse multi-modèles : GPT + Claude, JSON structuré, validation quotas.\nPhase 4 — Production n8n : planification quotidienne, suivi borné post-course, déduplication.\nPhase 5 — Amélioration continue : mesure des erreurs, analyse des divergences, révision des sélecteurs. »`,
      takeaway: 'Rapprochement par jalons : Prototype → Collecte → Multi-LLM → Prod → Optimisation.'
    },
    {
      num: 19,
      title: 'Conclusion & Message Final à Retenir — 1 minute',
      duration: '1 min',
      audience: 'Tous publics',
      speech: `« Pour conclure, cette architecture repose sur une idée simple : automatiser ne signifie pas supprimer le contrôle.\n\nLe collecteur récupère les informations autorisées. La base conserve l’historique. Le moteur de règles vérifie la cohérence. Les modèles IA interprètent les données selon la discipline. n8n orchestre les étapes et les notifications. Enfin, la surveillance post-course distingue rigoureusement le résultat non confirmé, l’arrivée provisoire et l’arrivée officielle.\n\nCe découpage rend le système plus fiable, plus explicable et plus facile à maintenir. Il permet également de remplacer une source, un modèle ou un outil sans reconstruire toute l’architecture.\n\nLe résultat attendu est un assistant d’analyse hippique documenté et réactif, capable de dire non seulement ce qu’il propose, mais aussi sur quelles données, à quelle heure et avec quelles limites. »`,
      takeaway: '« Collecter avec autorisation, horodater, comparer, analyser, contrôler, puis seulement publier. »'
    }
  ];

  const qaList = [
    {
      q: "Le système garantit-il le gagnant ?",
      a: "Non. Il structure l’information et améliore la traçabilité. Une course reste soumise à l’aléa sportif, aux conditions de course et aux événements imprévus."
    },
    {
      q: "Pourquoi utiliser deux modèles d’IA (GPT-4o + Claude) ?",
      a: "Pour comparer deux lectures, détecter des incohérences et réduire le risque de suivre une interprétation unique. Les modèles ne remplacent cependant pas les contrôles déterministes."
    },
    {
      q: "Que fait le système si PMU est indisponible ?",
      a: "Il effectue des tentatives limitées, applique un circuit breaker, conserve la dernière donnée fiable avec son âge et déclenche une alerte. Il ne présente pas une donnée ancienne comme actuelle."
    },
    {
      q: "Pourquoi ne pas utiliser directement un scraper agressif ?",
      a: "Parce qu’une extraction doit respecter les règles d’accès. Un scraper agressif est fragile, peut surcharger la source et peut être contraire à ses conditions d’utilisation. La solution privilégie une API ou un accès autorisé."
    },
    {
      q: "Quand l’analyse finale est-elle déclenchée ?",
      a: "Après une confirmation explicite de l’arrivée officielle, avec déduplication du résultat. Une arrivée provisoire ne déclenche pas l’analyse finale."
    },
    {
      q: "Que se passe-t-il si les modèles ne sont pas d’accord ?",
      a: "Le désaccord est conservé et signalé. L’arbitre privilégie les données sourcées et peut réduire le niveau de confiance plutôt que fabriquer un consensus."
    },
    {
      q: "Comment éviter les doubles notifications dans n8n ?",
      a: "On enregistre la clé composée (course_id + statut_officiel + ordre) DANS le Data Store AVANT l'envoi du message."
    }
  ];

  const slides = [
    {
      num: 1,
      title: 'Slide 1 — Le problème',
      tag: 'Constat & Contexte',
      speech: [
        `« L’analyse quotidienne d’un Quinté+ nécessite de consulter plusieurs informations : les partants, les performances récentes, les conditions de course, les avis spécialisés, les cotes et le résultat final. Lorsque ces recherches sont faites manuellement, elles prennent du temps et peuvent entraîner des oublis ou des incohérences. »`,
        `« Notre système automatise la collecte et l’organisation de ces informations, tout en conservant une validation humaine et une traçabilité des sources. »`
      ],
      points: [
        'Dispersion chronophage des données (PMU, LeTrot, Geny, Paris-Turf).',
        'Risques élevés d’oublis, de coquilles manuelles ou de doublons de partants.',
        'Nécessité absolue de traçabilité des sources et d’horodatage certifié.'
      ]
    },
    {
      num: 2,
      title: 'Slide 2 — L’objectif du système',
      tag: 'Périmètre & Quotas',
      speech: [
        `« Le système ne prétend pas prévoir avec certitude le résultat d’une course. Il fournit une analyse structurée et actualisée, fondée sur les données disponibles au moment de la consultation. »`,
        `« Il produit cinq groupes : deux bases, trois chances, quatre tocards et deux surprises. Tous les autres chevaux sont placés dans la catégorie des délaissés. »`
      ],
      points: [
        'Aide à la décision objective, jamais de promesse de gain irréaliste.',
        'Quotas stricts non négociables : 2 BASES, 3 CHANCES, 4 TOCARDS, 2 SURPRISES (= 11 retenus).',
        'Catégorie DÉLAISSÉS pour l’ensemble des autres concurrents partants.'
      ]
    },
    {
      num: 3,
      title: 'Slide 3 — Le fonctionnement général',
      tag: 'Pipeline en 6 Étapes',
      speech: [
        `« Le processus comporte six étapes : identifier la course, récupérer les partants, collecter les données de chaque cheval, suivre le marché PMU, appliquer l’analyse spécialisée, puis contrôler le résultat et l’arrivée après la course. »`
      ],
      diagram: [
        'Déclenchement quotidien (06h00 UTC)',
        'Identification du Quinté+ & Fiche Technique',
        'Partants officiels & Conditions de course',
        'Données sportives recoupées par cheval',
        'Cotes PMU horodatées & Variations',
        'Analyse IA spécialisée (Trot attelé/monté, Plat, Obstacles)',
        'Catégorisation (BASE, CHANCES, TOCARDS, SURPRISES, DÉLAISSÉS)',
        'Surveillance de l’arrivée provisoire puis officielle'
      ]
    },
    {
      num: 4,
      title: 'Slide 4 — Les sources',
      tag: 'Hiérarchie & Fiabilité',
      speech: [
        `« Les sources sont hiérarchisées. Les informations officielles de la réunion et les données PMU sont prioritaires pour les partants, les cotes et le résultat. Les médias spécialisés comme Geny, Paris-Turf et Equidia servent à enrichir l’analyse et à comparer les commentaires. »`,
        `« Chaque observation est enregistrée avec son URL, son heure de consultation et son niveau de fiabilité. »`
      ],
      points: [
        'Rang 1 (Priorité absolue) : Sociétés mères officielles (LeTrot / France Galop) et opérateur PMU.',
        'Rang 2 (Enrichissement) : Médias spécialisés reconnus (Geny Courses, Paris-Turf, Equidia).',
        'Zéro invention : Chaque donnée critique est horodatée avec son URL vérifiée.'
      ]
    },
    {
      num: 5,
      title: 'Slide 5 — Le rôle de l’intelligence artificielle',
      tag: 'Expertise Dédiée',
      speech: [
        `« L’IA ne remplace pas les données. Elle les organise, les compare et les interprète selon la discipline : trot attelé, trot monté, plat ou obstacles. »`,
        `« Elle sépare les faits vérifiés, les commentaires de presse et ses propres conclusions. Elle doit écrire “non vérifié” lorsqu’une information manque plutôt que d’inventer une donnée. »`
      ],
      points: [
        'Adaptation stricte à la discipline (ferrures en trot, corde/poids en plat, sauts en obstacles).',
        'Distinction tripartite : Faits vérifiés vs Avis de presse vs Déductions algorithmiques.',
        'Mention obligatoire « non vérifié » ou « Donnée indisponible » en cas de doute.'
      ]
    },
    {
      num: 6,
      title: 'Slide 6 — Le suivi des cotes',
      tag: 'Dynamique de Marché',
      speech: [
        `« Les cotes sont relevées plusieurs fois lorsque cela est autorisé et techniquement possible. Chaque relevé est horodaté. Le système conserve la cote précédente, calcule la variation et signale les mouvements confirmés. »`,
        `« Une baisse de cote indique un soutien relatif du marché, mais ne constitue pas une preuve de réussite. La cote reste un indicateur complémentaire à l’analyse sportive. »`
      ],
      points: [
        'Relevé horodaté multi-passages (T-4h, T-2h, T-30min).',
        'Calcul de variation % et qualification (baisse confirmée <= -10%, hausse confirmée >= +10%).',
        'Règle d’or : Le marché n’est qu’un indicator complémentaire, pas le moteur unique du choix.'
      ]
    },
    {
      num: 7,
      title: 'Slide 7 — Le suivi de l’arrivée',
      tag: 'Post-Course & Statuts',
      speech: [
        `« Après la course, le système distingue trois situations. Si aucun résultat fiable n’est publié, il indique “Résultat non encore confirmé”. Si l’ordre est publié mais susceptible de changer, il indique “Arrivée provisoire”. Il n’affiche “Arrivée officielle” qu’après confirmation explicite d’une source fiable. »`
      ],
      points: [
        'Statut 1 : « Résultat non encore confirmé » (course courue mais aucun ordre validé).',
        'Statut 2 : « Arrivée provisoire » (enquête des commissaires en cours ou photo d’arrivée).',
        'Statut 3 : « Arrivée officielle » (validation définitive par les commissaires de course).'
      ]
    },
    {
      num: 8,
      title: 'Slide 8 — Les contrôles de fiabilité',
      tag: 'Garde-Fous Automatiques',
      speech: [
        `« Avant publication, le système vérifie qu’il n’y a aucun doublon, que tous les numéros correspondent à des partants actifs et que les quotas sont respectés. Il contrôle également les non-partants, les divergences entre sources et l’heure de mise à jour. »`
      ],
      points: [
        'Zéro doublon entre catégories (intersection strictly vide).',
        'Exclusion immédiate de tout non-partant confirmé de la sélection active.',
        'Alerte et résolution en cas de divergence d’information entre PMU et LeTrot/Geny.'
      ]
    },
    {
      num: 9,
      title: 'Slide 9 — Les limites',
      tag: 'Transparence & Cadre Légal',
      speech: [
        `« Ce système ne garantit ni le résultat d’une course ni un gain. Les cotes peuvent être retardées, suspendues ou modifiées. Les résultats peuvent évoluer après une enquête ou une photo. Enfin, une extraction Web n’est fiable que si elle respecte les conditions d’accès et les règles du site consulté. »`
      ],
      points: [
        'Aléa sportif inhérent aux courses d’animaux vivants (fautes au départ, incidents de parcours).',
        'Respect scrupuleux des conditions d’utilisation, des quotas de requêtes et du robots.txt.',
        'Interdiction absolue de contournement de CAPTCHA ou de protections techniques.'
      ]
    },
    {
      num: 10,
      title: 'Slide 10 — Conclusion',
      tag: 'Synthèse à Retenir',
      speech: [
        `« La valeur du système vient de la combinaison de quatre éléments : des données sourcées, une actualisation horodatée, une analyse adaptée à la discipline et un contrôle automatique avant diffusion. L’objectif n’est pas de promettre l’impossible, mais de fournir une lecture plus claire, plus traçable et plus réactive de la course. »`
      ],
      points: [
        'Données sourcées et vérifiées auprès des autorités hippiques.',
        'Historisation continue des cotes sans écrasement des archives.',
        'Expertise IA contextualisée selon la discipline (Trot, Plat, Obstacles).',
        'Contrôles mathématiques des quotas et gestion post-course des statuts d’arrivée.'
      ]
    }
  ];

  const pythonModelCode = `from datetime import datetime, timezone
from pydantic import BaseModel, Field

class CoteObservation(BaseModel):
    course_id: str
    numero: int
    cheval: str
    marche: str
    cote: float | None = None
    statut: str
    consulte_le: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source_url: str
    source: str = "pmu.fr"

def variation(cote_precedente: float | None, cote_actuelle: float | None) -> float | None:
    if not cote_precedente or not cote_actuelle:
        return None
    return round((cote_actuelle - cote_precedente) / cote_precedente * 100, 2)

def tendance(cote_precedente: float | None, cote_actuelle: float | None) -> str:
    v = variation(cote_precedente, cote_actuelle)
    if v is None:
        return "indisponible"
    if v <= -10:
        return "baisse confirmée"
    if v >= 10:
        return "hausse confirmée"
    return "stable ou mouvement faible"

def normaliser_statut(texte: str, ordre_officiel: bool | None) -> str:
    t = (texte or "").lower()
    if ordre_officiel is True or "officielle" in t or "définitif" in t:
        return "Arrivée officielle"
    if "provisoire" in t or "enquête" in t or "photo" in t:
        return "Arrivée provisoire"
    return "Résultat non encore confirmé"`;

  const n8nCodeNode = `const now = new Date().toISOString();
const previous = $json.previous_odds ?? null;
const current = $json.odds ?? null;
let variation = null;

if (previous && current) {
  variation = Number((((current - previous) / previous) * 100).toFixed(2));
}

let trend = "indisponible";
if (variation !== null) {
  if (variation <= -10) trend = "baisse confirmée";
  else if (variation >= 10) trend = "hausse confirmée";
  else trend = "stable ou mouvement faible";
}

return [{
  json: {
    ...$json,
    observed_at: now,
    variation_percent: variation,
    market_trend: trend,
    source: "pmu.fr",
  }
}];`;

  const promptIaTemplate = `Tu reçois des données normalisées extraites à [HEURE] depuis [SOURCE].

Course : [COURSE]
Discipline : [DISCIPLINE]
Partants actifs : [LISTE]
Observations de marché : [JSON OU TABLEAU]
Historique des cotes : [JSON OU TABLEAU]

Consignes obligatoires :
1. Ne crée aucune donnée absente du paquet reçu. Si une valeur est manquante, écris « non vérifié » ou « Donnée indisponible ».
2. Distingue rigoureusement : faits vérifiés, commentaires de presse et conclusions analytiques.
3. Analyse les mouvements de cote comme un indicateur complémentaire de marché seulement.
4. Signale expressément les valeurs non publiées, suspendues ou incohérentes.
5. Produis le tableau complet de tous les partants avec note indicative de 0 à 100.
6. Classe les numéros des chevaux dans quatre catégories strictes et sans doublon :
   - 2 BASES : les deux chevaux les plus solides et fiables sportivement ;
   - 3 CHANCES : trois chevaux ayant une chance sportive régulière pour les places ;
   - 4 TOCARDS : quatre concurrents moins évidents mais capables d'une surprise argumentée ;
   - 2 SURPRISES : deux profils spéculatifs sous-estimés avec un scénario favorable identifiable ;
   - DÉLAISSÉS : tous les autres numéros partants actifs.
7. Total sélectionné : exactement 11 numéros distincts (2 + 3 + 4 + 2).
8. Après la course, applique strictly les statuts normés :
   - « Résultat non encore confirmé »
   - « Arrivée provisoire »
   - « Arrivée officielle » (uniquement si la source le confirme explicitement).
9. Affiche toujours l'heure et l'URL vérifiée de chaque source consultée.`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:pt-2 sm:px-3 sm:pb-2 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-slate-900 border-2 border-emerald-500/40 rounded-none sm:rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden text-slate-100 h-screen sm:h-[calc(100vh-16px)] flex flex-col">
        {/* Glow background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800 shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-500/40 text-emerald-400">
              <Presentation className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">
                  Dossier de Présentation Officiel
                </span>
                <span className="text-xs text-slate-400">Version 3.8 — Automatisation Quinté+</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Système d’Analyse Hippique Automatisé
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-3 border-b border-slate-800/80 shrink-0 scrollbar-none text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('script18')}
            className={`py-2 px-3.5 rounded-xl flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'script18'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Script Exécutif (18 Sections & Q&A)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`py-2 px-3.5 rounded-xl flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'script'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <PlayCircle className="w-4 h-4" />
            <span>Slides Orales (10 Transparents)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('architecture')}
            className={`py-2 px-3.5 rounded-xl flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'architecture'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Workflow className="w-4 h-4" />
            <span>Architecture Technique</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`py-2 px-3.5 rounded-xl flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'code'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Options Python / n8n / Make</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`py-2 px-3.5 rounded-xl flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'prompt'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Prompt IA & Quotas Stricts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`py-2 px-3.5 rounded-xl flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'checklist'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Checklist Mise en Production</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto pt-4 pr-1 space-y-6">
          {/* TAB 0: SCRIPT EXÉCUTIF 18 SECTIONS */}
          {activeTab === 'script18' && (
            <div className="space-y-6">
              {/* Callout Message de fin frappant */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border-2 border-amber-500/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Award className="w-6 h-6 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Devise Directrice du Système :</span>
                    <p className="text-sm font-black text-white italic">
                      « Collecter avec autorisation, horodater, comparer, analyser, contrôler, puis seulement publier. »
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-slate-950 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/40 shrink-0">
                  Durée : 20 - 30 min
                </span>
              </div>

              {/* Grid 2 colonnes : Liste des 18 Sections + Contenu Sélectionné */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Menu latéral des 18 Sections */}
                <div className="lg:col-span-4 space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {executiveSections.map((sec, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedSectionIdx(idx)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                        selectedSectionIdx === idx
                          ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400 shadow-md'
                          : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="block truncate font-extrabold">{sec.title}</span>
                        <span className={`text-[10px] block ${selectedSectionIdx === idx ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                          {sec.audience}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                        selectedSectionIdx === idx ? 'bg-slate-950 text-emerald-300 font-bold' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {sec.duration}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Main Content Area pour la Section Sélectionnée */}
                <div className="lg:col-span-8 p-5 rounded-3xl bg-slate-950/90 border-2 border-emerald-500/30 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                          {executiveSections[selectedSectionIdx].audience}
                        </span>
                        <h3 className="text-base font-black text-white">
                          {executiveSections[selectedSectionIdx].title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(executiveSections[selectedSectionIdx].speech, `sec-${selectedSectionIdx}`)}
                        className="flex items-center gap-1 text-xs font-bold py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                      >
                        {copiedKey === `sec-${selectedSectionIdx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === `sec-${selectedSectionIdx}` ? 'Copié !' : 'Copier'}</span>
                      </button>
                    </div>

                    {/* Discours à dire */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                      <span className="text-[10px] font-black uppercase text-amber-400 block tracking-wider">
                        Texte Oral du Présentateur :
                      </span>
                      <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-medium whitespace-pre-line italic">
                        {executiveSections[selectedSectionIdx].speech}
                      </p>
                    </div>

                    {/* Point clé à retenir */}
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
                      <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                      <span><strong>À retenir :</strong> {executiveSections[selectedSectionIdx].takeaway}</span>
                    </div>
                  </div>

                  {/* Navigation Basse entre Sections */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      disabled={selectedSectionIdx === 0}
                      onClick={() => setSelectedSectionIdx(p => Math.max(0, p - 1))}
                      className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-bold flex items-center gap-1 text-slate-200"
                    >
                      <ChevronLeft className="w-4 h-4" /> Section précédente
                    </button>
                    <span className="text-xs text-slate-400 font-mono">
                      {selectedSectionIdx + 1} / {executiveSections.length}
                    </span>
                    <button
                      type="button"
                      disabled={selectedSectionIdx === executiveSections.length - 1}
                      onClick={() => setSelectedSectionIdx(p => Math.min(executiveSections.length - 1, p + 1))}
                      className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-xs font-black text-slate-950 flex items-center gap-1 shadow"
                    >
                      Section suivante <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Foire aux Questions (Q&A de fin de présentation) */}
              <div className="p-5 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                  <HelpCircle className="w-5 h-5" />
                  <span>Annexe : Foire aux Questions Clés & Réponses de l'Expert</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {qaList.map((qa, qIdx) => (
                    <div key={qIdx} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                      <span className="text-xs font-bold text-amber-300 block">Q : {qa.q}</span>
                      <p className="text-xs text-slate-300 leading-relaxed font-medium">R : {qa.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: SCRIPT ORAL 10 SLIDES */}
          {activeTab === 'script' && (
            <div className="space-y-6">
              {/* Slide Navigator Ribbon */}
              <div className="flex items-center justify-between bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-amber-400">Présentation :</span>
                  <span className="text-xs text-slate-300 font-bold">
                    Slide {currentSlide + 1} / {slides.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentSlide === 0}
                    onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {slides.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentSlide(idx)}
                        className={`w-6 h-6 rounded-md text-[11px] font-bold transition-all ${
                          currentSlide === idx
                            ? 'bg-emerald-500 text-slate-950 font-black scale-110 shadow'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={currentSlide === slides.length - 1}
                    onClick={() => setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1))}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Current Slide Display */}
              <div className="p-6 rounded-3xl bg-slate-950/80 border-2 border-emerald-500/30 space-y-5 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
                      {slides[currentSlide].tag}
                    </span>
                    <h3 className="text-lg font-black text-white">{slides[currentSlide].title}</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        slides[currentSlide].speech.join('\n\n'),
                        `slide-${currentSlide}`
                      )
                    }
                    className="flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
                  >
                    {copiedKey === `slide-${currentSlide}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{copiedKey === `slide-${currentSlide}` ? 'Copié !' : 'Copier le texte oral'}</span>
                  </button>
                </div>

                {/* Speech Text Box */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider">
                    <PlayCircle className="w-4 h-4" />
                    <span>À dire mot à mot au micro :</span>
                  </div>
                  {slides[currentSlide].speech.map((paragraph, pIdx) => (
                    <p key={pIdx} className="text-sm text-slate-100 font-medium leading-relaxed italic">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* Visual Bullet Points or Diagram */}
                {slides[currentSlide].points && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Points d’appui visuels du transparent :
                    </span>
                    <ul className="space-y-2">
                      {slides[currentSlide].points.map((pt, ptIdx) => (
                        <li key={ptIdx} className="flex items-start gap-2.5 text-xs text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {slides[currentSlide].diagram && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Schéma de flux séquentiel :
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      {slides[currentSlide].diagram.map((step, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-[11px] font-bold text-slate-200"
                        >
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-black">
                            {sIdx + 1}
                          </span>
                          <span className="leading-tight">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ARCHITECTURE TECHNIQUE */}
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              <div className="p-5 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Architecture Technique Recommandée</h3>
                    <p className="text-xs text-slate-400">Pipeline découplé, résilient et conforme aux conditions d’accès</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                      <Clock className="w-4 h-4" />
                      <span>1. Déclencheur & Collecte</span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                      <li>Cron quotidien à 06h00 UTC / 08h00 Paris.</li>
                      <li>API officielle autorisée en priorité absolue.</li>
                      <li>Alternative : Page publique avec respect strict du robots.txt.</li>
                      <li>Limitation de fréquence (rate-limiting).</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      <Database className="w-4 h-4" />
                      <span>2. Normalisation & Stockage</span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                      <li>Clé unique : course_id + numero + marche + horodatage.</li>
                      <li>Historisation continue : jamais d’écrasement de la cote précédente.</li>
                      <li>Calcul de variation % et qualification de la tendance.</li>
                      <li>Support SQLite, PostgreSQL, Google Sheets ou Data Store Make/n8n.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                      <Cpu className="w-4 h-4" />
                      <span>3. Expertise IA & Surveillance</span>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                      <li>Adaptation par discipline (Trot, Plat, Obstacles).</li>
                      <li>Respect strict des quotas : 2-3-4-2 + Délaissés.</li>
                      <li>Surveillance post-course bornée dans le temps (&lt; 90 min).</li>
                      <li>Statuts normés : Non confirmé → Provisoire → Officielle.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Diagramme Avancé Multi-Modèles & Post-Course */}
              <div className="p-5 rounded-3xl bg-slate-950/80 border-2 border-emerald-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Workflow className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-extrabold text-white text-sm">
                      Pipeline Décisionnel Complet : Multi-Modèles (GPT-4o & Claude) & Surveillance Post-Course
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase">
                    Consensus & Arbitrage IA
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Branche 1 : Avant Départ (Pré-Course) */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                      <Clock className="w-4 h-4" />
                      <span>Branche Pré-Course (Avant Départ)</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <span className="font-bold text-white">1. Double Analyse Parallèle</span>
                        <span className="text-[10px] text-amber-400 font-mono">GPT-4o + Claude</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <span className="font-bold text-white">2. Fusion & Détection des Écarts</span>
                        <span className="text-[10px] text-sky-400 font-mono">Merge Engine</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <span className="font-bold text-white">3. Arbitrage Algorithmique</span>
                        <span className="text-[10px] text-purple-400 font-mono">Arbitre Impartial</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <span className="font-bold text-white">4. Validation Mathématique Quotas</span>
                        <span className="text-[10px] text-emerald-400 font-mono">2-3-4-2 + Délaissés</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-black text-center">
                        ✓ Publication du Rapport Officiel
                      </div>
                    </div>
                  </div>

                  {/* Branche 2 : Après Course (Post-Course) */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Branche Post-Course (Gestion de l'Arrivée)</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <span className="font-bold text-white">1. Capture Résultat & Enquête</span>
                        <span className="text-[10px] text-amber-400 font-mono">Circuit Breaker</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <span className="font-bold text-white">2. Si Arrivée Provisoire ?</span>
                        <span className="text-[10px] text-amber-300 font-mono">Stockage + Re-check borné</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <span className="font-bold text-white">3. Si Non-Officielle ?</span>
                        <span className="text-[10px] text-rose-300 font-mono">Arrêt statut prudent</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <span className="font-bold text-white">4. Si Arrivée Officielle Validée</span>
                        <span className="text-[10px] text-emerald-400 font-mono">Déduplication + Audit IA</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-300 font-black text-center">
                        ✓ Bilan IA & Notification Finale
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Politique de Déclenchement Intelligent de l'IA (5 Conditions Clés) */}
              <div className="p-5 rounded-3xl bg-slate-950/80 border-2 border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                    <Sparkles className="w-5 h-5" />
                    <span>Politique de Déclenchement Intelligent de l'IA (Évitement du Thrashing)</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase">
                    5 Déclencheurs Exclusifs
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Afin d'éviter le gaspillage de requêtes et les recalculs inutiles, l'analyse IA n'est actualisée <strong>QUE SI</strong> au moins l'une des 5 conditions suivantes est formellement détectée :
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="font-black text-emerald-400 block text-[11px]">1. Non-Partant Détecté</span>
                    <p className="text-[11px] text-slate-400">
                      Un concurrent déclaré forfait modifie immédiatement la redistribution des quotas (11 retenus) et les chances relatives.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="font-black text-amber-400 block text-[11px]">2. Forte Variation Marché</span>
                    <p className="text-[11px] text-slate-400">
                      Mouvement confirmé de cote (|Δ%| ≥ 25 %) signalant une réorientation massive des flux de paris (e-SG ou PMU).
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="font-black text-sky-400 block text-[11px]">3. Information Sportive Modifiée</span>
                    <p className="text-[11px] text-slate-400">
                      Changement de pilote (driver/jockey), modification de ferrure (ex: ferré → D4), évolution du terrain ou de l'équipement.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="font-black text-purple-400 block text-[11px]">4. Arrivée Officielle Publiée</span>
                    <p className="text-[11px] text-slate-400">
                      Validation définitive par les commissaires déclenchant l'audit post-course et le calcul de rentabilité réelle.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 sm:col-span-2 md:col-span-2">
                    <span className="font-black text-rose-400 block text-[11px]">5. Expiration du Délai de Fraîcheur (&gt; X min)</span>
                    <p className="text-[11px] text-slate-400">
                      Dépassement du TTL maximal (ex: 120 min en matinée, 30 min à l'approche du départ) garantissant des données toujours d'actualité.
                    </p>
                  </div>
                </div>
              </div>

              {/* Règle essentielle de conception */}
              <div className="p-5 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Règle Essentielle de Conception Anti-Fragilité</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Ne commencez pas par écrire un scraper fragile. Vérifiez d’abord si vous disposez d’une API ou d’un accès officiellement autorisé. À défaut, utilisez uniquement une page publiquement accessible, respectez les conditions d’utilisation et le fichier robots.txt lorsque pertinent, limitez la fréquence des requêtes et ne contournez jamais CAPTCHA, authentification, paywall ou protection anti-automatisation.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: CODE PYTHON / N8N / MAKE */}
          {activeTab === 'code' && (
            <div className="space-y-6">
              {/* Option Python */}
              <div className="p-5 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Terminal className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-extrabold text-white text-sm">Option Python (Pydantic, HTTPX & Datetime)</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(pythonModelCode, 'python')}
                    className="flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
                  >
                    {copiedKey === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'python' ? 'Copié !' : 'Copier Python'}</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto">
                  <pre className="text-xs font-mono text-emerald-300 leading-relaxed">{pythonModelCode}</pre>
                </div>
              </div>

              {/* Option n8n Code Node */}
              <div className="p-5 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Workflow className="w-5 h-5 text-amber-400" />
                    <h3 className="font-extrabold text-white text-sm">Option n8n (Code Node pour calcul de variation et tendance)</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(n8nCodeNode, 'n8n')}
                    className="flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
                  >
                    {copiedKey === 'n8n' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'n8n' ? 'Copié !' : 'Copier n8n Node'}</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto">
                  <pre className="text-xs font-mono text-amber-300 leading-relaxed">{n8nCodeNode}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PROMPT IA NORMALISÉ */}
          {activeTab === 'prompt' && (
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <div>
                      <h3 className="font-extrabold text-white text-sm">Prompt Normalisé pour l’Agent IA Spécialisé</h3>
                      <p className="text-xs text-slate-400">À injecter dans le module LLM (Make, n8n ou script Python)</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(promptIaTemplate, 'prompt-ia')}
                    className="flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition-all"
                  >
                    {copiedKey === 'prompt-ia' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'prompt-ia' ? 'Copié !' : 'Copier le Prompt Complet'}</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto">
                  <pre className="text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap">{promptIaTemplate}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CHECKLIST DE PRODUCTION */}
          {activeTab === 'checklist' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Accès & Conformité */}
                <div className="p-5 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Accès & Conformité</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded text-emerald-500" readOnly />
                      <span>Vérifier l’existence d’une API officiellement autorisée.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded text-emerald-500" readOnly />
                      <span>Vérifier les conditions d’utilisation PMU et médias.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded text-emerald-500" readOnly />
                      <span>Ne pas contourner les CAPTCHA ni les authentifications.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded text-emerald-500" readOnly />
                      <span>Utiliser un User-Agent clair et identifiable.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded text-emerald-500" readOnly />
                      <span>Limiter strictement la fréquence des requêtes.</span>
                    </li>
                  </ul>
                </div>

                {/* 2. Qualité des Données */}
                <div className="p-5 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                    <Database className="w-4 h-4" />
                    <span>Qualité des Données</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded text-blue-500" readOnly />
                      <span>Vérifier la concordance N° dossard et nom du cheval.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded text-blue-500" readOnly />
                      <span>Identifier précisément le marché de cote (e-SG, PMU).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded text-blue-500" readOnly />
                      <span>Horodater chaque observation en UTC.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded text-blue-500" readOnly />
                      <span>Conserver l’historique sans écrasement destructif.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded text-blue-500" readOnly />
                      <span>Traiter immédiatement les non-partants déclarés.</span>
                    </li>
                  </ul>
                </div>

                {/* 3. Fiabilité du Workflow */}
                <div className="p-5 rounded-3xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                    <Clock className="w-4 h-4" />
                    <span>Fiabilité du Workflow</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded text-amber-500" readOnly />
                      <span>Définir un délai d’expiration borné (&lt; 90 min post-course).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded text-amber-500" readOnly />
                      <span>Journaliser les erreurs HTTP et changements de structure.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded text-amber-500" readOnly />
                      <span>Alerte si la course compte moins de 11 partants actifs.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded text-amber-500" readOnly />
                      <span>Contrôler les 4 quotas stricts : 2 BASES, 3 CHANCES, 4 TOCARDS, 2 SURPRISES.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded text-amber-500" readOnly />
                      <span>Ne jamais publier « Arrivée officielle » sans validation explicite.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Conclusion à présenter */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border-2 border-emerald-500/40 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                  <Sparkles className="w-5 h-5" />
                  <span>Conclusion à Présenter</span>
                </div>
                <blockquote className="text-xs sm:text-sm text-slate-100 font-medium italic leading-relaxed border-l-4 border-emerald-400 pl-4 py-1">
                  « La solution recommandée est hybride : un collecteur spécialisé récupère les données autorisées, une base conserve l’historique, l’IA analyse les informations normalisées et un workflow Make ou n8n orchestre les mises à jour et les notifications. Cette séparation rend le système plus contrôlable qu’un agent qui naviguerait seul sur le Web et évite de confondre une cote actuelle, une opinion de marché et une arrivée officielle. »
                </blockquote>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Guide d'ingénierie & Script certifiés HippoAnalyse V3.8</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs transition-all"
          >
            Fermer le Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
