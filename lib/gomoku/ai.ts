import { TBoard, TStone, TPosition, TDifficulty } from './types';
import { BOARD_SIZE } from './constants';
import { isInBounds, placeStone, checkWin, isDraw } from './board';
import { evaluateBoard } from './evaluate';
import { isForbidden } from './renju';

// ---------------------------------------------------------------------------
// Difficulty configuration
// ---------------------------------------------------------------------------

type TDifficultyConfig = {
  depth: number;
  randomChance: number;
  delay: number;
};

const DIFFICULTY_CONFIG: Record<TDifficulty, TDifficultyConfig> = {
  beginner: { depth: 1, randomChance: 0.3, delay: 0 },
  easy: { depth: 2, randomChance: 0.15, delay: 500 },
  medium: { depth: 4, randomChance: 0.05, delay: 1000 },
};

/** Maximum number of candidate moves to consider at each level */
const MAX_CANDIDATES = 20;

/** Distance from existing stones to consider as candidate moves */
const CANDIDATE_RADIUS = 2;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the best AI move for the given board state and difficulty.
 * Returns null if no valid move exists (board full).
 */
export function getAIMove(
  board: TBoard,
  aiStone: TStone,
  difficulty: TDifficulty
): TPosition | null {
  const config = DIFFICULTY_CONFIG[difficulty];

  // Get candidate moves
  const candidates = getCandidateMoves(board, aiStone);
  if (candidates.length === 0) {
    return null;
  }

  // Random chance: pick a random move from candidates
  if (config.randomChance > 0 && Math.random() < config.randomChance) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Check for immediate winning move
  const winningMove = findImmediateWin(board, aiStone, candidates);
  if (winningMove) return winningMove;

  // Check for immediate blocking move (opponent would win next turn)
  const opponent: TStone = aiStone === 1 ? 2 : 1;
  const blockingMove = findImmediateWin(board, opponent, candidates);
  if (blockingMove) return blockingMove;

  // Use minimax with alpha-beta pruning
  let bestScore = -Infinity;
  let bestMove: TPosition = candidates[0];

  for (const move of candidates) {
    const newBoard = placeStone(board, move.x, move.y, aiStone);
    if (!newBoard) continue;

    const score = minimax(
      newBoard,
      config.depth - 1,
      -Infinity,
      Infinity,
      false,
      aiStone
    );

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * Get the thinking delay for a given difficulty in milliseconds.
 */
export function getAIDelay(difficulty: TDifficulty): number {
  return DIFFICULTY_CONFIG[difficulty].delay;
}

// ---------------------------------------------------------------------------
// Minimax with Alpha-Beta Pruning
// ---------------------------------------------------------------------------

function minimax(
  board: TBoard,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiStone: TStone
): number {
  // Terminal conditions
  if (depth === 0) {
    return evaluateBoard(board, aiStone);
  }

  const currentStone: TStone = isMaximizing ? aiStone : (aiStone === 1 ? 2 : 1);
  const candidates = getCandidateMoves(board, currentStone);

  if (candidates.length === 0 || isDraw(board)) {
    return evaluateBoard(board, aiStone);
  }

  // Check if any previous move resulted in a win
  // (we check by evaluating - if the score is extreme, stop)

  if (isMaximizing) {
    let maxScore = -Infinity;

    for (const move of candidates) {
      const newBoard = placeStone(board, move.x, move.y, currentStone);
      if (!newBoard) continue;

      // Check if this move wins
      const result = checkWin(newBoard, move.x, move.y);
      if (result.winner === aiStone) {
        return 1_000_000 + depth; // Prefer earlier wins
      }

      const score = minimax(newBoard, depth - 1, alpha, beta, false, aiStone);
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }

    return maxScore;
  } else {
    let minScore = Infinity;

    for (const move of candidates) {
      const newBoard = placeStone(board, move.x, move.y, currentStone);
      if (!newBoard) continue;

      // Check if opponent wins
      const result = checkWin(newBoard, move.x, move.y);
      if (result.winner !== 0 && result.winner !== aiStone) {
        return -(1_000_000 + depth); // Opponent winning is bad
      }

      const score = minimax(newBoard, depth - 1, alpha, beta, true, aiStone);
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }

    return minScore;
  }
}

// ---------------------------------------------------------------------------
// Candidate move generation
// ---------------------------------------------------------------------------

/**
 * Get candidate moves: empty positions within CANDIDATE_RADIUS of existing stones.
 * If the board is empty, return the center position.
 * Moves are scored and sorted for better alpha-beta pruning.
 */
function getCandidateMoves(board: TBoard, stone: TStone): TPosition[] {
  const hasStones = boardHasStones(board);

  if (!hasStones) {
    // First move: play center
    const center = Math.floor(BOARD_SIZE / 2);
    return [{ x: center, y: center }];
  }

  const candidateSet = new Set<string>();
  const candidates: TPosition[] = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === 0) continue;

      // Add empty cells around this stone
      for (let dy = -CANDIDATE_RADIUS; dy <= CANDIDATE_RADIUS; dy++) {
        for (let dx = -CANDIDATE_RADIUS; dx <= CANDIDATE_RADIUS; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          const key = `${nx},${ny}`;

          if (
            isInBounds(nx, ny) &&
            board[ny][nx] === 0 &&
            !candidateSet.has(key)
          ) {
            // For black stone, skip forbidden positions
            if (stone === 1 && isForbidden(board, nx, ny)) {
              continue;
            }

            candidateSet.add(key);
            candidates.push({ x: nx, y: ny });
          }
        }
      }
    }
  }

  // Sort candidates by a quick heuristic score (higher = better)
  // This improves alpha-beta pruning efficiency
  const scored = candidates.map((pos) => ({
    pos,
    score: quickEvaluateMove(board, pos.x, pos.y, stone),
  }));

  scored.sort((a, b) => b.score - a.score);

  // Limit number of candidates for performance
  return scored.slice(0, MAX_CANDIDATES).map((s) => s.pos);
}

/**
 * Quick heuristic evaluation of a single move without full minimax.
 * Used for move ordering to improve alpha-beta pruning.
 */
function quickEvaluateMove(
  board: TBoard,
  x: number,
  y: number,
  stone: TStone
): number {
  const opponent: TStone = stone === 1 ? 2 : 1;
  let score = 0;

  // Placing the stone temporarily
  const testBoard = board.map((row) => [...row]);
  testBoard[y][x] = stone;

  // Check if this move wins
  const result = checkWin(testBoard, x, y);
  if (result.winner === stone) {
    return 1_000_000;
  }

  // Check if this move blocks opponent's win
  testBoard[y][x] = opponent;
  const oppResult = checkWin(testBoard, x, y);
  if (oppResult.winner === opponent) {
    score += 500_000;
  }

  // Proximity to center is slightly better
  const center = Math.floor(BOARD_SIZE / 2);
  const distFromCenter = Math.abs(x - center) + Math.abs(y - center);
  score += Math.max(0, 10 - distFromCenter);

  // Count adjacent friendly and opponent stones (more = more interesting)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (isInBounds(nx, ny)) {
        if (board[ny][nx] === stone) score += 5;
        if (board[ny][nx] === opponent) score += 3;
      }
    }
  }

  return score;
}

/**
 * Find an immediate winning move from the candidates.
 */
function findImmediateWin(
  board: TBoard,
  stone: TStone,
  candidates: TPosition[]
): TPosition | null {
  for (const move of candidates) {
    const newBoard = placeStone(board, move.x, move.y, stone);
    if (!newBoard) continue;

    const result = checkWin(newBoard, move.x, move.y);
    if (result.winner === stone) {
      // For black, also ensure it's not a forbidden position
      if (stone === 1 && isForbidden(board, move.x, move.y)) {
        continue;
      }
      return move;
    }
  }
  return null;
}

/**
 * Check if any stones exist on the board.
 */
function boardHasStones(board: TBoard): boolean {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== 0) return true;
    }
  }
  return false;
}
