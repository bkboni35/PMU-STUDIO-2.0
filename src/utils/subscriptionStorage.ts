export interface SubscriptionPlan {
  id: 'pass_24h' | 'pass_7d' | 'pass_30d' | 'pass_1y';
  title: string;
  durationDays: number;
  priceFcfa: number;
  priceEur: number;
  badge?: string;
  popular?: boolean;
  description: string;
  features: string[];
}

export interface PaymentTransaction {
  id: string;
  planId: string;
  planTitle: string;
  amountFcfa: number;
  provider: 'orange_money' | 'wave' | 'mtn_momo' | 'moov_flooz' | 'djamo_card';
  phoneNumber: string;
  country: string;
  transactionRef: string;
  createdAt: string;
  expiresAt: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface UserSubscriptionState {
  isSubscribed: boolean;
  activePlan: SubscriptionPlan | null;
  subscribedAt: string | null;
  expiresAt: string | null;
  transactions: PaymentTransaction[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'pass_24h',
    title: 'Pass Express 24H',
    durationDays: 1,
    priceFcfa: 1000,
    priceEur: 1.5,
    description: 'Accès illimité d’une journée aux synthèses VIP & analyses IA.',
    features: [
      'Pronostics Quinté+ & Synthèse V38',
      'Indices de confiance & Bruits d\'écurie',
      'Accès instantané 24 heures',
    ],
  },
  {
    id: 'pass_7d',
    title: 'Pass Semaine 7 Jours',
    durationDays: 7,
    priceFcfa: 5000,
    priceEur: 7.5,
    popular: true,
    badge: 'LE PLUS POPULAIRE',
    description: 'L\'offre idéale pour suivre toute la semaine de courses PMU & LONACI.',
    features: [
      'Toutes les synthèses Quinté+ & Multi',
      'Alertes SMS/WhatsApp résultats en direct',
      'Collège Multi-Modèles IA Gemini & Claude',
      'Calculateur automatique de tickets & gains',
    ],
  },
  {
    id: 'pass_30d',
    title: 'Pass Mensuel VIP Pro',
    durationDays: 30,
    priceFcfa: 15000,
    priceEur: 23,
    badge: 'RECOMMANDÉ VIP',
    description: 'Accès VIP Pro complet 30 jours pour turfistes exigeants.',
    features: [
      'Accès illimité 30 Jours à tous les modules',
      'Propositions de jeux IA & Tendance cotes PMU',
      'Téléchargement fiches d\'impression PDF V38',
      'Support client prioritaire VIP 24/7',
      'Garantie réactualisation cotes en temps réel',
    ],
  },
  {
    id: 'pass_1y',
    title: 'Pass Annuel Elite',
    durationDays: 365,
    priceFcfa: 90000,
    priceEur: 137,
    badge: 'ÉCONOMIE 50%',
    description: 'L\'abonnement ultime avec 50% de réduction sur l\'année.',
    features: [
      'Accès illimité 365 jours sans interruption',
      'Toutes les mises à jour majeures offertes',
      'Dossiers confidentiels d\'entraîneurs & tuyaux',
      'Accès direct aux canaux VIP privés',
    ],
  },
];

const STORAGE_KEY = 'hippo_user_subscription';

export function getSubscriptionState(): UserSubscriptionState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: UserSubscriptionState = JSON.parse(stored);
      if (parsed.expiresAt) {
        const now = new Date().getTime();
        const exp = new Date(parsed.expiresAt).getTime();
        if (now > exp) {
          // Périmé
          parsed.isSubscribed = false;
        } else {
          parsed.isSubscribed = true;
        }
      }
      return parsed;
    }
  } catch (e) {
    console.error('Erreur chargement abonnement:', e);
  }

  return {
    isSubscribed: false,
    activePlan: null,
    subscribedAt: null,
    expiresAt: null,
    transactions: [],
  };
}

export function saveSubscriptionTransaction(
  plan: SubscriptionPlan,
  provider: PaymentTransaction['provider'],
  phoneNumber: string,
  country: string
): { state: UserSubscriptionState; transaction: PaymentTransaction } {
  const now = new Date();
  const expires = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  const txRef = `PAY-MM-${Math.floor(100000 + Math.random() * 900000)}`;

  const transaction: PaymentTransaction = {
    id: `tx-${Date.now()}`,
    planId: plan.id,
    planTitle: plan.title,
    amountFcfa: plan.priceFcfa,
    provider,
    phoneNumber,
    country,
    transactionRef: txRef,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    status: 'completed',
  };

  const currentState = getSubscriptionState();
  const newState: UserSubscriptionState = {
    isSubscribed: true,
    activePlan: plan,
    subscribedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    transactions: [transaction, ...(currentState.transactions || [])],
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    window.dispatchEvent(new CustomEvent('hippo_subscription_updated', { detail: newState }));
  } catch (e) {
    console.error('Erreur sauvegarde abonnement:', e);
  }

  return { state: newState, transaction };
}

export function cancelCurrentSubscription(): UserSubscriptionState {
  const currentState = getSubscriptionState();
  const newState: UserSubscriptionState = {
    ...currentState,
    isSubscribed: false,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    window.dispatchEvent(new CustomEvent('hippo_subscription_updated', { detail: newState }));
  } catch (e) {}
  return newState;
}

export function formatFcfa(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' FCFA';
}
