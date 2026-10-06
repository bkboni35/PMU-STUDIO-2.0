import React, { useState, useEffect } from 'react';
import {
  Crown,
  Smartphone,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  Clock,
  ChevronRight,
  Download,
  AlertCircle,
  Copy,
  RefreshCw,
  Award,
  CreditCard,
  QrCode,
  Check
} from 'lucide-react';
import {
  SUBSCRIPTION_PLANS,
  SubscriptionPlan,
  PaymentTransaction,
  getSubscriptionState,
  saveSubscriptionTransaction,
  UserSubscriptionState,
  formatFcfa,
  cancelCurrentSubscription
} from '../utils/subscriptionStorage';

interface MobileMoneySubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionSuccess?: (state: UserSubscriptionState) => void;
}

type Step = 'plans' | 'provider' | 'payment_process' | 'success';

interface MobileMoneyProvider {
  id: PaymentTransaction['provider'];
  name: string;
  badge: string;
  colorBg: string;
  borderColor: string;
  textColor: string;
  logoEmoji: string;
  countrySupport: string;
  ussdCode?: string;
  instructions: string;
}

const PROVIDERS: MobileMoneyProvider[] = [
  {
    id: 'orange_money',
    name: 'Orange Money',
    badge: 'AUTOMATIQUE USSD',
    colorBg: 'bg-orange-950/60',
    borderColor: 'border-orange-500/60',
    textColor: 'text-orange-400',
    logoEmoji: '🍊',
    countrySupport: 'Côte d\'Ivoire, Sénégal, Mali, Burkina Faso, Guinée',
    ussdCode: '#144*82#',
    instructions: 'Composez le #144*82# sur votre téléphone Orange pour générer le code OTP de confirmation.',
  },
  {
    id: 'wave',
    name: 'Wave Mobile Money',
    badge: '0% FRAIS · INSTANTANÉ',
    colorBg: 'bg-sky-950/60',
    borderColor: 'border-sky-400/60',
    textColor: 'text-sky-400',
    logoEmoji: '🌊',
    countrySupport: 'Côte d\'Ivoire, Sénégal, Mali, Burkina Faso',
    instructions: 'Validation directe sans frais via l\'application Wave ou scan du QR Code sécurisé.',
  },
  {
    id: 'mtn_momo',
    name: 'MTN Mobile Money (MoMo)',
    badge: 'NOTIFICATION PUSH',
    colorBg: 'bg-yellow-950/60',
    borderColor: 'border-yellow-500/60',
    textColor: 'text-yellow-400',
    logoEmoji: '🟡',
    countrySupport: 'Côte d\'Ivoire, Bénin, Cameroun, Ghana',
    ussdCode: '*133#',
    instructions: 'Vous recevrez une notification Push MTN MoMo sur votre mobile pour approuver le débit.',
  },
  {
    id: 'moov_flooz',
    name: 'Moov Money (Flooz)',
    badge: 'VALIDATION USSD',
    colorBg: 'bg-blue-950/60',
    borderColor: 'border-blue-500/60',
    textColor: 'text-blue-400',
    logoEmoji: '🔵',
    countrySupport: 'Côte d\'Ivoire, Togo, Bénin, Burkina Faso',
    ussdCode: '*155#',
    instructions: 'Composez le *155# pour approuver la demande de paiement en saisissant votre code PIN.',
  },
  {
    id: 'djamo_card',
    name: 'Carte Visa / Djamo / Mastercard',
    badge: 'PAIEMENT PAR CARTE',
    colorBg: 'bg-emerald-950/60',
    borderColor: 'border-emerald-500/60',
    textColor: 'text-emerald-400',
    logoEmoji: '💳',
    countrySupport: 'International & Afrique de l\'Ouest',
    instructions: 'Paiement sécurisé par carte bancaire Visa, Mastercard ou Djamo avec cryptage SSL 256-bit.',
  },
];

export const MobileMoneySubscriptionModal: React.FC<MobileMoneySubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSubscriptionSuccess,
}) => {
  const [subState, setSubState] = useState<UserSubscriptionState>(getSubscriptionState());
  const [step, setStep] = useState<Step>('plans');

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(SUBSCRIPTION_PLANS[1]); // Default 7 Jours
  const [selectedProvider, setSelectedProvider] = useState<MobileMoneyProvider>(PROVIDERS[0]); // Default Orange Money

  // Inputs du formulaire de paiement
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState('Côte d\'Ivoire (225)');

  // Simulation du paiement
  const [paymentProgress, setPaymentProgress] = useState(0);
  const [paymentStatusText, setPaymentStatusText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTransaction, setActiveTransaction] = useState<PaymentTransaction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getSubscriptionState();
      setSubState(current);
      if (current.isSubscribed) {
        // Déjà abonné
        setStep('success');
      } else {
        setStep('plans');
      }
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Navigation steps
  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setStep('provider');
  };

  const handleSelectProvider = (provider: MobileMoneyProvider) => {
    setSelectedProvider(provider);
    setStep('payment_process');
  };

  // Lancement du paiement Mobile Money
  const handleStartPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMessage('Veuillez saisir un numéro de téléphone Mobile Money valide (ex: 07 08 09 10 11).');
      return;
    }

    setIsProcessing(true);
    setPaymentProgress(10);
    setPaymentStatusText(`Initialisation de la transaction avec ${selectedProvider.name}...`);

    // Séquence de simulation en temps réel ultra-réaliste
    setTimeout(() => {
      setPaymentProgress(35);
      setPaymentStatusText(`Envoi de la demande de paiement de ${formatFcfa(selectedPlan.priceFcfa)} au réseau ${selectedProvider.name}...`);
    }, 1200);

    setTimeout(() => {
      setPaymentProgress(65);
      setPaymentStatusText(`Attente de confirmation USSD / Notification Mobile Money sur le ${cleanPhone}...`);
    }, 2800);

    setTimeout(() => {
      setPaymentProgress(90);
      setPaymentStatusText(`Approbation reçue ! Finalisation de l'activation du ${selectedPlan.title}...`);
    }, 4500);

    setTimeout(() => {
      setPaymentProgress(100);
      setIsProcessing(false);

      // Enregistrer la transaction et mettre à jour le statut
      const { state, transaction } = saveSubscriptionTransaction(
        selectedPlan,
        selectedProvider.id,
        cleanPhone,
        country
      );

      setSubState(state);
      setActiveTransaction(transaction);
      setStep('success');

      if (onSubscriptionSuccess) {
        onSubscriptionSuccess(state);
      }
    }, 6000);
  };

  const handleCopyRef = () => {
    if (!activeTransaction) return;
    navigator.clipboard.writeText(activeTransaction.transactionRef);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  // Calcul du temps restant pour un abonnement actif
  const getRemainingTimeText = () => {
    if (!subState.expiresAt) return '';
    const now = new Date().getTime();
    const exp = new Date(subState.expiresAt).getTime();
    const diffMs = exp - now;
    if (diffMs <= 0) return 'Expiré';

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days} jour${days > 1 ? 's' : ''} et ${hours}h restant${days > 1 ? 's' : ''}`;
    }
    return `${hours}h ${minutes}min restants`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl my-auto bg-slate-900 border-2 border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* En-tête Supérieur */}
        <div className="bg-gradient-to-r from-slate-950 via-amber-950/50 to-slate-950 p-4 sm:p-5 border-b border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <Crown className="w-5 h-5 text-slate-950 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                  Guichet Officiel
                </span>
                <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                  Espace Abonnement & Paiement Mobile Money
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Payez instantanément par Orange Money, Wave, MTN MoMo ou Moov Flooz et débloquez tous les accès VIP.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Fermer la fenêtre"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fil d'Ariane des Étapes */}
        {!subState.isSubscribed && (
          <div className="bg-slate-950/80 px-4 py-2.5 border-b border-slate-800 flex items-center justify-center gap-2 sm:gap-4 text-xs font-bold overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => !isProcessing && setStep('plans')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all whitespace-nowrap ${
                step === 'plans'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>1. Formule VIP</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            <button
              type="button"
              onClick={() => !isProcessing && setStep('provider')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all whitespace-nowrap ${
                step === 'provider'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>2. Mode de Paiement</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            <button
              type="button"
              onClick={() => !isProcessing && setStep('payment_process')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all whitespace-nowrap ${
                step === 'payment_process'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>3. Validation Mobile Money</span>
            </button>
          </div>
        )}

        {/* Corps Principal Modal */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">

          {/* ÉTAPE 1 : CHOIX DU PASS ABONNEMENT */}
          {step === 'plans' && !subState.isSubscribed && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  Pronostics & Analyses VIP
                </span>
                <h3 className="text-lg sm:text-2xl font-black text-white">
                  Choisissez la Formule d'Abonnement Adaptée à vos Besoins
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Profitez de l'accès complet aux synthèses IA V38, bruits d'écurie certifiés, pronostics Quinté+ et téléchargement fiches PDF.
                </p>
              </div>

              {/* Grille des Plans */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {SUBSCRIPTION_PLANS.map((plan) => {
                  const isSelected = selectedPlan.id === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                        plan.popular
                          ? 'bg-gradient-to-b from-amber-950/60 via-slate-900 to-slate-950 border-amber-500 shadow-xl shadow-amber-500/10 scale-[1.02]'
                          : isSelected
                          ? 'bg-slate-900 border-amber-400 shadow-lg'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      {/* Badge spécial */}
                      {plan.badge && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md whitespace-nowrap">
                          {plan.badge}
                        </div>
                      )}

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-black text-white">{plan.title}</h4>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />}
                        </div>

                        <div className="border-b border-slate-800 pb-3">
                          <div className="text-2xl font-black text-amber-400 tracking-tight">
                            {formatFcfa(plan.priceFcfa)}
                          </div>
                          <span className="text-[11px] text-slate-500 font-bold">
                            soit environ {plan.priceEur} € / {plan.durationDays === 1 ? '24h' : `${plan.durationDays} jours`}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 font-medium leading-relaxed">
                          {plan.description}
                        </p>

                        <ul className="space-y-2 pt-1">
                          {plan.features.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
                              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPlan(plan);
                        }}
                        className={`w-full py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md ${
                          plan.popular
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950'
                            : isSelected
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        <span>Souscrire ({formatFcfa(plan.priceFcfa)})</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : SÉLECTION DE L'OPÉRATEUR MOBILE MONEY */}
          {step === 'provider' && !subState.isSubscribed && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-black text-white">
                    Sélectionnez votre Opérateur Mobile Money
                  </h3>
                  <p className="text-xs text-slate-400">
                    Formule sélectionnée : <strong className="text-amber-400">{selectedPlan.title} ({formatFcfa(selectedPlan.priceFcfa)})</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('plans')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  ← Changer de formule
                </button>
              </div>

              {/* Grille des opérateurs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROVIDERS.map((prov) => {
                  const isSelected = selectedProvider.id === prov.id;
                  return (
                    <div
                      key={prov.id}
                      onClick={() => handleSelectProvider(prov)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? `${prov.colorBg} ${prov.borderColor} shadow-xl ring-1 ring-amber-400`
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl p-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
                            {prov.logoEmoji}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-black text-white">{prov.name}</h4>
                            </div>
                            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${prov.colorBg} ${prov.textColor} border ${prov.borderColor}`}>
                              {prov.badge}
                            </span>
                          </div>
                        </div>

                        {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />}
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                        <p className="text-xs text-slate-300 font-medium">
                          {prov.instructions}
                        </p>
                        <p className="text-[11px] text-slate-500 font-bold">
                          Pays supportés : {prov.countrySupport}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectProvider(prov);
                        }}
                        className="mt-1 w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 font-extrabold text-xs transition-all flex items-center justify-center gap-2"
                      >
                        <span>Payer avec {prov.name}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : FORMULAIRE & SIMULATION DE PAIEMENT EN TEMPS RÉEL */}
          {step === 'payment_process' && !subState.isSubscribed && (
            <div className="space-y-6 max-w-2xl mx-auto animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>{selectedProvider.logoEmoji}</span>
                    <span>Validation du Paiement {selectedProvider.name}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Montant total à débiter : <strong className="text-amber-400 text-sm font-mono">{formatFcfa(selectedPlan.priceFcfa)}</strong> pour le <strong>{selectedPlan.title}</strong>
                  </p>
                </div>

                {!isProcessing && (
                  <button
                    type="button"
                    onClick={() => setStep('provider')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                  >
                    ← Changer d'opérateur
                  </button>
                )}
              </div>

              {/* Notice d'instructions spécifiques à l'opérateur */}
              <div className={`p-4 rounded-2xl border ${selectedProvider.colorBg} ${selectedProvider.borderColor} space-y-2`}>
                <div className="flex items-center gap-2 font-black text-xs text-white">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>Instructions pour {selectedProvider.name} :</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {selectedProvider.instructions}
                </p>
                {selectedProvider.ussdCode && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-300 font-mono font-black text-xs">
                    <span>Code USSD :</span>
                    <span className="text-white bg-amber-500/20 px-2 py-0.5 rounded-md">{selectedProvider.ussdCode}</span>
                  </div>
                )}
              </div>

              {/* Formulaire de saisie du numéro */}
              <form onSubmit={handleStartPayment} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
                    Pays & Réseau Mobile
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    disabled={isProcessing}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:border-amber-400 focus:outline-none cursor-pointer"
                  >
                    <option value="Côte d'Ivoire (225)">🇨🇮 Côte d'Ivoire (LONACI / Orange / MTN / Moov / Wave)</option>
                    <option value="Sénégal (221)">🇸🇳 Sénégal (Wave / Orange Money / Free)</option>
                    <option value="Mali (223)">🇲🇱 Mali (Orange / Moov)</option>
                    <option value="Burkina Faso (226)">🇧🇫 Burkina Faso (Orange / Moov)</option>
                    <option value="Cameroun (237)">🇨🇲 Cameroun (MTN / Orange)</option>
                    <option value="Togo (228)">🇹🇬 Togo (TMoney / Moov)</option>
                    <option value="Bénin (229)">🇧🇯 Bénin (MTN / Moov)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
                    Numéro de Téléphone Mobile Money
                  </label>
                  <div className="relative flex items-center">
                    <Smartphone className="w-4 h-4 text-amber-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="ex: 07 08 09 10 11 ou 05 44 33 22 11"
                      disabled={isProcessing}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-mono font-bold text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Saisissez le numéro sur lequel est enregistré votre compte Mobile Money.
                  </span>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Progress Bar de simulation en direct */}
                {isProcessing && (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="text-amber-400 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                        <span>Paiement en cours...</span>
                      </span>
                      <span className="text-emerald-400 font-mono font-bold">{paymentProgress}%</span>
                    </div>

                    <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
                      <div
                        className="bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400 h-full transition-all duration-300 rounded-full shadow-md"
                        style={{ width: `${paymentProgress}%` }}
                      />
                    </div>

                    <div className="text-[11px] text-slate-200 font-semibold flex items-center justify-between pt-0.5">
                      <span className="truncate pr-2">{paymentStatusText}</span>
                      <span className="text-amber-400 font-mono shrink-0">Pass Passerelle V38</span>
                    </div>
                  </div>
                )}

                {!isProcessing && (
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    <Lock className="w-4 h-4 fill-current" />
                    <span>Confirmer le Paiement de {formatFcfa(selectedPlan.priceFcfa)}</span>
                  </button>
                )}
              </form>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Transaction certifiée & sécurisée par cryptage Mobile Money SSL</span>
              </div>
            </div>
          )}

          {/* ÉTAPE 4 : CONFIRMATION & STATUT ABONNEMENT ACTIF */}
          {(step === 'success' || subState.isSubscribed) && (
            <div className="space-y-6 max-w-2xl mx-auto animate-fadeIn text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                <Award className="w-9 h-9 text-slate-950 fill-current" />
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ABONNEMENT PASS VIP ACTIF
                </span>
                <h3 className="text-xl sm:text-3xl font-black text-white">
                  Félicitations ! Votre Abonnement VIP est Validé
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Votre compte bénéficie désormais de l'accès illimité à tous les pronostics VIP, synthèses IA et bruits d'écuries.
                </p>
              </div>

              {/* Carte Récapitulative du Pass Actif */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-2 border-emerald-500/50 shadow-2xl text-left space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Formule Active</span>
                    <h4 className="text-lg font-black text-white">{subState.activePlan?.title || 'Pass VIP Pro'}</h4>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black font-mono">
                    {getRemainingTimeText()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block">Souscrit le :</span>
                    <span className="text-slate-200 font-mono font-bold">
                      {subState.subscribedAt ? new Date(subState.subscribedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Aujourd\'hui'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">Expire le :</span>
                    <span className="text-amber-400 font-mono font-bold">
                      {subState.expiresAt ? new Date(subState.expiresAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'En cours'}
                    </span>
                  </div>
                </div>

                {/* Détails de la dernière transaction si disponible */}
                {activeTransaction && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">Référence Transaction :</span>
                      <div className="flex items-center gap-1.5 font-mono font-black text-amber-300">
                        <span>{activeTransaction.transactionRef}</span>
                        <button
                          type="button"
                          onClick={handleCopyRef}
                          className="p-1 hover:text-white transition-colors"
                          title="Copier la référence"
                        >
                          {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Moyen de paiement :</span>
                      <span className="text-white font-bold uppercase">{activeTransaction.provider.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Numéro débité :</span>
                      <span className="text-white font-mono">{activeTransaction.phoneNumber}</span>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('plans');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5"
                  >
                    <Crown className="w-4 h-4 fill-current" />
                    <span>Prolonger / Renouveler l'abonnement</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Voulez-vous réinitialiser le statut d\'abonnement local ?')) {
                        const updated = cancelCurrentSubscription();
                        setSubState(updated);
                        setStep('plans');
                      }
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 underline font-bold"
                  >
                    Annuler le pass
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-sm shadow-xl hover:scale-105 transition-all"
                >
                  Accéder à tous les pronostics VIP
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Pied de page */}
        <div className="bg-slate-950 p-3.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Support Mobile Money LONACI / PMU disponible 24h/24</span>
          </div>
          <span className="font-mono text-[11px] text-amber-400">Passerelle Certifiée V38</span>
        </div>

      </div>
    </div>
  );
};
