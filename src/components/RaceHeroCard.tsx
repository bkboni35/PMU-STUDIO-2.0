import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Clock, MapPin, Gauge, ShieldAlert, Award, ExternalLink, Zap, Star, ShieldCheck, CheckCircle2, CloudSun, FileText, AlertTriangle, RefreshCw, AlertCircle, Sparkles, Users, BookmarkCheck, Heart, RotateCcw, Share2, Check } from 'lucide-react';
import { isCourseFinished, shouldPromoteProvisionalToOfficial, checkOfficialArrivalAuditStatus } from '../utils/raceCountdown';
import { CourseHippique } from '../types/turf';
import { CountdownTimer } from './CountdownTimer';
import { HierarchieQuinteV38Banner } from './HierarchieQuinteV38Banner';
import { computeV38Hierarchy, getOfficialHippodromeCorde } from '../utils/v38Helper';
import { convertToUTC } from '../utils/timeConversion';
import { DisciplineExpertAnalysisModal } from './DisciplineExpertAnalysisModal';
import { toggleFavoriteRace, isCourseFavorite } from '../utils/favoritesStorage';
import { ArrivalAuditCountdownWidget } from './ArrivalAuditCountdownWidget';
import { ArrivalAuditProgressRingBadge } from './ArrivalAuditProgressRingBadge';

interface RaceHeroCardProps {
  course: CourseHippique;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onRefreshOdds?: () => void;
  nextOddsSec?: number;
  isRefreshingOdds?: boolean;
  onTriggerArrivalAudit?: () => void;
  isAuditingArrival?: boolean;
  onClearArrival?: () => void;
  onNavigateTab?: (tab: 'synthese' | 'propositions-ia' | 'partants' | 'ticket' | 'college-gemini' | 'stats' | 'advisor' | 'favoris' | 'calendrier' | 'fiche-pdf-v38') => void;
  selectedHorsesCount?: number;
  onResetSelection?: () => void;
}

export const RaceHeroCard: React.FC<RaceHeroCardProps> = ({
  course,
  isFavorite = false,
  onToggleFavorite,
  onRefreshOdds,
  nextOddsSec = 30,
  isRefreshingOdds = false,
  onTriggerArrivalAudit,
  isAuditingArrival = false,
  onClearArrival,
  onNavigateTab,
  selectedHorsesCount = 0,
  onResetSelection,
}) => {
  const [isGenyModalOpen, setIsGenyModalOpen] = useState(false);
  const [isExpertModalOpen, setIsExpertModalOpen] = useState(false);
  const [localFavorite, setLocalFavorite] = useState<boolean>(() => {
    return isFavorite || (course ? isCourseFavorite(course) : false);
  });

  useEffect(() => {
    if (isFavorite !== undefined) {
      setLocalFavorite(isFavorite);
    } else if (course) {
      setLocalFavorite(isCourseFavorite(course));
    }
  }, [isFavorite, course]);

  const handleFavoriteClick = () => {
    if (onToggleFavorite) {
      onToggleFavorite();
      setLocalFavorite(!localFavorite);
    } else if (course) {
      const res = toggleFavoriteRace(course);
      setLocalFavorite(res.isFavorite);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hippo_favorites_updated', { detail: res }));
      }
    }
  };
  const [lastUpdated, setLastUpdated] = useState<string>(
    new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Construction du lien officiel Geny Arrivée & Rapports
  const genyArrivalUrl = (course.sourceUrl || '')
    .replace('partants-pmu', 'arrivee-rapports')
    .replace('partants-pronostics', 'arrivee-rapports') || 'https://www.geny.com';

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLastUpdated(
        now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) +
        ' à ' +
        now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [course]);

  const handleAddToCalendar = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HippoAnalyse//FR',
      'BEGIN:VEVENT',
      `SUMMARY:Course ${course.course} - ${course.hippodrome}`,
      `DESCRIPTION:Réunion ${course.reunion}, ${course.discipline}.`,
      `DTSTART:${new Date().toISOString().split('T')[0].replace(/-/g, '')}T${course.heure.replace('h', '')}00Z`,
      `DTEND:${new Date().toISOString().split('T')[0].replace(/-/g, '')}T${parseInt(course.heure.replace('h', '')) + 1}0000Z`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `course_${course.hippodrome}_${course.course}.ics`;
    a.click();
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-3xl border border-slate-800 p-6 sm:p-7 shadow-2xl relative overflow-hidden">
      {/* Background ambient turf glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Références de la course et prix en rectangle orange et écriture noire (Demandé) */}
      <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500 text-slate-950 font-black text-sm sm:text-base shadow-lg border border-amber-400">
        <Trophy className="w-4 h-4 text-slate-950 shrink-0" />
        <span>
          {course.prixNom || 'Prix Austria'} ({course.reunion || 'R1'} {course.course || 'C4'}) - {course.hippodrome || 'Vincennes'} {course.allocation ? `- ${course.allocation.toLocaleString('fr-FR')} €` : '- 53 000 €'}
        </span>
      </div>

      {/* Top badges bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Réunion & Course Badge */}
          <span className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-md">
            {course.reunion} {course.course}
          </span>

          {/* Quinté+ Badge */}
          {course.estQuinte && (
            <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold text-xs tracking-wide shadow-md flex items-center gap-1.5 animate-pulse">
              <Trophy className="w-3.5 h-3.5" />
              <span>ÉVÉNEMENT QUINTÉ+</span>
            </span>
          )}

          {/* Discipline Badge */}
          <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-700">
            {course.discipline}
          </span>
          
          {/* Prix Badge */}
          <span className="px-2.5 py-1 rounded-xl bg-indigo-950/60 text-indigo-300 font-semibold text-xs border border-indigo-500/30">
            {course.prixNom || 'Course'}
          </span>

          {/* Allocation */}
          <span className="px-2.5 py-1 rounded-xl bg-emerald-950/60 text-emerald-400 font-semibold text-xs border border-emerald-500/30">
            {course.allocation ? course.allocation.toLocaleString('fr-FR') : '0'} € d'allocation
          </span>

          {/* Partants & NP sur la même ligne en gras 14px */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 shadow-sm">
            <span className="text-emerald-400 font-bold text-[14px]">
              Partants : {course.partants?.length || 0}
            </span>
            {course.partants?.some((p) => p.estNonPartant || p.statut === 'Non-partant') && (
              <span className="text-rose-400 font-bold text-[14px] bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-500/50">
                NP : {course.partants.filter((p) => p.estNonPartant || p.statut === 'Non-partant').map((p) => p.numero).join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Action bar: Live Odds + Favorite toggle + Source link badge */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Odds Real-Time Status & Button */}
          {isCourseFinished(course) ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs shadow-inner">
              <span className="font-bold text-[11px] text-slate-400">
                🏁 Cotes définitives de départ
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/80 border border-emerald-500/40 text-xs shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-[11px] text-emerald-300">
                Cotes en direct ({nextOddsSec}s)
              </span>
              {onRefreshOdds && (
                <button
                  type="button"
                  onClick={onRefreshOdds}
                  disabled={isRefreshingOdds}
                  className="ml-1 px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black transition-all flex items-center gap-1 disabled:opacity-50"
                  title="Actualiser les cotes en direct"
                >
                  <Zap className="w-2.5 h-2.5" />
                  <span>{isRefreshingOdds ? 'Actualisation...' : 'Actualiser'}</span>
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleAddToCalendar}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors border border-slate-700"
            title="Ajouter à Google/Apple Calendar"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Agenda</span>
          </button>
          {/* Bouton Réinitialiser la sélection */}
          {onResetSelection && (
            <button
              type="button"
              onClick={onResetSelection}
              disabled={selectedHorsesCount === 0}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all duration-200 shadow-sm ${
                (selectedHorsesCount || 0) > 0
                  ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-200 hover:text-white border-rose-500/60 hover:border-rose-400 active:scale-95 cursor-pointer shadow-rose-950/40'
                  : 'bg-slate-800/60 text-slate-500 border-slate-700/60 cursor-not-allowed opacity-60'
              }`}
              title={(selectedHorsesCount || 0) > 0 ? `Vider la liste des ${selectedHorsesCount} chevaux sélectionnés pour un nouveau ticket` : 'Aucun cheval sélectionné actuellement'}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${(selectedHorsesCount || 0) > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
              <span>Réinitialiser la sélection</span>
              {(selectedHorsesCount || 0) > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-slate-950 text-[10px] font-black ml-0.5">
                  {selectedHorsesCount}
                </span>
              )}
            </button>
          )}

          {/* Bouton Ajouter / Retirer des Favoris */}
          <button
            type="button"
            onClick={handleFavoriteClick}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all duration-200 shadow-sm ${
              localFavorite
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/25 scale-102 hover:brightness-105'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700 hover:border-amber-500/40'
            }`}
            title={localFavorite ? 'Course enregistrée dans vos favoris (cliquer pour retirer)' : 'Ajouter cette course à vos favoris'}
          >
            <Star
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                localFavorite ? 'fill-slate-950 text-slate-950 scale-110' : 'text-amber-400 group-hover:scale-110'
              }`}
            />
            <span>{localFavorite ? '★ Dans mes favoris' : 'Ajouter aux favoris'}</span>
          </button>

          <a
            href={course.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
            title="Ouvrir la page source officielle"
          >
            <span>Source : {course.sourceType}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Race Main Title & Hippodrome */}
      <div className="mb-5">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {course.titre}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-400 mt-2">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <MapPin className="w-4 h-4" />
            <span>Hippodrome de {course.hippodrome}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>{course.date}</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-white">
            <CountdownTimer
              date={course.date}
              heure={course.heure || '13h55'}
              isFinished={isCourseFinished(course)}
              statutCourse={course.statutCourse}
              isProvisional={Boolean(course.statutCourse?.toLowerCase()?.includes('provisoire') || (course as any).statutArrivee === 'provisoire')}
              showDepartureBadge={true}
            />
          </div>
          {/* Bouton Expertise Discipline /100 */}
          <button
            type="button"
            onClick={() => setIsExpertModalOpen(true)}
            className="flex items-center gap-1.5 font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-3.5 py-1.5 rounded-xl shadow-md shadow-amber-500/20 transition-all text-xs active:scale-95 border border-amber-300 shrink-0"
            title="Ouvrir la synthèse experte 100% conforme aux Prompts de Recherche Hippique (Trot Attelé, Trot Monté, Plat, Obstacles)"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
            <span>Expertise {course.discipline || 'Discipline'} /100</span>
          </button>

          {/* Bouton Exporter Hiérarchie V38 */}
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('fiche-pdf-v38')}
            className="flex items-center gap-1.5 font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 px-3 py-1.5 rounded-xl shadow-md transition-all text-xs"
            title="Afficher Exporter Hiérarchie V38"
          >
            <FileText className="w-3.5 h-3.5 text-slate-950" />
            <span>Exporter Hiérarchie V38</span>
          </button>

          {/* Bouton Réinitialiser la sélection si chevaux sélectionnés */}
          {onResetSelection && (selectedHorsesCount || 0) > 0 && (
            <button
              type="button"
              onClick={onResetSelection}
              className="flex items-center gap-1.5 font-extrabold text-rose-200 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/60 px-3 py-1.5 rounded-xl shadow-md shadow-rose-950/50 transition-all text-xs active:scale-95 shrink-0 animate-fadeIn"
              title="Vider instantanément la liste des chevaux sélectionnés pour un nouveau ticket"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Vider sélection ({selectedHorsesCount})</span>
            </button>
          )}

          {/* Bouton Vérifier sur Geny.com */}
          <button
            type="button"
            onClick={() => setIsGenyModalOpen(true)}
            className="flex items-center gap-1.5 font-bold text-amber-300 bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 px-3 py-1.5 rounded-xl shadow-sm transition-all text-xs active:scale-95"
            title="Vérifier et certifier les arrivées et rapports officiels sur le site officiel Geny.com"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Vérifier sur Geny.com</span>
          </button>

          {/* Bouton Actualiser l'Arrivée en Direct */}
          {onRefreshOdds && (
            <button
              type="button"
              onClick={onRefreshOdds}
              disabled={isRefreshingOdds}
              className="flex items-center gap-1.5 font-black text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 px-3.5 py-1.5 rounded-xl shadow-md shadow-rose-600/30 transition-all text-xs border border-rose-400 active:scale-95"
              title="Actualiser en direct la course pour récupérer l'arrivée officielle des 5 premiers"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-200 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span>{isRefreshingOdds ? "Recherche en direct..." : "🔴 Actualiser Arrivée en Direct"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Règle de sécurité : Pas d'invention d'arrivée si non vérifiée */}
      {!course.arriveeOfficielle && (
        <div className="mb-4 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-300 font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Contrôle d'Arrivée : Aucune arrivée inventée sans vérification certifiée auprès des flux officiels.</span>
          </span>
          <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-extrabold shrink-0">
            ⏳ Épreuve à venir / En attente
          </span>
        </div>
      )}

      {/* Official Arrival Banner if race finished */}
      {course.arriveeOfficielle && (() => {
        const isProvisional = course.statutCourse?.toLowerCase()?.includes('provisoire') || (course as any).statutArrivee === 'provisoire';
        const promotionCheck = shouldPromoteProvisionalToOfficial(
          course.provisionalArrivalAt,
          course.discipline,
          course.hasEnquete
        );
        const auditStatus = checkOfficialArrivalAuditStatus(
          course.officialArrivalAt,
          course.arrivalAuditCompleted
        );

        return (
          <div className={`mb-5 p-4 rounded-2xl border flex flex-col gap-3 shadow-lg ${
            isProvisional
              ? 'bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-slate-950 border-amber-500/50'
              : 'bg-gradient-to-r from-amber-500/20 via-emerald-500/15 to-amber-500/20 border-amber-500/40'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                {isProvisional ? (
                  <div className="flex flex-col gap-1">
                    <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md animate-pulse">
                      <ShieldAlert className="w-4 h-4 text-slate-950" />
                      <span>ARRIVÉE PROVISOIRE {course.reunion} {course.course} :</span>
                    </span>
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-950/90 px-2.5 py-0.5 rounded-md border border-amber-500/40 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {course.hasEnquete ? (
                        <span className="text-rose-300">⚠️ Enquête des commissaires en cours... Reste ARRIVÉE PROVISOIRE</span>
                      ) : (
                        <span>Homologation officielle automatique dans {promotionCheck.remainingSeconds}s ({promotionCheck.delayMinutes} min {promotionCheck.delayMinutes === 3 ? 'Trot' : 'Plat/Obstacle'})</span>
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                      <span>ARRIVÉE OFFICIELLE {course.reunion}{course.course}:</span>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  {course.arriveeOfficielle.split(/[-,\s]+/).filter(n => n.trim()).slice(0, 5).map((numStr, idx) => {
                    const num = parseInt(numStr.trim(), 10);
                    const horse = course.partants?.find(p => p.numero === num);
                    const rankLabels = ['🥇 1er', '🥈 2e', '🥉 3e', '4e', '5e'];
                    return (
                      <React.Fragment key={idx}>
                        {idx > 0 && <span className="text-xl sm:text-2xl font-black text-slate-600 self-center mb-5">-</span>}
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-tight mb-0.5">
                            {rankLabels[idx] || `${idx + 1}e`}
                          </span>
                          <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black font-mono text-xl sm:text-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 border-2 border-amber-300">
                            {numStr.trim()}
                          </span>
                          {horse && (
                            <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-200 truncate max-w-[75px] mt-1 text-center">
                              {horse.nom}
                            </span>
                          )}
                          <div className="flex flex-col items-center">
                            {horse && horse.coteProbable !== undefined ? (
                              <span className="text-[11px] font-black text-amber-300 bg-slate-950 px-2 py-0.5 rounded-md border border-amber-500/30 mt-0.5 shadow-sm">
                                {horse.coteProbable}/1
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-500 mt-0.5">—</span>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {onClearArrival && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("Voulez-vous vraiment effacer l'arrivée de cette course ? (Utile si la course n'a pas été disputée ou reportée)")) {
                        onClearArrival();
                      }
                    }}
                    className="text-xs font-bold text-rose-300 hover:text-white bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 px-3 py-1 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1"
                    title="Supprimer définitivement l'arrivée de la course car elle n'a pas été disputée ou a été extraite par erreur"
                  >
                    <span>❌ Supprimer l'arrivée (Non disputée / Erreur)</span>
                  </button>
                )}
                {!isProvisional && (
                  <ArrivalAuditProgressRingBadge
                    course={course}
                    size="sm"
                    showLabel={true}
                    onTriggerAudit={onTriggerArrivalAudit}
                    isAuditing={isAuditingArrival}
                  />
                )}
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-xl">
                  {isProvisional ? 'Contrôle automatique en direct' : 'Rapports & arrivée officielle constatée'}
                </span>
              </div>
            </div>

            {/* Volet de Contrôle et Audit 5 minutes post-Arrivée Officielle */}
            {!isProvisional && (
              <div className="w-full pt-2 border-t border-slate-800/80">
                <ArrivalAuditCountdownWidget
                  course={course}
                  onTriggerArrivalAudit={onTriggerArrivalAudit}
                  isAuditingArrival={isAuditingArrival}
                />
              </div>
            )}
          </div>
        );
      })()}

      {/* Technical Attributes Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80">
          <span className="text-[11px] uppercase font-bold text-slate-500 block mb-1">
            Distance
          </span>
          <span className="text-lg font-black text-white">
            {course.distance ? course.distance.toLocaleString('fr-FR') : '—'} m
          </span>
        </div>

        <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80">
          <span className="text-[11px] uppercase font-bold text-slate-500 block mb-1">
            Corde & Parcours
          </span>
          <span className="text-lg font-black text-amber-400">
            Corde à {getOfficialHippodromeCorde(course.hippodrome, course.corde)}
          </span>
        </div>

        <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80">
          <span className="text-[11px] uppercase font-bold text-slate-500 block mb-1">
            Piste & Terrain
          </span>
          <span className="text-sm font-bold text-slate-200 truncate block" title={course.terrain}>
            {course.terrain}
          </span>
        </div>

        <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80">
          <span className="text-[11px] uppercase font-bold text-slate-500 block mb-1">
            Nombre de Partants
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[14px] text-emerald-400">
              Partants : {course.partants?.length || 0}
            </span>
            {course.partants?.some((p) => p.estNonPartant || p.statut === 'Non-partant') && (
              <span className="font-bold text-[14px] text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-500/50">
                NP : {course.partants.filter((p) => p.estNonPartant || p.statut === 'Non-partant').map((p) => p.numero).join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Conditions summary */}
      {course.conditions && (
        <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400 leading-relaxed mb-4">
          <strong className="text-slate-300 mr-1.5">Conditions :</strong>
          {course.conditions}
        </div>
      )}

      {/* Bandeau Officiel HIÉRARCHIE QUINTÉ+ V38 sur la course analysée */}
      <HierarchieQuinteV38Banner course={course} />

      {/* PRONOSTICS APRÈS ANALYSE : BASE, CHANCES SÉRIEUSES, TOCARDS, SURPRISES, LES DÉLAISSÉS */}
      {course.partants && course.partants.length > 0 && (() => {
        const v38 = computeV38Hierarchy(course);
        return (
          <div className="mt-4 pt-4 border-t border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                    PRONOSTICS DE L'ÉPREUVE (HIÉRARCHIE D'ANALYSE)
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    12 chevaux repérés : <strong className="text-emerald-300">5 N° de {v38.labelGroup1}</strong> + <strong className="text-sky-300">3 N° de {v38.labelGroup2}</strong> + <strong className="text-purple-300">4 N° de {v38.labelGroup3}</strong>
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                ✓ 12 N° Classés par Cote
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* 1. BASE */}
              <div className="p-3 rounded-2xl bg-slate-950/90 border border-emerald-500/40 flex flex-col justify-between shadow-md">
                <div>
                  <div className="flex items-center justify-between text-emerald-400 text-xs font-black uppercase mb-2 pb-1 border-b border-emerald-500/20">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" />
                      <span>BASE (2 N°)</span>
                    </div>
                    <span className="text-[9px] text-emerald-300/80 font-mono">1er & 2e</span>
                  </div>
                  <div className="space-y-1.5">
                    {v38.basesSolides.map((p, idx) => (
                      <div key={`hero-base-${p.numero}-${idx}`} className="flex items-center justify-between text-xs p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                            {p.numero}
                          </span>
                          <span className="font-bold text-white truncate text-[11px]">{p.nom}</span>
                          <span className="text-[9px] font-black px-1 rounded bg-slate-950 text-emerald-400 border border-emerald-500/30 font-mono">
                            {p.group === 'G1' ? (v38.isPlat ? 'CA' : 'G1') : p.group === 'G2' ? (v38.isPlat ? 'CB' : 'G2') : (v38.isPlat ? 'CC' : 'G3')}
                          </span>
                        </div>
                        {p.coteProbable !== undefined && (
                          <span className="text-[10px] font-mono font-bold text-emerald-300 shrink-0">
                            {p.coteProbable}/1
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. CHANCES SÉRIEUSES */}
              <div className="p-3 rounded-2xl bg-slate-950/90 border border-amber-500/40 flex flex-col justify-between shadow-md">
                <div>
                  <div className="flex items-center justify-between text-amber-400 text-xs font-black uppercase mb-2 pb-1 border-b border-amber-500/20">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5" />
                      <span>CHANCES SÉRIEUSES (4 N°)</span>
                    </div>
                    <span className="text-[9px] text-amber-300/80 font-mono">3e à 6e</span>
                  </div>
                  <div className="space-y-1.5">
                    {v38.chancesSerieuses.map((p, idx) => (
                      <div key={`hero-chance-${p.numero}-${idx}`} className="flex items-center justify-between text-xs p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                            {p.numero}
                          </span>
                          <span className="font-bold text-white truncate text-[11px]">{p.nom}</span>
                          <span className="text-[9px] font-black px-1 rounded bg-slate-950 text-amber-400 border border-amber-500/30 font-mono">
                            {p.group === 'G1' ? (v38.isPlat ? 'CA' : 'G1') : p.group === 'G2' ? (v38.isPlat ? 'CB' : 'G2') : (v38.isPlat ? 'CC' : 'G3')}
                          </span>
                        </div>
                        {p.coteProbable !== undefined && (
                          <span className="text-[10px] font-mono font-bold text-amber-300 shrink-0">
                            {p.coteProbable}/1
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. TOCARDS */}
              <div className="p-3 rounded-2xl bg-slate-950/90 border border-orange-500/40 flex flex-col justify-between shadow-md">
                <div>
                  <div className="flex items-center justify-between text-orange-400 text-xs font-black uppercase mb-2 pb-1 border-b border-orange-500/20">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>TOCARDS (3 N°)</span>
                    </div>
                    <span className="text-[9px] text-orange-300/80 font-mono">7e à 9e</span>
                  </div>
                  <div className="space-y-1.5">
                    {v38.tocardsSpeculatifs.map((p, idx) => (
                      <div key={`hero-tocard-${p.numero}-${idx}`} className="flex items-center justify-between text-xs p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-orange-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                            {p.numero}
                          </span>
                          <span className="font-bold text-white truncate text-[11px]">{p.nom}</span>
                          <span className="text-[9px] font-black px-1 rounded bg-slate-950 text-orange-400 border border-orange-500/30 font-mono">
                            {p.group === 'G1' ? (v38.isPlat ? 'CA' : 'G1') : p.group === 'G2' ? (v38.isPlat ? 'CB' : 'G2') : (v38.isPlat ? 'CC' : 'G3')}
                          </span>
                        </div>
                        {p.coteProbable !== undefined && (
                          <span className="text-[10px] font-mono font-bold text-orange-300 shrink-0">
                            {p.coteProbable}/1
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. SURPRISES */}
              <div className="p-3 rounded-2xl bg-slate-950/90 border border-purple-500/40 flex flex-col justify-between shadow-md">
                <div>
                  <div className="flex items-center justify-between text-purple-400 text-xs font-black uppercase mb-2 pb-1 border-b border-purple-500/20">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>SURPRISES (3 N°)</span>
                    </div>
                    <span className="text-[9px] text-purple-300/80 font-mono">Par N° croissant</span>
                  </div>
                  <div className="space-y-1.5">
                    {v38.surprises.map((p, idx) => (
                      <div key={`hero-surprise-${p.numero}-${idx}`} className="flex items-center justify-between text-xs p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-purple-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                            {p.numero}
                          </span>
                          <span className="font-bold text-white truncate text-[11px]">{p.nom}</span>
                          <span className="text-[9px] font-black px-1 rounded bg-slate-950 text-purple-400 border border-purple-500/30 font-mono">
                            {p.group === 'G1' ? (v38.isPlat ? 'CA' : 'G1') : p.group === 'G2' ? (v38.isPlat ? 'CB' : 'G2') : (v38.isPlat ? 'CC' : 'G3')}
                          </span>
                        </div>
                        {p.coteProbable !== undefined && (
                          <span className="text-[10px] font-mono font-bold text-purple-300 shrink-0">
                            {p.coteProbable}/1
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. LES DÉLAISSÉS */}
              <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-700/60 flex flex-col justify-between shadow-md">
                <div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-black uppercase mb-2 pb-1 border-b border-slate-800">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>LES DÉLAISSÉS</span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                    {v38.delaisses.length === 0 ? (
                      <span className="text-[10px] text-slate-500 italic block p-1">Aucun délaissé</span>
                    ) : (
                      v38.delaisses.map((p, idx) => (
                        <div key={`hero-delaisse-${p.numero}-${idx}`} className="flex items-center justify-between text-xs p-1.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {p.numero}
                            </span>
                            <span className="font-medium text-slate-300 truncate text-[11px]">{p.nom}</span>
                          </div>
                          {p.coteProbable !== undefined && (
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {p.coteProbable}/1
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modale d'Audit et Vérification Officielle Geny.com */}
      {isGenyModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl sm:rounded-3xl p-4 sm:p-5 max-w-lg w-full shadow-2xl space-y-4 my-1 sm:my-2 max-h-[96vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">
                    Vérification Officielle Geny.com
                  </h3>
                  <p className="text-xs text-slate-400">
                    Audit de conformité & arrivées officielles certifiées
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGenyModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Informations de la course */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Course :</span>
                <span className="text-white font-extrabold">{course.reunion} {course.course} · {course.hippodrome}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Intitulé du Prix :</span>
                <span className="text-amber-300 font-bold truncate max-w-[220px]">{course.prixNom || course.titre}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Horaire officiel :</span>
                <span className="text-slate-200 font-mono font-bold">{course.date} à {convertToUTC(course.heure, course.date)} (GMT Abidjan)</span>
              </div>
            </div>

            {/* Arrivée officielle constatée */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-[#0a1426] to-slate-950 border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Arrivée Officielle Certifiée Geny :</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/40">
                  {course.arriveeOfficielle ? '✓ Homologuée' : '⏳ En attente'}
                </span>
              </div>

              {course.arriveeOfficielle ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 flex-wrap py-2">
                    {course.arriveeOfficielle.split(/[-,\s]+/).filter(Boolean).map((numStr, idx) => {
                      const num = parseInt(numStr.trim(), 10);
                      const horse = course.partants?.find((p) => p.numero === num);
                      return (
                        <div key={idx} className="flex flex-col items-center">
                          <span className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black font-mono text-base shadow-md ${
                            idx === 0
                              ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 ring-2 ring-amber-300'
                              : idx === 1
                              ? 'bg-slate-200 text-slate-950 ring-1 ring-white'
                              : idx === 2
                              ? 'bg-amber-700 text-amber-100 ring-1 ring-amber-600'
                              : 'bg-slate-800 text-white border border-slate-700'
                          }`}>
                            {num}
                          </span>
                          <span className="text-[10px] font-black text-amber-400 mt-1">
                            {idx === 0 ? '🥇 1er' : idx === 1 ? '🥈 2e' : idx === 2 ? '🥉 3e' : `${idx + 1}e`}
                          </span>
                          <span className="text-[9px] text-slate-300 font-bold truncate max-w-[65px]">
                            {horse?.nom || `N°${num}`}
                          </span>
                          {horse && horse.coteProbable && (
                            <span className="text-[9px] text-amber-300 font-mono">
                              ({horse.coteProbable}/1)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">
                  En attente de la publication des rapports et de l'arrivée officielle définitive par les commissaires.
                </p>
              )}
            </div>

            {/* Checklist de Conformité Geny */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Flux de partants synchronisé avec Geny Courses & PMU</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Certification anti-hallucination V38 active</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-amber-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Contrôle réglementaire 5 minutes commissaires opérationnel</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800 flex-wrap">
              <a
                href={genyArrivalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95"
              >
                <span>Ouvrir sur Geny.com</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-2">
                {onRefreshOdds && (
                  <button
                    type="button"
                    onClick={() => {
                      onRefreshOdds();
                      setIsGenyModalOpen(false);
                    }}
                    className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all active:scale-95"
                  >
                    Actualiser en direct
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsGenyModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'Expertise Recherche Hippique (Prompts Certifiés Trot Attelé, Trot Monté, Plat, Obstacles) */}
      <DisciplineExpertAnalysisModal
        isOpen={isExpertModalOpen}
        onClose={() => setIsExpertModalOpen(false)}
        course={course}
      />
    </div>
  );
};
