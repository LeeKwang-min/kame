export type TLane = 0 | 1 | 2 | 3;

export type TNote = {
  id: number;
  lane: TLane;
  y: number;
  targetTime: number;
  hit: boolean;
  missed: boolean;
};

export type TBeat = number | number[] | 0;

export type TPattern = {
  beats: TBeat[];
  difficulty: 1 | 2 | 3;
};

export type TJudgment = 'perfect' | 'great' | 'good' | 'miss';

export type TJudgmentEffect = {
  text: string;
  color: string;
  y: number;
  alpha: number;
  scale: number;
  lane: TLane;
};

export type TBpmPhase = {
  startTime: number;
  endTime: number;
  bpm: number;
  maxDifficulty: 1 | 2 | 3;
  name: string;
};
