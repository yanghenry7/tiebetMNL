
import React, { useState, useEffect } from 'react';
import { DeckCounts, Payouts, CalculationResult, EVResult } from './types.ts';
import { INITIAL_DECK_COUNT, TOTAL_RANKS, DEFAULT_PAYOUTS, RANK_LABELS } from './constants.ts';
import { calculateEV } from './logic/baccaratLogic.ts';

const App: React.FC = () => {
  const [counts, setCounts] = useState<DeckCounts>(() => {
    const initial: DeckCounts = {};
    TOTAL_RANKS.forEach(r => {
      initial[r] = INITIAL_DECK_COUNT;
    });
    return initial;
  });

  const [bankroll, setBankroll] = useState<number>(100000);
  const [payouts, setPayouts] = useState<Payouts>(DEFAULT_PAYOUTS);
  const [results, setResults] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const runCalc = async () => {
      setIsCalculating(true);
      setTimeout(async () => {
        try {
          const res = await calculateEV(counts, payouts);
          if (isMounted) {
            setResults(res);
            setIsCalculating(false);
          }
        } catch (error) {
          console.error("Calculation error:", error);
          if (isMounted) setIsCalculating(false);
        }
      }, 50);
    };
    runCalc();
    return () => { isMounted = false; };
  }, [counts, payouts]);

  const updateCount = (rank: number, delta: number) => {
    setCounts(prev => ({
      ...prev,
      [rank]: Math.max(0, prev[rank] + delta)
    }));
  };

  const handlePayoutChange = (key: keyof Payouts | 'tieBonus', value: string, bonusKey?: number) => {
    const num = parseFloat(value) || 0;
    setPayouts(prev => {
      if (key === 'tieBonus' && bonusKey !== undefined) {
        return {
          ...prev,
          tieBonus: { ...prev.tieBonus, [bonusKey]: num }
        };
      }
      return { ...prev, [key as keyof Payouts]: num };
    });
  };

  const resetShoe = () => {
    const initial: DeckCounts = {};
    TOTAL_RANKS.forEach(r => {
      initial[r] = INITIAL_DECK_COUNT;
    });
    setCounts(initial);
  };

  const calculateKellyBet = (item: EVResult) => {
    if (item.ev <= 0 || item.payout <= 0) return 0;
    const fraction = item.ev / item.payout;
    return Math.floor(bankroll * fraction);
  };

  const getAllPositiveEVBets = (): EVResult[] => {
    if (!results) return [];
    const all = [
      results.player, results.banker, results.tie, 
      results.playerPair, results.bankerPair, ...results.tieBonuses
    ];
    return all.filter(item => item.ev > 0).sort((a, b) => b.ev - a.ev);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      <header className="flex justify-between items-center border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-400">Baccarat Pro Calculator</h1>
          <p className="text-sm text-slate-400 uppercase tracking-widest">Exact Probability Engine</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`bg-slate-800 px-4 py-2 rounded border transition-colors ${isCalculating ? 'border-blue-500/50' : 'border-slate-700'}`}>
            <span className="text-xs text-slate-500 block uppercase">Remaining</span>
            <span className="text-xl font-bold text-yellow-500 mono">{results?.totalCards || 0}</span>
          </div>
          <button 
            onClick={resetShoe}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-bold transition-colors shadow-lg shadow-red-900/20 active:scale-95"
          >
            RESET
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
        {isCalculating && (
          <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center rounded-xl transition-opacity">
             <div className="bg-slate-800 border border-blue-500/50 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-blue-400 font-bold text-sm tracking-widest uppercase animate-pulse">Exact Calculation...</span>
             </div>
          </div>
        )}

        <div className="lg:col-span-4 bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-blue-400">
            Card Inventory
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-2 gap-4">
            {TOTAL_RANKS.map(rank => (
              <div key={rank} className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className={`text-2xl font-black mono ${rank >= 10 ? 'text-purple-400' : 'text-slate-300'}`}>
                    {RANK_LABELS[rank]}
                  </span>
                  <span className="text-lg font-bold text-blue-400 mono">{counts[rank]}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateCount(rank, -1)} className="flex-1 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 py-1 rounded transition-colors text-xl font-bold active:scale-95">-</button>
                  <button onClick={() => updateCount(rank, 1)} className="flex-1 bg-slate-800 hover:bg-blue-900/40 text-slate-400 hover:text-blue-400 py-1 rounded transition-colors text-xl font-bold active:scale-95">+</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 h-full">
            <h2 className="text-lg font-semibold mb-6 flex justify-between items-center">
              <span>Main Bets</span>
              <span className="text-xs text-slate-500 font-normal uppercase tracking-tighter">Prob / EV</span>
            </h2>
            <div className="space-y-4">
              {results && [results.player, results.banker, results.tie, results.playerPair, results.bankerPair].map((item, idx) => {
                const kellyAmount = calculateKellyBet(item);
                const isPositive = item.ev > 0;
                return (
                  <div key={idx} className={`bg-slate-900/80 p-4 rounded-lg border transition-all ${isPositive ? 'border-green-500/50 shadow-lg shadow-green-900/10 scale-[1.02]' : 'border-slate-700 opacity-80'}`}>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xl font-bold text-slate-200">{item.label}</span>
                      <div className="text-right">
                        <div className={`text-sm font-mono ${isPositive ? 'text-green-400 font-bold' : 'text-slate-400'}`}>
                          EV: {(item.ev * 100).toFixed(4)}%
                        </div>
                        {isPositive && <div className="text-[10px] text-green-500 uppercase font-black tracking-widest mt-0.5 animate-pulse">Bet: ${kellyAmount.toLocaleString()}</div>}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Probability</span>
                      <span className="text-lg font-bold text-yellow-500 mono">{(item.probability * 100).toFixed(4)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${isPositive ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${item.probability * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-slate-800/50 rounded-xl p-6 border border-slate-700 flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-4 text-green-400">Bankroll (本金)</h2>
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 shadow-inner">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                <input type="number" value={bankroll} onChange={(e) => setBankroll(parseFloat(e.target.value) || 0)} className="w-full bg-slate-800 border border-slate-700 rounded pl-7 pr-3 py-3 text-xl font-bold text-green-400 mono focus:ring-2 focus:ring-green-500/20 outline-none transition-all" />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4 text-purple-400">和寶 (Tie Bonuses)</h2>
            <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {results?.tieBonuses.map((bonus, point) => {
                const kellyAmt = calculateKellyBet(bonus);
                const isPositive = bonus.ev > 0;
                return (
                  <div key={point} className={`bg-slate-900 p-3 rounded border transition-all ${isPositive ? 'border-green-500/50 bg-green-900/10' : 'border-slate-700 opacity-90'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-slate-300">{point}點和</span>
                      <span className={`text-[11px] mono ${isPositive ? 'text-green-400 font-bold' : 'text-slate-500'}`}>{(bonus.ev * 100).toFixed(4)}%</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">Pay</span>
                      <input type="number" value={payouts.tieBonus[point]} onChange={(e) => handlePayoutChange('tieBonus', e.target.value, point)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs outline-none text-slate-200" />
                    </div>
                    {isPositive ? (
                      <div className="text-[10px] text-green-500 font-black text-center bg-green-500/10 rounded py-1 tracking-tighter">Bet: ${kellyAmt.toLocaleString()}</div>
                    ) : (
                      <div className="text-[10px] text-slate-600 text-center py-1">Prob: {(bonus.probability * 100).toFixed(4)}%</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      <footer className="mt-auto bg-slate-800 border-t border-blue-900/50 p-6 rounded-t-3xl shadow-2xl">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex-1">
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              Recommended Bets
            </h4>
            <div className="flex flex-wrap gap-3">
              {(() => {
                const positiveBets = getAllPositiveEVBets();
                if (positiveBets.length === 0) return <span className="text-slate-500 text-xs italic">No advantage found. Wait for better cards.</span>;
                return positiveBets.map((bet, i) => (
                  <div key={i} className="bg-green-500/10 border border-green-500/30 px-4 py-3 rounded-xl flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-green-400 text-[10px] font-bold uppercase">{bet.label}</span>
                      <span className="text-white text-xl font-black mono">${calculateKellyBet(bet).toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col border-l border-green-500/20 pl-4">
                      <span className="text-slate-500 text-[10px] uppercase font-bold">EV</span>
                      <span className="text-green-500 font-mono font-bold">{(bet.ev * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-mono opacity-60">
            Engine: Combinatorial-Exact-v3.0
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
