import { COLS, ROWS, TETROMINO_TYPES, TETROMINOES } from './config';
import { TBoard, TTetromino, TTetrominoType } from './types';

export const createEmptyBoard = (): TBoard => {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
};

export const getRandomType = (): TTetrominoType => {
  const idx = Math.floor(Math.random() * TETROMINO_TYPES.length);
  return TETROMINO_TYPES[idx];
};

export const createTetromino = (type: TTetrominoType): TTetromino => {
  const shape = TETROMINOES[type][0];
  const shapeWidth = shape[0].length;

  return {
    type,
    shape,
    x: Math.floor((COLS - shapeWidth) / 2),
    y: 0,
    rotation: 0,
  };
};

export const getShape = (piece: TTetromino): number[][] => {
  return TETROMINOES[piece.type][piece.rotation];
};
