import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Code2,
  Users,
  Download,
  X,
  Globe,
  Monitor,
  Laptop,
  Presentation,
} from 'lucide-react';
import { getUserAppUrl, getDevAppUrl, getQrCodeImageUrl } from '../utils/appUrls';
import {
  downloadWindowsBatchInstaller,
  downloadWindowsDesktopShortcut,
  downloadAndroidApkPackage,
} from '../utils/installGenerators';

interface DeveloperAndUserLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPresentationModal?: () => void;
}

export const DeveloperAndUserLinksModal: React.FC<DeveloperAndUserLinksModalProps> = ({
  isOpen,
  onClose,
  onOpenPresentationModal,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const userUrl = getUserAppUrl();
  const devUrl = getDevAppUrl();
  const qrCodeUrl = getQrCodeImageUrl(userUrl, 250);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-0 sm:pt-1 sm:px-2 sm:pb-1 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-amber-500/40 rounded-none sm:rounded-2xl p-4 sm:p-6 shadow-2xl overflow-hidden text-slate-100 h-screen sm:h-[calc(100vh-8px)] overflow-y-auto mt-0">
        {/* Glow effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-500/40 text-amber-400">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                Accès & Déploiement
              </span>
              <span className="text-xs text-slate-400">HippoAnalyse Engine</span>
            </div>
            <h3 className="text-xl font-black text-white mt-0.5">
              Liens Utilisateur, Développeur & APK Android
            </h3>
          </div>
        </div>

        <div className="space-y-6">
          {/* Section 1 : Lien Utilisateur & Développeur */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lien Utilisateur */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
                  <Users className="w-4 h-4" />
                  <span>Lien Utilisateur (Production / Public)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Lien partagé destiné aux parieurs et utilisateurs finaux pour consulter et analyser les courses.
                </p>
                <div className="mt-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-300 break-all select-all">
                  {userUrl}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleCopy(userUrl, 'user')}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  {copiedType === 'user' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'user' ? 'Copié !' : 'Copier le lien'}</span>
                </button>
                <a
                  href={userUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ouvrir</span>
                </a>
              </div>
            </div>

            {/* Lien Développeur */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-1">
                  <Code2 className="w-4 h-4" />
                  <span>Lien Développeur (Espace Dev)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Environnement de développement et de test en direct pour le paramétrage et la supervision.
                </p>
                <div className="mt-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-amber-300 break-all select-all">
                  {devUrl}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleCopy(devUrl, 'dev')}
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  {copiedType === 'dev' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'dev' ? 'Copié !' : 'Copier le lien'}</span>
                </button>
                <a
                  href={devUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ouvrir</span>
                </a>
              </div>
            </div>
          </div>

          {/* Section Présentation & Automatisation */}
          {onOpenPresentationModal && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-amber-950/40 border-2 border-emerald-500/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                  <Presentation className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Présentation du Système & Guide d'Automatisation</h4>
                  <p className="text-xs text-slate-300">
                    Script oral (10 slides), architecture découplée, options Python / n8n / Make et prompt IA.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPresentationModal();
                }}
                className="py-2 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shrink-0 transition-all shadow-md shadow-emerald-500/20"
              >
                Consulter
              </button>
            </div>
          )}

          {/* Section 2 : APK Android & Installation Mobile */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-sm">Application Android (APK / WebAPK PWA)</h4>
                  <p className="text-xs text-slate-400">Installez l'application directement sur votre smartphone Android</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider">
                Prêt pour Android 14+
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div className="sm:col-span-2 space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0 mt-0.5">1</div>
                  <span>Ouvrez le lien utilisateur ci-dessus dans le navigateur <strong>Google Chrome</strong> sur votre appareil Android.</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0 mt-0.5">2</div>
                  <span>Appuyez sur le menu (trois points en haut à droite de Chrome) et sélectionnez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0 mt-0.5">3</div>
                  <span>L'APK progressif s'installe instantanément sur votre bureau Android avec icône dédiée et mode hors-ligne.</span>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-3 bg-slate-900 border border-slate-800 rounded-2xl text-center">
                <div className="bg-white p-2 rounded-xl shadow-md border border-amber-400 mb-2">
                  <img
                    src={qrCodeUrl}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(userUrl)}`;
                    }}
                    alt="QR Code Android APK"
                    className="w-24 h-24 object-contain rounded"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-bold">Scannez pour installer sur Android</span>
              </div>
            </div>

            {/* Boutons directs Windows & Android */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={downloadWindowsBatchInstaller}
                className="py-2.5 px-3 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 text-blue-200 border border-blue-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow"
              >
                <Laptop className="w-4 h-4 text-blue-400" />
                <span>Télécharger l'Installeur Windows (.BAT)</span>
              </button>

              <button
                type="button"
                onClick={downloadAndroidApkPackage}
                className="py-2.5 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow"
              >
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Télécharger le Package APK (.HTML)</span>
              </button>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <a
                href={userUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex-1 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Ouvrir & Installer le WebAPK Android</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
