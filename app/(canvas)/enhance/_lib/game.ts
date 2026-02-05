import {
  createGameOverHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import { MAX_LEVEL, DESTROY_START_LEVEL, FAILURE_RATES, getTierByLevel, TIER_CONFIG } from './config';
import { EnhanceResult, EnhanceState } from './types';
import { getResultColor, getResultText, getSuccessRate, getTierConfig, rollEnhance } from './utils';

export type TEnhanceCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

type Button = {
  x: number;
  y: number;
  w: number;
  h: number;
  action: () => void;
  label: string;
};

export const setupEnhance = (
  canvas: HTMLCanvasElement,
  callbacks?: TEnhanceCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let state: EnhanceState = {
    level: 0,
    phase: 'playing',
    maxLevel: 0,
    lastResult: null,
    attempts: 0,
  };

  let animationProgress = 0;
  let isAnimating = false;
  let pendingResult: EnhanceResult | null = null;
  let globalTime = 0;
  let buttons: Button[] = [];
  let hoveredButton: Button | null = null;

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

  const gameOverHud = createGameOverHud(canvas, ctx, 'enhance', gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  const resetGame = async () => {
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    state = {
      level: 0,
      phase: 'playing',
      maxLevel: 0,
      lastResult: null,
      attempts: 0,
    };
    animationProgress = 0;
    isAnimating = false;
    pendingResult = null;
    gameOverHud.reset();
  };

  const doEnhance = () => {
    if (state.phase !== 'playing' || isAnimating) return;
    if (state.level >= MAX_LEVEL) {
      state.phase = 'gameover';
      return;
    }

    isAnimating = true;
    animationProgress = 0;
    pendingResult = rollEnhance(state.level);
    state.attempts++;
  };

  const applyResult = () => {
    if (!pendingResult) return;

    state.lastResult = pendingResult;

    switch (pendingResult) {
      case 'success':
        state.level++;
        if (state.level > state.maxLevel) {
          state.maxLevel = state.level;
        }
        if (state.level >= MAX_LEVEL) {
          state.phase = 'gameover';
        }
        break;
      case 'downgrade':
        state.level = Math.max(0, state.level - 1);
        break;
      case 'destroy':
        state.phase = 'gameover';
        break;
    }

    pendingResult = null;
    isAnimating = false;
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const getCanvasPos = (e: MouseEvent | Touch): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const findButton = (x: number, y: number): Button | null => {
    for (const btn of buttons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        return btn;
      }
    }
    return null;
  };

  const handleClick = (x: number, y: number) => {
    if (state.phase === 'gameover') return;

    const btn = findButton(x, y);
    if (btn) {
      btn.action();
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    const pos = getCanvasPos(e);
    hoveredButton = findButton(pos.x, pos.y);
    canvas.style.cursor = hoveredButton ? 'pointer' : 'default';
  };

  const onMouseDown = (e: MouseEvent) => {
    const pos = getCanvasPos(e);
    handleClick(pos.x, pos.y);
  };

  const onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const pos = getCanvasPos(e.touches[0]);
      handleClick(pos.x, pos.y);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (state.phase === 'gameover') {
      const handled = gameOverHud.onKeyDown(e, state.maxLevel);
      if (handled) return;
    }

    if (e.code === 'KeyR') {
      resetGame();
      return;
    }

    if ((e.code === 'Space' || e.code === 'Enter') && state.phase === 'playing') {
      e.preventDefault();
      doEnhance();
      return;
    }
  };

  // ========== 렌더링 함수들 ==========

  const renderParticles = (cx: number, cy: number, radius: number, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + globalTime * 0.001;
      const dist = radius + Math.sin(globalTime * 0.003 + i) * 10;
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      const size = 3 + Math.sin(globalTime * 0.005 + i * 0.5) * 2;

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.6 + Math.sin(globalTime * 0.004 + i) * 0.4;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const renderAura = (cx: number, cy: number, radius: number, color: string, intensity: number = 1) => {
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, color + '60');
    gradient.addColorStop(0.5, color + '30');
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * (1 + Math.sin(globalTime * 0.002) * 0.1 * intensity), 0, Math.PI * 2);
    ctx.fill();
  };

  const renderCommonItem = (cx: number, cy: number, size: number, level: number) => {
    const tier = getTierConfig(level);
    const scale = 1 + level * 0.05;
    const s = size * scale;

    ctx.fillStyle = tier.primaryColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s * 0.6, cy);
    ctx.lineTo(cx, cy + s);
    ctx.lineTo(cx - s * 0.6, cy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = tier.secondaryColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = tier.secondaryColor + '40';
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.7);
    ctx.lineTo(cx + s * 0.3, cy - s * 0.2);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx - s * 0.3, cy - s * 0.2);
    ctx.closePath();
    ctx.fill();
  };

  const renderUncommonItem = (cx: number, cy: number, size: number, level: number) => {
    const tier = getTierConfig(level);
    const points = 5;
    const outerR = size * (1.1 + (level - 5) * 0.05);
    const innerR = outerR * 0.5;
    const rotation = globalTime * 0.0005;

    renderAura(cx, cy, outerR * 1.8, tier.glowColor, 0.5);
    renderParticles(cx, cy, outerR * 1.3, tier.particleCount, tier.secondaryColor);

    ctx.fillStyle = tier.primaryColor;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI * i) / points - Math.PI / 2 + rotation;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = tier.secondaryColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR * 0.8);
    gradient.addColorStop(0, tier.secondaryColor);
    gradient.addColorStop(1, tier.primaryColor);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, innerR * 0.6, 0, Math.PI * 2);
    ctx.fill();
  };

  const renderRareItem = (cx: number, cy: number, size: number, level: number) => {
    const tier = getTierConfig(level);
    const s = size * (1.15 + (level - 10) * 0.05);

    renderAura(cx, cy, s * 2, tier.glowColor, 0.7);
    renderParticles(cx, cy, s * 1.5, tier.particleCount, tier.secondaryColor);

    ctx.fillStyle = tier.primaryColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s * 0.8, cy - s * 0.6);
    ctx.lineTo(cx + s * 0.8, cy + s * 0.2);
    ctx.quadraticCurveTo(cx + s * 0.4, cy + s, cx, cy + s * 1.1);
    ctx.quadraticCurveTo(cx - s * 0.4, cy + s, cx - s * 0.8, cy + s * 0.2);
    ctx.lineTo(cx - s * 0.8, cy - s * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = tier.secondaryColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.strokeStyle = tier.secondaryColor;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.5);
    ctx.lineTo(cx, cy + s * 0.5);
    ctx.moveTo(cx - s * 0.35, cy - s * 0.1);
    ctx.lineTo(cx + s * 0.35, cy - s * 0.1);
    ctx.stroke();

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.65, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
  };

  const renderEpicItem = (cx: number, cy: number, size: number, level: number) => {
    const tier = getTierConfig(level);
    const s = size * (1.2 + (level - 15) * 0.05);

    renderAura(cx, cy, s * 2.2, tier.glowColor, 1);
    renderParticles(cx, cy, s * 1.6, tier.particleCount, tier.secondaryColor);

    const gradient = ctx.createLinearGradient(cx - s, cy, cx + s, cy);
    gradient.addColorStop(0, tier.primaryColor);
    gradient.addColorStop(0.5, tier.secondaryColor);
    gradient.addColorStop(1, tier.primaryColor);
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.moveTo(cx - s * 0.9, cy + s * 0.5);
    ctx.lineTo(cx - s * 0.7, cy - s * 0.3);
    ctx.lineTo(cx - s * 0.35, cy);
    ctx.lineTo(cx, cy - s * 0.8);
    ctx.lineTo(cx + s * 0.35, cy);
    ctx.lineTo(cx + s * 0.7, cy - s * 0.3);
    ctx.lineTo(cx + s * 0.9, cy + s * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.stroke();

    const gemPositions = [
      { x: cx - s * 0.55, y: cy - s * 0.1 },
      { x: cx, y: cy - s * 0.5 },
      { x: cx + s * 0.55, y: cy - s * 0.1 },
    ];
    const gemColors = ['#E91E63', '#00BCD4', '#E91E63'];

    gemPositions.forEach((pos, i) => {
      const pulse = 1 + Math.sin(globalTime * 0.003 + i) * 0.2;
      ctx.fillStyle = gemColors[i];
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, s * 0.12 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(pos.x - 2, pos.y - 2, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#FFD700';
    ctx.fillRect(cx - s * 0.85, cy + s * 0.35, s * 1.7, s * 0.2);
  };

  const renderLegendaryItem = (cx: number, cy: number, size: number, level: number) => {
    const tier = getTierConfig(level);
    const s = size * (1.25 + (level - 20) * 0.05);
    const wingFlap = Math.sin(globalTime * 0.004) * 0.15;

    renderAura(cx, cy, s * 2.5, tier.glowColor, 1.5);
    renderParticles(cx, cy, s * 2, tier.particleCount, tier.secondaryColor);

    ctx.save();
    ctx.translate(cx - s * 0.5, cy);
    ctx.rotate(-0.3 - wingFlap);
    const wingGradientL = ctx.createLinearGradient(0, 0, -s * 1.2, 0);
    wingGradientL.addColorStop(0, tier.primaryColor);
    wingGradientL.addColorStop(1, tier.secondaryColor + '60');
    ctx.fillStyle = wingGradientL;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-s * 0.8, -s * 0.8, -s * 1.3, -s * 0.2);
    ctx.quadraticCurveTo(-s * 1, s * 0.3, -s * 0.5, s * 0.5);
    ctx.quadraticCurveTo(-s * 0.2, s * 0.3, 0, 0);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(cx + s * 0.5, cy);
    ctx.rotate(0.3 + wingFlap);
    const wingGradientR = ctx.createLinearGradient(0, 0, s * 1.2, 0);
    wingGradientR.addColorStop(0, tier.primaryColor);
    wingGradientR.addColorStop(1, tier.secondaryColor + '60');
    ctx.fillStyle = wingGradientR;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(s * 0.8, -s * 0.8, s * 1.3, -s * 0.2);
    ctx.quadraticCurveTo(s * 1, s * 0.3, s * 0.5, s * 0.5);
    ctx.quadraticCurveTo(s * 0.2, s * 0.3, 0, 0);
    ctx.fill();
    ctx.restore();

    const gemGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.7);
    gemGradient.addColorStop(0, '#FFF8E1');
    gemGradient.addColorStop(0.3, tier.secondaryColor);
    gemGradient.addColorStop(1, tier.primaryColor);
    ctx.fillStyle = gemGradient;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.7);
    ctx.lineTo(cx + s * 0.5, cy);
    ctx.lineTo(cx, cy + s * 0.7);
    ctx.lineTo(cx - s * 0.5, cy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.5);
    ctx.lineTo(cx + s * 0.2, cy - s * 0.1);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx - s * 0.2, cy - s * 0.1);
    ctx.closePath();
    ctx.fill();
  };

  const renderMythicItem = (cx: number, cy: number, size: number) => {
    const tier = getTierConfig(25);
    const s = size * 1.5;
    const pulse = 1 + Math.sin(globalTime * 0.002) * 0.1;

    renderAura(cx, cy, s * 3.5 * pulse, '#FF5252', 2);
    renderAura(cx, cy, s * 2.8 * pulse, '#FF8A80', 1.5);
    renderAura(cx, cy, s * 2.2 * pulse, '#FFAB91', 1);

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(globalTime * 0.001 * (i % 2 === 0 ? 1 : -1) + (i * Math.PI) / 3);
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.5 + i * 10, s * 0.8 + i * 5, 0, 0, Math.PI * 2);
      ctx.globalAlpha = 0.3 + i * 0.2;
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    renderParticles(cx, cy, s * 2, tier.particleCount, '#FFD700');
    renderParticles(cx, cy, s * 1.5, 8, '#FF5252');

    const gradient = ctx.createRadialGradient(cx, cy - s * 0.2, 0, cx, cy, s);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.2, '#FFCDD2');
    gradient.addColorStop(0.5, tier.secondaryColor);
    gradient.addColorStop(1, tier.primaryColor);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const r = i % 2 === 0 ? s : s * 0.6;
      const angle = (Math.PI * i) / 8 - Math.PI / 2 + globalTime * 0.0003;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.shadowBlur = 0;

    const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.4);
    coreGradient.addColorStop(0, '#FFFFFF');
    coreGradient.addColorStop(0.5, '#FFD700');
    coreGradient.addColorStop(1, '#FF6F00');
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.35 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,215,0,0.6)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + globalTime * 0.001;
      const innerR = s * 0.5;
      const outerR = s * 1.2 + Math.sin(globalTime * 0.003 + i) * s * 0.2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
      ctx.stroke();
    }
  };

  const renderItem = (cx: number, cy: number, size: number, level: number) => {
    const tierName = getTierByLevel(level);

    switch (tierName) {
      case 'common':
        renderCommonItem(cx, cy, size, level);
        break;
      case 'uncommon':
        renderUncommonItem(cx, cy, size, level);
        break;
      case 'rare':
        renderRareItem(cx, cy, size, level);
        break;
      case 'epic':
        renderEpicItem(cx, cy, size, level);
        break;
      case 'legendary':
        renderLegendaryItem(cx, cy, size, level);
        break;
      case 'mythic':
        renderMythicItem(cx, cy, size);
        break;
    }

    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(`+${level}`, cx, cy);
    ctx.shadowBlur = 0;
  };

  const renderEnhanceAnimation = (cx: number, cy: number) => {
    const progress = animationProgress;
    const sparkCount = 16;

    for (let i = 0; i < sparkCount; i++) {
      const angle = (Math.PI * 2 * i) / sparkCount + progress * Math.PI * 2;
      const dist = 40 + progress * 80;
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      const alpha = 1 - progress;
      const size = (1 - progress * 0.5) * 6;

      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const burstAlpha = Math.max(0, 1 - progress * 2);
    if (burstAlpha > 0) {
      const burstGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100 * progress);
      burstGradient.addColorStop(0, `rgba(255, 255, 255, ${burstAlpha})`);
      burstGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = burstGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, 100 * progress, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const renderButton = (btn: Button, isHovered: boolean) => {
    const gradient = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
    if (isHovered) {
      gradient.addColorStop(0, '#FFD700');
      gradient.addColorStop(1, '#FFA000');
    } else {
      gradient.addColorStop(0, '#4CAF50');
      gradient.addColorStop(1, '#2E7D32');
    }

    ctx.fillStyle = gradient;
    ctx.shadowColor = isHovered ? '#FFD700' : '#4CAF50';
    ctx.shadowBlur = isHovered ? 15 : 5;
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = isHovered ? '#FFF' : '#81C784';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
  };

  const renderGameScreen = () => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;

    buttons = [];

    const bgGradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    bgGradient.addColorStop(0, '#0f0f23');
    bgGradient.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5) % rect.width;
      const y = (i * 97.3) % rect.height;
      const size = 1 + Math.sin(globalTime * 0.001 + i) * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const tier = getTierConfig(state.level);
    ctx.fillStyle = 'white';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Max Level: ${state.maxLevel}`, 20, 30);
    ctx.fillText(`Attempts: ${state.attempts}`, 20, 55);

    ctx.textAlign = 'right';
    ctx.fillStyle = tier.primaryColor;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`${tier.nameKor} (${tier.name})`, rect.width - 20, 30);

    const itemCy = 220;
    renderItem(cx, itemCy, 55, state.level);

    if (isAnimating) {
      renderEnhanceAnimation(cx, itemCy);
    }

    const successRate = getSuccessRate(state.level);
    ctx.fillStyle = 'white';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';

    if (state.level < MAX_LEVEL) {
      ctx.fillText(`Lv.${state.level} → Lv.${state.level + 1}`, cx, 360);

      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = successRate >= 50 ? '#4CAF50' : successRate >= 20 ? '#FF9800' : '#F44336';
      ctx.fillText(`${successRate}%`, cx, 395);

      if (state.level >= DESTROY_START_LEVEL) {
        const destroyRate = FAILURE_RATES[state.level]?.destroy || 0;
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#F44336';
        ctx.fillText(`파괴 확률: ${destroyRate}%`, cx, 425);
      }
    }

    if (state.lastResult && !isAnimating) {
      ctx.font = 'bold 28px sans-serif';
      ctx.fillStyle = getResultColor(state.lastResult);
      ctx.fillText(getResultText(state.lastResult), cx, 460);
    }

    // 강화 버튼
    if (state.phase === 'playing' && state.level < MAX_LEVEL && !isAnimating) {
      const enhanceBtn: Button = {
        x: cx - 80,
        y: 500,
        w: 160,
        h: 50,
        action: doEnhance,
        label: '강화하기',
      };
      buttons.push(enhanceBtn);
      renderButton(enhanceBtn, hoveredButton === enhanceBtn);
    }

    // 재시작 버튼
    const restartBtn: Button = {
      x: cx - 50,
      y: 560,
      w: 100,
      h: 35,
      action: resetGame,
      label: '재시작',
    };
    buttons.push(restartBtn);

    ctx.fillStyle = hoveredButton === restartBtn ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h, 5);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('재시작 (R)', cx, restartBtn.y + restartBtn.h / 2 + 5);

    if (state.level >= MAX_LEVEL) {
      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FF6F00';
      ctx.shadowBlur = 10;
      ctx.fillText('★ MAX LEVEL ★', cx, 480);
      ctx.shadowBlur = 0;
    }
  };

  let lastTime = 0;
  const ANIMATION_DURATION = 600;

  const update = (t: number) => {
    if (!lastTime) lastTime = t;
    const dt = t - lastTime;
    lastTime = t;
    globalTime = t;

    if (isAnimating) {
      animationProgress += dt / ANIMATION_DURATION;
      if (animationProgress >= 1) {
        animationProgress = 1;
        applyResult();
      }
    }
  };

  const render = () => {
    renderGameScreen();

    if (state.phase === 'gameover') {
      gameOverHud.render(state.maxLevel);
    }
  };

  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();
    raf = requestAnimationFrame(draw);
  };

  resize();
  raf = requestAnimationFrame(draw);

  window.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('touchstart', onTouchStart);
  };
};
