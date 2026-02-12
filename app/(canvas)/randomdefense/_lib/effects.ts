import {
  SUMMON_PARTICLE_COUNT,
  MERGE_PARTICLE_COUNT,
  KILL_PARTICLE_COUNT,
  BOSS_ENTRY_PARTICLE_COUNT,
  PARTICLE_LIFE,
  SCREEN_SHAKE_DURATION,
  SCREEN_SHAKE_INTENSITY,
} from './config';
import { TParticle, TFloatingText, TScreenShake } from './types';

// ─── Summon Particles (circular burst, tier color) ───

export function spawnSummonParticles(
  x: number,
  y: number,
  color: string,
): TParticle[] {
  const particles: TParticle[] = [];
  for (let i = 0; i < SUMMON_PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / SUMMON_PARTICLE_COUNT;
    const speed = 80 + Math.random() * 60;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: PARTICLE_LIFE,
      maxLife: PARTICLE_LIFE,
      size: 3 + Math.random() * 2,
      color,
      gravity: 100,
    });
  }
  return particles;
}

// ─── Merge Particles (spiral + white glow) ───

export function spawnMergeParticles(
  x: number,
  y: number,
  color: string,
): TParticle[] {
  const particles: TParticle[] = [];

  // Spiral burst
  for (let i = 0; i < MERGE_PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / MERGE_PARTICLE_COUNT + i * 0.3;
    const speed = 100 + Math.random() * 80;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: PARTICLE_LIFE * 1.2,
      maxLife: PARTICLE_LIFE * 1.2,
      size: 3 + Math.random() * 3,
      color,
      gravity: 50,
    });
  }

  // White glow
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 40;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: PARTICLE_LIFE * 0.8,
      maxLife: PARTICLE_LIFE * 0.8,
      size: 4 + Math.random() * 3,
      color: '#ffffff',
      gravity: 20,
    });
  }

  return particles;
}

// ─── Kill Particles (gravity drop) ───

export function spawnKillParticles(
  x: number,
  y: number,
  color: string,
): TParticle[] {
  const particles: TParticle[] = [];
  for (let i = 0; i < KILL_PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 80;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: PARTICLE_LIFE * 0.6,
      maxLife: PARTICLE_LIFE * 0.6,
      size: 2 + Math.random() * 2,
      color,
      gravity: 300,
    });
  }
  return particles;
}

// ─── Boss Entry Particles (red/gold ring burst) ───

export function spawnBossEntryParticles(
  x: number,
  y: number,
): TParticle[] {
  const particles: TParticle[] = [];
  for (let i = 0; i < BOSS_ENTRY_PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / BOSS_ENTRY_PARTICLE_COUNT;
    const speed = 120 + Math.random() * 80;
    const color = i % 2 === 0 ? '#ef4444' : '#f59e0b';
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: PARTICLE_LIFE * 1.5,
      maxLife: PARTICLE_LIFE * 1.5,
      size: 4 + Math.random() * 3,
      color,
      gravity: 30,
    });
  }
  return particles;
}

// ─── Floating Texts ───

export function spawnGoldText(x: number, y: number, amount: number): TFloatingText {
  return {
    x,
    y: y - 20,
    text: `+${amount}G`,
    alpha: 1,
    color: '#f59e0b',
    life: 1.2,
    fontSize: 14,
  };
}

export function spawnWaveText(wave: number, canvasWidth: number): TFloatingText {
  const isBoss = wave % 5 === 0;
  return {
    x: canvasWidth / 2,
    y: 100,
    text: isBoss ? `⚠ BOSS WAVE ${wave} ⚠` : `Wave ${wave}`,
    alpha: 1,
    color: isBoss ? '#ef4444' : '#ffffff',
    life: 2.0,
    fontSize: isBoss ? 32 : 24,
  };
}

export function spawnRushBonusText(x: number, y: number, amount: number): TFloatingText {
  return {
    x,
    y: y - 20,
    text: `RUSH +${amount}G`,
    color: '#06b6d4', // cyan
    alpha: 1,
    life: 1.5,
    fontSize: 18,
  };
}

// ─── Screen Shake ───

export function triggerScreenShake(
  shake: TScreenShake,
  intensity?: number,
): void {
  shake.timer = SCREEN_SHAKE_DURATION;
  shake.intensity = intensity ?? SCREEN_SHAKE_INTENSITY;
}

export function getShakeOffset(shake: TScreenShake): { x: number; y: number } {
  if (shake.timer <= 0) return { x: 0, y: 0 };
  const magnitude = shake.intensity * (shake.timer / SCREEN_SHAKE_DURATION);
  return {
    x: (Math.random() - 0.5) * 2 * magnitude,
    y: (Math.random() - 0.5) * 2 * magnitude,
  };
}

export function updateScreenShake(shake: TScreenShake, dt: number): void {
  if (shake.timer > 0) {
    shake.timer -= dt;
    if (shake.timer < 0) shake.timer = 0;
  }
}

// ─── Update Particles (reverse iterate + splice) ───

export function updateParticles(particles: TParticle[], dt: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.vy += p.gravity * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

// ─── Update Floating Texts ───

export function updateFloatingTexts(texts: TFloatingText[], dt: number): void {
  for (let i = texts.length - 1; i >= 0; i--) {
    const ft = texts[i];
    ft.y -= 40 * dt;
    ft.life -= dt;
    ft.alpha = Math.max(0, ft.life);
    if (ft.life <= 0) {
      texts.splice(i, 1);
    }
  }
}
