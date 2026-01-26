import { TPlayer, TGoal } from './types';
import { LEVELS } from './levels';
import {
  MAP_COLS,
  MAP_ROWS,
  PLAYER_WIDTH_RATIO,
  PLAYER_HEIGHT_RATIO,
  PLAYER_SPEED_RATIO,
  GRAVITY_RATIO,
  JUMP_FORCE_RATIO,
  MAX_FALL_SPEED_RATIO,
  COLORS,
} from './config';

export const setupPlatformer = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ==================== 반응형 크기 계산 ====================

  // 동적으로 계산되는 값들
  let tileSize = 40;
  let playerWidth = 30;
  let playerHeight = 40;
  let playerSpeed = 200;
  let gravity = 1200;
  let jumpForce = -500;
  let maxFallSpeed = 600;

  // 캔버스 크기에 따라 타일 크기 계산
  const calculateSizes = () => {
    const rect = canvas.getBoundingClientRect();

    // 캔버스에 맞는 타일 크기 계산 (여백 고려)
    const tileSizeW = Math.floor(rect.width / MAP_COLS);
    const tileSizeH = Math.floor(rect.height / MAP_ROWS);
    tileSize = Math.min(tileSizeW, tileSizeH);

    // 타일 크기 기반으로 다른 값들 계산
    playerWidth = tileSize * PLAYER_WIDTH_RATIO;
    playerHeight = tileSize * PLAYER_HEIGHT_RATIO;
    playerSpeed = tileSize * PLAYER_SPEED_RATIO;
    gravity = tileSize * GRAVITY_RATIO;
    jumpForce = tileSize * JUMP_FORCE_RATIO;
    maxFallSpeed = tileSize * MAX_FALL_SPEED_RATIO;
  };

  // ==================== State ====================

  // 키 입력 (좌우 + 점프)
  const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    Space: false,
  };

  // 현재 레벨 맵
  let levelIndex = 0;
  let level = LEVELS[levelIndex];

  // 플레이어
  let player: TPlayer = {
    x: 0,
    y: 0,
    width: playerWidth,
    height: playerHeight,
    vx: 0,
    vy: 0,
    isGrounded: false,
    facingRight: true,
  };

  // 탈출구
  let goal: TGoal = { x: 0, y: 0, width: tileSize, height: tileSize };

  // 게임 상태
  let isStarted = false;
  let isGameOver = false;
  let isCleared = false; // 클리어 여부
  let lastTime = 0;
  let sec = 0;

  // ==================== Game State ====================

  // ==================== 맵 초기화 ====================

  // 맵에서 특정 타일 위치 찾기
  const findTilePosition = (tileType: number): { x: number; y: number } | null => {
    for (let row = 0; row < level.length; row++) {
      for (let col = 0; col < level[row].length; col++) {
        if (level[row][col] === tileType) {
          return { x: col * tileSize, y: row * tileSize };
        }
      }
    }
    return null;
  };

  // 특정 위치의 타일 가져오기 (경계 체크 포함)
  const getTile = (col: number, row: number): number => {
    if (row < 0 || row >= level.length) return 1; // 맵 밖은 벽 취급
    if (col < 0 || col >= level[0].length) return 1;
    return level[row][col];
  };

  const startGame = () => {
    if (isStarted) return;
    isStarted = true;
    lastTime = 0;
    sec = 0;

    level = LEVELS[levelIndex];
  };

  const resetGame = () => {
    isStarted = false;
    isGameOver = false;
    isCleared = false;
    lastTime = 0;
    sec = 0;

    // 시작 위치 찾기 (타일 타입 2)
    const startPos = findTilePosition(2);
    if (startPos) {
      player = {
        x: startPos.x + (tileSize - playerWidth) / 2, // 타일 중앙에 배치
        y: startPos.y + tileSize - playerHeight, // 타일 위에 서도록
        width: playerWidth,
        height: playerHeight,
        vx: 0,
        vy: 0,
        isGrounded: false,
        facingRight: true,
      };
    }

    // 골 위치 찾기 (타일 타입 3)
    const goalPos = findTilePosition(3);
    if (goalPos) {
      goal = {
        x: goalPos.x,
        y: goalPos.y,
        width: tileSize,
        height: tileSize,
      };
    }
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // 반응형 크기 재계산
    calculateSizes();

    resetGame();
  };

  // ==================== Input Handlers ====================

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'KeyS') {
      startGame();
      return;
    }

    if (e.code === 'KeyR') {
      resetGame();
      return;
    }

    // 좌우 이동
    if (e.code === 'ArrowLeft') {
      keys.ArrowLeft = true;
      e.preventDefault();
    }
    if (e.code === 'ArrowRight') {
      keys.ArrowRight = true;
      e.preventDefault();
    }

    // 점프 (위 화살표 또는 스페이스)
    if (e.code === 'ArrowUp' || e.code === 'Space') {
      keys.ArrowUp = true;
      keys.Space = true;
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight') keys.ArrowRight = false;
    if (e.code === 'ArrowUp' || e.code === 'Space') {
      keys.ArrowUp = false;
      keys.Space = false;
    }
  };

  // ==================== Update Functions ====================
  // 플레이어 수평 이동
  const updatePlayerMovement = () => {
    // 입력에 따른 속도 설정
    if (keys.ArrowLeft) {
      player.vx = -playerSpeed;
      player.facingRight = false;
    } else if (keys.ArrowRight) {
      player.vx = playerSpeed;
      player.facingRight = true;
    } else {
      player.vx = 0; // 입력 없으면 정지
    }
  };

  // 점프 처리
  const updatePlayerJump = () => {
    // 바닥에 있을 때만 점프 가능
    if ((keys.ArrowUp || keys.Space) && player.isGrounded) {
      player.vy = jumpForce;
      player.isGrounded = false;
    }
  };

  // 중력 적용
  const applyGravity = (dt: number) => {
    player.vy += gravity * dt;

    // 최대 낙하 속도 제한
    if (player.vy > maxFallSpeed) {
      player.vy = maxFallSpeed;
    }
  };

  // 타일 충돌 처리 (X축)
  const handleTileCollisionX = () => {
    // 이동 후 위치 적용
    const newX = player.x + player.vx * (1 / 60); // 예상 dt

    // 플레이어의 타일 좌표 범위 계산
    const leftCol = Math.floor(newX / tileSize);
    const rightCol = Math.floor((newX + player.width - 1) / tileSize);
    const topRow = Math.floor(player.y / tileSize);
    const bottomRow = Math.floor((player.y + player.height - 1) / tileSize);

    // 각 타일 체크
    for (let row = topRow; row <= bottomRow; row++) {
      for (let col = leftCol; col <= rightCol; col++) {
        const tile = getTile(col, row);
        if (tile === 1) {
          // 벽과 충돌!
          if (player.vx > 0) {
            // 오른쪽으로 이동 중 → 왼쪽 벽에 붙임
            player.x = col * tileSize - player.width;
          } else if (player.vx < 0) {
            // 왼쪽으로 이동 중 → 오른쪽 벽에 붙임
            player.x = (col + 1) * tileSize;
          }
          player.vx = 0;
          return;
        }
      }
    }

    // 충돌 없으면 이동
    player.x = newX;
  };

  // 타일 충돌 처리 (Y축)
  const handleTileCollisionY = (dt: number) => {
    const newY = player.y + player.vy * dt;

    const leftCol = Math.floor(player.x / tileSize);
    const rightCol = Math.floor((player.x + player.width - 1) / tileSize);
    const topRow = Math.floor(newY / tileSize);
    const bottomRow = Math.floor((newY + player.height - 1) / tileSize);

    player.isGrounded = false; // 일단 공중 상태로

    for (let row = topRow; row <= bottomRow; row++) {
      for (let col = leftCol; col <= rightCol; col++) {
        const tile = getTile(col, row);
        if (tile === 1) {
          if (player.vy > 0) {
            // 아래로 떨어지는 중 → 바닥에 착지
            player.y = row * tileSize - player.height;
            player.vy = 0;
            player.isGrounded = true;
          } else if (player.vy < 0) {
            // 위로 점프 중 → 천장에 부딪힘
            player.y = (row + 1) * tileSize;
            player.vy = 0;
          }
          return;
        }
      }
    }

    // 충돌 없으면 이동
    player.y = newY;
  };

  // 골(탈출구) 도달 체크
  const checkGoalReached = (): boolean => {
    // AABB 충돌 체크
    return (
      player.x < goal.x + goal.width &&
      player.x + player.width > goal.x &&
      player.y < goal.y + goal.height &&
      player.y + player.height > goal.y
    );
  };

  const nextLevel = () => {
    if (levelIndex < LEVELS.length - 1) {
      levelIndex++;
      level = LEVELS[levelIndex];
      resetGame();
    } else {
      isCleared = true;
      isGameOver = true;
    }
  }

  const update = (t: number) => {
    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05); // 프레임 드랍 방지
    sec += dt;

    if (isStarted && !isGameOver && !isCleared) {
      updatePlayerMovement();
      updatePlayerJump();
      applyGravity(dt);

      // 충돌 처리 (X → Y 순서)
      handleTileCollisionX();
      handleTileCollisionY(dt);

      // 골 도달 체크
      if (checkGoalReached()) {
        nextLevel();
      }
    }
  };

  // ==================== Render Functions ====================


  // 맵 타일 그리기
  const renderTiles = () => {
    for (let row = 0; row < level.length; row++) {
      for (let col = 0; col < level[row].length; col++) {
        const tile = level[row][col];
        const x = col * tileSize;
        const y = row * tileSize;

        if (tile === 1) {
          // 벽/바닥
          ctx.fillStyle = COLORS.tile;
          ctx.fillRect(x, y, tileSize, tileSize);

          // 테두리 (입체감)
          ctx.strokeStyle = '#654321';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, tileSize, tileSize);
        }
      }
    }
  };

  // 골(탈출구) 그리기
  const renderGoal = () => {
    ctx.fillStyle = COLORS.goal;
    ctx.fillRect(goal.x, goal.y, goal.width, goal.height);

    // 별 모양 또는 깃발 등으로 표시
    ctx.fillStyle = '#FFA500';
    const fontSize = Math.max(16, tileSize * 0.6);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('★', goal.x + goal.width / 2, goal.y + goal.height / 2 + fontSize * 0.3);
  };

  // 플레이어 그리기
  const renderPlayer = () => {
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // 눈 (방향 표시) - 크기를 비율로 계산
    const eyeSize = player.width * 0.25;
    const eyeY = player.y + player.height * 0.2;
    ctx.fillStyle = 'white';
    const eyeX = player.facingRight
      ? player.x + player.width - eyeSize - player.width * 0.1
      : player.x + player.width * 0.1;
    ctx.fillRect(eyeX, eyeY, eyeSize, eyeSize);

    // 눈동자
    ctx.fillStyle = 'black';
    const pupilSize = eyeSize * 0.5;
    const pupilOffset = player.facingRight ? eyeSize * 0.5 : 0;
    ctx.fillRect(eyeX + pupilOffset, eyeY + eyeSize * 0.25, pupilSize, pupilSize);
  };

  // 레벨 표시
  const renderLevelInfo = () => {
    const fontSize = Math.max(14, tileSize * 0.4);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`Level ${levelIndex + 1} / ${LEVELS.length}`, 10, fontSize + 5);
  };

  // 클리어 화면
  const renderCleared = () => {
    if (!isCleared) return;

    const rect = canvas.getBoundingClientRect();
    const titleSize = Math.max(24, tileSize * 0.9);
    const textSize = Math.max(14, tileSize * 0.45);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${titleSize}px sans-serif`;
    ctx.textAlign = 'center';

    if (levelIndex >= LEVELS.length - 1 && isGameOver) {
      // 모든 레벨 클리어
      ctx.fillText('ALL CLEAR!', rect.width / 2, rect.height / 2 - titleSize * 0.5);
      ctx.fillStyle = 'white';
      ctx.font = `${textSize}px sans-serif`;
      ctx.fillText('Congratulations!', rect.width / 2, rect.height / 2 + textSize);
    } else {
      ctx.fillText(`LEVEL ${levelIndex} CLEAR!`, rect.width / 2, rect.height / 2 - titleSize * 0.5);
    }

    ctx.fillStyle = 'white';
    ctx.font = `${textSize}px sans-serif`;
    ctx.fillText(`Time: ${sec.toFixed(2)}s`, rect.width / 2, rect.height / 2 + textSize * 1.5);
    ctx.fillText('Press R to restart', rect.width / 2, rect.height / 2 + textSize * 3);
  };

  // 시작 화면
  const renderStart = () => {
    if (isStarted || isGameOver || isCleared) return;

    const rect = canvas.getBoundingClientRect();
    const titleSize = Math.max(18, tileSize * 0.6);
    const textSize = Math.max(12, tileSize * 0.4);

    ctx.fillStyle = '#333';
    ctx.font = `${titleSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`Level ${levelIndex + 1}`, rect.width / 2, rect.height / 2 - titleSize);
    ctx.fillText('Press S to start', rect.width / 2, rect.height / 2);
    ctx.font = `${textSize}px sans-serif`;
    ctx.fillText('← → : Move, ↑ or Space : Jump', rect.width / 2, rect.height / 2 + titleSize);
  };

  const render = () => {
    const rect = canvas.getBoundingClientRect();

    // 배경
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, rect.width, rect.height);

    renderTiles();
    renderGoal();
    renderPlayer();
    renderLevelInfo();
    renderCleared();
    renderStart();
  };

  // ==================== Game Loop ====================

  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();

    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
};
