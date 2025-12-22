//account
export interface AccountRow {
	id: string;
	is_admin: boolean;
	is_manager: boolean;
}

//admin_reports
export interface AdminReportsRow {
	id: string;
	reported_player_id: string;
	reported_by: string;
	match_id?: string | null;
	report_type: string;
	report_message: string;
	resolved: boolean;
	created_at: string;
}

//Type of ban
export type BanType = "play" | "submit";

//group_bans
export interface GroupBanRow {
	id: string;
	group_id: string;
	ban_type: BanType;
	start_date: string;
	end_date: string;
	ban_message: string;
	created_by: string;
	created_at: string;
	manager_override: boolean;
	active: boolean;
}

//groups
export interface GroupsRow {
	id: string;
	group_name: string;
	created_at: string;
}

//manager_reports
export interface ManagerReport {
	id: string;
	reported_player_id?: string | null;
	reported_by: string;
	match_id?: string | null;
	report_type: string;
	report_message: string;
	resolved: boolean;
	created_at: string;
	reported_group_id?: string | null;
}

//Type of match
export type MatchType = "singles" | "doubles";

//matches
export interface MatchRow {
	id: string;
	player_a1_id: string;
	player_b1_id: string;
	player_a2_id?: string | null;
	player_b2_id?: string | null;
	elo_before_a1: number;
	elo_before_b1: number;
	elo_before_a2?: number | null;
	elo_before_b2?: number | null;
	score_a: number;
	score_b: number;
	game_points: number;
	created_by: string;
	created_at: string;
	elo_change_a: number;
	elo_change_b: number;
	winner1: string;
	winner2?: string | null;
	match_number: number;
	match_type: MatchType;
	tournament_id?: string | null;
	bracket_id?: string | null;
}

//player_bans
export interface PlayerBanRow {
	id: string;
	player_id: string;
	ban_type: BanType;
	start_date: string;
	end_date: string;
	ban_message: string;
	created_by: string;
	created_at: string;
	manager_override: boolean;
	active: boolean;
}

//players
export interface Player {
	id: string;
	player_name: string;
	singles_elo: number;
	doubles_elo: number;
	account_id?: string | null;
	created_at: string;
	claim_code?: string | null;
	group_id?: string | null;
	created_by: string;
}

//tournament_brackets
export interface TournamentBracketRow {
	id: string;
	tournament_id: string;
	bracket_number: number;
	round: number;
	status: string;
	created_at: string;
}

//tournament_signups
export interface TournamentSignupRow {
	signup_number: number;
	created_at: string;
	tournament_id: string;
	player_id: string;
}

//tournaments
export interface TournamentRow {
	id: string;
	tournament_name: string;
	created_by: string;
	created_at: string;
	start_date: string;
	end_date: string;
}
