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

//Ensure env variable exists at startup
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL;
if (!PYTHON_BACKEND_URL) {
  throw new Error("PYTHON_BACKEND_URL is not defined");
}

//Create a reusable axios client (best practice)
const pythonClient = axios.create({
  baseURL: PYTHON_BACKEND_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

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
    const response = await pythonClient.post("/calculate_elo", {
      rating_player_a: request.ratingA,
      rating_player_b: request.ratingB,
      score_player_a: request.scoreA,
      score_player_b: request.scoreB,
      game_points: request.gamePoints,
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
    if (err.response) {
      console.error("Python error:", {
        status: err.response.status,
        data: err.response.data,
      });
    } else {
      console.error("Network error:", err.message);
    }
    throw new Error("Could not calculate Elo");
  }
}
