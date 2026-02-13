import type { TWaveEvent, TEnemy, TEnemyType } from './types';
import { WAVE_SCHEDULE, GAME_DURATION } from './config';
import { spawnEnemy, getSpawnPosition } from './enemies';

// ─── Internal Types ───

type TActiveSpawner = {
  event: TWaveEvent;
  spawnTimer: number;
  spawned: number;
};

type TWaveManager = {
  // One active spawner per enemy type (replaced when new event activates)
  spawners: Map<TEnemyType, TActiveSpawner>;
  activatedIndices: Set<number>;
  deathSpawned: boolean;
};

// ─── Create Wave Manager ───

export function createWaveManager(): TWaveManager {
  return {
    spawners: new Map(),
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
  // 1. Activate new events based on elapsed time
  for (let i = 0; i < WAVE_SCHEDULE.length; i++) {
    if (manager.activatedIndices.has(i)) continue;

    const event = WAVE_SCHEDULE[i];
    if (event.time <= elapsed) {
      manager.activatedIndices.add(i);

      if (event.count != null) {
        // Finite spawn (e.g. boss): handle immediately, don't replace spawner
        if (event.interval === 0) {
          // Instant spawn all at once
          for (let j = 0; j < event.count; j++) {
            const spawnPos = getSpawnPosition(playerX, playerY);
            spawnEnemy(
              enemyPool,
              event.enemyType,
              spawnPos.x,
              spawnPos.y,
              event.hpMultiplier,
              event.speedMultiplier,
            );
          }
        } else {
          // Finite count with interval: create a temporary separate spawner
          // Store with a unique key so it doesn't replace the continuous spawner
          const tempKey = `${event.enemyType}_finite_${i}` as TEnemyType;
          manager.spawners.set(tempKey, { event, spawnTimer: 0, spawned: 0 });
        }
      } else {
        // Infinite spawn: replace existing spawner for this enemy type
        manager.spawners.set(event.enemyType, { event, spawnTimer: 0, spawned: 0 });
      }
    }
  }

  // 2. Update all active spawners
  const toRemove: TEnemyType[] = [];

  for (const [key, spawner] of manager.spawners) {
    // Skip instant spawns (already handled above)
    if (spawner.event.interval === 0) {
      toRemove.push(key);
      continue;
    }

    spawner.spawnTimer += dt;
    while (spawner.spawnTimer >= spawner.event.interval) {
      spawner.spawnTimer -= spawner.event.interval;

      const spawnPos = getSpawnPosition(playerX, playerY);
      spawnEnemy(
        enemyPool,
        spawner.event.enemyType,
        spawnPos.x,
        spawnPos.y,
        spawner.event.hpMultiplier,
        spawner.event.speedMultiplier,
      );
      spawner.spawned++;

      // Only remove if finite count is reached
      if (spawner.event.count != null && spawner.spawned >= spawner.event.count) {
        toRemove.push(key);
        break;
      }
    }
  }

  for (const key of toRemove) {
    manager.spawners.delete(key);
  }

  // 3. Death boss at GAME_DURATION (600s)
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
  manager.spawners.clear();
  manager.activatedIndices.clear();
  manager.deathSpawned = false;
}
