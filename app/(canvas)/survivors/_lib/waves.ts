import type { TWaveEvent, TEnemy } from './types';
import { WAVE_SCHEDULE, GAME_DURATION } from './config';
import { spawnEnemy, getSpawnPosition } from './enemies';

// ─── Internal Types ───

type TActiveWave = {
  event: TWaveEvent;
  spawnTimer: number;
  spawned: number;
};

type TWaveManager = {
  activeWaves: TActiveWave[];
  activatedIndices: Set<number>;
  deathSpawned: boolean;
};

// ─── Create Wave Manager ───

export function createWaveManager(): TWaveManager {
  return {
    activeWaves: [],
    activatedIndices: new Set(),
    deathSpawned: false,
  };
}

// ─── Update Waves ───

export function updateWaves(
  manager: TWaveManager,
  elapsed: number,
  dt: number,
  enemyPool: TEnemy[],
  playerX: number,
  playerY: number,
): void {
  // 1. Activate new wave events based on elapsed time
  for (let i = 0; i < WAVE_SCHEDULE.length; i++) {
    if (manager.activatedIndices.has(i)) continue;

    const event = WAVE_SCHEDULE[i];
    if (event.time <= elapsed) {
      manager.activeWaves.push({ event, spawnTimer: 0, spawned: 0 });
      manager.activatedIndices.add(i);
    }
  }

  // 2. Update each active wave (iterate backwards for safe removal)
  for (let i = manager.activeWaves.length - 1; i >= 0; i--) {
    const wave = manager.activeWaves[i];

    // Instant spawn (interval === 0): spawn all at once
    if (wave.event.interval === 0) {
      while (wave.spawned < wave.event.count) {
        const spawnPos = getSpawnPosition(playerX, playerY);
        spawnEnemy(
          enemyPool,
          wave.event.enemyType,
          spawnPos.x,
          spawnPos.y,
          wave.event.hpMultiplier,
          wave.event.speedMultiplier,
        );
        wave.spawned++;
      }
      manager.activeWaves.splice(i, 1);
      continue;
    }

    // Interval-based spawning
    wave.spawnTimer += dt;
    if (wave.spawnTimer >= wave.event.interval) {
      wave.spawnTimer -= wave.event.interval;

      const spawnPos = getSpawnPosition(playerX, playerY);
      spawnEnemy(
        enemyPool,
        wave.event.enemyType,
        spawnPos.x,
        spawnPos.y,
        wave.event.hpMultiplier,
        wave.event.speedMultiplier,
      );
      wave.spawned++;

      if (wave.spawned >= wave.event.count) {
        manager.activeWaves.splice(i, 1);
      }
    }
  }

  // 3. Death check at GAME_DURATION (600s)
  if (elapsed >= GAME_DURATION && !manager.deathSpawned) {
    const spawnPos = getSpawnPosition(playerX, playerY);
    const deathBoss = spawnEnemy(enemyPool, 'boss', spawnPos.x, spawnPos.y, 1, 1);
    if (deathBoss) {
      deathBoss.hp = 99999;
      deathBoss.maxHp = 99999;
      deathBoss.speed = 60;
      deathBoss.damage = 999;
    }
    manager.deathSpawned = true;
  }
}

// ─── Reset Wave Manager ───

export function resetWaveManager(manager: TWaveManager): void {
  manager.activeWaves = [];
  manager.activatedIndices.clear();
  manager.deathSpawned = false;
}
