export type Role = 'babu' | 'police' | 'dakat' | 'chor';

/** The outlaw role the Police must catch this round (strict alternation). */
export type RoundTarget = 'chor' | 'dakat';

export type Phase =
  | 'lobby'
  | 'dealing'
  | 'drawing'
  | 'announce'
  | 'guessing'
  | 'reveal'
  | 'scoring'
  | 'podium';

export type PlayerId = string;

export type MatchMode = 'rounds' | 'target';

export type Assignments = Record<PlayerId, Role>;

export type ScoreDelta = Record<PlayerId, number>;

export interface RoundState {
  roundNumber: number;
  assignments: Assignments;
  target: RoundTarget;
  policeGuess: PlayerId | null;
  caught: boolean | null;
  deltas: ScoreDelta | null;
}

export interface MatchState {
  players: PlayerId[];
  phase: Phase;
  mode: MatchMode;
  // rounds mode: number of rounds. target mode: the score to reach.
  // NB: unrelated to the per-round RoundTarget (chor/dakat).
  modeValue: number;
  totals: Record<PlayerId, number>;
  currentRound: RoundState | null;
  history: RoundState[];
  winners: PlayerId[] | null;
}
