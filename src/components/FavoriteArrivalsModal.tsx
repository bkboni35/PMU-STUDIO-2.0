import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  X, 
  Trophy, 
  Calendar, 
  MapPin, 
  Clock, 
  ArrowUpRight, 
  Trash2, 
  ShieldCheck, 
  AlertTriangle,
  Volume2,
  VolumeX,
  Check
} from 'lucide-react';
import { 
  FavoriteArrivalAlert, 
  getFavoriteArrivalAlerts, 
  markFavoriteAlertAsRead, 
  removeFavoriteArrivalAlert, 
  clearAllFavoriteArrivalAlerts,
  getFavoriteNotificationsEnabled,
  setFavoriteNotificationsEnabled
} from '../utils/favoriteArrivalNotificationService';
import { CourseHippique } from '../types/turf';

interface FavoriteArrivalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCourse: (course: CourseHippique) => void;
}

export const FavoriteArrivalsModal: React.FC<FavoriteArrivalsModalProps> = ({
  isOpen,
  onClose,
  onSelectCourse,
}) => {
  const [alerts, setAlerts] = useState<FavoriteArrivalAlert[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() =>
    getFavoriteNotificationsEnabled()
  );

  useEffect(() => {
    if (isOpen) {
      setAlerts(getFavoriteArrivalAlerts());
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => {
      setAlerts(getFavoriteArrivalAlerts());
    };
    window.addEventListener('hippo-favorite-arrival-alert', handleUpdate);
    return () => window.removeEventListener('hippo-favorite-arrival-alert', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const handleToggleNotificationPref = () => {
    const nextVal = !notificationsEnabled;
    setNotificationsEnabled(nextVal);
    setFavoriteNotificationsEnabled(nextVal);
  };

  const handleMarkAllRead = () => {
    markFavoriteAlertAsRead();
    setAlerts(getFavoriteArrivalAlerts());
  };

  const handleClearAll = () => {
    clearAllFavoriteArrivalAlerts();
    setAlerts([]);
  };

  const handleSelect = (alert: FavoriteArrivalAlert) => {
    markFavoriteAlertAsRead(alert.id);
    if (alert.course) {
      onSelectCourse(alert.course);
      onClose();
    }
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-1 sm:p-3 sm:pt-2 bg-slate-950/90 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[96vh] sm:max-h-[calc(100vh-1rem)] flex flex-col shadow-2xl overflow-hidden mt-0 sm:mt-1">
        {/* En-tête Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-md">
              <Bell className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Notifications d'Arrivées · Courses Favorites
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                    {unreadCount} nouvelle(s)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Alertes automatiques en temps réel dès confirmation officielle de vos courses enregistrées
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barre d'options & actions rapides */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-xs">
          <button
            type="button"
            onClick={handleToggleNotificationPref}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-all ${
              notificationsEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            {notificationsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Alertes sonores & bannières : {notificationsEnabled ? 'Activées' : 'Désactivées'}</span>
          </button>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors font-bold text-[11px]"
              >
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Tout marquer lu</span>
              </button>
            )}
            {alerts.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 transition-colors font-bold text-[11px]"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>Effacer l'historique</span>
              </button>
            )}
          </div>
        </div>

        {/* Liste des alertes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {alerts.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800/60 text-slate-500 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h4 className="text-sm font-bold text-slate-300">Aucune alerte d'arrivée pour le moment</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Ajoutez des courses à vos favoris en cliquant sur l'étoile. Dès que l'arrivée officielle sera publiée ou rectifiée, une notification sonore et visuelle s'affichera ici.
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const arrivalNums = (alert.arriveeOfficielle || '')
                .split(/[-,\s]+/)
                .map((s) => s.trim())
                .filter(Boolean);
              const dateStr = new Date(alert.timestamp).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={alert.id}
                  onClick={() => handleSelect(alert)}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                    !alert.read
                      ? 'bg-gradient-to-r from-slate-900 to-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                      : 'bg-slate-950 hover:bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-black text-[10px]">
                          {alert.reunion} {alert.courseNumero}
                        </span>
                        <span className="text-xs font-bold text-slate-300">{alert.hippodrome}</span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{dateStr}</span>
                        </span>
                        {!alert.read && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-black">
                            NOUVEAU
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-black text-white truncate group-hover:text-amber-400 transition-colors">
                        {alert.courseTitle}
                      </h4>

                      {/* Ordre des chevaux */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-400">Arrivée certifiée :</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {arrivalNums.map((num, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[11px] font-black ${
                                idx === 0
                                  ? 'bg-amber-400 text-slate-950'
                                  : idx === 1
                                  ? 'bg-slate-200 text-slate-900'
                                  : idx === 2
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-slate-800 text-slate-200'
                              }`}
                            >
                              {num}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFavoriteArrivalAlert(alert.id);
                          setAlerts(getFavoriteArrivalAlerts());
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Supprimer cette alerte"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="p-1.5 text-slate-500 group-hover:text-amber-400 transition-colors">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
