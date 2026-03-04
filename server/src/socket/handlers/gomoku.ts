import { Server, Socket } from 'socket.io';
import { RoomManager } from '../../game/RoomManager';
import {
  TGomokuGameState,
  TGomokuPlacePayload,
  TGomokuPlacedPayload,
  TGomokuGameOverPayload,
  TGomokuSyncPayload,
  TGomokuRestartPayload,
  TGomokuStone,
} from '../../../../shared/types';
import { createBoard, placeStone, checkWin, isDraw } from '../../../../lib/gomoku/board';
import { isForbidden } from '../../../../lib/gomoku/renju';
import { BOARD_SIZE } from '../../../../lib/gomoku/constants';

function createInitialGameState(player1Id: string, player2Id: string): TGomokuGameState {
  return {
    board: createBoard(),
    turn: 1,
    moveHistory: [],
    winner: null,
    winLine: null,
    playerOrder: [player1Id, player2Id],
    isDraw: false,
  };
}

function isValidPlacePayload(data: unknown): data is TGomokuPlacePayload {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d.x !== 'number' || typeof d.y !== 'number') return false;
  if (!Number.isInteger(d.x) || !Number.isInteger(d.y)) return false;
  if (d.x < 0 || d.x >= BOARD_SIZE || d.y < 0 || d.y >= BOARD_SIZE) return false;
  return true;
}

function getPlayerStone(gameState: TGomokuGameState, socketId: string): 1 | 2 | null {
  if (gameState.playerOrder[0] === socketId) return 1; // black
  if (gameState.playerOrder[1] === socketId) return 2; // white
  return null;
}

export function registerGomokuHandlers(
  io: Server,
  socket: Socket,
  roomManager: RoomManager
): void {
  // Initialize game state when room transitions to playing
  socket.on('gomoku:init', () => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room || room.gameType !== 'gomoku') return;

    // Only host can init, and only when 2 players are present
    if (room.hostId !== socket.id) return;
    if (room.players.size !== 2) return;
    if (room.gameState) return; // already initialized

    const playerIds = Array.from(room.players.keys());
    room.gameState = createInitialGameState(playerIds[0], playerIds[1]);
    room.state = 'playing';

    const state = room.gameState as TGomokuGameState;
    const syncData: TGomokuSyncPayload = {
      board: state.board,
      turn: state.turn,
      moveHistory: state.moveHistory,
      winner: state.winner,
      winLine: state.winLine,
      playerOrder: state.playerOrder,
      isDraw: state.isDraw,
    };

    io.to(room.id).emit('gomoku:started', syncData);
  });

  // Player places a stone
  socket.on('gomoku:place', (payload: unknown) => {
    if (!isValidPlacePayload(payload)) return;

    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room || room.gameType !== 'gomoku') return;
    if (!room.gameState) return;

    const gameState = room.gameState as TGomokuGameState;

    // Game already over?
    if (gameState.winner !== null || gameState.isDraw) return;

    // Is it this player's turn?
    const playerStone = getPlayerStone(gameState, socket.id);
    if (playerStone === null || playerStone !== gameState.turn) return;

    const { x, y } = payload;

    // Is position empty?
    if (gameState.board[y][x] !== 0) return;

    // Renju rules: black cannot place on forbidden positions
    if (playerStone === 1 && isForbidden(gameState.board, x, y)) return;

    // Place the stone
    const newBoard = placeStone(gameState.board, x, y, playerStone as TGomokuStone);
    if (!newBoard) return;

    gameState.board = newBoard;
    gameState.moveHistory.push({ x, y, stone: playerStone });

    // Check for win
    const result = checkWin(gameState.board, x, y);
    if (result.winner !== 0 && result.winLine) {
      gameState.winner = result.winner as 1 | 2;
      gameState.winLine = result.winLine;
      room.state = 'finished';

      const winnerSocketId = gameState.playerOrder[gameState.winner - 1];

      // Broadcast placed
      const placedData: TGomokuPlacedPayload = {
        x,
        y,
        stone: playerStone,
        nextTurn: gameState.turn, // doesn't matter, game over
      };
      io.to(room.id).emit('gomoku:placed', placedData);

      // Broadcast game over
      const gameOverData: TGomokuGameOverPayload = {
        winner: gameState.winner,
        winLine: gameState.winLine,
        winnerPlayerId: winnerSocketId,
        isDraw: false,
      };
      io.to(room.id).emit('gomoku:gameover', gameOverData);
      return;
    }

    // Check for draw
    if (isDraw(gameState.board)) {
      gameState.isDraw = true;
      room.state = 'finished';

      const placedData: TGomokuPlacedPayload = {
        x,
        y,
        stone: playerStone,
        nextTurn: gameState.turn,
      };
      io.to(room.id).emit('gomoku:placed', placedData);

      const gameOverData: TGomokuGameOverPayload = {
        winner: null,
        winLine: null,
        winnerPlayerId: null,
        isDraw: true,
      };
      io.to(room.id).emit('gomoku:gameover', gameOverData);
      return;
    }

    // Switch turn
    const nextTurn: 1 | 2 = gameState.turn === 1 ? 2 : 1;
    gameState.turn = nextTurn;

    const placedData: TGomokuPlacedPayload = {
      x,
      y,
      stone: playerStone,
      nextTurn,
    };
    io.to(room.id).emit('gomoku:placed', placedData);
  });

  // Player surrenders
  socket.on('gomoku:surrender', () => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room || room.gameType !== 'gomoku') return;
    if (!room.gameState) return;

    const gameState = room.gameState as TGomokuGameState;
    if (gameState.winner !== null || gameState.isDraw) return;

    const playerStone = getPlayerStone(gameState, socket.id);
    if (playerStone === null) return;

    // The opponent wins
    const winnerStone: 1 | 2 = playerStone === 1 ? 2 : 1;
    gameState.winner = winnerStone;
    room.state = 'finished';

    const winnerSocketId = gameState.playerOrder[winnerStone - 1];

    const gameOverData: TGomokuGameOverPayload = {
      winner: winnerStone,
      winLine: null,
      winnerPlayerId: winnerSocketId,
      isDraw: false,
    };
    io.to(room.id).emit('gomoku:gameover', gameOverData);
  });

  // Request restart (new game)
  socket.on('gomoku:restart', () => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room || room.gameType !== 'gomoku') return;
    if (!room.gameState) return;
    if (room.players.size !== 2) return;

    const gameState = room.gameState as TGomokuGameState;

    // Only allow restart after game is over
    if (gameState.winner === null && !gameState.isDraw) return;

    // Swap colors: previous player[0] (black) becomes player[1] (white)
    const newPlayerOrder: [string, string] = [
      gameState.playerOrder[1],
      gameState.playerOrder[0],
    ];

    const newState = createInitialGameState(newPlayerOrder[0], newPlayerOrder[1]);
    room.gameState = newState;
    room.state = 'playing';

    const restartData: TGomokuRestartPayload = {
      board: newState.board,
      turn: newState.turn,
      playerOrder: newState.playerOrder,
    };
    io.to(room.id).emit('gomoku:restarted', restartData);
  });

  // Request sync (for reconnection)
  socket.on('gomoku:request-sync', () => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room || room.gameType !== 'gomoku') return;

    if (!room.gameState) {
      socket.emit('gomoku:sync', null);
      return;
    }

    const state = room.gameState as TGomokuGameState;
    const syncData: TGomokuSyncPayload = {
      board: state.board,
      turn: state.turn,
      moveHistory: state.moveHistory,
      winner: state.winner,
      winLine: state.winLine,
      playerOrder: state.playerOrder,
      isDraw: state.isDraw,
    };
    socket.emit('gomoku:sync', syncData);
  });
}
