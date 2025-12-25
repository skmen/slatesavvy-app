
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UploadCloud, FileText, BarChart2, Users, Activity, Sun, Moon, Database, Check, RefreshCw, Layers, AlertTriangle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { AppState, ViewState, Player, Lineup, ContestInput, ContestDerived } from './types';
import { parseProjections, parsePipelineJson, parseOptimizerLineups, parseUserLineupsRows, parseOptimizerLineupsFromText } from './utils/csvParser';
import { ProjectionsView } from './components/ProjectionsView';
import { LineupsView } from './components/LineupsView';
import { DiagnosticsView } from './components/DiagnosticsView';
import { ContestSummary } from './components/ContestSummary';
import { deriveContest, DEFAULT_CONTEST, deriveGamesFromPlayers, recomputeLineupDisplay } from './utils/contest';
import { saveContestInput, loadContestInput, hasDismissedOnboarding, dismissOnboarding, saveBeliefs, loadBeliefs } from './utils/storage';
import { autoLoadReferencePack } from './utils/assetLoader';

const INITIAL_STATE: AppState = {
  players: [],
  lineups: [],
  slateStats: { totalPlayers: 0, totalLineups: 0, missingSalaryCount: 0, warnings: [] },
  lastUpdated: 0,
  hasAutoLoadedReferencePack: false
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [view, setView] = useState<ViewState>(ViewState.LINEUPS);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [contestInput, setContestInput] = useState<ContestInput>(DEFAULT_CONTEST);

  const getLocalDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      console.log('🚀 Initializing SlateSavvy App...');
      
      const savedContest = loadContestInput();
      const savedBeliefs = loadBeliefs();
      
      const loadResult = await autoLoadReferencePack({
        dateStrings: [getLocalDateStr(new Date())],
        defaultName: 'pipeline_2025-12-20'
      });

      if (loadResult.ok && loadResult.json) {
        console.group('📊 Pipeline Hydration Summary');
        const refData = parsePipelineJson(loadResult.json);
        const refPlayers = refData.referencePlayers || [];
        let finalLineups = refData.referenceLineups || [];
        
        console.log(`Players Loaded: ${refPlayers.length}`);
        console.log(`Lineups Loaded: ${finalLineups.length}`);

        if (refData.files?.optimized_lineups) {
           console.log(`Attempting sidecar hydration: ${refData.files.optimized_lineups}`);
           try {
             const csvUrl = new URL(refData.files.optimized_lineups, loadResult.loadedFrom).href;
             const csvRes = await fetch(csvUrl, { cache: 'no-store' });
             if (csvRes.ok) {
                const text = await csvRes.text();
                const csvLineups = parseOptimizerLineupsFromText(text, refPlayers, 'reference');
                if (csvLineups.length > 0) {
                    console.log(`✅ SUCCESS: Overwrote JSON lineups with ${csvLineups.length} entries from CSV.`);
                    finalLineups = csvLineups;
                }
             }
           } catch (e) { 
               console.warn("Sidecar CSV fetch failed. Falling back to JSON source."); 
           }
        }
        console.groupEnd();

        setState(prev => {
          const activePool = (savedBeliefs?.players && savedBeliefs.players.length > 0) ? savedBeliefs.players : refPlayers;
          const games = deriveGamesFromPlayers(refPlayers.length > 0 ? refPlayers : activePool);
          return {
            ...prev,
            referencePlayers: refPlayers,
            referenceMeta: refData.meta,
            referenceDiagnostics: refData.diagnostics,
            referenceLineups: finalLineups,
            referencePackPath: loadResult.loadedFrom,
            beliefPlayers: savedBeliefs?.players || undefined,
            activeBeliefProfileName: savedBeliefs?.name || undefined,
            players: activePool,
            lineups: finalLineups,
            contestState: refData.contestState || prev.contestState,
            games,
            hasAutoLoadedReferencePack: true,
            lastUpdated: Date.now(),
            slateStats: {
              ...prev.slateStats,
              totalPlayers: refPlayers.length,
              totalLineups: finalLineups.length,
              warnings: prev.slateStats.warnings.filter(w => !w.includes('Auto-load'))
            }
          };
        });

        if (refData.contestState) setContestInput(refData.contestState.input);
        else if (savedContest) setContestInput(savedContest);
      } else {
        setState(prev => ({
          ...prev,
          slateStats: {
            ...prev.slateStats,
            warnings: [...prev.slateStats.warnings, `Auto-load failed. Open Console (F12) to see path resolution diagnostics.`]
          }
        }));
        if (savedContest) setContestInput(savedContest);
      }
      
      if (!hasDismissedOnboarding()) setShowOnboarding(true);
      setLoading(false);
    };

    initApp();
  }, []);

  useEffect(() => { saveContestInput(contestInput); }, [contestInput]);

  const handleDismissOnboarding = () => {
    dismissOnboarding();
    setShowOnboarding(false);
  };

  const contestDerived: ContestDerived = useMemo(() => deriveContest(contestInput), [contestInput]);
  const contestState = { input: contestInput, derived: contestDerived };

  const computedLineups = useMemo(
    () => recomputeLineupDisplay(state.lineups, contestState, state.referencePlayers),
    [state.lineups, state.referencePlayers, contestInput]
  );

  useEffect(() => {
    const initialTheme = (localStorage.getItem('theme') as 'light' | 'dark' | null) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const onDropMain = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const refData = parsePipelineJson(content);
        const refPlayers = refData.referencePlayers || [];
        setState(prev => ({
          ...prev,
          referencePlayers: refPlayers,
          referenceMeta: refData.meta,
          referenceDiagnostics: refData.diagnostics,
          referenceLineups: refData.referenceLineups,
          referencePackPath: file.name,
          players: prev.beliefPlayers || refPlayers,
          lineups: refData.referenceLineups || [],
          contestState: refData.contestState || prev.contestState,
          games: deriveGamesFromPlayers(refPlayers),
          hasAutoLoadedReferencePack: true,
          lastUpdated: Date.now(),
          slateStats: { ...prev.slateStats, totalPlayers: refPlayers.length, totalLineups: (refData.referenceLineups || []).length, warnings: prev.slateStats.warnings.filter(w => !w.includes('Auto-load')) }
        }));
        if (refData.contestState) setContestInput(refData.contestState.input);
      } catch (err) { alert("Failed to parse pipeline JSON."); }
      setLoading(false);
    };
    reader.readAsText(file);
  }, []);

  const onBeliefUpload = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setLoading(true);
    try {
      const newBeliefPlayers = await parseProjections(file);
      saveBeliefs(newBeliefPlayers, file.name);
      setState(prev => ({ ...prev, beliefPlayers: newBeliefPlayers, players: newBeliefPlayers, activeBeliefProfileName: file.name, lastUpdated: Date.now() }));
    } catch (e) { alert("Failed to parse belief projections."); }
    setLoading(false);
  }, []);

  const onLineupUpload = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setLoading(true);
    try {
      const previewText = await file.slice(0, 4096).text();
      const headers = previewText.toLowerCase();
      const hasEV = headers.includes('simev') || headers.includes('ev') || headers.includes('tailscore');
      const isOptimizer = headers.includes('pg') && headers.includes('util') || (headers.includes('p1') && hasEV);

      if (isOptimizer) {
         if (!state.referencePlayers || state.referencePlayers.length === 0) {
            throw new Error("Reference pack not loaded. Load pipeline_YYYY-MM-DD.json first so DraftKings numeric IDs map to players correctly.");
         }
         const loaded = await parseOptimizerLineups(file, state.referencePlayers);
         setState(prev => ({ ...prev, lineups: loaded, lastUpdated: Date.now(), slateStats: { ...prev.slateStats, totalLineups: loaded.length, warnings: prev.slateStats.warnings.filter(w => !w.includes('Mapping')) } }));
      } else {
         const loaded = await parseUserLineupsRows(file);
         setState(prev => ({ ...prev, lineups: loaded, lastUpdated: Date.now(), slateStats: { ...prev.slateStats, totalLineups: loaded.length, warnings: prev.slateStats.warnings.filter(w => !w.includes('Mapping')) } }));
      }
    } catch (e: any) { alert(e.message || "Failed to parse lineups CSV."); }
    setLoading(false);
  }, [state.referencePlayers]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: onDropMain, accept: { 'application/json': ['.json'] }, multiple: false });

  const NavItem = ({ label, icon: Icon, targetView }: { label: string, icon: any, targetView: ViewState }) => (
    <button onClick={() => setView(targetView)} className={`flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-lg transition-colors ${view === targetView ? 'text-brand bg-brand-light dark:bg-brand/20 font-medium' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-charcoal-card'}`}>
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen font-sans bg-cloud dark:bg-charcoal text-cloud-text dark:text-charcoal-text flex flex-col">
      {showOnboarding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-charcoal-card max-w-md w-full rounded-2xl shadow-2xl overflow-hidden border border-cloud-darker dark:border-charcoal-card">
                <div className="p-6">
                    <div className="bg-brand-light dark:bg-brand/20 w-12 h-12 rounded-full flex items-center justify-center mb-4"><Activity className="w-6 h-6 text-brand" /></div>
                    <h2 className="text-2xl font-bold mb-2">SlateSavvy Beta</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm leading-relaxed">Reality Check is live. Auto-loading daily reference builds from local storage.</p>
                    <button onClick={handleDismissOnboarding} className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3 rounded-xl transition-colors">Enter Beta</button>
                </div>
            </div>
        </div>
      )}

      <header className="bg-white dark:bg-charcoal-card border-b border-cloud-darker dark:border-charcoal-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView(ViewState.LINEUPS)}>
            <div className="bg-brand p-1.5 rounded-lg"><Layers className="w-5 h-5 text-white" /></div>
            <div className="flex flex-col"><h1 className="font-bold text-lg tracking-tight leading-none">Slate<span className="text-brand">Savvy</span></h1><span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Reality Check</span></div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setView(ViewState.LOAD)} className="text-[10px] font-bold text-gray-400 hover:text-brand transition-colors uppercase border border-cloud-darker dark:border-charcoal px-2 py-1 rounded">Update Pack</button>
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-cloud dark:hover:bg-charcoal text-gray-600 dark:text-gray-400 transition-colors">{theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}</button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        {state.slateStats.warnings.length > 0 && (
          <div className="mb-6 space-y-2">
            {state.slateStats.warnings.map((w, i) => (
              <div key={i} className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />{w}
              </div>
            ))}
          </div>
        )}

        {view === ViewState.LOAD && (
          <div className="max-w-xl mx-auto space-y-8 mt-6 pb-24">
            <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${isDragActive ? 'border-brand bg-brand-light dark:bg-brand/20' : 'border-cloud-darker dark:border-charcoal-card hover:border-brand hover:bg-white dark:hover:bg-charcoal-card'}`}>
              <input {...getInputProps()} />
              <div className="bg-brand-light dark:bg-charcoal-card w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Database className="w-8 h-8 text-brand" /></div>
              <p className="font-medium text-lg mb-1">Upload Reference Pack (JSON)</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">pipeline_YYYY-MM-DD.json</p>
            </div>
          </div>
        )}

        {view === ViewState.PROJECTIONS && <ProjectionsView players={state.players} referencePlayers={state.referencePlayers} contestState={contestState} beliefName={state.activeBeliefProfileName} onBeliefUpload={onBeliefUpload} />}
        {view === ViewState.LINEUPS && (
          <LineupsView 
            lineups={computedLineups} 
            contestState={contestState} 
            onLineupUpload={onLineupUpload} 
            onContestChange={setContestInput} 
            hasAutoLoadedReferencePack={state.hasAutoLoadedReferencePack} 
            referencePackPath={state.referencePackPath}
            referenceMeta={state.referenceMeta}
            slateStats={state.slateStats}
            games={state.games}
          />
        )}
        {view === ViewState.DIAGNOSTICS && <DiagnosticsView state={{...state, lineups: computedLineups, contestState}} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-charcoal-card border-t border-cloud-darker dark:border-charcoal-card px-6 py-2 pb-safe z-40 shadow-lg">
           <div className="flex justify-around items-center max-w-lg mx-auto">
              <NavItem label="Lineups" icon={Layers} targetView={ViewState.LINEUPS} />
              <NavItem label="Beliefs" icon={Users} targetView={ViewState.PROJECTIONS} />
              <NavItem label="Report" icon={BarChart2} targetView={ViewState.DIAGNOSTICS} />
           </div>
      </nav>

      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
            <div className="bg-white dark:bg-charcoal-card p-6 rounded-xl shadow-2xl flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-brand border-t-transparent animate-spin mb-4"></div>
                <p className="font-medium text-sm">Processing Data...</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
