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

// ─── Summon Particles (Neon burst) ───

export function spawnSummonParticles(
  x: number,
  y: number,
  color: string,
): TParticle[] {
  const particles: TParticle[] = [];
  for (let i = 0; i < SUMMON_PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / SUMMON_PARTICLE_COUNT;
    const speed = 100 + Math.random() * 80;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: PARTICLE_LIFE,
      maxLife: PARTICLE_LIFE,
      size: 2 + Math.random() * 2,
      color,
      gravity: 0, // No gravity for digital particles
    });
  }
  return particles;
}

// ─── Merge Particles (Neon spiral + binary flash) ───

export function spawnMergeParticles(
  x: number,
  y: number,
  color: string,
): TParticle[] {
  const particles: TParticle[] = [];

  // Spiral energy
  for (let i = 0; i < MERGE_PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / MERGE_PARTICLE_COUNT + i * 0.4;
    const speed = 120 + Math.random() * 100;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: PARTICLE_LIFE * 1.5,
      maxLife: PARTICLE_LIFE * 1.5,
      size: 2 + Math.random() * 2,
      color,
      gravity: 10,
    });
  }

  // Cyan flash points
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 60;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: PARTICLE_LIFE,
      maxLife: PARTICLE_LIFE,
      size: 3 + Math.random() * 2,
      color: '#22d3ee',
      gravity: 0,
    });
  }

  return particles;
}

// ─── Kill Particles (Data fragmentation) ───

export function spawnKillParticles(
  x: number,
  y: number,
  color: string,
): TParticle[] {
  const particles: TParticle[] = [];
  for (let i = 0; i < KILL_PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 60;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: PARTICLE_LIFE * 0.8,
      maxLife: PARTICLE_LIFE * 0.8,
      size: 1.5 + Math.random() * 1.5,
      color,
      gravity: 0,
    });
  }
  return particles;
}

// ─── Boss Entry Particles (Alert Pulse) ───

export function spawnBossEntryParticles(
  x: number,
  y: number,
): TParticle[] {
  const particles: TParticle[] = [];
  for (let i = 0; i < BOSS_ENTRY_PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / BOSS_ENTRY_PARTICLE_COUNT;
    const speed = 150 + Math.random() * 100;
    const color = i % 2 === 0 ? '#ef4444' : '#22d3ee';
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: PARTICLE_LIFE * 2.0,
      maxLife: PARTICLE_LIFE * 2.0,
      size: 3 + Math.random() * 2,
      color,
      gravity: 0,
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
    color: '#fbbf24',
    life: 1.2,
    fontSize: 14,
  };
}

export function spawnWaveText(wave: number, canvasWidth: number): TFloatingText {
  const isBoss = wave % 5 === 0;
  return {
    x: canvasWidth / 2,
    y: 100,
    text: isBoss ? `[!] THREAT DETECTED: BOSS WAVE ${wave} [!]` : `ACCESSING WAVE ${wave}`,
    alpha: 1,
    color: isBoss ? '#ef4444' : '#22d3ee',
    life: 2.0,
    fontSize: isBoss ? 28 : 22,
  };
}

export function spawnRushBonusText(x: number, y: number, amount: number): TFloatingText {
  return {
    x,
    y: y - 20,
    text: `OVERCLOCK +${amount}G`,
    color: '#22d3ee',
    alpha: 1,
    life: 1.5,
    fontSize: 16,
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
