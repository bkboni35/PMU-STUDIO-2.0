import React from 'react';
import { Trophy, Calendar, Hash, Star } from 'lucide-react';
import { CourseHippique } from '../types/turf';
import { toggleFavoriteRace as toggleFavorite, isCourseFavorite as isFavorite } from '../utils/favoritesStorage';

interface Props {
  race: CourseHippique;
}

export const DerniersResultatsQuinte: React.FC<Props> = ({ race }) => {
  const [favorite, setFavorite] = React.useState(isFavorite(race));

  const handleToggle = () => {
    toggleFavorite(race);
    setFavorite(isFavorite(race));
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-lg mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
            <Trophy className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
            Dernier Résultat Quinté+
            </h3>
        </div>
        <button
            onClick={handleToggle}
            className={`p-2 rounded-xl transition-colors ${favorite ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400 hover:text-amber-400'}`}
            title={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
            <Star className={`w-5 h-5 ${favorite ? 'fill-current' : ''}`} />
        </button>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <Hash className="w-3 h-3" />
            {race.reunion} {race.course}
          </span>
          <span className="text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {race.date}
          </span>
        </div>
        <h4 className="text-white font-bold text-sm truncate">{race.titre}</h4>
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-center gap-3 flex-wrap">
            {race.arriveeOfficielle?.split(/[-,\s]+/).filter(n => n.trim()).slice(0, 5).map((nStr, i) => {
                const num = parseInt(nStr.trim(), 10);
                const horse = race.partants?.find(p => p.numero === num);
                const ranks = ['🥇 1er', '🥈 2e', '🥉 3e', '4e', '5e'];
                return (
                    <React.Fragment key={i}>
                        {i > 0 && <span className="text-slate-600 font-black self-center mb-5 text-lg">-</span>}
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-extrabold text-amber-400 uppercase mb-0.5 tracking-tight">
                              {ranks[i] || `${i + 1}e`}
                            </span>
                            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-base shadow-lg shadow-amber-500/20 border border-amber-300">
                                {nStr.trim()}
                            </span>
                            {horse && (
                              <span className="text-[10px] font-extrabold text-slate-300 max-w-[65px] truncate mt-1 text-center">
                                {horse.nom}
                              </span>
                            )}
                            <div className="flex flex-col items-center">
                                {horse && horse.coteProbable !== undefined ? (
                                    <span className="text-[10px] font-black text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded border border-amber-500/30 mt-0.5">
                                        {horse.coteProbable}/1
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-600 mt-0.5">—</span>
                                )}
                            </div>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
      </div>
    </div>
  );
};
