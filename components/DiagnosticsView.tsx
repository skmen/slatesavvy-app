import React from 'react';
import { AppState } from '../types';
import { Activity, ShieldCheck, Target, TrendingUp, Info, AlertTriangle, BarChart2 } from 'lucide-react';
import { getContestViability, getFieldAlignment, getUpsideQuality, formatPct } from '../utils/contest';

interface Props {
  state: AppState;
}

export const DiagnosticsView: React.FC<Props> = ({ state }) => {
  const { lineups, contestState } = state;
  
  const completeLineups = lineups.filter(l => !l.missingCount || l.missingCount === 0);
  
  // Narrative Logic
  const getNarrative = () => {
    if (completeLineups.length === 0) return "No lineups analyzed yet. Upload builds to generate your Reality Check summary.";
    
    const strongCount = completeLineups.filter(l => getContestViability(l).label === 'Strong').length;
    const overAlignedCount = completeLineups.filter(l => getFieldAlignment(l).label === 'Over-Aligned').length;
    const cleanUpsideCount = completeLineups.filter(l => getUpsideQuality(l).label === 'Clean').length;
    
    const viabilityPct = (strongCount / completeLineups.length) * 100;
    const alignmentPct = (overAlignedCount / completeLineups.length) * 100;
    
    let viabilityText = viabilityPct > 50 ? "Your portfolio is highly viable for this contest" : "Your portfolio shows mixed viability";
    let alignmentText = alignmentPct > 50 ? "but is heavily aligned with the field" : "and maintains a balanced exposure to the field";
    let upsideText = cleanUpsideCount > 0 ? "Upside exists, but payout splitting risk should be monitored." : "Upside exists, though floor stability is the primary driver.";
    
    return `${viabilityText} ${alignmentText}. ${upsideText}`;
  };

  const BreakdownTile = ({ label, value, color, description }: { label: string, value: string, color: string, description: string }) => {
    const borderColors: Record<string, string> = {
      emerald: 'border-emerald-100 dark:border-emerald-900/50',
      red: 'border-red-100 dark:border-red-900/50',
      blue: 'border-blue-100 dark:border-blue-900/50',
    };
    return (
      <div className={`p-5 rounded-2xl bg-white dark:bg-charcoal-card border ${borderColors[color] || 'border-cloud-darker dark:border-charcoal'} shadow-sm`}>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-[10px] text-gray-500 mt-2 leading-relaxed">{description}</div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-2">
      <header className="flex items-center gap-3">
         <BarChart2 className="w-8 h-8 text-brand" />
         <div>
            <h2 className="text-2xl font-bold">Reality Check Report</h2>
            <p className="text-sm text-gray-500">Portfolio analysis based on {completeLineups.length} complete builds.</p>
         </div>
      </header>

      {/* Narrative Summary */}
      <section className="bg-brand-light dark:bg-brand/10 p-6 rounded-3xl border border-brand/20 shadow-sm">
        <h3 className="text-xs font-bold text-brand uppercase tracking-widest mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Portfolio Reality Summary
        </h3>
        <p className="text-lg font-medium leading-relaxed text-cloud-text dark:text-white">
          {getNarrative()}
        </p>
      </section>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <BreakdownTile 
          label="Strong Viability" 
          value={formatPct(completeLineups.length > 0 ? completeLineups.filter(l => getContestViability(l).label === 'Strong').length / completeLineups.length : 0, 0)} 
          color="emerald"
          description="Percentage of lineups showing high sim-win probability in this payout structure."
        />
        <BreakdownTile 
          label="Over-Aligned" 
          value={formatPct(completeLineups.length > 0 ? completeLineups.filter(l => getFieldAlignment(l).label === 'Over-Aligned').length / completeLineups.length : 0, 0)} 
          color="red"
          description="Builds that mirror common field patterns and face higher payout splitting risk."
        />
        <BreakdownTile 
          label="Clean Upside" 
          value={formatPct(completeLineups.length > 0 ? completeLineups.filter(l => getUpsideQuality(l).label === 'Clean').length / completeLineups.length : 0, 0)} 
          color="blue"
          description="Lineups with high ceiling-to-projection ratios and unique stack pathways."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contest Context */}
        <section className="bg-white dark:bg-charcoal-card p-6 rounded-2xl border border-cloud-darker dark:border-charcoal space-y-4">
           <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
             <Target className="w-4 h-4" /> Contest Context
           </h3>
           {contestState ? (
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                <p>
                  This <span className="font-bold text-cloud-text dark:text-white">{contestState.input.contestName}</span> slate features 
                  a field of <span className="font-bold text-cloud-text dark:text-white">{contestState.input.fieldSize.toLocaleString()}</span> entries.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-cloud dark:bg-charcoal p-3 rounded-xl border border-cloud-darker dark:border-charcoal">
                    <div className="text-[9px] font-bold text-gray-400 uppercase">Rake</div>
                    <div className="text-sm font-bold text-red-500">{formatPct(contestState.derived.rakePct)}</div>
                  </div>
                  <div className="bg-cloud dark:bg-charcoal p-3 rounded-xl border border-cloud-darker dark:border-charcoal">
                    <div className="text-[9px] font-bold text-gray-400 uppercase">Paid Places</div>
                    <div className="text-sm font-bold text-emerald-500">{contestState.derived.estimatedPaidPlaces.toLocaleString()}</div>
                  </div>
                </div>
                <p className="italic text-xs leading-relaxed text-gray-400">
                  Large field GPPs like this demand ceiling-first builds and strategic differentiation to combat the 
                  {formatPct(contestState.derived.rakePct)} house edge.
                </p>
              </div>
           ) : (
              <div className="p-8 text-center text-gray-400 italic">No contest data active.</div>
           )}
        </section>

        {/* Actionable Guidance */}
        <section className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-200 dark:border-amber-900/50 space-y-4">
           <h3 className="font-bold text-sm uppercase tracking-widest text-amber-800 dark:text-amber-400 flex items-center gap-2">
             <AlertTriangle className="w-4 h-4" /> Actionable Guidance
           </h3>
           <div className="text-sm leading-relaxed text-amber-900 dark:text-amber-200">
             {contestState && contestState.input.fieldSize > 5000 ? (
               <p>
                 For this contest size, consider reducing duplication risk and increasing ceiling exposure across your remaining entries. 
                 The "Over-Aligned" builds should be scrutinized for potential pivot plays in FLEX spots.
               </p>
             ) : (
               <p>
                 Smaller fields prioritize projectable volume. Focus on your "Strong Viability" builds and ensure you aren't 
                 over-extending into low-floor contrarian plays where variance outweighs potential ROI.
               </p>
             )}
           </div>
           <div className="pt-4 border-t border-amber-200/50 dark:border-amber-900/30 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] text-amber-700/70 dark:text-amber-400/50 font-medium">Analysis updated {new Date().toLocaleTimeString()}</span>
           </div>
        </section>
      </div>
    </div>
  );
};