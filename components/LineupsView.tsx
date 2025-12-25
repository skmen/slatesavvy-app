
import React, { useState } from 'react';
import { Lineup, ContestState, Player, SlateStats, GameInfo } from '../types';
import { Copy, CheckCircle, RefreshCw, ChevronDown, ChevronUp, Settings, X, PlusCircle, Info, AlertTriangle } from 'lucide-react';
import { assignDraftKingsSlots, getContestViability, getFieldAlignment, getUpsideQuality, DEFAULT_CONTEST } from '../utils/contest';
import { ContestForm } from './ContestForm';
import { ContestSummary } from './ContestSummary';

interface Props {
  lineups: Lineup[];
  contestState?: ContestState;
  onLineupUpload: (files: File[]) => void;
  onContestChange: (input: any) => void;
  hasAutoLoadedReferencePack?: boolean;
  referencePackPath?: string;
  referenceMeta?: any;
  slateStats?: SlateStats;
  games?: GameInfo[];
}

const DK_NBA_SLOTS = ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL'];

export const LineupsView: React.FC<Props> = ({ 
  lineups, 
  contestState, 
  onLineupUpload, 
  onContestChange,
  hasAutoLoadedReferencePack,
  referencePackPath,
  referenceMeta,
  slateStats,
  games
}) => {
  const [activeSet, setActiveSet] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedLineups, setExpandedLineups] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(!contestState || contestState.input.fieldSize === 0);

  const uniqueSets = ['All', ...Array.from(new Set(lineups.map(l => l.set))).filter(Boolean)];
  const filteredLineups = activeSet === 'All' 
    ? lineups 
    : lineups.filter(l => l.set === activeSet);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onLineupUpload([file]);
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedLineups);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedLineups(next);
  };

  const SignalChip = ({ label, color, icon, tooltip }: { label: string, color: string, icon?: string, tooltip: string }) => {
    const bgColors: Record<string, string> = {
      emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    };
    return (
      <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${bgColors[color]}`} title={tooltip}>
        {icon && <span>{icon}</span>}
        {label}
      </div>
    );
  };

  const LineupRow: React.FC<{ lineup: Lineup, index: number }> = ({ lineup, index }) => {
    const isExpanded = expandedLineups.has(lineup.id);
    const viability = getContestViability(lineup);
    const alignment = getFieldAlignment(lineup);
    const upside = getUpsideQuality(lineup);
    const isComplete = (lineup.players?.length || 0) === 8;
    const { slotMap } = isComplete ? assignDraftKingsSlots(lineup.players || []) : { slotMap: {} };

    return (
      <div className={`border-b border-cloud-darker dark:border-charcoal last:border-0 transition-all ${isExpanded ? 'bg-cloud/30 dark:bg-charcoal/50' : 'hover:bg-cloud/20 dark:hover:bg-charcoal/30'}`}>
        <div 
          className="flex flex-col sm:flex-row sm:items-center p-4 cursor-pointer select-none gap-4"
          onClick={() => toggleExpand(lineup.id)}
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="w-8 text-xs font-mono text-gray-400">#{lineup.lineupIdRaw || index + 1}</div>
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2">
                  <span className="font-bold text-sm truncate">
                    {lineup.missingCount === 8 || (lineup.playerIds.length > 0 && (lineup.players?.length || 0) === 0)
                      ? 'Unmapped Roster' 
                      : (lineup.missingCount || 0) > 0 
                        ? `Partially Mapped (${lineup.players?.length || 0}/8)` 
                        : (lineup.players && lineup.players.length > 0)
                          ? lineup.players.slice(0, 3).map(p => p.name.split(' ').pop()).join(', ') + '...'
                          : 'Empty Lineup'}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">${(lineup.totalSalary/1000).toFixed(1)}k • {lineup.totalProjection.toFixed(1)} pts</span>
               </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <SignalChip 
              label={viability.label} 
              color={viability.color} 
              icon={viability.icon} 
              tooltip="Contest Viability: Based on simulated outcomes against a realistic field and this contest’s payout structure."
            />
            <SignalChip 
              label={alignment.label} 
              color={alignment.color} 
              tooltip="Field Alignment: Measures how concentrated this lineup is in popular plays relative to expected field behavior."
            />
            <SignalChip 
              label={upside.label} 
              color={upside.color} 
              tooltip="Upside Quality: Evaluates ceiling strength and how likely payouts would be split if this lineup succeeds."
            />
          </div>
          <div className="hidden sm:block w-6">
            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-6 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-4">
                  <div>
                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Signal Diagnosis</h5>
                    <div className="bg-white dark:bg-charcoal-card p-4 rounded-xl border border-cloud-darker dark:border-charcoal shadow-sm space-y-3">
                      <div className="text-xs space-y-2 text-gray-600 dark:text-gray-300">
                        {(lineup.missingCount && lineup.missingCount > 0) || (lineup.playerIds.length > 0 && (lineup.players?.length || 0) < lineup.playerIds.length) ? (
                          <p className="flex gap-2 text-amber-600 dark:text-amber-400 font-bold"><Info className="w-3.5 h-3.5 shrink-0" /> Missing player mappings. Signals are unavailable for incomplete rosters.</p>
                        ) : null}
                        {viability.label === 'Strong' && <p className="flex gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Simulation shows positive expectation in this prize structure.</p>}
                        {viability.label === 'Unlikely' && <p className="flex gap-2"><X className="w-3.5 h-3.5 text-red-500 shrink-0" /> Build struggles to reach profitable win frequency in current field model.</p>}
                        
                        {alignment.label === 'Over-Aligned' && <p className="flex gap-2">⚠️ High concentration of popular plays increases duplication risk.</p>}
                        {alignment.label === 'Contrarian' && <p className="flex gap-2">✨ Unique build paths reduce payout splitting risk.</p>}
                        
                        {upside.label === 'Clean' && <p className="flex gap-2">🎯 High-ceiling combinations identified in core positions.</p>}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Roster Mapping</h5>
                    <div className="bg-white dark:bg-charcoal-card rounded-xl border border-cloud-darker dark:border-charcoal overflow-hidden shadow-sm">
                        {DK_NBA_SLOTS.map((slot) => {
                          const p = slotMap[slot];
                          return (
                            <div key={slot} className="flex items-center justify-between p-2 px-3 border-b border-cloud-darker dark:border-charcoal last:border-0 text-xs">
                               <div className="flex items-center gap-3 overflow-hidden">
                                  <span className="w-8 font-mono font-bold text-gray-400 uppercase">{slot}</span>
                                  <span className="truncate font-medium">{p ? p.name : 'Unknown'}</span>
                               </div>
                               <div className="flex gap-4 shrink-0">
                                  <span className="text-gray-400 w-12 text-right">{p?.salary ? `$${(p.salary/1000).toFixed(1)}k` : '—'}</span>
                                  <span className="font-bold w-10 text-right">{p?.projection.toFixed(1) || '—'}</span>
                               </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                   <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-[10px] font-bold text-brand uppercase tracking-widest">SlateSavvy Baseline</h5>
                        <div className="px-2 py-0.5 bg-brand-light dark:bg-brand/10 text-brand text-[9px] font-bold rounded">SIMULATED VS REALISTIC FIELD</div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-white dark:bg-charcoal-card rounded-xl border border-cloud-darker dark:border-charcoal">
                           <div className="text-[9px] text-gray-400 font-bold uppercase mb-1">Expected Profit</div>
                           <div className="text-sm font-bold">{lineup.simEV !== undefined ? `$${lineup.simEV.toFixed(2)}` : '—'}</div>
                        </div>
                        <div className="p-3 bg-white dark:bg-charcoal-card rounded-xl border border-cloud-darker dark:border-charcoal">
                           <div className="text-[9px] text-gray-400 font-bold uppercase mb-1">Expected ROI</div>
                           <div className="text-sm font-bold">{(lineup.simROI ?? 0).toFixed(1)}%</div>
                        </div>
                        <div className="p-3 bg-white dark:bg-charcoal-card rounded-xl border border-cloud-darker dark:border-charcoal">
                           <div className="text-[9px] text-gray-400 font-bold uppercase mb-1">Cash Rate</div>
                           <div className="text-sm font-bold">{(lineup.cashPct ?? 0).toFixed(1)}%</div>
                        </div>
                        <div className="p-3 bg-white dark:bg-charcoal-card rounded-xl border border-cloud-darker dark:border-charcoal">
                           <div className="text-[9px] text-gray-400 font-bold uppercase mb-1">Top Rate</div>
                           <div className="text-sm font-bold">{(lineup.top10Pct ?? 0).toFixed(1)}%</div>
                        </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100/50 dark:border-emerald-900/50 space-y-3">
                        <h5 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Field Concentration</h5>
                        <div className="flex justify-between items-center text-xs">
                           <span className="text-gray-500 font-medium">Total Ownership</span>
                           <span className="font-bold">{lineup.totalOwnership !== undefined && lineup.totalOwnership > 0 ? `${Math.round(lineup.totalOwnership)}%` : '—'}</span>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100/50 dark:border-blue-900/50 space-y-3">
                        <h5 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Upside Contribution</h5>
                        <div className="flex justify-between items-center text-xs">
                           <span className="text-gray-500 font-medium">Lineup Ceiling</span>
                           <span className="font-bold">{lineup.totalCeiling !== undefined && lineup.totalCeiling > 0 ? Math.round(lineup.totalCeiling) : '—'}</span>
                        </div>
                      </div>
                   </div>

                   <div className="flex justify-end gap-2 pt-2">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-cloud dark:bg-charcoal hover:bg-gray-200 dark:hover:bg-charcoal-card rounded-lg text-xs font-bold transition-all border border-cloud-darker dark:border-charcoal" onClick={() => {
                        const ids = lineup.playerIds.join(',');
                        navigator.clipboard.writeText(ids);
                        setCopiedId(lineup.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}>
                         {copiedId === lineup.id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                         {copiedId === lineup.id ? 'Copied' : 'Copy IDs'}
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-4 pb-24">
        {contestState && (
          <ContestSummary 
            input={contestState.input} 
            derived={contestState.derived} 
            slateStats={slateStats}
            hasAutoLoadedReferencePack={hasAutoLoadedReferencePack}
            referencePackPath={referencePackPath}
            referenceMeta={referenceMeta}
            games={games}
          />
        )}
        
        {(!lineups.some(l => (l.players?.length || 0) > 0) && lineups.length > 0) && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 p-4 rounded-xl flex items-start gap-3">
             <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
             <div className="text-sm text-red-800 dark:text-red-200">
                <p className="font-bold mb-1">Roster Mapping Critical</p>
                <p>Could not map any players from the uploaded CSV to the active reference pack. Ensure the correct pipeline JSON is loaded.</p>
             </div>
          </div>
        )}

        <div className="flex justify-between items-center px-1">
           <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold">Reality Check</h2>
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-charcoal-card border border-cloud-darker dark:border-charcoal rounded-lg text-xs font-bold hover:bg-gray-50 dark:hover:bg-charcoal transition-all"
              >
                <Settings className="w-3.5 h-3.5 text-brand" />
                Contest Setup
              </button>
           </div>
        </div>

        {lineups.length === 0 ? (
           <div className="bg-white dark:bg-charcoal-card rounded-2xl p-16 text-center border-2 border-dashed border-cloud-darker dark:border-charcoal">
              <div className="bg-brand-light dark:bg-brand/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <PlusCircle className="w-8 h-8 text-brand" />
              </div>
              <h3 className="text-xl font-bold mb-2">Ready for Reality Check</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">Upload an optimizer CSV or a list of lineups to start your analysis.</p>
              <label className="cursor-pointer bg-brand hover:bg-brand-hover text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg inline-block">
                  Upload Lineups CSV
                  <input type="file" className="hidden" accept=".csv" onChange={handleUpload} />
              </label>
           </div>
        ) : (
          <div className="bg-white dark:bg-charcoal-card rounded-xl shadow-sm border border-cloud-darker dark:border-charcoal overflow-hidden">
             <div className="bg-cloud/50 dark:bg-charcoal/50 p-4 border-b border-cloud-darker dark:border-charcoal flex items-center justify-between">
                <div className="flex gap-2">
                  {uniqueSets.map(set => (
                    <button key={set} onClick={() => setActiveSet(set)} className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${activeSet === set ? 'bg-brand text-white' : 'bg-white dark:bg-charcoal border border-cloud-darker dark:border-charcoal text-gray-500'}`}>{set}</button>
                  ))}
                </div>
                <label className="text-[10px] font-bold uppercase text-brand hover:text-brand-hover cursor-pointer flex items-center gap-1">
                   <RefreshCw className="w-3 h-3" /> Swap File
                   <input type="file" className="hidden" accept=".csv" onChange={handleUpload} />
                </label>
             </div>
             <div className="divide-y divide-cloud-darker dark:divide-charcoal">
                {filteredLineups.map((l, i) => <LineupRow key={l.id} lineup={l} index={i} />)}
             </div>
          </div>
        )}
      </div>

      {isSidebarOpen && (
        <div className="w-full lg:w-80 shrink-0">
          <div className="sticky top-24">
            <ContestForm 
              input={contestState?.input || DEFAULT_CONTEST} 
              onChange={onContestChange} 
              onClose={() => setIsSidebarOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
