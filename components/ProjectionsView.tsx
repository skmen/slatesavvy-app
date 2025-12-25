import React, { useState, useMemo } from 'react';
import { Player, ContestState } from '../types';
import { Search, ArrowUp, ArrowDown, Trophy, Users, Upload, X, ChevronRight, Scale, Info } from 'lucide-react';

interface Props {
  players: Player[];
  referencePlayers?: Player[];
  contestState?: ContestState;
  beliefName?: string;
  onBeliefUpload: (files: File[]) => void;
}

type SortField = 'salary' | 'projection' | 'ownership' | 'value' | 'ceiling';
type SortDir = 'asc' | 'desc';

export const ProjectionsView: React.FC<Props> = ({ players, referencePlayers, contestState, beliefName, onBeliefUpload }) => {
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('projection');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const selectedPlayer = useMemo(() => players.find(p => p.id === selectedPlayerId), [players, selectedPlayerId]);
  const refMatch = useMemo(() => {
    if (!selectedPlayer || !referencePlayers) return null;
    return referencePlayers.find(rp => rp.id === selectedPlayer.id) || 
           referencePlayers.find(rp => rp.name.toLowerCase() === selectedPlayer.name.toLowerCase() && rp.team === selectedPlayer.team);
  }, [selectedPlayer, referencePlayers]);

  const positions = useMemo(() => {
    const s = new Set<string>(['ALL']);
    players.forEach(p => s.add(p.position));
    return Array.from(s).sort();
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.team.toLowerCase().includes(search.toLowerCase());
      const matchPos = posFilter === 'ALL' || p.position === posFilter;
      return matchSearch && matchPos;
    }).sort((a, b) => {
      const valA = a[sortField] || 0;
      const valB = b[sortField] || 0;
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
  }, [players, search, posFilter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const DeltaRow = ({ label, belief, ref, suffix = "" }: { label: string, belief: number, ref: number | undefined, suffix?: string }) => {
    if (ref === undefined) return null;
    const delta = belief - ref;
    const isHigh = delta > 0.01;
    const isLow = delta < -0.01;
    return (
      <div className="flex flex-col gap-1 p-3 rounded-lg bg-cloud dark:bg-charcoal/50">
        <div className="flex justify-between text-xs font-bold uppercase text-gray-400">
            <span>{label}</span>
            <span className={`${isHigh ? 'text-emerald-500' : isLow ? 'text-amber-500' : 'text-gray-400'}`}>
                {isHigh ? `+${delta.toFixed(1)}${suffix}` : isLow ? `${delta.toFixed(1)}${suffix}` : '--'}
            </span>
        </div>
        <div className="flex justify-between items-end">
            <div className="text-lg font-bold">{belief.toFixed(1)}{suffix}</div>
            <div className="text-xs text-gray-500">Ref: {ref.toFixed(1)}{suffix}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative space-y-4 pb-24">
      <div className="bg-white dark:bg-charcoal-card p-4 rounded-2xl shadow-sm border border-cloud-darker dark:border-charcoal-card sticky top-0 z-10 space-y-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold flex items-center gap-2">
                Belief Profile <Scale className="w-4 h-4 text-brand" />
            </h2>
            <span className="text-xs text-gray-500">{beliefName || 'Using SlateSavvy Reference Data'}</span>
          </div>
          <div className="flex gap-4 flex-1 justify-end">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search player or team..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-lg border border-cloud-darker dark:border-gray-600 bg-cloud dark:bg-charcoal focus:ring-2 focus:ring-brand outline-none transition-all dark:text-white" />
              </div>
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-cloud dark:bg-charcoal border border-cloud-darker dark:border-gray-600 rounded-lg text-sm font-bold hover:bg-gray-100 dark:hover:bg-charcoal/80 transition-all">
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Swap Beliefs</span>
                  <input type="file" className="hidden" accept=".csv" onChange={(e) => e.target.files && onBeliefUpload(Array.from(e.target.files))} />
              </label>
          </div>
        </div>

        <div className="bg-brand-light dark:bg-brand/10 p-3 rounded-xl flex items-start gap-3 border border-brand/10">
          <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
          <p className="text-xs text-brand-hover dark:text-brand-light leading-relaxed">
            <strong>Belief Profile</strong> represents your uploaded projections. <strong>Reference Pack</strong> is the SlateSavvy baseline calibrated for slate structure and contest context. Use it to spot where your beliefs differ materially.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {positions.map(pos => (
            <button key={pos} onClick={() => setPosFilter(pos)} className={`px-4 py-2 rounded-full text-xs font-bold uppercase whitespace-nowrap transition-colors ${posFilter === pos ? 'bg-brand text-white' : 'bg-cloud dark:bg-charcoal text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-charcoal/80'}`}>{pos}</button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-charcoal-card rounded-2xl shadow-sm overflow-hidden border border-cloud-darker dark:border-charcoal-card">
          <table className="w-full text-left text-sm">
              <thead className="bg-cloud dark:bg-charcoal text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                      <th className="p-4">Player</th>
                      <th className="p-4">Pos</th>
                      <th className="p-4 cursor-pointer hover:text-brand" onClick={() => handleSort('salary')}>Salary</th>
                      <th className="p-4 cursor-pointer hover:text-brand font-bold" onClick={() => handleSort('projection')}>Belief Proj</th>
                      <th className="p-4 cursor-pointer hover:text-brand" onClick={() => handleSort('ownership')}>Own%</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-cloud-darker dark:divide-charcoal">
                  {filteredPlayers.map(p => (
                  <tr key={p.id} onClick={() => setSelectedPlayerId(p.id)} className={`cursor-pointer transition-colors ${selectedPlayerId === p.id ? 'bg-brand-light dark:bg-brand/20' : 'hover:bg-cloud dark:hover:bg-charcoal/50'}`}>
                      <td className="p-4 font-medium text-cloud-text dark:text-white">
                          <div className="font-bold">{p.name}</div>
                          <div className="text-xs text-gray-400">{p.team}</div>
                      </td>
                      <td className="p-4"><span className="px-2 py-1 rounded bg-cloud dark:bg-charcoal text-xs font-bold">{p.position}</span></td>
                      <td className="p-4">${p.salary.toLocaleString()}</td>
                      <td className="p-4 font-bold text-brand">{p.projection.toFixed(1)}</td>
                      <td className="p-4 text-gray-400">{p.ownership?.toFixed(1)}%</td>
                  </tr>
                  ))}
              </tbody>
          </table>
      </div>

      {selectedPlayer && (
          <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-charcoal-card shadow-2xl z-[60] border-l border-cloud-darker dark:border-charcoal-card flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-6 border-b border-cloud-darker dark:border-charcoal flex justify-between items-center">
                  <div>
                      <h3 className="text-xl font-bold">{selectedPlayer.name}</h3>
                      <p className="text-sm text-gray-500">{selectedPlayer.position} • {selectedPlayer.team}</p>
                  </div>
                  <button onClick={() => setSelectedPlayerId(null)} className="p-2 hover:bg-cloud dark:hover:bg-charcoal rounded-full"><X className="w-6 h-6" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase text-gray-400 tracking-widest">Belief vs Reference</h4>
                      <DeltaRow label="Projection" belief={selectedPlayer.projection} ref={refMatch?.projection} />
                      <DeltaRow label="Ownership" belief={selectedPlayer.ownership || 0} ref={refMatch?.ownership} suffix="%" />
                      <DeltaRow label="Value (x)" belief={selectedPlayer.value || 0} ref={refMatch?.value} />
                  </div>
                  <div className="p-4 bg-brand-light dark:bg-brand/10 rounded-xl space-y-3">
                      <div className="flex justify-between text-xs">
                          <span className="text-brand-hover dark:text-brand-light font-bold">Player Metrics</span>
                          <span className="text-gray-500 font-mono">ID: {selectedPlayer.id}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><div className="text-xs text-gray-400 uppercase font-bold mb-1">Salary</div><div className="font-bold">${selectedPlayer.salary.toLocaleString()}</div></div>
                          <div><div className="text-xs text-gray-400 uppercase font-bold mb-1">Opponent</div><div className="font-bold">{selectedPlayer.opponent || '--'}</div></div>
                      </div>
                  </div>
                  {!beliefName && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                          Comparison relies on uploaded Belief Profile. Currently using Reference Pack for both sides.
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};