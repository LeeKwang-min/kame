export type GamePhase = 'playing' | 'revealing' | 'result' | 'gameover';

export type RPSChoice = 'rock' | 'paper' | 'scissors';

export type RPSResult = 'win' | 'lose' | 'tie';

export type RPSState = {
  phase: GamePhase;
  playerChoice: RPSChoice | null;
  computerChoice: RPSChoice | null;
  result: RPSResult | null;
  streak: number;
  maxStreak: number;
};
