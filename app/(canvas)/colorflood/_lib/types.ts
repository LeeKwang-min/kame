export type TCell = number; // color index 0-5
export type TGrid = TCell[][];
export type TMoveHistory = {
  grid: TGrid;
  colorIndex: number;
}[];
