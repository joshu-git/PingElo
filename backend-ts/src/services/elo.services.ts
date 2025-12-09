//Allows calls to external python backend
import axios from "axios";

//Data we will send to python
interface EloRequest {
  playerAId: string;
  playerBId: string;
  ratingA: number;
  ratingB: number;
  scoreA: number;
  scoreB: number;
  gamePoints: number;
}

//Data we expect to get back from python
export interface EloResponse {
  newRatingA: number;
  newRatingB: number;
  eloChangeA: number;
  eloChangeB: number;
  winner: string;
}

//Allows calculation of elo
export async function calculateElo(request: EloRequest): Promise<EloResponse> {
  try {
    //Calls the python backend for calculation of elo
    const response = await axios.post(`${process.env.PYTHON_BACKEND_URL}/calculate_elo`, {
      rating_player_a: request.ratingA,
      rating_player_b: request.ratingB,
      score_player_a: request.scoreA,
      score_player_b: request.scoreB,
      game_points: request.gamePoints
    });

    //Stores the data from the python backend
    const data = response.data;

    //Determines the ID of the winner
    const winnerId = data.winner === "A" ? request.playerAId : request.playerBId;

    //Returns new ratings, elo changes and the winnerId
    return {
      newRatingA: data.new_rating_a,
      newRatingB: data.new_rating_b,
      eloChangeA: data.rating_change_a,
      eloChangeB: data.rating_change_b,
      winner: winnerId
    };
  } catch (err: any) {
    console.error("Failed to calculate Elo:", err.message);
    throw new Error("Could not calculate Elo");
  }
}
