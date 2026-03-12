# Game Icon Thumbnails Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all Lucide icons in GameCard with custom SVG game thumbnails using category-based gradient templates.

**Architecture:** Create 62 SVG files (61 games + 1 default fallback) in `public/image/games/`, then modify `GameCard.tsx` to use `next/image` Image component instead of Lucide icons.

**Tech Stack:** SVG, Next.js Image component, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-12-game-icon-thumbnails-design.md`

---

## Chunk 1: SVG Creation — Arcade + Action

### Task 1: Create default.svg fallback icon

**Files:**
- Create: `public/image/games/default.svg`

- [ ] **Step 1: Create default.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#64748b"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
  </defs>
  <rect width="120" height="120" rx="16" fill="url(#bg)"/>
  <rect x="35" y="45" width="50" height="32" rx="8" fill="white" fill-opacity="0.9"/>
  <circle cx="50" cy="61" r="5" fill="#64748b"/>
  <circle cx="70" cy="61" r="5" fill="#64748b"/>
  <rect x="42" y="77" width="10" height="16" rx="3" fill="white" fill-opacity="0.6"/>
  <rect x="68" y="77" width="10" height="16" rx="3" fill="white" fill-opacity="0.6"/>
  <circle cx="60" cy="38" r="4" fill="white" fill-opacity="0.5"/>
</svg>
```

- [ ] **Step 2: Commit**

```bash
git add public/image/games/default.svg
git commit -m "feat(icons): add default fallback game icon SVG"
```

### Task 2: Create Arcade category SVGs (13 files)

**Files:**
- Create: `public/image/games/tetrix.svg`
- Create: `public/image/games/snake.svg`
- Create: `public/image/games/pacmaze.svg`
- Create: `public/image/games/kero33.svg`
- Create: `public/image/games/brickout.svg`
- Create: `public/image/games/paddlerally.svg`
- Create: `public/image/games/asteroid.svg`
- Create: `public/image/games/spaceraiders.svg`
- Create: `public/image/games/missileguard.svg`
- Create: `public/image/games/bubbleshooter.svg`
- Create: `public/image/games/kracing.svg`
- Create: `public/image/games/kracing2.svg`
- Create: `public/image/games/randomdefense.svg`

**Template:** Arcade gradient `#f97316 → #ef4444`

- [ ] **Step 1: Create all 13 Arcade SVGs**

Each SVG follows this template structure:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#ef4444"/>
    </linearGradient>
    <filter id="s"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.12"/></filter>
  </defs>
  <rect width="120" height="120" rx="16" fill="url(#bg)"/>
  <!-- game-specific elements -->
</svg>
```

Icon concepts per game (from spec):
| gameId | Concept |
|--------|---------|
| tetrix | T-block shape + stacked lines at bottom |
| snake | Connected circles (body) + apple circle |
| pacmaze | Pac-man wedge + dots + wall lines |
| kero33 | Star/sparkle symbols |
| brickout | Paddle bar + brick rows + ball |
| paddlerally | Two paddles (left/right) + ball |
| asteroid | Triangle ship + irregular polygons |
| spaceraiders | Enemy row + player ship |
| missileguard | City silhouette + missile arc |
| bubbleshooter | Bubble cluster + shooter base |
| kracing | Car shape + road lines |
| kracing2 | Two car shapes + road lines |
| randomdefense | Tower + zigzag path |

- [ ] **Step 2: Commit**

```bash
git add public/image/games/tetrix.svg public/image/games/snake.svg public/image/games/pacmaze.svg public/image/games/kero33.svg public/image/games/brickout.svg public/image/games/paddlerally.svg public/image/games/asteroid.svg public/image/games/spaceraiders.svg public/image/games/missileguard.svg public/image/games/bubbleshooter.svg public/image/games/kracing.svg public/image/games/kracing2.svg public/image/games/randomdefense.svg
git commit -m "feat(icons): add Arcade category game icon SVGs (13 files)"
```

### Task 3: Create Action category SVGs (13 files)

**Files:**
- Create: `public/image/games/dodge.svg`
- Create: `public/image/games/flappywings.svg`
- Create: `public/image/games/dino.svg`
- Create: `public/image/games/doodlehop.svg`
- Create: `public/image/games/roadcross.svg`
- Create: `public/image/games/endlessstairs.svg`
- Create: `public/image/games/burger.svg`
- Create: `public/image/games/towerblocks.svg`
- Create: `public/image/games/kustom.svg`
- Create: `public/image/games/survivors.svg`
- Create: `public/image/games/helicopter.svg`
- Create: `public/image/games/dropwell.svg`
- Create: `public/image/games/hexaspin.svg`

**Template:** Action gradient `#3b82f6 → #6366f1`

- [ ] **Step 1: Create all 13 Action SVGs**

Same template structure with Action gradient. Icon concepts:
| gameId | Concept |
|--------|---------|
| dodge | Center player circle + scattered projectile circles |
| flappywings | Bird ellipse + pipe rectangles |
| dino | Dino silhouette + cactus |
| doodlehop | Character + platforms + up arrow |
| roadcross | Character + road stripes + car shape |
| endlessstairs | Staircase pattern + character dot |
| burger | Layered burger (bun/patty/lettuce) |
| towerblocks | Stacked colored blocks |
| kustom | Two crossed swords |
| survivors | Center character + surrounding enemy dots |
| helicopter | Helicopter shape + obstacle bars |
| dropwell | Falling blocks + well walls |
| hexaspin | Rotating hexagon + ball dot |

- [ ] **Step 2: Commit**

```bash
git add public/image/games/dodge.svg public/image/games/flappywings.svg public/image/games/dino.svg public/image/games/doodlehop.svg public/image/games/roadcross.svg public/image/games/endlessstairs.svg public/image/games/burger.svg public/image/games/towerblocks.svg public/image/games/kustom.svg public/image/games/survivors.svg public/image/games/helicopter.svg public/image/games/dropwell.svg public/image/games/hexaspin.svg
git commit -m "feat(icons): add Action category game icon SVGs (13 files)"
```

---

## Chunk 2: SVG Creation — Puzzle

### Task 4: Create Puzzle category SVGs (18 files)

**Files:**
- Create: `public/image/games/2048.svg`
- Create: `public/image/games/colorflood.svg`
- Create: `public/image/games/lightsout.svg`
- Create: `public/image/games/slidingpuzzle.svg`
- Create: `public/image/games/nonogram.svg`
- Create: `public/image/games/numberchain.svg`
- Create: `public/image/games/minesweeper.svg`
- Create: `public/image/games/matchpairs.svg`
- Create: `public/image/games/maze.svg`
- Create: `public/image/games/jellypop.svg`
- Create: `public/image/games/jewelcrush.svg`
- Create: `public/image/games/blockpuzzle.svg`
- Create: `public/image/games/queens.svg`
- Create: `public/image/games/ripple.svg`
- Create: `public/image/games/solitaire.svg`
- Create: `public/image/games/suikagame.svg`
- Create: `public/image/games/watersort.svg`
- Create: `public/image/games/gomoku.svg`

**Template:** Puzzle gradient `#10b981 → #06b6d4`

- [ ] **Step 1: Create all 18 Puzzle SVGs**

Icon concepts:
| gameId | Concept |
|--------|---------|
| 2048 | 2x2 number tiles (2, 4, 8, 16) |
| colorflood | 2x2 colored squares (4 different opacities) |
| lightsout | 3x3 grid with on/off cells |
| slidingpuzzle | 3x3 grid with one empty cell |
| nonogram | Grid + top/left number hints |
| numberchain | 1→2→3 connected circles with lines |
| minesweeper | Grid + flag + mine circle |
| matchpairs | Flipped cards + one face-up card |
| maze | Maze wall pattern + exit arrow |
| jellypop | Rounded square cluster (jelly shapes) |
| jewelcrush | 3 diamond/gem shapes in a row |
| blockpuzzle | L-shape + T-shape blocks on grid |
| queens | Checkerboard + crown shape |
| ripple | Concentric circles + numbers |
| solitaire | 3 fanned cards |
| suikagame | Graduated fruit circles (small→large) |
| watersort | Test tubes with colored layers |
| gomoku | Go board grid + black/white stones |

- [ ] **Step 2: Commit**

```bash
git add public/image/games/2048.svg public/image/games/colorflood.svg public/image/games/lightsout.svg public/image/games/slidingpuzzle.svg public/image/games/nonogram.svg public/image/games/numberchain.svg public/image/games/minesweeper.svg public/image/games/matchpairs.svg public/image/games/maze.svg public/image/games/jellypop.svg public/image/games/jewelcrush.svg public/image/games/blockpuzzle.svg public/image/games/queens.svg public/image/games/ripple.svg public/image/games/solitaire.svg public/image/games/suikagame.svg public/image/games/watersort.svg public/image/games/gomoku.svg
git commit -m "feat(icons): add Puzzle category game icon SVGs (18 files)"
```

---

## Chunk 3: SVG Creation — Reflex + Good Luck + Idle + Utility + Multiplayer

### Task 5: Create Reflex category SVGs (5 files)

**Files:**
- Create: `public/image/games/aimtrainer.svg`
- Create: `public/image/games/fruitslash.svg`
- Create: `public/image/games/typingfall.svg`
- Create: `public/image/games/colormemory.svg`
- Create: `public/image/games/rhythmbeat.svg`

**Template:** Reflex gradient `#eab308 → #f97316`

- [ ] **Step 1: Create all 5 Reflex SVGs**

| gameId | Concept |
|--------|---------|
| aimtrainer | Crosshair (concentric circles + lines) |
| fruitslash | Fruit circle + diagonal slash line |
| typingfall | Falling letter text elements |
| colormemory | Color card sequence (3-4 colored rects) |
| rhythmbeat | Music notes + rhythm lane lines |

- [ ] **Step 2: Commit**

```bash
git add public/image/games/aimtrainer.svg public/image/games/fruitslash.svg public/image/games/typingfall.svg public/image/games/colormemory.svg public/image/games/rhythmbeat.svg
git commit -m "feat(icons): add Reflex category game icon SVGs (5 files)"
```

### Task 6: Create Good Luck category SVGs (5 files)

**Files:**
- Create: `public/image/games/enhance.svg`
- Create: `public/image/games/slot.svg`
- Create: `public/image/games/highlow.svg`
- Create: `public/image/games/roulette.svg`
- Create: `public/image/games/rps.svg`

**Template:** Good Luck gradient `#a855f7 → #ec4899`

- [ ] **Step 1: Create all 5 Good Luck SVGs**

| gameId | Concept |
|--------|---------|
| enhance | Sword + up arrow + star sparkle |
| slot | Three reel rectangles with "7" text |
| highlow | Card shape + up/down arrows |
| roulette | Roulette wheel (divided circle) |
| rps | Rock/scissors/paper symbols |

- [ ] **Step 2: Commit**

```bash
git add public/image/games/enhance.svg public/image/games/slot.svg public/image/games/highlow.svg public/image/games/roulette.svg public/image/games/rps.svg
git commit -m "feat(icons): add Good Luck category game icon SVGs (5 files)"
```

### Task 7: Create Idle + Utility + Multiplayer SVGs (7 files)

**Files:**
- Create: `public/image/games/tapempire.svg`
- Create: `public/image/games/dungeonmerchant.svg`
- Create: `public/image/games/stocktrader.svg`
- Create: `public/image/games/ladder.svg`
- Create: `public/image/games/wheel.svg`
- Create: `public/image/games/whiteboard.svg`
- Create: `public/image/games/gomoku-online.svg`

**Templates:**
- Idle: `#14b8a6 → #0ea5e9`
- Utility: `#64748b → #475569`
- Multiplayer: `#f43f5e → #e11d48`

- [ ] **Step 1: Create all 7 SVGs**

| gameId | Category | Concept |
|--------|----------|---------|
| tapempire | Idle | Crown + rising bar chart |
| dungeonmerchant | Idle | Sword + gold coins |
| stocktrader | Idle | Candlestick chart |
| ladder | Utility | Vertical lines + horizontal bridges + top dots |
| wheel | Utility | Divided circle + pointer arrow |
| whiteboard | Multiplayer | Whiteboard rect + pen scribbles |
| gomoku-online | Multiplayer | Go board + stones + 2 person icons |

- [ ] **Step 2: Commit**

```bash
git add public/image/games/tapempire.svg public/image/games/dungeonmerchant.svg public/image/games/stocktrader.svg public/image/games/ladder.svg public/image/games/wheel.svg public/image/games/whiteboard.svg public/image/games/gomoku-online.svg
git commit -m "feat(icons): add Idle, Utility, Multiplayer category game icon SVGs (7 files)"
```

---

## Chunk 4: GameCard Component Modification + Verification

### Task 8: Modify GameCard.tsx

**Files:**
- Modify: `components/common/GameCard.tsx`

- [ ] **Step 1: Rewrite GameCard.tsx**

Replace entire file content with:

```tsx
'use client';

import { useState } from 'react';
import { TMenu } from '@/@types/menus';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from '@/provider/LocaleProvider';

interface IProps {
  menu: TMenu;
}

function GameCard({ menu }: IProps) {
  const { locale } = useLocale();
  const gameName = locale === 'ko' ? menu.name.kor : menu.name.eng;
  const [imgSrc, setImgSrc] = useState(`/image/games/${menu.href.slice(1)}.svg`);

  if (menu.disabled) {
    return (
      <div
        className={cn(
          'relative flex flex-col items-center justify-center',
          'aspect-square p-4 rounded-lg',
          'bg-arcade-surface border border-arcade-border',
          'cursor-not-allowed opacity-50',
          'transition-[border-color,box-shadow,opacity] duration-300',
        )}>
        <Lock className="absolute top-2 right-2 w-4 h-4 text-arcade-text/50" aria-hidden="true" />
        <Image
          src={imgSrc}
          alt={gameName}
          width={48}
          height={48}
          className="mb-2 grayscale opacity-30"
          onError={() => setImgSrc('/image/games/default.svg')}
        />
        <span className="text-sm font-bold text-arcade-text/50 text-center">
          {gameName}
        </span>
      </div>
    );
  }

  return (
    <Link href={menu.href} target={menu.target ?? '_self'} aria-label={gameName}>
      <div
        className={cn(
          'group relative flex flex-col items-center justify-center',
          'aspect-square p-4 rounded-lg',
          'bg-arcade-surface border border-arcade-border',
          'cursor-pointer',
          'transition-[transform,border-color,box-shadow] duration-300',
          'hover:scale-105',
          'hover:border-arcade-cyan',
          'hover:shadow-[0_0_20px_rgba(0,255,245,0.3)]',
        )}>
        <div
          className={cn(
            'absolute inset-0 rounded-lg opacity-0',
            'bg-gradient-to-br from-arcade-cyan/10 to-arcade-magenta/10',
            'group-hover:opacity-100 transition-opacity duration-300',
          )}
        />
        <Image
          src={imgSrc}
          alt={gameName}
          width={48}
          height={48}
          className={cn(
            'mb-2 relative z-10',
            'group-hover:brightness-110',
            'transition-[filter] duration-300',
          )}
          onError={() => setImgSrc('/image/games/default.svg')}
        />
        <span
          className={cn(
            'text-sm font-bold text-center relative z-10',
            'text-arcade-text/80',
            'group-hover:text-arcade-text',
            'transition-colors duration-300',
          )}>
          {gameName}
        </span>
      </div>
    </Link>
  );
}

export default GameCard;
```

- [ ] **Step 2: Commit**

```bash
git add components/common/GameCard.tsx
git commit -m "feat(icons): replace Lucide icons with custom SVG game thumbnails in GameCard"
```

### Task 9: Verify build and icon coverage

- [ ] **Step 1: Run build**

```bash
yarn build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Verify all MENU_LIST hrefs have corresponding SVGs**

Check that every href in `lib/config.ts` MENU_LIST has a matching SVG file in `public/image/games/`. Run:

```bash
# Extract all hrefs from MENU_LIST and check for corresponding SVG files
node -e "
const fs = require('fs');
const config = fs.readFileSync('lib/config.ts', 'utf8');
const hrefs = [...config.matchAll(/href:\s*'([^']+)'/g)].map(m => m[1]);
const missing = hrefs.filter(h => !fs.existsSync('public/image/games/' + h.slice(1) + '.svg'));
if (missing.length) { console.log('MISSING SVGs:', missing); process.exit(1); }
else { console.log('All', hrefs.length, 'game icons present.'); }
"
```

Expected: "All 61 game icons present." (or similar count matching active MENU_LIST entries)

- [ ] **Step 3: Run dev server and visual check**

```bash
yarn dev
```

Open http://localhost:3000 and verify:
- All game cards show custom SVG icons
- Hover effect (brightness + overlay) works
- No broken images

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(icons): address any icon issues found during verification"
```
