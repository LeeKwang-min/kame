# RhythmBeat Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 4키 하강형 리듬 게임(RhythmBeat)을 canvas-mobile 라우트 그룹에 추가한다.

**Architecture:** Web Audio API로 프로시저럴 비트를 생성하고, BPM 스케줄러 + 패턴 테이블로 노트를 배치하는 무한 모드 리듬 게임. Canvas 2D 렌더링에 CSS transform 스케일링으로 모바일 반응형 지원.

**Tech Stack:** Canvas 2D, Web Audio API, React, Next.js, TypeScript

---

## Task 1: 타입 & 설정 파일 생성

**Files:**
- Create: `app/(canvas-mobile)/rhythmbeat/_lib/types.ts`
- Create: `app/(canvas-mobile)/rhythmbeat/_lib/config.ts`

**Step 1: types.ts 생성**

```typescript
// app/(canvas-mobile)/rhythmbeat/_lib/types.ts

export type TLane = 0 | 1 | 2 | 3; // D, F, J, K

export type TNote = {
  id: number;
  lane: TLane;
  y: number; // 현재 y 좌표
  targetTime: number; // 판정 라인 도달 예정 시간(ms)
  hit: boolean;
  missed: boolean;
};

export type TBeat = number | number[] | 0; // 0=없음, 1=D, 2=F, 3=J, 4=K, [1,4]=동시

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
  startTime: number; // 시작 시간(초)
  endTime: number; // 끝 시간(초), Infinity for last phase
  bpm: number;
  maxDifficulty: 1 | 2 | 3;
  name: string;
};
```

**Step 2: config.ts 생성**

```typescript
// app/(canvas-mobile)/rhythmbeat/_lib/config.ts

import { TGameMeta } from '@/@types/game-meta';
import { TBpmPhase } from './types';

export const GAME_META: TGameMeta = {
  id: 'rhythmbeat',
  title: '리듬 비트',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'reflex',
  difficulty: 'progressive',
};

// 캔버스 설정
export const CANVAS_WIDTH = 400;
export const MIN_CANVAS_HEIGHT = 600;
export const MAX_CANVAS_HEIGHT = 900;

// 레인 설정
export const LANE_COUNT = 4;
export const LANE_COLORS = ['#00f5ff', '#ff00ff', '#ffff00', '#00ff88'] as const;
export const LANE_KEYS = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'] as const;
export const LANE_LABELS = ['D', 'F', 'J', 'K'] as const;

// 노트 설정
export const NOTE_HEIGHT = 20;
export const NOTE_SPEED = 400; // px/sec (높이에 맞춰 조절됨)

// 판정 설정 (ms)
export const JUDGE_PERFECT = 30;
export const JUDGE_GREAT = 60;
export const JUDGE_GOOD = 100;

// 판정 라인 위치 (캔버스 하단에서 위로)
export const JUDGE_LINE_OFFSET = 80;

// 점수 설정
export const SCORE_PERFECT = 300;
export const SCORE_GREAT = 200;
export const SCORE_GOOD = 100;

// HP 설정
export const HP_MAX = 100;
export const HP_PERFECT = 3;
export const HP_GREAT = 1;
export const HP_GOOD = -2;
export const HP_MISS = -10;

// BPM 프로그레션
export const BPM_PHASES: TBpmPhase[] = [
  { startTime: 0, endTime: 30, bpm: 100, maxDifficulty: 1, name: 'Warm Up' },
  { startTime: 30, endTime: 60, bpm: 115, maxDifficulty: 2, name: 'Build Up' },
  { startTime: 60, endTime: 90, bpm: 100, maxDifficulty: 1, name: 'Rest' },
  { startTime: 90, endTime: 130, bpm: 130, maxDifficulty: 3, name: 'Intensity' },
  { startTime: 130, endTime: 150, bpm: 115, maxDifficulty: 1, name: 'Rest' },
  { startTime: 150, endTime: 200, bpm: 145, maxDifficulty: 3, name: 'Peak' },
  { startTime: 200, endTime: 220, bpm: 130, maxDifficulty: 1, name: 'Rest' },
  { startTime: 220, endTime: Infinity, bpm: 160, maxDifficulty: 3, name: 'Endless' },
];

export const BPM_MAX = 200;
export const BPM_ENDLESS_INCREASE_PER_SEC = 0.2; // Endless 구간에서 초당 BPM 증가량

// 히트 영역 높이 (하단)
export const HIT_AREA_HEIGHT = 60;

// 터치 영역 (하단 25%)
export const TOUCH_AREA_RATIO = 0.25;
```

**Step 3: Commit**

```bash
git add app/(canvas-mobile)/rhythmbeat/_lib/types.ts app/(canvas-mobile)/rhythmbeat/_lib/config.ts
git commit -m "feat(rhythmbeat): add type definitions and game config"
```

---

## Task 2: 리듬 패턴 테이블 생성

**Files:**
- Create: `app/(canvas-mobile)/rhythmbeat/_lib/patterns.ts`

**Step 1: patterns.ts 생성**

```typescript
// app/(canvas-mobile)/rhythmbeat/_lib/patterns.ts

import { TPattern } from './types';

// 비트 값: 0=없음, 1=D, 2=F, 3=J, 4=K, [n,m]=동시노트

export const PATTERNS: TPattern[] = [
  // === Difficulty 1: 4비트 단순 패턴 ===
  { beats: [1, 0, 3, 0], difficulty: 1 },
  { beats: [0, 2, 0, 4], difficulty: 1 },
  { beats: [1, 2, 3, 4], difficulty: 1 },
  { beats: [4, 3, 2, 1], difficulty: 1 },
  { beats: [1, 0, 0, 3], difficulty: 1 },
  { beats: [2, 0, 0, 4], difficulty: 1 },
  { beats: [0, 1, 0, 4], difficulty: 1 },
  { beats: [3, 0, 1, 0], difficulty: 1 },
  { beats: [0, 4, 0, 2], difficulty: 1 },
  { beats: [1, 3, 0, 0], difficulty: 1 },

  // === Difficulty 2: 8비트 혼합 패턴 ===
  { beats: [1, 0, 2, 0, 3, 0, 4, 0], difficulty: 2 },
  { beats: [4, 0, 3, 0, 2, 0, 1, 0], difficulty: 2 },
  { beats: [1, 3, 0, 2, 4, 0, 1, 0], difficulty: 2 },
  { beats: [2, 4, 1, 3, 0, 0, 2, 4], difficulty: 2 },
  { beats: [1, 1, 3, 3, 2, 2, 4, 4], difficulty: 2 },
  { beats: [3, 0, 3, 1, 0, 1, 4, 0], difficulty: 2 },
  { beats: [0, 2, 3, 0, 4, 1, 0, 2], difficulty: 2 },
  { beats: [1, 2, 0, 3, 4, 0, 2, 1], difficulty: 2 },
  { beats: [4, 0, 2, 3, 0, 1, 4, 0], difficulty: 2 },
  { beats: [1, 0, 4, 0, 2, 0, 3, 0], difficulty: 2 },

  // === Difficulty 3: 동시노트 + 복잡 패턴 ===
  { beats: [[1, 4], 0, [2, 3], 0, 1, 3, 2, 4], difficulty: 3 },
  { beats: [1, 2, 3, 4, [1, 3], 0, [2, 4], 0], difficulty: 3 },
  { beats: [[1, 2], 0, [3, 4], 0, [1, 2], 0, [3, 4], 0], difficulty: 3 },
  { beats: [1, 3, [2, 4], 0, 4, 2, [1, 3], 0], difficulty: 3 },
  { beats: [[1, 4], 2, 3, [1, 4], 0, 2, 3, 0], difficulty: 3 },
  { beats: [1, [2, 3], 4, 0, 3, [1, 4], 2, 0], difficulty: 3 },
  { beats: [[2, 3], 1, 4, [1, 4], 2, [2, 3], 1, 4], difficulty: 3 },
  { beats: [1, 2, [1, 4], 3, 4, 3, [2, 3], 1], difficulty: 3 },
];
```

**Step 2: Commit**

```bash
git add app/(canvas-mobile)/rhythmbeat/_lib/patterns.ts
git commit -m "feat(rhythmbeat): add rhythm pattern table (Lv1-3)"
```

---

## Task 3: 사운드 엔진 생성

**Files:**
- Create: `app/(canvas-mobile)/rhythmbeat/_lib/audio.ts`

**참조:** `app/(canvas)/randomdefense/_lib/sounds.ts`의 Web Audio API 패턴을 따른다.

**Step 1: audio.ts 생성**

```typescript
// app/(canvas-mobile)/rhythmbeat/_lib/audio.ts

export type TRhythmSoundSystem = {
  resume: () => void;
  dispose: () => void;
  playKick: () => void;
  playSnare: () => void;
  playHihat: () => void;
  playHit: (lane: number) => void;
  playMiss: () => void;
  setMasterVolume: (volume: number) => void;
  getMasterVolume: () => number;
  toggleMute: () => void;
  isMuted: () => boolean;
};

export function createRhythmSoundSystem(): TRhythmSoundSystem {
  const audioCtx = new AudioContext();
  const masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);
  masterGain.gain.value = 0; // 초기 음소거
  let muted = true;
  let prevVolume = 0.5;

  function setMasterVolume(volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    if (clamped > 0) prevVolume = clamped;
    masterGain.gain.setValueAtTime(clamped, audioCtx.currentTime);
  }

  function getMasterVolume(): number {
    return masterGain.gain.value;
  }

  function toggleMute() {
    if (muted) {
      muted = false;
      setMasterVolume(prevVolume);
    } else {
      muted = true;
      setMasterVolume(0);
    }
  }

  function isMuted(): boolean {
    return muted;
  }

  function resume() {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function dispose() {
    audioCtx.close();
  }

  // 킥 드럼: 사인파 150Hz->50Hz 급하강
  function playKick() {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(masterGain);

    osc.type = 'sine';
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
    gainNode.gain.setValueAtTime(0.8, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // 스네어: 화이트 노이즈 + 밴드패스 필터
  function playSnare() {
    const bufferSize = audioCtx.sampleRate * 0.1;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 0.5;

    const gainNode = audioCtx.createGain();
    const now = audioCtx.currentTime;
    gainNode.gain.setValueAtTime(0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(masterGain);

    noise.start(now);
    noise.stop(now + 0.1);
  }

  // 하이햇: 고주파 노이즈 + 짧은 감쇄
  function playHihat() {
    const bufferSize = audioCtx.sampleRate * 0.05;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;

    const gainNode = audioCtx.createGain();
    const now = audioCtx.currentTime;
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(masterGain);

    noise.start(now);
    noise.stop(now + 0.05);
  }

  // 히트 사운드: 레인별 삼각파 (C4, E4, G4, B4)
  const HIT_FREQS = [261.63, 329.63, 392.0, 493.88];
  function playHit(lane: number) {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(masterGain);

    osc.type = 'triangle';
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(HIT_FREQS[lane] ?? 440, now);
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // 미스 사운드: 사각파 낮은 주파수 버즈
  function playMiss() {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(masterGain);

    osc.type = 'square';
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(80, now);
    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  return {
    resume,
    dispose,
    playKick,
    playSnare,
    playHihat,
    playHit,
    playMiss,
    setMasterVolume,
    getMasterVolume,
    toggleMute,
    isMuted,
  };
}
```

**Step 2: Commit**

```bash
git add app/(canvas-mobile)/rhythmbeat/_lib/audio.ts
git commit -m "feat(rhythmbeat): add procedural sound engine (Web Audio API)"
```

---

## Task 4: 메인 게임 로직 (game.ts)

**Files:**
- Create: `app/(canvas-mobile)/rhythmbeat/_lib/game.ts`

**참조:** `app/(canvas-mobile)/dodge/_lib/game.ts` 패턴을 따른다.

**Step 1: game.ts 생성**

이 파일은 가장 큰 핵심 파일이다. 다음 구조로 작성:

```typescript
// app/(canvas-mobile)/rhythmbeat/_lib/game.ts

import {
  createGameOverHud,
  gameHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import {
  CANVAS_WIDTH,
  LANE_COUNT,
  LANE_COLORS,
  LANE_KEYS,
  LANE_LABELS,
  NOTE_HEIGHT,
  NOTE_SPEED,
  JUDGE_PERFECT,
  JUDGE_GREAT,
  JUDGE_GOOD,
  JUDGE_LINE_OFFSET,
  SCORE_PERFECT,
  SCORE_GREAT,
  SCORE_GOOD,
  HP_MAX,
  HP_PERFECT,
  HP_GREAT,
  HP_GOOD,
  HP_MISS,
  BPM_PHASES,
  BPM_MAX,
  BPM_ENDLESS_INCREASE_PER_SEC,
  HIT_AREA_HEIGHT,
} from './config';
import { TNote, TLane, TJudgment, TJudgmentEffect, TBeat } from './types';
import { PATTERNS } from './patterns';
import { createRhythmSoundSystem } from './audio';

export type TRhythmBeatCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export function setupRhythmBeat(
  canvas: HTMLCanvasElement,
  canvasHeight: number,
  callbacks?: TRhythmBeatCallbacks,
): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  canvas.width = CANVAS_WIDTH;
  canvas.height = canvasHeight;

  const judgeLineY = canvasHeight - JUDGE_LINE_OFFSET;
  const laneWidth = CANVAS_WIDTH / LANE_COUNT;

  // --- 사운드 ---
  const sound = createRhythmSoundSystem();

  // --- 게임 상태 ---
  let isStarted = false;
  let isLoading = false;
  let isGameOver = false;
  let isPaused = false;
  let raf = 0;
  let lastTime = 0;
  let gameTime = 0; // 총 플레이 시간(초)

  // --- 게임 데이터 ---
  let notes: TNote[] = [];
  let noteIdCounter = 0;
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let hp = HP_MAX;
  let currentBpm = 100;
  let judgmentEffects: TJudgmentEffect[] = [];

  // --- BPM 스케줄러 ---
  let beatTimer = 0; // 다음 비트까지 남은 시간
  let patternQueue: TBeat[] = []; // 현재 패턴의 남은 비트
  let recentPatternIndices: number[] = [];

  // --- 키 상태 (눌림 이펙트용) ---
  const lanePressed = [false, false, false, false];

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

  const gameOverHud = createGameOverHud(canvas, ctx, 'rhythmbeat' as any, gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  // --- 게임 리셋 ---
  function resetGame() {
    isStarted = false;
    isLoading = false;
    isGameOver = false;
    isPaused = false;
    lastTime = 0;
    gameTime = 0;
    notes = [];
    noteIdCounter = 0;
    score = 0;
    combo = 0;
    maxCombo = 0;
    hp = HP_MAX;
    currentBpm = 100;
    beatTimer = 0;
    patternQueue = [];
    recentPatternIndices = [];
    judgmentEffects = [];
    gameOverHud.reset();
  }

  // --- 게임 시작 ---
  async function startGame() {
    if (isStarted || isLoading) return;
    isLoading = true;
    sound.resume();
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    isLoading = false;
    isStarted = true;
    lastTime = 0;
  }

  // --- BPM/페이즈 관리 ---
  function getCurrentPhase() {
    for (let i = BPM_PHASES.length - 1; i >= 0; i--) {
      if (gameTime >= BPM_PHASES[i].startTime) return BPM_PHASES[i];
    }
    return BPM_PHASES[0];
  }

  function updateBpm() {
    const phase = getCurrentPhase();
    if (phase.name === 'Endless') {
      const elapsed = gameTime - phase.startTime;
      currentBpm = Math.min(phase.bpm + elapsed * BPM_ENDLESS_INCREASE_PER_SEC, BPM_MAX);
    } else {
      currentBpm = phase.bpm;
    }
  }

  // --- 패턴 선택 ---
  function selectPattern(): TBeat[] {
    const phase = getCurrentPhase();
    const eligible = PATTERNS
      .map((p, i) => ({ pattern: p, index: i }))
      .filter(
        ({ pattern, index }) =>
          pattern.difficulty <= phase.maxDifficulty &&
          !recentPatternIndices.includes(index),
      );

    if (eligible.length === 0) {
      // 최근 패턴 제한 완화
      const fallback = PATTERNS.filter((p) => p.difficulty <= phase.maxDifficulty);
      const idx = Math.floor(Math.random() * fallback.length);
      return [...fallback[idx].beats];
    }

    const pick = eligible[Math.floor(Math.random() * eligible.length)];
    recentPatternIndices.push(pick.index);
    if (recentPatternIndices.length > 3) recentPatternIndices.shift();

    return [...pick.pattern.beats];
  }

  // --- 노트 생성 ---
  function spawnNote(lane: TLane) {
    const travelTime = (judgeLineY / NOTE_SPEED) * 1000; // ms
    notes.push({
      id: noteIdCounter++,
      lane,
      y: -NOTE_HEIGHT,
      targetTime: performance.now() + travelTime,
      hit: false,
      missed: false,
    });
  }

  function spawnBeat(beat: TBeat) {
    if (beat === 0) return;
    if (Array.isArray(beat)) {
      beat.forEach((b) => spawnNote((b - 1) as TLane));
    } else {
      spawnNote((beat - 1) as TLane);
    }
  }

  // --- 비트 스케줄링 ---
  function updateBeatScheduler(dt: number) {
    const beatInterval = 60 / currentBpm; // 초 단위
    beatTimer -= dt;

    if (beatTimer <= 0) {
      // 비트 사운드 (킥/스네어 교차)
      const beatCount = Math.floor(gameTime / beatInterval);
      if (beatCount % 2 === 0) {
        sound.playKick();
      } else {
        sound.playSnare();
      }

      // 패턴에서 다음 비트 가져오기
      if (patternQueue.length === 0) {
        patternQueue = selectPattern();
      }
      const nextBeat = patternQueue.shift()!;
      spawnBeat(nextBeat);

      beatTimer += beatInterval;
      if (beatTimer < 0) beatTimer = 0;
    }
  }

  // --- 판정 ---
  function judge(lane: TLane): TJudgment | null {
    const now = performance.now();

    // 판정 라인 근처의 해당 레인 노트 찾기
    let closest: TNote | null = null;
    let closestDiff = Infinity;

    for (const note of notes) {
      if (note.lane !== lane || note.hit || note.missed) continue;
      const diff = Math.abs(now - note.targetTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = note;
      }
    }

    if (!closest || closestDiff > JUDGE_GOOD) return null;

    closest.hit = true;

    let judgment: TJudgment;
    if (closestDiff <= JUDGE_PERFECT) {
      judgment = 'perfect';
    } else if (closestDiff <= JUDGE_GREAT) {
      judgment = 'great';
    } else {
      judgment = 'good';
    }

    applyJudgment(judgment, lane);
    return judgment;
  }

  function applyJudgment(judgment: TJudgment, lane: TLane) {
    // 점수
    const comboMultiplier = 1 + Math.floor(combo / 10) * 0.1;
    let baseScore = 0;
    let hpChange = 0;
    let color = '#ffffff';
    let text = '';

    switch (judgment) {
      case 'perfect':
        baseScore = SCORE_PERFECT;
        hpChange = HP_PERFECT;
        color = '#ffd700';
        text = 'Perfect!';
        break;
      case 'great':
        baseScore = SCORE_GREAT;
        hpChange = HP_GREAT;
        color = '#00f5ff';
        text = 'Great!';
        break;
      case 'good':
        baseScore = SCORE_GOOD;
        hpChange = HP_GOOD;
        color = '#ffffff';
        text = 'Good';
        break;
      case 'miss':
        baseScore = 0;
        hpChange = HP_MISS;
        color = '#ff3333';
        text = 'Miss';
        break;
    }

    if (judgment !== 'miss') {
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      sound.playHit(lane);
    } else {
      combo = 0;
      sound.playMiss();
    }

    score += Math.floor(baseScore * comboMultiplier);
    hp = Math.max(0, Math.min(HP_MAX, hp + hpChange));

    // 이펙트
    judgmentEffects.push({
      text,
      color,
      y: judgeLineY - 30,
      alpha: 1,
      scale: judgment === 'perfect' ? 1.3 : 1,
      lane,
    });

    // HP 0 -> 게임 오버
    if (hp <= 0) {
      isGameOver = true;
    }
  }

  // --- 노트 업데이트 ---
  function updateNotes(dt: number) {
    for (const note of notes) {
      if (note.hit || note.missed) continue;
      note.y += NOTE_SPEED * dt;

      // 판정 라인을 지나간 노트 -> Miss
      if (note.y > judgeLineY + JUDGE_GOOD * NOTE_SPEED / 1000 + NOTE_HEIGHT) {
        note.missed = true;
        applyJudgment('miss', note.lane);
      }
    }

    // 화면 밖 노트 제거
    notes = notes.filter((n) => n.y < canvasHeight + NOTE_HEIGHT || (!n.hit && !n.missed));
  }

  // --- 이펙트 업데이트 ---
  function updateEffects(dt: number) {
    for (const effect of judgmentEffects) {
      effect.y -= 60 * dt;
      effect.alpha -= 1.5 * dt;
      if (effect.scale > 1) effect.scale -= 1.5 * dt;
      if (effect.scale < 1) effect.scale = 1;
    }
    judgmentEffects = judgmentEffects.filter((e) => e.alpha > 0);
  }

  // --- 렌더링 ---
  function render() {
    // 배경
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

    // 그리드 라인
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = 1; i < LANE_COUNT; i++) {
      const x = i * laneWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }

    // 노트 렌더링
    for (const note of notes) {
      if (note.hit || note.missed) continue;
      const x = note.lane * laneWidth + laneWidth * 0.1;
      const w = laneWidth * 0.8;
      const color = LANE_COLORS[note.lane];

      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(x, note.y, w, NOTE_HEIGHT, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 판정 라인
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, judgeLineY);
    ctx.lineTo(CANVAS_WIDTH, judgeLineY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 히트 영역 (하단)
    for (let i = 0; i < LANE_COUNT; i++) {
      const x = i * laneWidth;
      const color = LANE_COLORS[i];

      // 눌림 상태 배경
      if (lanePressed[i]) {
        ctx.fillStyle = color + '30';
        ctx.fillRect(x, judgeLineY, laneWidth, canvasHeight - judgeLineY);
      }

      // 키 레이블
      ctx.fillStyle = lanePressed[i] ? color : 'rgba(255,255,255,0.4)';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(LANE_LABELS[i], x + laneWidth / 2, judgeLineY + 40);
    }

    // HP 바
    const hpBarWidth = CANVAS_WIDTH - 20;
    const hpBarHeight = 6;
    const hpBarX = 10;
    const hpBarY = 45;
    const hpRatio = hp / HP_MAX;

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

    let hpColor: string;
    if (hpRatio > 0.5) hpColor = '#00ff88';
    else if (hpRatio > 0.2) hpColor = '#ffff00';
    else hpColor = '#ff3333';

    // 20% 이하 깜빡임
    if (hpRatio <= 0.2 && Math.floor(gameTime * 4) % 2 === 0) {
      hpColor = '#ff0000';
    }

    ctx.fillStyle = hpColor;
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpRatio, hpBarHeight);

    // 점수 & 콤보 (상단)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score.toLocaleString()}`, 10, 25);

    ctx.textAlign = 'right';
    ctx.fillText(`BPM: ${Math.floor(currentBpm)}`, CANVAS_WIDTH - 10, 25);

    // 콤보 (중앙 상단)
    if (combo >= 5) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      const comboScale = combo % 10 === 0 && combo > 0 ? 1.2 : 1;
      const comboSize = Math.floor(28 * comboScale);
      ctx.font = `bold ${comboSize}px monospace`;
      ctx.fillText(`${combo}`, CANVAS_WIDTH / 2, 80);
      ctx.font = '12px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('COMBO', CANVAS_WIDTH / 2, 96);
    }

    // 판정 이펙트
    for (const effect of judgmentEffects) {
      ctx.globalAlpha = effect.alpha;
      ctx.fillStyle = effect.color;
      ctx.font = `bold ${Math.floor(16 * effect.scale)}px monospace`;
      ctx.textAlign = 'center';
      const x = effect.lane * laneWidth + laneWidth / 2;
      ctx.fillText(effect.text, x, effect.y);
      ctx.globalAlpha = 1;
    }

    // 현재 페이즈 이름 (좌하단)
    const phase = getCurrentPhase();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(phase.name, 10, canvasHeight - 10);

    // 음소거 표시 (우상단)
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '12px monospace';
    ctx.fillText(sound.isMuted() ? '♪ MUTE' : '♪ ON', CANVAS_WIDTH - 10, canvasHeight - 10);
  }

  // --- HUD 렌더링 ---
  function drawHuds() {
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
  }

  // --- 게임 루프 ---
  function gameLoop(timestamp: number) {
    const dt = lastTime > 0 ? Math.min((timestamp - lastTime) / 1000, 0.1) : 0;
    lastTime = timestamp;

    if (isStarted && !isGameOver && !isPaused) {
      gameTime += dt;
      updateBpm();
      updateBeatScheduler(dt);
      updateNotes(dt);
      updateEffects(dt);
    }

    render();
    drawHuds();

    raf = requestAnimationFrame(gameLoop);
  }

  // --- 키보드 이벤트 ---
  function onKeyDown(e: KeyboardEvent) {
    if (e.repeat) return;

    if (e.code === 'KeyM') {
      sound.toggleMute();
      return;
    }

    if (e.code === 'KeyS') {
      if (isPaused) {
        isPaused = false;
        lastTime = 0;
        return;
      }
      if (!isStarted && !isLoading && !isGameOver) {
        startGame();
      }
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

    // 레인 입력
    if (isStarted && !isGameOver && !isPaused) {
      const laneIndex = LANE_KEYS.indexOf(e.code as any);
      if (laneIndex >= 0) {
        lanePressed[laneIndex] = true;
        judge(laneIndex as TLane);
        e.preventDefault();
      }
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    const laneIndex = LANE_KEYS.indexOf(e.code as any);
    if (laneIndex >= 0) {
      lanePressed[laneIndex] = false;
    }
  }

  // --- 터치 이벤트 ---
  function getTouchPos(touch: Touch) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = canvasHeight / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    sound.resume();

    // 게임 오버
    if (isGameOver) {
      const touch = e.touches[0];
      if (!touch) return;
      const pos = getTouchPos(touch);
      gameOverHud.onTouchStart(pos.x, pos.y, score);
      return;
    }

    // 시작
    if (!isStarted && !isLoading) {
      startGame();
      return;
    }

    // 일시정지 해제
    if (isPaused) {
      isPaused = false;
      lastTime = 0;
      return;
    }

    // 레인 입력 (멀티터치)
    if (isStarted && !isGameOver && !isPaused) {
      for (let i = 0; i < e.touches.length; i++) {
        const pos = getTouchPos(e.touches[i]);
        const laneIndex = Math.floor(pos.x / laneWidth);
        if (laneIndex >= 0 && laneIndex < LANE_COUNT) {
          lanePressed[laneIndex] = true;
          judge(laneIndex as TLane);
        }
      }
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    e.preventDefault();
    // 모든 레인 해제 (멀티터치 복잡도 줄이기)
    if (e.touches.length === 0) {
      for (let i = 0; i < LANE_COUNT; i++) {
        lanePressed[i] = false;
      }
    }
  }

  // --- 이벤트 리스너 등록 ---
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

  raf = requestAnimationFrame(gameLoop);

  // --- Cleanup ---
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchend', handleTouchEnd);
    sound.dispose();
  };
}
```

**Step 2: Commit**

```bash
git add app/(canvas-mobile)/rhythmbeat/_lib/game.ts
git commit -m "feat(rhythmbeat): add main game logic with note system, judging, and BPM scheduler"
```

---

## Task 5: React 컴포넌트 생성

**Files:**
- Create: `app/(canvas-mobile)/rhythmbeat/_components/RhythmBeat.tsx`

**참조:** `app/(canvas-mobile)/dodge/_components/Dodge.tsx` 패턴을 따르되, 동적 높이를 추가한다.

**Step 1: RhythmBeat.tsx 생성**

```typescript
// app/(canvas-mobile)/rhythmbeat/_components/RhythmBeat.tsx

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupRhythmBeat, TRhythmBeatCallbacks } from '../_lib/game';
import { CANVAS_WIDTH, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT } from '../_lib/config';
import { useCreateScore, useGameSession } from '@/service/scores';

function RhythmBeat() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('rhythmbeat' as any);
  const { mutateAsync: createSession } = useGameSession('rhythmbeat' as any);
  const isLoggedIn = !!session;

  // 가용 높이 계산
  const getCanvasHeight = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return MIN_CANVAS_HEIGHT;
    const container = wrapper.parentElement;
    if (!container) return MIN_CANVAS_HEIGHT;
    const available = container.clientHeight;
    return Math.max(MIN_CANVAS_HEIGHT, Math.min(MAX_CANVAS_HEIGHT, available));
  }, []);

  // CSS transform 스케일링
  const updateScale = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const container = wrapper.parentElement;
    if (!container) return;
    const containerWidth = container.clientWidth;
    const canvasHeight = getCanvasHeight();
    const scale = Math.min(containerWidth / CANVAS_WIDTH, 1);
    wrapper.style.transform = `scale(${scale})`;
    wrapper.style.transformOrigin = 'top center';
    wrapper.style.width = `${CANVAS_WIDTH}px`;
    wrapper.style.height = `${canvasHeight}px`;
    const outerDiv = wrapper.parentElement;
    if (outerDiv) {
      outerDiv.style.height = `${canvasHeight * scale}px`;
    }
  }, [getCanvasHeight]);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasHeight = getCanvasHeight();

    const callbacks: TRhythmBeatCallbacks = {
      onGameStart: async () => {
        try {
          const gameSession = await createSession();
          sessionTokenRef.current = gameSession.token;
        } catch (error) {
          console.error('Failed to create game session:', error);
        }
      },
      onScoreSave: async (score) => {
        if (!sessionTokenRef.current) return { saved: false };
        const result = await saveScore({
          gameType: 'rhythmbeat' as any,
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    cleanupRef.current = setupRhythmBeat(canvas, canvasHeight, callbacks);

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [saveScore, createSession, isLoggedIn, getCanvasHeight]);

  return (
    <div className="w-full h-full flex justify-center">
      <div>
        <div ref={wrapperRef}>
          <canvas
            ref={canvasRef}
            className="border border-white/20 rounded-2xl shadow-lg touch-none"
          />
        </div>
      </div>
    </div>
  );
}

export default RhythmBeat;
```

**Step 2: Commit**

```bash
git add app/(canvas-mobile)/rhythmbeat/_components/RhythmBeat.tsx
git commit -m "feat(rhythmbeat): add React component with dynamic height and CSS transform scaling"
```

---

## Task 6: 페이지 & 레이아웃 생성

**Files:**
- Create: `app/(canvas-mobile)/rhythmbeat/page.tsx`
- Create: `app/(canvas-mobile)/rhythmbeat/layout.tsx`

**참조:** `app/(canvas-mobile)/dodge/page.tsx`, `app/(canvas-mobile)/dodge/layout.tsx`

**Step 1: layout.tsx 생성**

```typescript
// app/(canvas-mobile)/rhythmbeat/layout.tsx

import KameHeader from '@/components/common/KameHeader';

function RhythmBeatLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-4 xl:px-6 py-4 flex flex-col gap-4 xl:gap-10 items-center">
      <KameHeader title="리듬 비트" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default RhythmBeatLayout;
```

**Step 2: page.tsx 생성**

```typescript
// app/(canvas-mobile)/rhythmbeat/page.tsx

'use client';

import { Menu } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import UserProfile from '@/components/auth/UserProfile';
import { useGetScores } from '@/service/scores';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import RhythmBeat from './_components/RhythmBeat';

const controls = [
  { key: 'D F J K', action: '레인 입력' },
  { key: 'S / Tap', action: '게임 시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
  { key: 'M', action: '음소거 토글' },
];

function RhythmBeatPage() {
  const { data: session, status } = useSession();
  const { data: scores = [], isLoading } = useGetScores('rhythmbeat' as any);

  return (
    <section className="w-full h-full flex flex-col xl:flex-row gap-4 xl:gap-6 items-center xl:items-start justify-center">
      {/* 모바일: 햄버거 메뉴 */}
      <div className="xl:hidden w-full flex justify-end px-2">
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-2 rounded-lg border border-arcade-border bg-arcade-surface text-arcade-text">
              <Menu size={20} />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-arcade-bg border-arcade-border overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-arcade-text">Menu</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-6 p-4">
              <div>
                <h3 className="text-sm font-semibold text-arcade-cyan mb-2">Player</h3>
                {status === 'loading' ? (
                  <div className="h-9 bg-arcade-border rounded animate-pulse" />
                ) : session?.user ? (
                  <UserProfile user={session.user} />
                ) : (
                  <GoogleLoginButton />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-arcade-cyan mb-2">Controls</h3>
                <ControlInfoTable controls={controls} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-arcade-cyan mb-2">Ranking</h3>
                <RankBoard data={scores} isLoading={isLoading} showCountry />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* 데스크탑: 조작법 */}
      <aside className="hidden xl:block shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>

      {/* 게임 캔버스 */}
      <div className="w-full xl:flex-1 h-full max-w-[400px]">
        <RhythmBeat />
      </div>

      {/* 데스크탑: 랭킹 */}
      <aside className="hidden xl:block shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default RhythmBeatPage;
```

**Step 3: Commit**

```bash
git add app/(canvas-mobile)/rhythmbeat/page.tsx app/(canvas-mobile)/rhythmbeat/layout.tsx
git commit -m "feat(rhythmbeat): add page and layout with mobile hamburger menu"
```

---

## Task 7: 게임 등록 (6개 파일 수정)

**Files:**
- Modify: `@types/scores.ts` - TGameType에 'rhythmbeat' 추가
- Modify: `lib/config.ts` - MENU_LIST에 추가
- Modify: `components/common/GameCard.tsx` - 아이콘 추가
- Modify: `app/api/game-session/route.ts` - VALID_GAME_TYPES에 추가
- Modify: `app/api/scores/route.ts` - VALID_GAME_TYPES에 추가
- Modify: `lib/game-security/config.ts` - 보안 설정 추가

**Step 1: @types/scores.ts**

TGameType 유니온에 `| 'rhythmbeat'` 추가 (마지막 항목 뒤에).

**Step 2: lib/config.ts**

MENU_LIST에 Reflex 카테고리로 추가:
```typescript
{
  name: {
    kor: '리듬 비트',
    eng: 'Rhythm Beat',
  },
  href: '/rhythmbeat',
  category: 'Reflex',
  platform: 'both',
},
```

**Step 3: components/common/GameCard.tsx**

GAME_ICONS에 추가 (Music 아이콘 import 후):
```typescript
import { ..., Music } from 'lucide-react';
// GAME_ICONS 객체에:
'/rhythmbeat': Music,
```

**Step 4: app/api/game-session/route.ts**

VALID_GAME_TYPES 배열에 `'rhythmbeat'` 추가.

**Step 5: app/api/scores/route.ts**

VALID_GAME_TYPES 배열에 `'rhythmbeat'` 추가.

**Step 6: lib/game-security/config.ts**

GAME_SECURITY_CONFIG에 추가:
```typescript
rhythmbeat: { maxScore: 9999999, minPlayTimeSeconds: 10 },
```

**Step 7: Commit**

```bash
git add @types/scores.ts lib/config.ts components/common/GameCard.tsx app/api/game-session/route.ts app/api/scores/route.ts lib/game-security/config.ts
git commit -m "feat(rhythmbeat): register game in all 6 required files"
```

---

## Task 8: 빌드 검증 & 수동 테스트

**Step 1: TypeScript 빌드 검증**

```bash
yarn build
```

Expected: 빌드 성공, 에러 없음.

**Step 2: 개발 서버 실행 및 수동 테스트**

```bash
yarn dev
```

브라우저에서 `http://localhost:3000/rhythmbeat` 접속 후 다음을 확인:

- [ ] 게임 화면이 정상 렌더링 (어두운 배경 + 4레인)
- [ ] S키 또는 터치로 게임 시작
- [ ] 노트가 위에서 아래로 하강
- [ ] D/F/J/K 키로 판정 작동 (Perfect/Great/Good/Miss)
- [ ] 콤보 카운터 정상 증가
- [ ] HP 바 감소/증가
- [ ] HP 0 시 게임 오버
- [ ] 게임 오버 HUD에서 R키로 재시작
- [ ] M키로 음소거/해제 토글
- [ ] P키로 일시정지/재개
- [ ] BPM 변화 체감 (30초 후 빨라짐, 60초 후 느려짐)
- [ ] 모바일 뷰포트에서 CSS transform 스케일링 정상
- [ ] 터치로 4개 레인 입력 작동
- [ ] 멀티터치 (동시노트) 작동

**Step 3: 이슈 수정 후 최종 Commit**

발견된 이슈를 수정하고 커밋.

```bash
git add -A
git commit -m "fix(rhythmbeat): resolve issues found during manual testing"
```
