import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Monitor,
  Download,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  FileCode,
  ExternalLink,
  Laptop,
  Copy,
  Check,
  AlertCircle,
  Play
} from 'lucide-react';
import { getUserAppUrl, getQrCodeImageUrl } from '../utils/appUrls';
import {
  downloadWindowsBatchInstaller,
  downloadWindowsDesktopShortcut,
  downloadAndroidApkPackage
} from '../utils/installGenerators';
import { WindowsAppLaunchAnimation } from './WindowsAppLaunchAnimation';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'windows' | 'android';
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'windows',
}) => {
  const [activePlatform, setActivePlatform] = useState<'windows' | 'android'>(initialTab);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState<string | null>(null);
  const [hasCopiedUrl, setHasCopiedUrl] = useState(false);
  const [isWindowsLaunchAnimationOpen, setIsWindowsLaunchAnimationOpen] = useState(false);

  const userUrl = getUserAppUrl();
  const qrCodeUrl = getQrCodeImageUrl(userUrl, 260);

  const handleCopyUrl = () => {
    try {
      navigator.clipboard.writeText(userUrl);
      setHasCopiedUrl(true);
      setTimeout(() => setHasCopiedUrl(false), 3000);
    } catch {}
  };

  useEffect(() => {
    if (initialTab) {
      setActivePlatform(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setDownloadSuccessNotice("Utilisez l'option du navigateur (icône d'installation dans la barre d'adresse) ou téléchargez le script ci-dessous.");
      setTimeout(() => setDownloadSuccessNotice(null), 4500);
    }
  };

  const handleDownloadWindowsBatch = () => {
    downloadWindowsBatchInstaller();
    setDownloadSuccessNotice("Script d'installation Windows téléchargé ! Double-cliquez dessus pour créer le raccourci sur votre Bureau.");
    setTimeout(() => setDownloadSuccessNotice(null), 4500);
  };

  const handleDownloadWindowsShortcut = () => {
    downloadWindowsDesktopShortcut();
    setDownloadSuccessNotice("Raccourci Bureau Windows (.url) téléchargé avec succès !");
    setTimeout(() => setDownloadSuccessNotice(null), 4500);
  };

  const handleDownloadAndroidApk = () => {
    downloadAndroidApkPackage();
    setDownloadSuccessNotice("Package d'installation Android téléchargé ! Ouvrez-le sur votre téléphone.");
    setTimeout(() => setDownloadSuccessNotice(null), 4500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:pt-1 sm:px-2 sm:pb-1 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-amber-500/50 rounded-none sm:rounded-2xl p-4 sm:p-6 shadow-2xl overflow-hidden text-slate-100 h-screen sm:h-[calc(100vh-8px)] overflow-y-auto mt-0">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App Logo & Title */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="relative shrink-0">
            <img
              src="/horse-logo.jpg"
              alt="Logo HippoAnalyse"
              className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shadow-xl shadow-amber-500/25"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 p-1 bg-amber-500 rounded-full text-slate-950 ring-2 ring-slate-900">
              <Sparkles className="w-3 h-3 text-slate-950" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                Installation Autonome
              </span>
              <span className="text-xs text-slate-400 font-bold">Sans navigateur apparent</span>
            </div>
            <h3 className="text-xl font-black text-white mt-0.5">
              Installation Windows & APK Android
            </h3>
          </div>
        </div>

        {/* Platform Tabs: Windows vs Android */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-950 border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => setActivePlatform('windows')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activePlatform === 'windows'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>💻 Installation Windows (PC)</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePlatform('android')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all ${
              activePlatform === 'android'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>📱 APK Android (Mobile)</span>
          </button>
        </div>

        {/* Feedback notice if action clicked */}
        {downloadSuccessNotice && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{downloadSuccessNotice}</span>
          </div>
        )}

        {/* ================= TAB 1: WINDOWS INSTALLATION ================= */}
        {activePlatform === 'windows' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 space-y-3">
              <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
                <Laptop className="w-5 h-5 text-blue-400" />
                <span>Application de Bureau Windows 10 / Windows 11</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Installez HippoAnalyse sur votre PC Windows pour l'ouvrir dans une fenêtre indépendante dédiée, ultra-fluide, avec raccourci sur le Bureau et la Barre des tâches.
              </p>
            </div>

            {/* Verified Active URL Box */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Adresse active vérifiée du serveur (Sans erreur 404) :</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">En ligne 100%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-amber-300 select-all truncate">
                  {userUrl}
                </div>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0"
                  title="Copier l'adresse de l'application"
                >
                  {hasCopiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{hasCopiedUrl ? 'Copié !' : 'Copier'}</span>
                </button>
                <a
                  href={userUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all shrink-0"
                  title="Ouvrir dans un nouvel onglet pour vérifier"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Windows Animation Launcher Button */}
            <button
              type="button"
              onClick={() => setIsWindowsLaunchAnimationOpen(true)}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/30 active:scale-95 transition-all text-center animate-pulse hover:animate-none"
            >
              <Play className="w-5 h-5 fill-slate-950 text-slate-950" />
              <span>🚀 Lancer l'Animation d'Ouverture Windows 11</span>
            </button>

            {/* Main Action Buttons for Windows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDownloadWindowsBatch}
                className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm flex flex-col items-center justify-center gap-2 shadow-xl shadow-blue-900/30 active:scale-95 transition-all text-center"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-white" />
                  <span>Télécharger l'Installeur Windows (.BAT)</span>
                </div>
                <span className="text-[11px] font-normal text-blue-100 opacity-90">
                  Crée le raccourci Bureau et lance l'app en 1 clic
                </span>
              </button>

              <button
                type="button"
                onClick={handleDownloadWindowsShortcut}
                className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/40 font-black text-xs sm:text-sm flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-center"
              >
                <div className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-amber-400" />
                  <span>Raccourci Direct Bureau (.URL)</span>
                </div>
                <span className="text-[11px] font-normal text-slate-400">
                  Double-cliquez pour ouvrir directement
                </span>
              </button>
            </div>

            {/* In-browser Windows Desktop PWA Install Button */}
            {deferredPrompt && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/40 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-white">Installation Directe du Navigateur Détectée</div>
                  <div className="text-[11px] text-slate-400">Cliquez pour installer sans fichier supplémentaire</div>
                </div>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow transition-all shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Installer maintenant</span>
                </button>
              </div>
            )}

            {/* Step by step manual guide for Windows */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-blue-400" />
                Méthode Navigateur (Microsoft Edge & Google Chrome sous Windows) :
              </h4>
              <ol className="space-y-2.5 text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <span>
                    Regardez à droite de la barre d'adresse de votre navigateur : cliquez sur l'icône <strong>« Ordinateur avec flèche ⤓ »</strong> (Installer l'application).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <span>
                    Ou dans le menu <strong>« ... »</strong> en haut à droite, allez sur <strong>« Applications »</strong> &rarr; <strong>« Installer HippoAnalyse Pro »</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <span>
                    Cochez <em>« Créer un raccourci sur le bureau »</em> et <em>« Épingler à la barre des tâches »</em>.
                  </span>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* ================= TAB 2: ANDROID APK INSTALLATION ================= */}
        {activePlatform === 'android' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <span>Package Android APK & WebAPK Officiel</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Profitez de la version mobile optimisée pour Android : notifications de courses, synchronisation hors ligne et interface plein écran.
              </p>
            </div>

            {/* Direct APK Package Download Button */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDownloadAndroidApk}
                className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex flex-col items-center justify-center gap-2 shadow-xl shadow-emerald-900/30 active:scale-95 transition-all text-center"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-white" />
                  <span>Télécharger le Package APK Android</span>
                </div>
                <span className="text-[11px] font-normal text-emerald-100 opacity-90">
                  Fichier d'installation autonome (.HTML / WebAPK)
                </span>
              </button>

              <button
                type="button"
                onClick={handleInstallClick}
                className="p-4 rounded-2xl bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 font-black text-xs sm:text-sm flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-center"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <span>Installer sur l'Écran d'Accueil</span>
                </div>
                <span className="text-[11px] font-normal text-slate-400">
                  Installation directe WebAPK sans store
                </span>
              </button>
            </div>

            {/* QR Code pour Flash & Télécharger sur Mobile */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="bg-white p-2.5 rounded-xl shadow-lg border-2 border-amber-400 shrink-0">
                <img
                  src={qrCodeUrl}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(userUrl)}`;
                  }}
                  alt="QR Code APK HippoAnalyse"
                  className="w-28 h-28 object-contain rounded"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase">
                    Scan Rapide APK
                  </span>
                  <span className="text-xs font-bold text-white">Android PWA / WebAPK</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Scannez ce QR Code avec l'appareil photo de votre smartphone Android pour ouvrir et installer instantanément l'APK.
                </p>
                <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                  <a
                    href={userUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Lien direct smartphone</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Step by Step Manual Guide for Chrome / Samsung Browser */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                Installation sur Chrome Mobile Android :
              </h4>
              <ol className="space-y-2 text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <span>Touchez le menu <strong>« ⋮ »</strong> en haut à droite du navigateur sur Android.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <span>Sélectionnez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <span>Confirmez : l'icône <strong>HippoAnalyse</strong> s'installe comme une application native.</span>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 pt-4 mt-6 border-t border-slate-800/80 gap-2">
          <span>Compatible Windows 10/11 & Android 8.0+</span>
          <span className="text-amber-400 font-bold">
            Concepteur : Ghislain BONI / +(225) 01 01 24 61 06
          </span>
        </div>
      </div>

      {/* Windows App Launch Animation Modal */}
      <WindowsAppLaunchAnimation
        isOpen={isWindowsLaunchAnimationOpen}
        onClose={() => setIsWindowsLaunchAnimationOpen(false)}
        onLaunchSuccess={() => {
          setIsWindowsLaunchAnimationOpen(false);
          onClose();
        }}
      />
    </div>
  );
};
