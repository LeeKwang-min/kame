import {
  createGameOverHud,
  gameHud,
  gameLoadingHud,
  gamePauseHud,
  gameStartHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import { CELL, DIR, INPUT_BUFFER_SIZE, STEP } from './config';
import { Point } from './types';

export type TSnakeCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setupSnake = (
  canvas: HTMLCanvasElement,
  callbacks?: TSnakeCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let snake: Point[] = [{ x: 0, y: 0 }];
  let dir: Point = { x: 0, y: 0 };
  let food: Point = { x: 0, y: 0 };

  // 입력 버퍼 (빠른 연속 입력 처리)
  let inputBuffer: Point[] = [];

  // 보간용 변수
  let moveProgress = 0; // 0~1 사이, 현재 이동 진행률
  let prevSnake: Point[] = [{ x: 0, y: 0 }]; // 이전 프레임의 뱀 위치 (보간용)

  let score = 0;
  let isStarted = false;
  let isLoading = false;
  let isGameOver = false;
  let isPaused = false;

  let lastTime = 0;
  let acc = 0;
  let sec = 0;

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

  const gameOverHud = createGameOverHud(canvas, ctx, 'snake', gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  const spawnFood = (): Point => {
    const rect = canvas.getBoundingClientRect();
    const cols = Math.floor(rect.width / CELL);
    const rows = Math.floor(rect.height / CELL);
    const head = snake[0];

    // 유효한 위치 후보 수집 (테두리 제외, 뱀 위치 제외)
    const candidates: Point[] = [];
    for (let c = 1; c < cols - 1; c++) {
      for (let r = 1; r < rows - 1; r++) {
        const x = c * CELL;
        const y = r * CELL;
        const onSnake = snake.some((seg) => seg.x === x && seg.y === y);
        if (!onSnake) {
          candidates.push({ x, y });
        }
      }
    }

    if (candidates.length === 0) {
      // 폴백: 후보가 없으면 중앙
      return { x: Math.floor(cols / 2) * CELL, y: Math.floor(rows / 2) * CELL };
    }

    // 머리로부터의 거리 계산 후 정렬
    const withDistance = candidates.map((p) => ({
      point: p,
      dist: Math.abs(p.x - head.x) + Math.abs(p.y - head.y),
    }));
    withDistance.sort((a, b) => a.dist - b.dist);

    // 가까운 위치들 중에서 랜덤 선택 (상위 40% 또는 최소 5개)
    const nearCount = Math.max(5, Math.floor(candidates.length * 0.4));
    const nearCandidates = withDistance.slice(0, nearCount);
    const selected = nearCandidates[Math.floor(Math.random() * nearCandidates.length)];

    return selected.point;
  };

  const startGame = async () => {
    if (isStarted || isLoading) return;
    isLoading = true;
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    isLoading = false;
    isStarted = true;
    lastTime = 0;
    acc = 0;
    sec = 0;
  };

  const resetGame = () => {
    const rect = canvas.getBoundingClientRect();

    isStarted = false;
    isGameOver = false;
    isPaused = false;
    score = 0;
    lastTime = 0;
    acc = 0;
    sec = 0;
    moveProgress = 0;
    inputBuffer = [];
    gameOverHud.reset();

    const startX = Math.floor(rect.width / 2 / CELL) * CELL;
    const startY = Math.floor(rect.height / 2 / CELL) * CELL;

    snake = [
      { x: startX, y: startY },
      { x: startX - CELL, y: startY },
      { x: startX - CELL * 2, y: startY },
    ];
    prevSnake = snake.map((seg) => ({ ...seg }));
    dir = { x: 1, y: 0 };

    food = spawnFood();
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, rect.width, rect.height);

    resetGame();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'KeyS') {
      if (isPaused) {
        isPaused = false;
        lastTime = 0;
        return;
      }
      startGame();
      return;
    }

    if (e.code === 'KeyP' && isStarted && !isGameOver) {
      isPaused = true;
      return;
    }

    if (isGameOver) {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    if (e.code === 'KeyR' && !isGameOver && !isPaused) {
      resetGame();
      return;
    }

    if (isPaused) return;

    if (e.key in DIR) {
      // 방향키는 항상 기본 동작(스크롤) 방지
      e.preventDefault();

      const cand = DIR[e.key as keyof typeof DIR];

      // 현재 방향 또는 대기 중인 방향과 반대 방향인지 체크
      const lastDir = inputBuffer.length > 0 ? inputBuffer[inputBuffer.length - 1] : dir;
      if (cand.x + lastDir.x === 0 && cand.y + lastDir.y === 0) return;

      // 같은 방향 중복 입력 방지
      if (cand.x === lastDir.x && cand.y === lastDir.y) return;

      // 버퍼에 추가 (최대 크기 제한)
      if (inputBuffer.length < INPUT_BUFFER_SIZE) {
        inputBuffer.push(cand);
      } else {
        // 버퍼가 가득 차면 마지막 입력 교체
        inputBuffer[inputBuffer.length - 1] = cand;
      }
    }
  };

  const handleWallCollision = (newHead: Point): boolean => {
    const rect = canvas.getBoundingClientRect();
    return (
      newHead.x < 0 ||
      newHead.y < 0 ||
      newHead.x >= Math.floor(rect.width / CELL) * CELL ||
      newHead.y >= Math.floor(rect.height / CELL) * CELL
    );
  };

  const handleSelfCollision = (newHead: Point): boolean => {
    return snake.some(
      (seg, i) => i > 0 && seg.x === newHead.x && seg.y === newHead.y,
    );
  };

  const handleFoodCollision = (newHead: Point): boolean => {
    return newHead.x === food.x && newHead.y === food.y;
  };

  const updateSnake = () => {
    // 이전 위치 저장 (보간용)
    prevSnake = snake.map((seg) => ({ ...seg }));

    // 입력 버퍼에서 다음 방향 가져오기
    if (inputBuffer.length > 0) {
      const nextInput = inputBuffer.shift()!;
      // 반대 방향이 아닌지 다시 체크 (안전장치)
      if (!(nextInput.x + dir.x === 0 && nextInput.y + dir.y === 0)) {
        dir = nextInput;
      }
    }

    const head = snake[0];
    const newHead = { x: head.x + dir.x * CELL, y: head.y + dir.y * CELL };

    if (handleWallCollision(newHead)) {
      isGameOver = true;
      return;
    }

    if (handleSelfCollision(newHead)) {
      isGameOver = true;
      return;
    }

    snake = [newHead, ...snake];

    if (handleFoodCollision(newHead)) {
      score += 1;
      food = spawnFood();
    } else {
      snake = snake.slice(0, -1);
    }

    // 이동 진행률 리셋
    moveProgress = 0;
  };

  const update = (t: number) => {
    if (isPaused) return;

    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);
    acc += dt;
    sec += dt;

    if (isStarted && !isGameOver) {
      // 이동 진행률 업데이트 (보간용)
      moveProgress = Math.min(acc / STEP, 1);

      while (acc >= STEP) {
        updateSnake();
        acc -= STEP;
        if (isGameOver) break;
      }
    }
  };


  const renderGrid = () => {
    const rect = canvas.getBoundingClientRect();
    const cols = Math.floor(rect.width / CELL);
    const rows = Math.floor(rect.height / CELL);

    // 체커보드 패턴 그리드 (잔디밭 느낌)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((c + r) % 2 === 0) {
          ctx.fillStyle = '#a8d5a2'; // 밝은 잔디
        } else {
          ctx.fillStyle = '#8fc786'; // 어두운 잔디
        }
        ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
      }
    }
  };

  // 보간된 위치 계산
  const getInterpolatedPos = (current: Point, prev: Point | undefined): Point => {
    if (!prev || !isStarted || isGameOver) {
      return current;
    }

    // easeOutQuad로 더 부드러운 느낌
    const t = moveProgress;
    const eased = t * (2 - t);

    return {
      x: prev.x + (current.x - prev.x) * eased,
      y: prev.y + (current.y - prev.y) * eased,
    };
  };

  const GAP = 2; // 세그먼트 사이 간격

  const renderSnakeHead = (pos: Point) => {
    const gap = GAP;
    const size = CELL - gap * 2;
    const cx = pos.x + CELL / 2;
    const cy = pos.y + CELL / 2;
    const radius = size / 2;

    ctx.fillStyle = '#5C6BC0'; // 인디고 블루

    // 방향에 따른 둥근 머리 모양 (사각형 + 반원)
    ctx.beginPath();
    if (dir.x === 1) {
      // 오른쪽
      ctx.rect(pos.x + gap, pos.y + gap, size / 2, size);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pos.x + gap + size / 2, cy, radius, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
    } else if (dir.x === -1) {
      // 왼쪽
      ctx.rect(pos.x + gap + size / 2, pos.y + gap, size / 2, size);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pos.x + gap + size / 2, cy, radius, Math.PI / 2, -Math.PI / 2);
      ctx.fill();
    } else if (dir.y === -1) {
      // 위
      ctx.rect(pos.x + gap, pos.y + gap + size / 2, size, size / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, pos.y + gap + size / 2, radius, Math.PI, 0);
      ctx.fill();
    } else if (dir.y === 1) {
      // 아래
      ctx.rect(pos.x + gap, pos.y + gap, size, size / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, pos.y + gap + size / 2, radius, 0, Math.PI);
      ctx.fill();
    } else {
      // 정지 상태 (기본 오른쪽)
      ctx.rect(pos.x + gap, pos.y + gap, size / 2, size);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pos.x + gap + size / 2, cy, radius, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
    }

    // 눈 그리기
    ctx.fillStyle = '#fff';
    const eyeSize = 4;
    const pupilSize = 2;
    let eye1x: number, eye1y: number, eye2x: number, eye2y: number;

    if (dir.x === 1) {
      eye1x = cx + 3;
      eye1y = cy - 5;
      eye2x = cx + 3;
      eye2y = cy + 5;
    } else if (dir.x === -1) {
      eye1x = cx - 3;
      eye1y = cy - 5;
      eye2x = cx - 3;
      eye2y = cy + 5;
    } else if (dir.y === -1) {
      eye1x = cx - 5;
      eye1y = cy - 3;
      eye2x = cx + 5;
      eye2y = cy - 3;
    } else if (dir.y === 1) {
      eye1x = cx - 5;
      eye1y = cy + 3;
      eye2x = cx + 5;
      eye2y = cy + 3;
    } else {
      eye1x = cx + 3;
      eye1y = cy - 5;
      eye2x = cx + 3;
      eye2y = cy + 5;
    }

    // 흰자
    ctx.beginPath();
    ctx.arc(eye1x, eye1y, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eye2x, eye2y, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    // 눈동자
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(eye1x + dir.x * 1.5, eye1y + dir.y * 1.5, pupilSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eye2x + dir.x * 1.5, eye2y + dir.y * 1.5, pupilSize, 0, Math.PI * 2);
    ctx.fill();
  };

  const renderSnakeTail = (pos: Point, tailDir: Point) => {
    const gap = GAP;
    const size = CELL - gap * 2;
    const cx = pos.x + CELL / 2;
    const cy = pos.y + CELL / 2;
    const radius = size / 2;

    // 꼬리 색상 (가장 어두운 몸통 색) - 인디고 블루 계열
    const darkness = Math.min(snake.length * 3, 40);
    const r = Math.max(92 - darkness, 50);
    const g = Math.max(107 - darkness, 60);
    const b = Math.max(192 - darkness, 140);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

    // 꼬리 방향 반대쪽으로 둥글게 (사각형 + 반원)
    ctx.beginPath();
    if (tailDir.x === 1) {
      // 몸통이 오른쪽 → 꼬리는 왼쪽으로 둥글게
      ctx.rect(pos.x + gap + size / 2, pos.y + gap, size / 2, size);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pos.x + gap + size / 2, cy, radius, Math.PI / 2, -Math.PI / 2);
      ctx.fill();
    } else if (tailDir.x === -1) {
      // 몸통이 왼쪽 → 꼬리는 오른쪽으로 둥글게
      ctx.rect(pos.x + gap, pos.y + gap, size / 2, size);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pos.x + gap + size / 2, cy, radius, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
    } else if (tailDir.y === -1) {
      // 몸통이 위 → 꼬리는 아래로 둥글게
      ctx.rect(pos.x + gap, pos.y + gap, size, size / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, pos.y + gap + size / 2, radius, 0, Math.PI);
      ctx.fill();
    } else if (tailDir.y === 1) {
      // 몸통이 아래 → 꼬리는 위로 둥글게
      ctx.rect(pos.x + gap, pos.y + gap + size / 2, size, size / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, pos.y + gap + size / 2, radius, Math.PI, 0);
      ctx.fill();
    } else {
      // 기본 (왼쪽으로 둥글게)
      ctx.rect(pos.x + gap + size / 2, pos.y + gap, size / 2, size);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pos.x + gap + size / 2, cy, radius, Math.PI / 2, -Math.PI / 2);
      ctx.fill();
    }
  };

  const renderSnake = () => {
    // 뱀이 2칸 이상일 때만 꼬리 그리기
    if (snake.length >= 2) {
      const tailIdx = snake.length - 1;
      const tail = snake[tailIdx];
      const prevTail = prevSnake[tailIdx];
      const beforeTail = snake[tailIdx - 1];

      if (tail && beforeTail) {
        const pos = getInterpolatedPos(tail, prevTail);
        // 꼬리 방향: 마지막에서 두번째 세그먼트를 향하는 방향
        const tailDir = {
          x: Math.sign(beforeTail.x - tail.x),
          y: Math.sign(beforeTail.y - tail.y),
        };
        renderSnakeTail(pos, tailDir);
      }
    }

    // 몸통 그리기 (꼬리와 머리 제외)
    const gap = GAP;
    const size = CELL - gap * 2;
    for (let i = snake.length - 2; i >= 1; i--) {
      const seg = snake[i];
      const prevSeg = prevSnake[i];
      const pos = getInterpolatedPos(seg, prevSeg);

      // 몸통 그라데이션 (머리에서 멀어질수록 어두워짐) - 인디고 블루 계열
      const darkness = Math.min(i * 3, 40);
      const r = Math.max(92 - darkness, 50);
      const g = Math.max(107 - darkness, 60);
      const b = Math.max(192 - darkness, 140);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

      // 둥근 사각형으로 몸통 그리기
      ctx.beginPath();
      ctx.roundRect(pos.x + gap, pos.y + gap, size, size, 4);
      ctx.fill();
    }

    // 머리 그리기
    const head = snake[0];
    const prevHead = prevSnake[0];
    if (head) {
      const pos = getInterpolatedPos(head, prevHead);
      renderSnakeHead(pos);
    }
  };

  const renderFood = () => {
    const cx = food.x + CELL / 2;
    const cy = food.y + CELL / 2;
    const radius = CELL / 2 - 4;

    // 사과 본체 (빨간색)
    ctx.fillStyle = '#E53935';
    ctx.beginPath();
    ctx.arc(cx, cy + 2, radius, 0, Math.PI * 2);
    ctx.fill();

    // 하이라이트 (광택)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 2, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // 줄기 (갈색)
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius + 2);
    ctx.lineTo(cx + 1, cy - radius - 4);
    ctx.stroke();

    // 잎 (초록색)
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.ellipse(cx + 5, cy - radius - 2, 5, 3, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  };

  const render = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    renderGrid();
    renderSnake();
    renderFood();
  };

  const drawHud = () => {
    if (!isStarted) {
      if (isLoading) {
        gameLoadingHud(canvas, ctx);
      } else {
        gameStartHud(canvas, ctx);
      }
      return;
    }

    if (isGameOver) {
      gameOverHud.render(score);
      return;
    }

    if (isPaused) {
      gamePauseHud(canvas, ctx);
      return;
    }

    gameHud(ctx, score, sec);
  };

  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();
    drawHud();

    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  resize();
  window.addEventListener('keydown', onKeyDown);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
  };
};
