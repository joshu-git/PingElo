//Data we expect to receive
export interface EloCalculationInput {
  ratingA: number;
  ratingB: number;
  scoreA: number;
  scoreB: number;
  gamePoints: number;
}

//Data we will send back
export interface EloCalculationResult {
  newRatingA: number;
  newRatingB: number;
  eloChangeA: number;
  eloChangeB: number;
  winner: "A" | "B";
}

//Base elo sensitivity
const BASE_K = 50;

//Standard amount of points per game
const IDEAL_POINTS = 7;

//Expected score formula for elo
function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

// Matches Python calculate_effective_k()
function calculateEffectiveK(
  scoreA: number,
  scoreB: number,
  gamePoints: number
): number {
  //Elo is scaled based on game length
  const lengthFactor = gamePoints / IDEAL_POINTS;

  //Elo is scaled based on point difference
  const scoreDiffFactor = Math.abs(scoreA - scoreB) / gamePoints;
  return BASE_K * scoreDiffFactor * lengthFactor;
}

//Elo calculation for every match
export function calculateElo({
  ratingA,
  ratingB,
  scoreA,
  scoreB,
  gamePoints,
}: EloCalculationInput): EloCalculationResult {
  //Decide who the winner is
  const winner: "A" | "B" = scoreA > scoreB ? "A" : "B";
  const actualA = winner === "A" ? 1 : 0;

  //Determines who is expected to win
  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = 1 - expectedA;

  //Calculate elo scale modifier
  const effectiveK = calculateEffectiveK(scoreA, scoreB, gamePoints);

  //Gives elo change for both players
  const eloChangeA = Math.round(effectiveK * (actualA - expectedA));
  const eloChangeB = -eloChangeA;

  return {
    newRatingA: ratingA + eloChangeA,
    newRatingB: ratingB + eloChangeB,
    eloChangeA,
    eloChangeB,
    winner,
  };
}