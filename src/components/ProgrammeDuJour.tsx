import React, { useState } from 'react';
import { Calendar, ExternalLink, RotateCcw } from 'lucide-react';

export const ProgrammeDuJour: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [programData, setProgramData] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const fetchProgram = async () => {
    setLoading(true);
    const date = new Date().toISOString().split('T')[0];
    try {
      // NOTE: This will require a server-side proxy endpoint in server.ts
      const response = await fetch(`/api/geny-program?date=${date}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setProgramData(JSON.stringify(data));
    } catch (error) {
      console.error('Error fetching program:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-lg mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            Programme du Jour
          </h3>
        </div>
        <div className="flex items-center gap-2">
            <input
                type="text"
                placeholder="Filtrer par hippodrome..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
            />
            <button 
                onClick={fetchProgram}
                disabled={loading}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
                <RotateCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
            </button>
            <a 
            href={`https://www.geny.com/programme/${new Date().toISOString().split('T')[0]}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
            Geny <ExternalLink className="w-3 h-3" />
            </a>
        </div>
      </div>
      <div className="text-slate-400 text-xs p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
        {loading ? "Chargement en cours..." : programData ? "Programme mis à jour." : "Cliquez sur Actualiser pour charger le programme du jour."}
      </div>
    </div>
  );
};
