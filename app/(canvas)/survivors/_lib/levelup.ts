import type {
  TLevelUpChoice,
  TPlayer,
  TWeaponId,
  TPassiveId,
  TWeaponInstance,
  TPassiveInstance,
} from './types';
import { MAX_WEAPONS, MAX_PASSIVES, COLORS } from './config';
import { WEAPON_DEFS, PASSIVE_DEFS, checkEvolution } from './weapons';
import { drawSprite, WEAPON_ICONS, PASSIVE_ICONS } from './sprites';
import { PLAYER_HP, PLAYER_PICKUP_RANGE } from './config';

// ─── Fisher-Yates Shuffle ───

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Generate Level-Up Choices ───

export function generateChoices(player: TPlayer, count: number = 3): TLevelUpChoice[] {
  const pool: TLevelUpChoice[] = [];

  const ownedWeaponIds = new Set(player.weapons.map((w) => w.id));
  const ownedPassiveIds = new Set(player.passives.map((p) => p.id));

  // 1. New weapons (if player has room)
  if (player.weapons.length < MAX_WEAPONS) {
    for (const def of Object.values(WEAPON_DEFS)) {
      if (!ownedWeaponIds.has(def.id)) {
        pool.push({
          type: 'weapon',
          id: def.id,
          name: def.name,
          description: def.description,
          level: 1,
        });
      }
    }
  }

  // 2. Weapon upgrades (for weapons player already has, level < 8, not evolved)
  for (const weapon of player.weapons) {
    if (weapon.level < 8 && !weapon.isEvolved) {
      const def = WEAPON_DEFS[weapon.id as TWeaponId];
      if (def) {
        pool.push({
          type: 'weapon',
          id: def.id,
          name: def.name,
          description: `Level ${weapon.level + 1}`,
          level: weapon.level + 1,
        });
      }
    }
  }

  // 3. New passives (if player has room)
  if (player.passives.length < MAX_PASSIVES) {
    for (const def of Object.values(PASSIVE_DEFS)) {
      if (!ownedPassiveIds.has(def.id)) {
        pool.push({
          type: 'passive',
          id: def.id,
          name: def.name,
          description: def.description,
          level: 1,
        });
      }
    }
  }

  // 4. Passive upgrades (for passives player has, level < 5)
  for (const passive of player.passives) {
    if (passive.level < 5) {
      const def = PASSIVE_DEFS[passive.id as TPassiveId];
      if (def) {
        pool.push({
          type: 'passive',
          id: def.id,
          name: def.name,
          description: `Level ${passive.level + 1}`,
          level: passive.level + 1,
        });
      }
    }
  }

  // 5. Shuffle and pick
  if (pool.length === 0) return [];

  shuffle(pool);
  return pool.slice(0, count);
}

// ─── Apply a Level-Up Choice ───

export function applyChoice(player: TPlayer, choice: TLevelUpChoice): void {
  if (choice.type === 'weapon') {
    if (choice.level === 1) {
      // New weapon
      const newWeapon: TWeaponInstance = {
        id: choice.id as TWeaponId,
        level: 1,
        cooldownTimer: 0,
        isEvolved: false,
      };
      player.weapons.push(newWeapon);
    } else {
      // Upgrade existing weapon
      const weapon = player.weapons.find((w) => w.id === choice.id);
      if (weapon) {
        weapon.level++;
      }
    }
  } else if (choice.type === 'passive') {
    if (choice.level === 1) {
      // New passive
      const newPassive: TPassiveInstance = {
        id: choice.id as TPassiveId,
        level: 1,
      };
      player.passives.push(newPassive);
    } else {
      // Upgrade existing passive
      const passive = player.passives.find((p) => p.id === choice.id);
      if (passive) {
        passive.level++;
      }
    }
  }

  // Check for weapon evolution after applying choice
  checkEvolution(player);

  // Update player stats based on passives
  const hollowHeart = player.passives.find((p) => p.id === 'hollow_heart');
  if (hollowHeart) {
    const newMaxHp = PLAYER_HP + hollowHeart.level;
    // If maxHp increased, also heal the difference
    if (newMaxHp > player.maxHp) {
      player.hp += newMaxHp - player.maxHp;
    }
    player.maxHp = newMaxHp;
  }

  const attractorb = player.passives.find((p) => p.id === 'attractorb');
  if (attractorb) {
    player.pickupRange = PLAYER_PICKUP_RANGE * (1 + attractorb.level * 0.25);
  }
}

// ─── Render Level-Up UI ───

/** Draw a rounded rectangle (fallback for Canvas without roundRect) */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function renderLevelUpUI(
  ctx: CanvasRenderingContext2D,
  choices: TLevelUpChoice[],
  canvasW: number,
  canvasH: number,
): void {
  // 1. Full-screen semi-transparent overlay
  ctx.fillStyle = COLORS.levelUpBg;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // 2. "LEVEL UP!" text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LEVEL UP!', canvasW / 2, 80);

  // 3. Cards layout
  const cardW = 200;
  const cardH = 280;
  const gap = 20;
  const totalW = choices.length * cardW + (choices.length - 1) * gap;
  const startX = (canvasW - totalW) / 2;
  const startY = (canvasH - cardH) / 2 - 10;

  for (let i = 0; i < choices.length; i++) {
    const choice = choices[i];
    const cx = startX + i * (cardW + gap);
    const cy = startY;

    // Card background with rounded corners
    drawRoundRect(ctx, cx, cy, cardW, cardH, 8);
    ctx.fillStyle = COLORS.cardBg;
    ctx.fill();

    // Card border
    drawRoundRect(ctx, cx, cy, cardW, cardH, 8);
    ctx.strokeStyle = COLORS.cardBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Card number indicator
    ctx.fillStyle = COLORS.cardBorder;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${i + 1}`, cx + cardW / 2, cy + 25);

    // Icon at top of card
    const iconScale = 4;
    const iconSize = 8 * iconScale; // 8x8 sprites at scale 4 = 32px
    const iconX = cx + (cardW - iconSize) / 2;
    const iconY = cy + 45;

    if (choice.type === 'weapon') {
      const icon = WEAPON_ICONS[choice.id as TWeaponId];
      if (icon) {
        drawSprite(ctx, icon, iconX, iconY, iconScale);
      }
    } else {
      const icon = PASSIVE_ICONS[choice.id as TPassiveId];
      if (icon) {
        drawSprite(ctx, icon, iconX, iconY, iconScale);
      }
    }

    // Type badge
    ctx.font = '12px monospace';
    ctx.fillStyle = choice.type === 'weapon' ? '#ff8844' : '#44ff88';
    ctx.textAlign = 'center';
    ctx.fillText(
      choice.type === 'weapon' ? 'WEAPON' : 'PASSIVE',
      cx + cardW / 2,
      iconY + iconSize + 16,
    );

    // Name text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(choice.name, cx + cardW / 2, iconY + iconSize + 40);

    // Level text
    ctx.fillStyle = COLORS.cardBorder;
    ctx.font = '14px monospace';
    ctx.fillText(`Lv.${choice.level}`, cx + cardW / 2, iconY + iconSize + 60);

    // Description text (wrap long descriptions)
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '12px monospace';
    const descY = iconY + iconSize + 80;
    const maxDescWidth = cardW - 20;

    // Simple word wrap
    const words = choice.description.split(' ');
    let line = '';
    let lineY = descY;

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxDescWidth && line) {
        ctx.fillText(line, cx + cardW / 2, lineY);
        line = word;
        lineY += 16;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, cx + cardW / 2, lineY);
    }
  }

  // 5. Bottom instruction
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Press 1, 2, or 3 to choose', canvasW / 2, canvasH - 50);
}

// ─── Handle Level-Up Input ───

export function handleLevelUpInput(code: string, choiceCount: number): number {
  if (code === 'Digit1') return 0;
  if (code === 'Digit2' && choiceCount >= 2) return 1;
  if (code === 'Digit3' && choiceCount >= 3) return 2;
  return -1;
}
