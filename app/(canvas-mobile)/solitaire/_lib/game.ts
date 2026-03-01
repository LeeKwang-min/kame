import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_GAP,
  CARD_OVERLAP_Y,
  CARD_OVERLAP_FACE_Y,
  CARD_RADIUS,
  TOP_ROW_Y,
  TABLEAU_Y,
  PILE_START_X,
  BASE_SCORE,
  PENALTY_PER_SEC,
  TABLE_COLOR,
  CARD_BACK_COLOR,
  CARD_BACK_PATTERN_COLOR,
  CARD_FRONT_COLOR,
  CARD_BORDER_COLOR,
  RED_SUIT_COLOR,
  BLACK_SUIT_COLOR,
  HIGHLIGHT_COLOR,
  EMPTY_PILE_COLOR,
  TDrawMode,
  DEFAULT_DRAW_MODE,
} from './config';
import { TCard, TSuit, TRank, TPile } from './types';

// ============================================================
// Types
// ============================================================

export type TSolitaireCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

// ============================================================
// Constants
// ============================================================

const SUITS: TSuit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: TRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const SUIT_SYMBOLS: Record<TSuit, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

const RANK_VALUES: Record<TRank, number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
};

const FOUNDATION_SUIT_ORDER: TSuit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

// Column spacing calculation
const TOTAL_CARD_AREA = CANVAS_WIDTH - PILE_START_X * 2;
const COL_SPACING = TOTAL_CARD_AREA / 7;

// ============================================================
// Helpers
// ============================================================

const isRed = (suit: TSuit): boolean => suit === 'hearts' || suit === 'diamonds';

const suitColor = (suit: TSuit): string => isRed(suit) ? RED_SUIT_COLOR : BLACK_SUIT_COLOR;

const foundationX = (index: number): number =>
  PILE_START_X + (index + 3) * COL_SPACING + (COL_SPACING - CARD_WIDTH) / 2;

const stockX = (): number => PILE_START_X + (COL_SPACING - CARD_WIDTH) / 2;

const wasteX = (): number => PILE_START_X + COL_SPACING + (COL_SPACING - CARD_WIDTH) / 2;

const tableauX = (col: number): number =>
  PILE_START_X + col * COL_SPACING + (COL_SPACING - CARD_WIDTH) / 2;

const tableauCardY = (pile: TPile, cardIndex: number): number => {
  let y = TABLEAU_Y;
  for (let i = 0; i < cardIndex; i++) {
    y += pile.cards[i].faceUp ? CARD_OVERLAP_FACE_Y : CARD_OVERLAP_Y;
  }
  return y;
};

// ============================================================
// Setup
// ============================================================

export const setupSolitaire = (
  canvas: HTMLCanvasElement,
  callbacks?: TSolitaireCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  // --- Game state ---
  let stock: TPile = { type: 'stock', index: 0, cards: [] };
  let waste: TPile = { type: 'waste', index: 0, cards: [] };
  let foundations: TPile[] = [0, 1, 2, 3].map(i => ({ type: 'foundation', index: i, cards: [] }));
  let tableau: TPile[] = [0, 1, 2, 3, 4, 5, 6].map(i => ({ type: 'tableau', index: i, cards: [] }));

  let state: 'start' | 'loading' | 'playing' | 'paused' | 'gameover' = 'start';
  let lastTime = 0;
  let elapsedSec = 0;
  let score = 0;
  let drawMode: TDrawMode = DEFAULT_DRAW_MODE;
  let hasWon = false;

  // --- Game Over HUD ---
  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (finalScore) => {
      if (callbacks?.onScoreSave) {
        return callbacks.onScoreSave(finalScore);
      }
      return { saved: false };
    },
    onRestart: () => {
      resetGame();
    },
  };

  const gameOverHud = createGameOverHud(canvas, ctx, 'solitaire', gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  // ============================================================
  // Deck creation & shuffling
  // ============================================================

  const createDeck = (): TCard[] => {
    const deck: TCard[] = [];
    let id = 0;
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank, faceUp: false, id: id++ });
      }
    }
    return deck;
  };

  const shuffle = (deck: TCard[]): TCard[] => {
    const arr = [...deck];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // ============================================================
  // Game initialization
  // ============================================================

  const dealCards = () => {
    const deck = shuffle(createDeck());
    let idx = 0;

    // Deal to tableau
    for (let col = 0; col < 7; col++) {
      tableau[col].cards = [];
      for (let row = 0; row <= col; row++) {
        const card = { ...deck[idx++] };
        card.faceUp = row === col; // Only top card face up
        tableau[col].cards.push(card);
      }
    }

    // Remaining cards go to stock
    stock.cards = [];
    for (let i = idx; i < 52; i++) {
      stock.cards.push({ ...deck[i], faceUp: false });
    }

    waste.cards = [];
    foundations.forEach(f => (f.cards = []));
    hasWon = false;
  };

  // ============================================================
  // Move validation
  // ============================================================

  const canMoveToFoundation = (card: TCard, foundationIndex: number): boolean => {
    const pile = foundations[foundationIndex];
    if (pile.cards.length === 0) {
      return card.rank === 'A';
    }
    const top = pile.cards[pile.cards.length - 1];
    if (top.suit !== card.suit) return false;
    return RANK_VALUES[card.rank] === RANK_VALUES[top.rank] + 1;
  };

  const canMoveToTableau = (card: TCard, colIndex: number): boolean => {
    const pile = tableau[colIndex];
    if (pile.cards.length === 0) {
      return card.rank === 'K';
    }
    const top = pile.cards[pile.cards.length - 1];
    if (!top.faceUp) return false;
    // Alternating colors, descending rank
    return isRed(card.suit) !== isRed(top.suit) &&
      RANK_VALUES[card.rank] === RANK_VALUES[top.rank] - 1;
  };

  // ============================================================
  // Auto-move logic
  // ============================================================

  const tryAutoMoveToFoundation = (card: TCard): number => {
    for (let i = 0; i < 4; i++) {
      if (canMoveToFoundation(card, i)) return i;
    }
    return -1;
  };

  const tryAutoMoveToTableau = (card: TCard, excludeCol: number): number => {
    // Prefer columns that already have cards (non-empty)
    for (let i = 0; i < 7; i++) {
      if (i === excludeCol) continue;
      if (tableau[i].cards.length > 0 && canMoveToTableau(card, i)) return i;
    }
    // Then try empty columns (for Kings only)
    for (let i = 0; i < 7; i++) {
      if (i === excludeCol) continue;
      if (tableau[i].cards.length === 0 && canMoveToTableau(card, i)) return i;
    }
    return -1;
  };

  const flipTopCard = (pile: TPile) => {
    if (pile.cards.length > 0) {
      const top = pile.cards[pile.cards.length - 1];
      if (!top.faceUp) top.faceUp = true;
    }
  };

  const handleStockTap = () => {
    if (stock.cards.length === 0) {
      // Flip waste back to stock
      if (waste.cards.length === 0) return;
      stock.cards = waste.cards.reverse().map(c => ({ ...c, faceUp: false }));
      waste.cards = [];
      return;
    }

    const count = Math.min(drawMode, stock.cards.length);
    for (let i = 0; i < count; i++) {
      const card = stock.cards.pop()!;
      card.faceUp = true;
      waste.cards.push(card);
    }
  };

  const handleWasteTap = () => {
    if (waste.cards.length === 0) return;
    const card = waste.cards[waste.cards.length - 1];

    // Try foundation first
    const fi = tryAutoMoveToFoundation(card);
    if (fi >= 0) {
      waste.cards.pop();
      foundations[fi].cards.push(card);
      checkWin();
      return;
    }

    // Try tableau
    const ti = tryAutoMoveToTableau(card, -1);
    if (ti >= 0) {
      waste.cards.pop();
      tableau[ti].cards.push(card);
      return;
    }
  };

  const handleFoundationTap = (foundationIndex: number) => {
    const pile = foundations[foundationIndex];
    if (pile.cards.length === 0) return;
    const card = pile.cards[pile.cards.length - 1];

    // Try to move to tableau (usually for strategic moves)
    const ti = tryAutoMoveToTableau(card, -1);
    if (ti >= 0) {
      pile.cards.pop();
      tableau[ti].cards.push(card);
    }
  };

  const handleTableauTap = (colIndex: number, cardIndex: number) => {
    const pile = tableau[colIndex];
    if (cardIndex < 0 || cardIndex >= pile.cards.length) return;

    const card = pile.cards[cardIndex];
    if (!card.faceUp) return;

    const isTopCard = cardIndex === pile.cards.length - 1;

    if (isTopCard) {
      // Single card: try foundation first, then tableau
      const fi = tryAutoMoveToFoundation(card);
      if (fi >= 0) {
        pile.cards.pop();
        foundations[fi].cards.push(card);
        flipTopCard(pile);
        checkWin();
        return;
      }

      const ti = tryAutoMoveToTableau(card, colIndex);
      if (ti >= 0) {
        pile.cards.pop();
        tableau[ti].cards.push(card);
        flipTopCard(pile);
        return;
      }
    } else {
      // Multiple cards: move the sequence from cardIndex to top
      const cardsToMove = pile.cards.slice(cardIndex);
      const bottomCard = cardsToMove[0];

      const ti = tryAutoMoveToTableau(bottomCard, colIndex);
      if (ti >= 0) {
        pile.cards = pile.cards.slice(0, cardIndex);
        tableau[ti].cards.push(...cardsToMove);
        flipTopCard(pile);
        return;
      }
    }
  };

  // ============================================================
  // Win check
  // ============================================================

  const checkWin = () => {
    const totalFoundation = foundations.reduce((sum, f) => sum + f.cards.length, 0);
    if (totalFoundation === 52) {
      hasWon = true;
      score = Math.max(0, Math.floor(BASE_SCORE - elapsedSec * PENALTY_PER_SEC));
      state = 'gameover';
    }
  };

  // ============================================================
  // Auto-complete: when all tableau cards are face up, auto-finish
  // ============================================================

  const canAutoComplete = (): boolean => {
    // Stock and waste must be empty
    if (stock.cards.length > 0 || waste.cards.length > 0) return false;
    // All tableau cards must be face up
    for (const col of tableau) {
      for (const card of col.cards) {
        if (!card.faceUp) return false;
      }
    }
    return true;
  };

  let autoCompleteActive = false;
  let autoCompleteTimer = 0;
  const AUTO_COMPLETE_INTERVAL = 0.05; // seconds between moves

  const doAutoCompleteStep = (): boolean => {
    // Try to move any tableau top card or waste top card to a foundation
    for (const col of tableau) {
      if (col.cards.length === 0) continue;
      const card = col.cards[col.cards.length - 1];
      const fi = tryAutoMoveToFoundation(card);
      if (fi >= 0) {
        col.cards.pop();
        foundations[fi].cards.push(card);
        checkWin();
        return true;
      }
    }
    return false;
  };

  // ============================================================
  // Start / Reset / Pause
  // ============================================================

  const startGame = async () => {
    if (state !== 'start') return;
    state = 'loading';
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    state = 'playing';
    lastTime = 0;
    elapsedSec = 0;
    score = 0;
    autoCompleteActive = false;
    autoCompleteTimer = 0;
    dealCards();
  };

  const resetGame = () => {
    state = 'start';
    lastTime = 0;
    elapsedSec = 0;
    score = 0;
    hasWon = false;
    autoCompleteActive = false;
    autoCompleteTimer = 0;
    stock = { type: 'stock', index: 0, cards: [] };
    waste = { type: 'waste', index: 0, cards: [] };
    foundations = [0, 1, 2, 3].map(i => ({ type: 'foundation', index: i, cards: [] }));
    tableau = [0, 1, 2, 3, 4, 5, 6].map(i => ({ type: 'tableau', index: i, cards: [] }));
    gameOverHud.reset();
  };

  const toggleDrawMode = () => {
    drawMode = drawMode === 1 ? 3 : 1;
    if (state === 'playing') {
      // Reset stock/waste when toggling during game
      const allCards = [...stock.cards, ...waste.cards.reverse()];
      stock.cards = allCards.map(c => ({ ...c, faceUp: false }));
      waste.cards = [];
    }
  };

  // ============================================================
  // DPR / Resize
  // ============================================================

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(CANVAS_WIDTH * dpr);
    canvas.height = Math.round(CANVAS_HEIGHT * dpr);
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // ============================================================
  // Hit testing
  // ============================================================

  const getTouchPos = (touch: Touch) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  };

  const getMousePos = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const isInsideRect = (px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean =>
    px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;

  // Draw mode indicator position
  const drawModeIndicatorRect = () => {
    const x = wasteX() + CARD_WIDTH + 10;
    const y = TOP_ROW_Y + CARD_HEIGHT / 2 - 12;
    return { x, y, w: 55, h: 24 };
  };

  const handleClick = (x: number, y: number) => {
    if (state !== 'playing' || autoCompleteActive) return;

    // Check draw mode indicator tap
    const dmr = drawModeIndicatorRect();
    if (isInsideRect(x, y, dmr.x, dmr.y, dmr.w, dmr.h)) {
      toggleDrawMode();
      return;
    }

    // Check stock tap
    if (isInsideRect(x, y, stockX(), TOP_ROW_Y, CARD_WIDTH, CARD_HEIGHT)) {
      handleStockTap();
      return;
    }

    // Check waste tap
    if (isInsideRect(x, y, wasteX(), TOP_ROW_Y, CARD_WIDTH, CARD_HEIGHT)) {
      handleWasteTap();
      return;
    }

    // Check foundation taps
    for (let i = 0; i < 4; i++) {
      if (isInsideRect(x, y, foundationX(i), TOP_ROW_Y, CARD_WIDTH, CARD_HEIGHT)) {
        handleFoundationTap(i);
        return;
      }
    }

    // Check tableau taps (iterate from top card to bottom for overlap)
    for (let col = 0; col < 7; col++) {
      const pile = tableau[col];
      if (pile.cards.length === 0) {
        // Empty column - check if tapped the empty slot area
        if (isInsideRect(x, y, tableauX(col), TABLEAU_Y, CARD_WIDTH, CARD_HEIGHT)) {
          // Nothing to do on empty column tap
          return;
        }
        continue;
      }

      // Check from top card (last) to bottom (first)
      for (let i = pile.cards.length - 1; i >= 0; i--) {
        const cx = tableauX(col);
        const cy = tableauCardY(pile, i);
        const cardH = i === pile.cards.length - 1 ? CARD_HEIGHT : (pile.cards[i].faceUp ? CARD_OVERLAP_FACE_Y : CARD_OVERLAP_Y);

        if (isInsideRect(x, y, cx, cy, CARD_WIDTH, cardH)) {
          handleTableauTap(col, i);
          return;
        }
      }
    }
  };

  // ============================================================
  // Keyboard events
  // ============================================================

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (e.code === 'KeyS') {
      if (state === 'start') {
        startGame();
        return;
      }
      if (state === 'paused') {
        state = 'playing';
        lastTime = 0;
        return;
      }
      return;
    }

    if (e.code === 'KeyP' && state === 'playing') {
      state = 'paused';
      return;
    }

    if (state === 'gameover') {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    if (e.code === 'KeyR') {
      resetGame();
      return;
    }

    if (e.code === 'KeyD') {
      if (state === 'start' || state === 'playing') {
        toggleDrawMode();
      }
      return;
    }
  };

  // ============================================================
  // Touch events
  // ============================================================

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;

    const pos = getTouchPos(touch);

    // Game over: delegate to HUD
    if (state === 'gameover') {
      const handled = gameOverHud.onTouchStart(pos.x, pos.y, score);
      if (handled) return;
      return;
    }

    // Start screen: tap to start
    if (state === 'start') {
      startGame();
      return;
    }

    // Loading: ignore
    if (state === 'loading') return;

    // Paused: tap to resume
    if (state === 'paused') {
      state = 'playing';
      lastTime = 0;
      return;
    }

    // Playing: handle card/stock tap
    handleClick(pos.x, pos.y);
  };

  // ============================================================
  // Mouse click (desktop)
  // ============================================================

  const handleMouseDown = (e: MouseEvent) => {
    if (state !== 'playing') return;
    const pos = getMousePos(e);
    handleClick(pos.x, pos.y);
  };

  // ============================================================
  // Update
  // ============================================================

  const update = (t: number) => {
    if (state !== 'playing') return;

    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;
    dt = Math.min(dt, 0.05);

    elapsedSec += dt;

    // Auto-complete logic
    if (!autoCompleteActive && canAutoComplete()) {
      autoCompleteActive = true;
      autoCompleteTimer = 0;
    }

    if (autoCompleteActive && state === 'playing') {
      autoCompleteTimer += dt;
      while (autoCompleteTimer >= AUTO_COMPLETE_INTERVAL && state === 'playing') {
        autoCompleteTimer -= AUTO_COMPLETE_INTERVAL;
        if (!doAutoCompleteStep()) {
          autoCompleteActive = false;
          break;
        }
      }
    }
  };

  // ============================================================
  // Rendering
  // ============================================================

  const renderBackground = () => {
    ctx.fillStyle = TABLE_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  const renderCardBack = (x: number, y: number) => {
    ctx.save();
    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Card body
    ctx.fillStyle = CARD_BACK_COLOR;
    ctx.beginPath();
    ctx.roundRect(x, y, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Border
    ctx.strokeStyle = '#2a5a8c';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inner pattern
    ctx.fillStyle = CARD_BACK_PATTERN_COLOR;
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 4, CARD_WIDTH - 8, CARD_HEIGHT - 8, CARD_RADIUS - 2);
    ctx.fill();

    // Cross-hatch pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 4, CARD_WIDTH - 8, CARD_HEIGHT - 8, CARD_RADIUS - 2);
    ctx.clip();
    for (let i = -CARD_HEIGHT; i < CARD_WIDTH + CARD_HEIGHT; i += 8) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + CARD_HEIGHT, y + CARD_HEIGHT);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + i + CARD_HEIGHT, y);
      ctx.lineTo(x + i, y + CARD_HEIGHT);
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
  };

  const renderCardFace = (x: number, y: number, card: TCard, highlight: boolean) => {
    ctx.save();
    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Card body
    ctx.fillStyle = CARD_FRONT_COLOR;
    ctx.beginPath();
    ctx.roundRect(x, y, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Border
    if (highlight) {
      ctx.strokeStyle = HIGHLIGHT_COLOR;
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = CARD_BORDER_COLOR;
      ctx.lineWidth = 1;
    }
    ctx.stroke();

    // Rank and suit
    const color = suitColor(card.suit);
    const symbol = SUIT_SYMBOLS[card.suit];

    ctx.fillStyle = color;

    // Top-left rank
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(card.rank, x + 5, y + 4);

    // Top-left suit symbol
    ctx.font = '12px sans-serif';
    ctx.fillText(symbol, x + 5, y + 20);

    // Center suit symbol (large)
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2);

    // Bottom-right rank (rotated)
    ctx.save();
    ctx.translate(x + CARD_WIDTH - 5, y + CARD_HEIGHT - 4);
    ctx.rotate(Math.PI);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(card.rank, 0, 0);
    ctx.font = '12px sans-serif';
    ctx.fillText(symbol, 0, 16);
    ctx.restore();

    ctx.restore();
  };

  const renderEmptyPile = (x: number, y: number, label?: string) => {
    ctx.save();
    ctx.strokeStyle = EMPTY_PILE_COLOR;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.roundRect(x, y, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
    ctx.stroke();
    ctx.setLineDash([]);

    if (label) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2);
    }
    ctx.restore();
  };

  const renderStock = () => {
    const x = stockX();
    if (stock.cards.length === 0) {
      // Empty stock: show recycle indicator
      renderEmptyPile(x, TOP_ROW_Y);
      if (waste.cards.length > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u21BB', x + CARD_WIDTH / 2, TOP_ROW_Y + CARD_HEIGHT / 2);
        ctx.restore();
      }
    } else {
      // Show stacked cards effect
      if (stock.cards.length > 4) {
        renderCardBack(x + 2, TOP_ROW_Y - 2);
      }
      if (stock.cards.length > 2) {
        renderCardBack(x + 1, TOP_ROW_Y - 1);
      }
      renderCardBack(x, TOP_ROW_Y);

      // Card count
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${stock.cards.length}`, x + CARD_WIDTH / 2, TOP_ROW_Y + CARD_HEIGHT + 14);
      ctx.restore();
    }
  };

  const renderWaste = () => {
    const x = wasteX();
    if (waste.cards.length === 0) {
      renderEmptyPile(x, TOP_ROW_Y);
    } else {
      // Show only top card (or top 3 slightly fanned in draw-3 mode)
      if (drawMode === 3 && waste.cards.length >= 3) {
        const start = waste.cards.length - 3;
        for (let i = 0; i < 3; i++) {
          const card = waste.cards[start + i];
          const offsetX = i * 15;
          renderCardFace(x + offsetX, TOP_ROW_Y, card, i === 2);
        }
      } else if (drawMode === 3 && waste.cards.length === 2) {
        renderCardFace(x, TOP_ROW_Y, waste.cards[0], false);
        renderCardFace(x + 15, TOP_ROW_Y, waste.cards[1], true);
      } else {
        renderCardFace(x, TOP_ROW_Y, waste.cards[waste.cards.length - 1], false);
      }
    }
  };

  const renderFoundations = () => {
    for (let i = 0; i < 4; i++) {
      const x = foundationX(i);
      const pile = foundations[i];
      const suitSymbol = SUIT_SYMBOLS[FOUNDATION_SUIT_ORDER[i]];

      if (pile.cards.length === 0) {
        renderEmptyPile(x, TOP_ROW_Y, suitSymbol);
      } else {
        const top = pile.cards[pile.cards.length - 1];
        renderCardFace(x, TOP_ROW_Y, top, false);
      }
    }
  };

  const renderTableau = () => {
    for (let col = 0; col < 7; col++) {
      const x = tableauX(col);
      const pile = tableau[col];

      if (pile.cards.length === 0) {
        renderEmptyPile(x, TABLEAU_Y, 'K');
        continue;
      }

      for (let i = 0; i < pile.cards.length; i++) {
        const card = pile.cards[i];
        const y = tableauCardY(pile, i);

        if (card.faceUp) {
          renderCardFace(x, y, card, false);
        } else {
          renderCardBack(x, y);
        }
      }
    }
  };

  const renderGameHud = () => {
    const hudY = CANVAS_HEIGHT - 35;

    ctx.save();

    // Background bar
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, CANVAS_HEIGHT - 45, CANVAS_WIDTH, 45);

    // Time
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const minutes = Math.floor(elapsedSec / 60);
    const seconds = Math.floor(elapsedSec % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    ctx.fillText(`Time: ${timeStr}`, 15, hudY);

    // Score projection
    const projectedScore = Math.max(0, Math.floor(BASE_SCORE - elapsedSec * PENALTY_PER_SEC));
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${projectedScore.toLocaleString()}`, CANVAS_WIDTH / 2, hudY);

    // Draw mode indicator
    ctx.textAlign = 'right';
    const dmr = drawModeIndicatorRect();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(dmr.x, dmr.y, dmr.w, dmr.h, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Draw ${drawMode}`, dmr.x + dmr.w / 2, dmr.y + dmr.h / 2);

    // Auto-complete indicator
    if (autoCompleteActive) {
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Auto-completing...', CANVAS_WIDTH / 2, TABLEAU_Y - 15);
    }

    ctx.restore();
  };

  const renderWinMessage = () => {
    if (!hasWon) return;

    ctx.save();
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YOU WIN!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 120);
    ctx.restore();
  };

  const render = () => {
    renderBackground();

    if (state === 'playing' || state === 'gameover' || state === 'paused') {
      renderStock();
      renderWaste();
      renderFoundations();
      renderTableau();

      if (state === 'playing') {
        renderGameHud();
      }

      if (state === 'gameover') {
        renderWinMessage();
      }
    }
  };

  const drawHud = () => {
    if (state === 'start') {
      // Render a preview background first
      renderBackground();

      // Draw mode indicator on start screen
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Draw Mode: ${drawMode}  (D to toggle)`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
      ctx.restore();

      gameStartHud(canvas, ctx);
      return;
    }

    if (state === 'loading') {
      renderBackground();
      gameLoadingHud(canvas, ctx);
      return;
    }

    if (state === 'gameover') {
      gameOverHud.render(score);
      return;
    }

    if (state === 'paused') {
      gamePauseHud(canvas, ctx);
      return;
    }
  };

  // ============================================================
  // Main loop
  // ============================================================

  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();
    drawHud();
    raf = requestAnimationFrame(draw);
  };

  resize();
  raf = requestAnimationFrame(draw);

  // ============================================================
  // Event listeners
  // ============================================================

  window.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('mousedown', handleMouseDown);

  // ============================================================
  // Cleanup
  // ============================================================

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('mousedown', handleMouseDown);
  };
};
