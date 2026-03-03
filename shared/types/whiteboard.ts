export type TStrokePoint = {
  x: number;
  y: number;
};

export type TStroke = {
  playerId: string;
  points: TStrokePoint[];
  color: string;
  width: number;
};

export type TWhiteboardState = {
  strokes: TStroke[];
};
