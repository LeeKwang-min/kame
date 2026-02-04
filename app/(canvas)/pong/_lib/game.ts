import { TBall, TGameMode, TGamePhase, TPaddle, TDifficulty } from './types';
import {
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_MARGIN,
  PADDLE_SPEED,
  BALL_RADIUS,
  BALL_SPEED,
  BALL_SPEED_INCREASE,
  WIN_SCORE,
  AI_SPEED,
  AI_DEADZONE,
  AI_ERROR_CHANCE,
} from './config';
import { circleRectHit, isPointInRect } from '@/lib/utils';
import { gamePauseHud } from '@/lib/game';

export const setupPong = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ==================== State ====================

  // Player 1 키 (W, S)
  const p1Keys = { w: false, s: false };
  // Player 2 키 (방향키)
  const p2Keys = { ArrowUp: false, ArrowDown: false };

  // 공 상태
  let ball: TBall = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
  };

  // 패들 상태 (왼쪽: P1, 오른쪽: P2)
  let paddle1: TPaddle = {
    x: 0,
    y: 0,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
  };
  let paddle2: TPaddle = {
    x: 0,
    y: 0,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
  };

  // 점수
  let score = { p1: 0, p2: 0 };

  let phase: TGamePhase = 'menu';
  let mode: TGameMode = 'multi';
  let difficulty: TDifficulty = 'normal';
  let winner: 'p1' | 'p2' | null = null;
  let isPaused = false;

  let lastTime = 0;
  let sec = 0;

  let singleBtn = { x: 0, y: 0, width: 200, height: 60 };
  let multiBtn = { x: 0, y: 0, width: 200, height: 60 };

  // 난이도 버튼 추가
  let easyBtn = { x: 0, y: 0, width: 150, height: 50 };
  let normalBtn = { x: 0, y: 0, width: 150, height: 50 };
  let hardBtn = { x: 0, y: 0, width: 150, height: 50 };

  let mouseX = 0;
  let mouseY = 0;

  // ==================== Game State ====================

  // 메뉴 버튼 위치 계산
  const updateButtonPositions = () => {
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // === 모드 선택 버튼 (가로 배치) ===
    const modeBtnWidth = 180;
    const modeBtnHeight = 60;
    const modeGap = 16;
    const modeTotalWidth = modeBtnWidth * 2 + modeGap;

    singleBtn = {
      x: centerX - modeTotalWidth / 2,
      y: centerY - modeBtnHeight / 2,
      width: modeBtnWidth,
      height: modeBtnHeight,
    };

    multiBtn = {
      x: centerX + modeGap / 2,
      y: centerY - modeBtnHeight / 2,
      width: modeBtnWidth,
      height: modeBtnHeight,
    };

    // === 난이도 선택 버튼 (가로 배치) ===
    const diffBtnWidth = 120;
    const diffBtnHeight = 50;
    const diffGap = 20;
    const diffTotalWidth = diffBtnWidth * 3 + diffGap * 2;

    easyBtn = {
      x: centerX - diffTotalWidth / 2,
      y: centerY - diffBtnHeight / 2,
      width: diffBtnWidth,
      height: diffBtnHeight,
    };

    normalBtn = {
      x: centerX - diffBtnWidth / 2,
      y: centerY - diffBtnHeight / 2,
      width: diffBtnWidth,
      height: diffBtnHeight,
    };

    hardBtn = {
      x: centerX + diffTotalWidth / 2 - diffBtnWidth,
      y: centerY - diffBtnHeight / 2,
      width: diffBtnWidth,
      height: diffBtnHeight,
    };
  };

  const startGame = () => {
    if (phase !== 'ready') return;
    phase = 'playing';
    lastTime = 0;
    sec = 0;
  };

  const resetGame = () => {
    const rect = canvas.getBoundingClientRect();

    updateButtonPositions();

    phase = 'ready';
    winner = null;
    isPaused = false;
    score = { p1: 0, p2: 0 };
    lastTime = 0;
    sec = 0;

    // 패들 초기 위치 (화면 중앙 높이)
    const centerY = rect.height / 2 - PADDLE_HEIGHT / 2;

    paddle1 = {
      x: PADDLE_MARGIN,
      y: centerY,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
    };

    paddle2 = {
      x: rect.width - PADDLE_MARGIN - PADDLE_WIDTH,
      y: centerY,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
    };

    // 공 초기 위치 (화면 중앙)
    resetBall();
  };

  const resetBall = () => {
    const rect = canvas.getBoundingClientRect();

    // 랜덤 방향 (-1 또는 1)
    const dirX = Math.random() > 0.5 ? 1 : -1;
    const dirY = Math.random() > 0.5 ? 1 : -1;

    // 랜덤 각도 (30~60도 사이)
    const angle = Math.PI / 6 + Math.random() * (Math.PI / 6);

    ball = {
      x: rect.width / 2,
      y: rect.height / 2,
      vx: Math.cos(angle) * BALL_SPEED * dirX,
      vy: Math.sin(angle) * BALL_SPEED * dirY,
      radius: BALL_RADIUS,
    };
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    updateButtonPositions(); // 버튼 위치 업데이트

    // 게임 중이 아닐 때만 리셋
    if (phase === 'menu') {
      // 메뉴면 그대로
    } else {
      resetGame();
    }
  };

  const goToMenu = () => {
    phase = 'menu';
    winner = null;
    score = { p1: 0, p2: 0 };
    updateButtonPositions();
  };

  const selectDifficulty = (selectedDifficulty: TDifficulty) => {
    difficulty = selectedDifficulty;
    phase = 'ready';
    resetGame();
  };

  const selectMode = (selectedMode: TGameMode) => {
    mode = selectedMode;
    if (selectedMode === 'single') {
      // 싱글 모드면 난이도 선택 화면으로
      phase = 'difficulty';
    } else {
      // 멀티 모드면 바로 게임 준비
      phase = 'ready';
      resetGame();
    }
  };

  // ==================== Input Handlers ====================

  const onKeyDown = (e: KeyboardEvent) => {
    // Space: 시작 / 일시정지 해제
    if (e.code === 'Space') {
      if (isPaused) {
        isPaused = false;
        lastTime = 0;
        e.preventDefault();
        return;
      }
      if (phase === 'ready') startGame();
      e.preventDefault();
      return;
    }

    // P: 일시정지
    if (e.code === 'KeyP' && phase === 'playing' && !isPaused) {
      isPaused = true;
      return;
    }

    if (e.code === 'KeyR') {
      if (phase !== 'menu') resetGame();
      return;
    }

    if (e.code === 'Escape') {
      goToMenu();
      return;
    }

    // 게임 중일 때만 패들 조작 가능
    if (phase !== 'playing' && phase !== 'ready') return;
    if (isPaused) return;

    // Player 1: W, S
    if (e.code === 'KeyW') p1Keys.w = true;
    if (e.code === 'KeyS') p1Keys.s = true;

    // Player 2: 방향키 (멀티 모드에서만)
    if (mode === 'multi') {
      if (e.code === 'ArrowUp') {
        p2Keys.ArrowUp = true;
        e.preventDefault();
      }
      if (e.code === 'ArrowDown') {
        p2Keys.ArrowDown = true;
        e.preventDefault();
      }
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    // Player 1
    if (e.code === 'KeyW') p1Keys.w = false;
    if (e.code === 'KeyS') p1Keys.s = false;

    // Player 2
    if (e.code === 'ArrowUp') p2Keys.ArrowUp = false;
    if (e.code === 'ArrowDown') p2Keys.ArrowDown = false;
  };

  // 마우스 클릭 핸들러
  const onClick = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 메뉴 화면에서 모드 선택
    if (phase === 'menu') {
      if (
        isPointInRect(
          x,
          y,
          singleBtn.x,
          singleBtn.y,
          singleBtn.width,
          singleBtn.height,
        )
      ) {
        selectMode('single');
      }
      if (
        isPointInRect(
          x,
          y,
          multiBtn.x,
          multiBtn.y,
          multiBtn.width,
          multiBtn.height,
        )
      ) {
        selectMode('multi');
      }
      return;
    }

    // 난이도 선택 화면
    if (phase === 'difficulty') {
      if (
        isPointInRect(x, y, easyBtn.x, easyBtn.y, easyBtn.width, easyBtn.height)
      ) {
        selectDifficulty('easy');
      }
      if (
        isPointInRect(
          x,
          y,
          normalBtn.x,
          normalBtn.y,
          normalBtn.width,
          normalBtn.height,
        )
      ) {
        selectDifficulty('normal');
      }
      if (
        isPointInRect(x, y, hardBtn.x, hardBtn.y, hardBtn.width, hardBtn.height)
      ) {
        selectDifficulty('hard');
      }
      return;
    }
  };

  // 마우스 이동 핸들러 (호버 효과용)
  const onMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    // 버튼 위에 있으면 커서를 pointer로 변경
    const isOverButton = checkButtonHover();
    canvas.style.cursor = isOverButton ? 'pointer' : 'default';
  };

  // 버튼 위에 마우스가 있는지 체크
  const checkButtonHover = (): boolean => {
    if (phase === 'menu') {
      return (
        isPointInRect(
          mouseX,
          mouseY,
          singleBtn.x,
          singleBtn.y,
          singleBtn.width,
          singleBtn.height,
        ) ||
        isPointInRect(
          mouseX,
          mouseY,
          multiBtn.x,
          multiBtn.y,
          multiBtn.width,
          multiBtn.height,
        )
      );
    }

    if (phase === 'difficulty') {
      return (
        isPointInRect(
          mouseX,
          mouseY,
          easyBtn.x,
          easyBtn.y,
          easyBtn.width,
          easyBtn.height,
        ) ||
        isPointInRect(
          mouseX,
          mouseY,
          normalBtn.x,
          normalBtn.y,
          normalBtn.width,
          normalBtn.height,
        ) ||
        isPointInRect(
          mouseX,
          mouseY,
          hardBtn.x,
          hardBtn.y,
          hardBtn.width,
          hardBtn.height,
        )
      );
    }

    return false;
  };

  // ==================== Update Functions ====================
  // 패들 이동 (경계 체크 포함)
  const updatePaddles = (dt: number) => {
    const rect = canvas.getBoundingClientRect();

    // Player 1 이동
    if (p1Keys.w) paddle1.y -= PADDLE_SPEED * dt;
    if (p1Keys.s) paddle1.y += PADDLE_SPEED * dt;

    // Player 2 이동
    if (p2Keys.ArrowUp) paddle2.y -= PADDLE_SPEED * dt;
    if (p2Keys.ArrowDown) paddle2.y += PADDLE_SPEED * dt;

    // 경계 체크 (패들이 화면 밖으로 나가지 않게)
    paddle1.y = Math.max(0, Math.min(rect.height - PADDLE_HEIGHT, paddle1.y));
    paddle2.y = Math.max(0, Math.min(rect.height - PADDLE_HEIGHT, paddle2.y));
  };

  // AI 패들 업데이트 (싱글 모드용)
  const updateAI = (dt: number) => {
    const rect = canvas.getBoundingClientRect();

    // AI 설정값 가져오기
    const speed = AI_SPEED[difficulty];
    const deadzone = AI_DEADZONE[difficulty];
    const errorChance = AI_ERROR_CHANCE[difficulty];

    // 패들 중심 y좌표
    const paddleCenter = paddle2.y + paddle2.height / 2;

    // 공과 패들 중심의 y좌표 차이
    const diff = ball.y - paddleCenter;

    // 실수 확률: 랜덤하게 반대로 움직임
    const makeError = Math.random() < errorChance;

    // 데드존 밖에 있을 때만 움직임
    if (Math.abs(diff) > deadzone) {
      if (makeError) {
        // 실수: 반대 방향으로 이동
        if (diff > 0) {
          paddle2.y -= speed * dt;
        } else {
          paddle2.y += speed * dt;
        }
      } else {
        // 정상: 공 방향으로 이동
        if (diff > 0) {
          paddle2.y += speed * dt;
        } else {
          paddle2.y -= speed * dt;
        }
      }
    }

    // 경계 체크
    paddle2.y = Math.max(0, Math.min(rect.height - PADDLE_HEIGHT, paddle2.y));
  };

  // 공 이동
  const updateBall = (dt: number) => {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
  };

  // 공-벽 충돌 (상하 벽)
  const handleWallCollision = () => {
    const rect = canvas.getBoundingClientRect();

    // 상단 벽
    if (ball.y - ball.radius < 0) {
      ball.y = ball.radius;
      ball.vy *= -1;
    }

    // 하단 벽
    if (ball.y + ball.radius > rect.height) {
      ball.y = rect.height - ball.radius;
      ball.vy *= -1;
    }
  };

  // 공-패들 충돌
  const handlePaddleCollision = () => {
    // Player 1 패들 (왼쪽)
    if (
      circleRectHit(
        ball.x,
        ball.y,
        ball.radius,
        paddle1.x,
        paddle1.y,
        paddle1.width,
        paddle1.height,
      )
    ) {
      // 공이 왼쪽으로 가고 있을 때만 반사 (중복 충돌 방지)
      if (ball.vx < 0) {
        ball.x = paddle1.x + paddle1.width + ball.radius;
        ball.vx *= -1;

        // 패들 어디에 맞았는지에 따라 각도 조절
        const hitPos = (ball.y - paddle1.y) / paddle1.height; // 0~1
        ball.vy += (hitPos - 0.5) * 200; // 위쪽 맞으면 위로, 아래쪽 맞으면 아래로

        // 속도 증가
        const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
        const newSpeed = speed + BALL_SPEED_INCREASE;
        ball.vx = (ball.vx / speed) * newSpeed;
        ball.vy = (ball.vy / speed) * newSpeed;
      }
    }

    // Player 2 패들 (오른쪽)
    if (
      circleRectHit(
        ball.x,
        ball.y,
        ball.radius,
        paddle2.x,
        paddle2.y,
        paddle2.width,
        paddle2.height,
      )
    ) {
      if (ball.vx > 0) {
        ball.x = paddle2.x - ball.radius;
        ball.vx *= -1;

        const hitPos = (ball.y - paddle2.y) / paddle2.height;
        ball.vy += (hitPos - 0.5) * 200;

        const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
        const newSpeed = speed + BALL_SPEED_INCREASE;
        ball.vx = (ball.vx / speed) * newSpeed;
        ball.vy = (ball.vy / speed) * newSpeed;
      }
    }
  };

  // 득점 체크 (좌우 벽)
  const handleScore = () => {
    const rect = canvas.getBoundingClientRect();

    // 공이 왼쪽 벽 통과 → P2 득점
    if (ball.x + ball.radius < 0) {
      score.p2++;
      if (score.p2 >= WIN_SCORE) {
        phase = 'gameover';
        winner = 'p2';
      } else {
        phase = 'ready';
        resetBall();
      }
    }

    // 공이 오른쪽 벽 통과 → P1 득점
    if (ball.x - ball.radius > rect.width) {
      score.p1++;
      if (score.p1 >= WIN_SCORE) {
        phase = 'gameover';
        winner = 'p1';
      } else {
        phase = 'ready';
        resetBall();
      }
    }
  };

  const update = (t: number) => {
    // 메뉴 상태에서는 업데이트 불필요
    if (phase === 'menu' || phase === 'difficulty') return;
    if (isPaused) return;

    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);
    sec += dt;

    if (phase === 'playing') {
      updatePaddles(dt);

      if (mode === 'single') {
        updateAI(dt);
      }

      updateBall(dt);
      handleWallCollision();
      handlePaddleCollision();
      handleScore();
    }

    // ready 상태에서도 패들은 움직일 수 있게 (선택사항)
    if (phase === 'ready') {
      updatePaddles(dt);
    }
  };

  // ==================== Render Functions ====================

  const renderPaddles = () => {
    ctx.fillStyle = 'white';
    ctx.fillRect(paddle1.x, paddle1.y, paddle1.width, paddle1.height);
    ctx.fillRect(paddle2.x, paddle2.y, paddle2.width, paddle2.height);
  };

  const renderBall = () => {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
  };

  const renderCenterLine = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.setLineDash([10, 10]); // 점선
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(rect.width / 2, 0);
    ctx.lineTo(rect.width / 2, rect.height);
    ctx.stroke();

    ctx.setLineDash([]); // 점선 해제
  };

  const renderScore = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';

    // P1 점수 (왼쪽)
    ctx.fillText(String(score.p1), rect.width / 4, 60);
    // P2 점수 (오른쪽)
    ctx.fillText(String(score.p2), (rect.width / 4) * 3, 60);
  };

  const renderWinner = () => {
    if (phase !== 'gameover' || !winner) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';

    let text = '';
    if (mode === 'single') {
      text = winner === 'p1' ? 'You Win!' : 'AI Wins!';
    } else {
      text = winner === 'p1' ? 'Player 1 Wins!' : 'Player 2 Wins!';
    }
    ctx.fillText(text, rect.width / 2, rect.height / 2);

    ctx.font = '20px sans-serif';
    ctx.fillText('Press R to play again', rect.width / 2, rect.height / 2 + 40);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('Press ESC for menu', rect.width / 2, rect.height / 2 + 70);
  };

  // 버튼 그리기 헬퍼 함수
  const drawButton = (
    btn: { x: number; y: number; width: number; height: number },
    text: string,
    baseColor: string,
    hoverColor: string,
  ) => {
    const isHovered = isPointInRect(
      mouseX,
      mouseY,
      btn.x,
      btn.y,
      btn.width,
      btn.height,
    );

    // 배경
    ctx.fillStyle = isHovered ? hoverColor : baseColor;
    ctx.fillRect(btn.x, btn.y, btn.width, btn.height);

    // 호버 시 테두리 추가
    if (isHovered) {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
    }

    // 텍스트
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, btn.x + btn.width / 2, btn.y + btn.height / 2 + 7);
  };

  // 메뉴 화면 렌더링
  const renderMenu = () => {
    const rect = canvas.getBoundingClientRect();

    // 제목
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.font = '20px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('Select Game Mode', rect.width / 2, rect.height / 4 + 100);

    // 버튼들 (호버 효과 적용)
    drawButton(singleBtn, 'SINGLE', '#333', '#555');
    drawButton(multiBtn, 'MULTI', '#333', '#555');
  };

  // 난이도 선택 화면 렌더링
  const renderDifficulty = () => {
    const rect = canvas.getBoundingClientRect();

    // 제목
    ctx.fillStyle = 'white';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Select Difficulty', rect.width / 2, rect.height / 4);

    // 안내 문구
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('Press ESC to go back', rect.width / 2, rect.height / 4 + 30);

    // 난이도 버튼들 (호버 효과 적용)
    drawButton(easyBtn, 'EASY', '#2d5a27', '#3d7a37');
    drawButton(normalBtn, 'NORMAL', '#5a5a27', '#7a7a37');
    drawButton(hardBtn, 'HARD', '#5a2727', '#7a3737');

    // 난이도별 설명
    // ctx.font = '12px sans-serif';
    // ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    // ctx.fillText('Slow AI', easyBtn.x + easyBtn.width / 2, easyBtn.y + easyBtn.height + 20);
    // ctx.fillText('Balanced', normalBtn.x + normalBtn.width / 2, normalBtn.y + normalBtn.height + 20);
    // ctx.fillText('Fast AI', hardBtn.x + hardBtn.width / 2, hardBtn.y + hardBtn.height + 20);
  };

  // 게임 대기 화면 (Space to Start)
  const renderReady = () => {
    const rect = canvas.getBoundingClientRect();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE to Start', rect.width / 2, rect.height - 50);

    // 현재 모드 & 난이도 표시
    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';

    let modeText = '';
    if (mode === 'single') {
      const diffText = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
      modeText = `Single Mode (${diffText})`;
    } else {
      modeText = 'Multi Mode';
    }

    ctx.fillText(modeText, rect.width / 2, 50);
    ctx.fillText('Press ESC to Menu', rect.width / 2, rect.height - 20);
  };

  const render = () => {
    const rect = canvas.getBoundingClientRect();

    // 배경 (검은색)
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // 메뉴 화면
    if (phase === 'menu') {
      renderMenu();
      return;
    }

    if (phase === 'difficulty') {
      renderDifficulty();
      return;
    }

    // 게임 화면 (ready, playing, gameover)
    renderCenterLine();
    renderScore();
    renderPaddles();
    renderBall();

    if (phase === 'ready') {
      renderReady();
    }

    if (phase === 'gameover') {
      renderWinner();
    }

    if (isPaused) {
      gamePauseHud(canvas, ctx, { resumeKey: 'Space' });
    }
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
  updateButtonPositions(); // 초기 버튼 위치 설정
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('click', onClick); // 클릭 이벤트 추가
  canvas.addEventListener('mousemove', onMouseMove); // 마우스 이동 이벤트 추가

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('click', onClick);
    canvas.removeEventListener('mousemove', onMouseMove);
  };
};
