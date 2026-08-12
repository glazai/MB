export type BackLayInput = {
  backStake: number;
  backOdds: number;
  layOdds: number;
  commission: number;
  snr: boolean;
};

export type BackLayOutcome = {
  bookmakerProfit: number;
  exchangeProfit: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function calcLayStake({ backStake, backOdds, layOdds, commission, snr }: BackLayInput) {
  const commissionFraction = commission / 100;
  const layOddsAfterCommission = layOdds - commissionFraction;
  const backWinnings = backStake * (backOdds - 1);
  return snr ? backWinnings / layOddsAfterCommission : (backStake * backOdds) / layOddsAfterCommission;
}

export function calcLiability(layStake: number, layOdds: number) {
  return layStake * (layOdds - 1);
}

export function calcBackLayOutcomes(input: BackLayInput) {
  const { backStake, backOdds, layOdds, commission, snr } = input;
  // Round the lay stake to the nearest penny first — that's the actual amount
  // you'd place with the exchange, and it's what makes the two outcomes not
  // perfectly symmetric (the whole reason a settled bet needs to record which
  // side won, rather than a single outcome-invariant profit figure).
  const layStake = round2(calcLayStake(input));
  const liability = calcLiability(layStake, layOdds);
  const commissionFraction = commission / 100;

  const ifBookmakerWins: BackLayOutcome = {
    bookmakerProfit: round2(backStake * (backOdds - 1)),
    exchangeProfit: round2(-liability),
  };

  const ifExchangeWins: BackLayOutcome = {
    bookmakerProfit: round2(snr ? 0 : -backStake),
    exchangeProfit: round2(layStake * (1 - commissionFraction)),
  };

  return {
    layStake: round2(layStake),
    liability: round2(liability),
    ifBookmakerWins,
    ifExchangeWins,
  };
}
