import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  X, 
  Trophy, 
  Sparkles, 
  ChevronRight, 
  Clock, 
  Volume2, 
  VolumeX, 
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { 
  FavoriteArrivalAlert, 
  getFavoriteArrivalAlerts, 
  markFavoriteAlertAsRead, 
  removeFavoriteArrivalAlert,
  getFavoriteNotificationsEnabled,
  setFavoriteNotificationsEnabled
} from '../utils/favoriteArrivalNotificationService';
import { CourseHippique } from '../types/turf';

interface FavoriteArrivalNotificationBannerProps {
  onSelectCourse: (course: CourseHippique) => void;
  onOpenFavoritesModal?: () => void;
}

export const FavoriteArrivalNotificationBanner: React.FC<FavoriteArrivalNotificationBannerProps> = ({
  onSelectCourse,
  onOpenFavoritesModal,
}) => {
  const [alerts, setAlerts] = useState<FavoriteArrivalAlert[]>([]);
  const [activeAlertIndex, setActiveAlertIndex] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() =>
    getFavoriteNotificationsEnabled()
  );

  useEffect(() => {
    // Initialiser les alertes
    const initial = getFavoriteArrivalAlerts();
    setAlerts(initial);

    const handleCustomAlert = (e: Event) => {
      const customEv = e as CustomEvent<{ alerts?: FavoriteArrivalAlert[] }>;
      if (customEv.detail?.alerts) {
        setAlerts(customEv.detail.alerts);
        setActiveAlertIndex(0); // Afficher la dernière alerte reçue
      } else {
        setAlerts(getFavoriteArrivalAlerts());
      }
    };

    window.addEventListener('hippo-favorite-arrival-alert', handleCustomAlert);
    return () => window.removeEventListener('hippo-favorite-arrival-alert', handleCustomAlert);
  }, []);

  const unreadAlerts = alerts.filter((a) => !a.read);
  const currentAlert = unreadAlerts[activeAlertIndex] || unreadAlerts[0] || alerts[0];

  if (!notificationsEnabled || (!currentAlert && unreadAlerts.length === 0)) {
    return null;
  }

  // Ne pas afficher si aucune alerte non lue
  if (unreadAlerts.length === 0) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    markFavoriteAlertAsRead(currentAlert.id);
    const updated = alerts.map((a) => (a.id === currentAlert.id ? { ...a, read: true } : a));
    setAlerts(updated);
  };

  const handleConsultCourse = () => {
    markFavoriteAlertAsRead(currentAlert.id);
    if (currentAlert.course) {
      onSelectCourse(currentAlert.course);
    }
  };

  const arrivalNumbers = (currentAlert.arriveeOfficielle || '')
    .split(/[-,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const isModified = currentAlert.statutArrivee === 'modifiee';

  return (
    <div className="relative z-40 my-3 animate-fadeIn">
      <div
        className={`relative overflow-hidden rounded-2xl border-2 p-3.5 sm:p-4 shadow-2xl transition-all ${
          isModified
            ? 'bg-gradient-to-r from-amber-950 via-slate-950 to-rose-950 border-amber-500 shadow-amber-500/20'
            : 'bg-gradient-to-r from-emerald-950 via-slate-950 to-amber-950 border-emerald-400 shadow-emerald-500/20'
        }`}
      >
        {/* Lueur d'ambiance */}
        <div
          className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl pointer-events-none opacity-30 ${
            isModified ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
        />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 relative z-10">
          {/* Côté Gauche : Icône animée & Informations de la course */}
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                isModified
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 animate-pulse'
                  : 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 ring-2 ring-emerald-300'
              }`}
            >
              {isModified ? (
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              ) : (
                <Trophy className="w-6 h-6 fill-slate-950 stroke-[2.5]" />
              )}
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    isModified
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-emerald-500 text-slate-950'
                  }`}
                >
                  ⭐ Course Favorite
                </span>
                <span className="text-[11px] font-bold text-slate-300">
                  {currentAlert.reunion} {currentAlert.courseNumero} · {currentAlert.hippodrome}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
                    isModified
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  {isModified ? 'Arrivée Rectifiée Commissaires' : 'Arrivée Officielle Confirmée'}
                </span>
              </div>

              <h4 className="text-sm sm:text-base font-black text-white truncate">
                {currentAlert.courseTitle}
              </h4>

              {/* Rendu visuel soigné des numéros d'arrivée (Boules numérotées) */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-xs font-bold text-slate-400">Ordre d'arrivée :</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {arrivalNumbers.map((num, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black shadow-md ${
                          idx === 0
                            ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 ring-1 ring-amber-300'
                            : idx === 1
                            ? 'bg-slate-200 text-slate-900 ring-1 ring-white'
                            : idx === 2
                            ? 'bg-amber-700 text-amber-100 ring-1 ring-amber-500'
                            : 'bg-slate-800 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {num}
                      </span>
                      {idx < arrivalNumbers.length - 1 && (
                        <span className="text-slate-600 font-bold text-xs">-</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Côté Droit : Boutons d'action rapides */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
            {unreadAlerts.length > 1 && (
              <span className="text-[11px] font-bold text-amber-300/80 px-2 py-1 rounded-lg bg-slate-900/80 border border-amber-500/20">
                +{unreadAlerts.length - 1} autre(s)
              </span>
            )}

            <button
              type="button"
              onClick={handleConsultCourse}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span>Voir la Course</span>
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            {onOpenFavoritesModal && (
              <button
                type="button"
                onClick={onOpenFavoritesModal}
                className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition-all active:scale-95"
              >
                <span>Mes Favoris</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-850"
              title="Ignorer cette alerte"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
