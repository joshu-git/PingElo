export interface MatchRow {
  id: string;
  match_number: number;
  player_a_id: string;
  player_b_id: string;
  score_a: number;
  score_b: number;
  game_points: number;
  created_at: string;
  elo_before_a: number | null;
  elo_before_b: number | null;
  elo_change_a: number | null;
  elo_change_b: number | null;
  winner: string | null;
}