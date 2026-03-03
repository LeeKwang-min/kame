export type TCarState = {
  x: number;
  y: number;
  angle: number;
  speed: number;
  isDrifting: boolean;
  driftBoostTimer: number;
};

export type TDriftTrail = {
  x: number;
  y: number;
  alpha: number;
};

export type TTrackPoint = {
  x: number;
  y: number;
};

export type TGameState =
  | 'start'
  | 'loading'
  | 'countdown'
  | 'racing'
  | 'paused'
  | 'finished';

export type TInput = {
  left: boolean;
  right: boolean;
  brake: boolean;
};

export type TLapData = {
  time: number;
};
