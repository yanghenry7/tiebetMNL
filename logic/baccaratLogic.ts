
import { DeckCounts, Payouts, CalculationResult, EVResult } from '../types.ts';

const getVal = (rank: number) => (rank >= 10 ? 0 : rank);

/**
 * Combinatorial Baccarat Engine
 * Calculates exact probabilities by iterating through all possible card value sequences (0-9).
 */
export async function calculateEV(counts: DeckCounts, payouts: Payouts): Promise<CalculationResult> {
  const totalCards = Object.values(counts).reduce((a, b) => a + b, 0);

  if (totalCards < 6) {
    return {
      player: { label: '閒', probability: 0, payout: 0, ev: 0 },
      banker: { label: '莊', probability: 0, payout: 0, ev: 0 },
      tie: { label: '和', probability: 0, payout: 0, ev: 0 },
      playerPair: { label: '閒對', probability: 0, payout: 0, ev: 0 },
      bankerPair: { label: '莊對', probability: 0, payout: 0, ev: 0 },
      tieBonuses: Array.from({length: 10}, (_, i) => ({ label: `${i}點和`, probability: 0, payout: payouts.tieBonus[i], ev: 0 })),
      totalCards: totalCards
    };
  }

  const valCounts = new Array(10).fill(0);
  for (let rank = 1; rank <= 13; rank++) {
    valCounts[getVal(rank)] += (counts[rank] || 0);
  }

  let pWinProb = 0, bWinProb = 0, tieProb = 0;
  let pPairProb = calculatePairProbability(counts, totalCards);
  let bPairProb = pPairProb; 
  const tiePointProbs = new Array(10).fill(0);

  const getP = (val: number, currentCounts: number[], currentTotal: number) => {
    if (currentCounts[val] <= 0) return 0;
    return currentCounts[val] / currentTotal;
  };

  // 10,000 paths for initial 4 cards
  for (let p1 = 0; p1 <= 9; p1++) {
    const prob1 = getP(p1, valCounts, totalCards);
    if (prob1 === 0) continue;
    valCounts[p1]--;

    for (let b1 = 0; b1 <= 9; b1++) {
      const prob2 = prob1 * getP(b1, valCounts, totalCards - 1);
      if (prob2 === 0) continue;
      valCounts[b1]--;

      for (let p2 = 0; p2 <= 9; p2++) {
        const prob3 = prob2 * getP(p2, valCounts, totalCards - 2);
        if (prob3 === 0) continue;
        valCounts[p2]--;

        for (let b2 = 0; b2 <= 9; b2++) {
          const prob4 = prob3 * getP(b2, valCounts, totalCards - 3);
          if (prob4 === 0) continue;
          valCounts[b2]--;

          const pInit = (p1 + p2) % 10;
          const bInit = (b1 + b2) % 10;

          if (pInit >= 8 || bInit >= 8) {
            tally(pInit, bInit, prob4);
          } else {
            if (pInit <= 5) {
              for (let p3 = 0; p3 <= 9; p3++) {
                const prob5 = prob4 * getP(p3, valCounts, totalCards - 4);
                if (prob5 === 0) continue;
                valCounts[p3]--;
                const pFinal = (pInit + p3) % 10;

                let bDraw = false;
                if (bInit <= 2) bDraw = true;
                else if (bInit === 3 && p3 !== 8) bDraw = true;
                else if (bInit === 4 && p3 >= 2 && p3 <= 7) bDraw = true;
                else if (bInit === 5 && p3 >= 4 && p3 <= 7) bDraw = true;
                else if (bInit === 6 && (p3 === 6 || p3 === 7)) bDraw = true;

                if (bDraw) {
                  for (let b3 = 0; b3 <= 9; b3++) {
                    const prob6 = prob5 * getP(b3, valCounts, totalCards - 5);
                    if (prob6 === 0) continue;
                    tally(pFinal, (bInit + b3) % 10, prob6);
                  }
                } else {
                  tally(pFinal, bInit, prob5);
                }
                valCounts[p3]++;
              }
            } else {
              if (bInit <= 5) {
                for (let b3 = 0; b3 <= 9; b3++) {
                  const prob5 = prob4 * getP(b3, valCounts, totalCards - 4);
                  if (prob5 === 0) continue;
                  tally(pInit, (bInit + b3) % 10, prob5);
                }
              } else {
                tally(pInit, bInit, prob4);
              }
            }
          }
          valCounts[b2]++;
        }
        valCounts[p2]++;
      }
      valCounts[b1]++;
    }
    valCounts[p1]++;
  }

  function tally(p: number, b: number, prob: number) {
    if (p > b) pWinProb += prob;
    else if (b > p) bWinProb += prob;
    else {
      tieProb += prob;
      if (p >= 0 && p <= 9) tiePointProbs[p] += prob;
    }
  }

  const evP = (pWinProb * payouts.player) - bWinProb;
  const evB = (bWinProb * payouts.banker) - pWinProb;
  const evT = (tieProb * (payouts.tie + 1)) - 1;
  const evPPair = (pPairProb * (payouts.playerPair + 1)) - 1;
  const evBPair = (bPairProb * (payouts.bankerPair + 1)) - 1;

  const tieBonuses: EVResult[] = [];
  for (let i = 0; i <= 9; i++) {
    tieBonuses.push({
      label: `${i}點和`,
      probability: tiePointProbs[i],
      payout: payouts.tieBonus[i],
      ev: (tiePointProbs[i] * (payouts.tieBonus[i] + 1)) - 1
    });
  }

  return {
    player: { label: '閒', probability: pWinProb, payout: payouts.player, ev: evP },
    banker: { label: '莊', probability: bWinProb, payout: payouts.banker, ev: evB },
    tie: { label: '和', probability: tieProb, payout: payouts.tie, ev: evT },
    playerPair: { label: '閒對', probability: pPairProb, payout: payouts.playerPair, ev: evPPair },
    bankerPair: { label: '莊對', probability: bPairProb, payout: payouts.bankerPair, ev: evBPair },
    tieBonuses,
    totalCards
  };
}

function calculatePairProbability(counts: DeckCounts, total: number): number {
  if (total < 2) return 0;
  let prob = 0;
  for (let rank = 1; rank <= 13; rank++) {
    const c = (counts[rank] || 0);
    if (c >= 2) {
      prob += (c / total) * ((c - 1) / (total - 1));
    }
  }
  return prob;
}
