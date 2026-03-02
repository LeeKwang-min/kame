# Idle Category Games Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 5 idle/management games to fill the Idle category: Cookie Bakery, Lemonade Stand, Dungeon Merchant, Stock Trader, Space Colony.

**Architecture:** All games follow the Tap Empire pattern in `(canvas-mobile)` route group. Canvas 2D engine, 620px square canvas, CSS transform scaling, 10-minute timed sessions. Each game uses the shared HUD system (`gameStartHud`, `gameLoadingHud`, `gamePauseHud`, `createGameOverHud`) and score saving via session tokens.

**Tech Stack:** Next.js App Router, Canvas 2D, TypeScript, Tailwind CSS, next-auth, shared game HUD library (`lib/game.ts`)

---

## Reference: Tap Empire Pattern

Every game MUST follow these patterns exactly (from `app/(canvas-mobile)/tapempire/`):

### File Structure
```
app/(canvas-mobile)/[gamename]/
├── _lib/config.ts      # GAME_META + constants + COLORS + LAYOUT
├── _lib/types.ts       # Type definitions
├── _lib/game.ts        # setup[GameName]() function, returns cleanup
├── _components/[gamename].tsx  # React wrapper with CSS transform scaling
├── page.tsx            # Mobile hamburger + desktop 3-column layout
└── layout.tsx          # KameHeader wrapper
```

### Critical Patterns
1. **game.ts** exports `setup[GameName](canvas, callbacks)` returning `() => void` cleanup
2. **Callbacks type**: `{ onGameStart?: () => Promise<void>; onScoreSave: (score: number) => Promise<TSaveResult>; isLoggedIn?: boolean; }`
3. **HUD imports**: `import { createGameOverHud, gameLoadingHud, gameStartHud, gamePauseHud, TGameOverCallbacks, TSaveResult } from '@/lib/game';`
4. **Game states**: `'start' | 'loading' | 'playing' | 'paused' | 'gameover'`
5. **Keyboard**: Always use `e.code` (e.g., `KeyS`, `KeyP`, `KeyR`, `Space`), check `e.repeat`
6. **Touch**: `canvas.addEventListener('touchstart', handler, { passive: false })`, use `getTouchPos()` with `getBoundingClientRect()` scaling
7. **Game over touch**: Must call `gameOverHud.onTouchStart(pos.x, pos.y, score)` when `isGameOver`
8. **Canvas setup**: `resize()` function sets canvas DPR, `canvas.style.width/height = CANVAS_SIZE`
9. **Component**: `wrapperRef` for CSS transform scaling, `updateScale()` on resize
10. **Registration**: 6 files must be updated per game

### Registration Files (6 files per game)
1. `@types/scores.ts` — Add to `TGameType` union (last entry before `;`)
2. `lib/config.ts` — Add to `MENU_LIST` in Idle section (after tapempire entry ~line 338)
3. `components/common/GameCard.tsx` — Add icon mapping + import
4. `app/api/game-session/route.ts` — Add to `VALID_GAME_TYPES` array
5. `app/api/scores/route.ts` — Add to `VALID_GAME_TYPES` array
6. `lib/game-security/config.ts` — Add security config entry

---

## Task 1: Cookie Bakery (쿠키 공장)

**Files:**
- Create: `app/(canvas-mobile)/cookiebakery/_lib/config.ts`
- Create: `app/(canvas-mobile)/cookiebakery/_lib/types.ts`
- Create: `app/(canvas-mobile)/cookiebakery/_lib/game.ts`
- Create: `app/(canvas-mobile)/cookiebakery/_components/cookiebakery.tsx`
- Create: `app/(canvas-mobile)/cookiebakery/page.tsx`
- Create: `app/(canvas-mobile)/cookiebakery/layout.tsx`
- Modify: 6 registration files

### Game Design

**Theme**: Cookie Clicker style bakery management

**Resources**: Cookies (single resource)

**Producers (6)**:
| ID | Name | Icon | Base Cost | Base Production/s |
|----|------|------|-----------|-------------------|
| cursor | 커서 | 👆 | 15 | 0.1 |
| grandma | 할머니 | 👵 | 100 | 1 |
| oven | 오븐 | 🔥 | 500 | 8 |
| factory | 공장 | 🏭 | 3000 | 47 |
| bank | 은행 | 🏦 | 20000 | 260 |
| franchise | 프랜차이즈 | 🌍 | 150000 | 1400 |

**Recipe Unlocks (8)** — Milestone-based (total cookies produced):
| Milestone | Recipe | Multiplier |
|-----------|--------|------------|
| 100 | 초코칩 | x1.2 |
| 1,000 | 바닐라 | x1.4 |
| 10,000 | 마카롱 | x1.6 |
| 50,000 | 크루아상 | x1.8 |
| 200,000 | 티라미수 | x2.0 |
| 1,000,000 | 도넛 | x2.5 |
| 5,000,000 | 웨딩케이크 | x3.0 |
| 20,000,000 | 황금쿠키 | x4.0 |

**Prestige System**:
- Player can reset mid-game (loses all cookies + producers)
- Earns "prestige points" based on total cookies at reset: `floor(sqrt(totalCookies / 1000))`
- Each prestige point gives permanent +1% production multiplier
- Strategy: Reset early to snowball faster in remaining time

**GAME_META**:
```typescript
{ id: 'cookiebakery', title: '쿠키 공장', engine: 'canvas', platform: 'both',
  touchControls: 'tap', orientation: 'portrait', category: 'idle', difficulty: 'progressive' }
```

**UI Layout** (CANVAS_SIZE = 620):
```
headerHeight: 50       — Gold display (left) + Timer (right)
tapAreaTop: 55          — Big cookie tap area (200px height)
tapAreaHeight: 200
recipeBarTop: 260       — Recipe unlock progress bar (25px)
recipeBarHeight: 25
statsBarTop: 290        — Per sec + Total + Prestige multiplier (25px)
statsBarHeight: 25
producerListTop: 320    — 6 producer rows (45px each = 270px)
producerRowHeight: 45
upgradeBarTop: 565      — [Tap UP] [Prestige Reset] buttons (50px)
upgradeBarHeight: 50
```

**Controls**:
```typescript
const controls = [
  { key: 'S / Tap', action: '게임 시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
  { key: 'Space / Tap', action: '쿠키 굽기' },
  { key: '1~6', action: '생산기 구매' },
  { key: 'Q', action: '탭 파워 업그레이드' },
  { key: 'E', action: '프레스티지 리셋' },
];
```

**Security**: `cookiebakery: { maxScore: 500000000, minPlayTimeSeconds: 120 }`

**GameCard icon**: `Cookie` from lucide-react

### Step 1: Read Tap Empire files for reference
Before writing any code, read all files in `app/(canvas-mobile)/tapempire/` to understand the exact patterns.

### Step 2: Create config.ts
Create `app/(canvas-mobile)/cookiebakery/_lib/config.ts` with GAME_META, CANVAS_SIZE=620, GAME_DURATION=600, COLORS (same palette as Tap Empire), PRODUCERS array, RECIPES array (milestone+multiplier), PRICE_MULTIPLIER=1.15, LAYOUT object.

### Step 3: Create types.ts
Create `app/(canvas-mobile)/cookiebakery/_lib/types.ts` with TProducerDef, TProducerState, TRecipe, TFloatingText.

### Step 4: Create game.ts
Create `app/(canvas-mobile)/cookiebakery/_lib/game.ts` following Tap Empire pattern exactly:
- `setupCookieBakery(canvas, callbacks)` returning cleanup function
- Same HUD imports and usage pattern
- Game logic: tap for cookies, auto-production, recipe unlocks, prestige system
- Keyboard (e.code) + touch event handling
- `gameOverHud.onTouchStart()` in touch handler when isGameOver
- `getTouchPos()` with rect scaling
- `formatGold()` helper for number display
- `drawRoundRect()` helper

### Step 5: Create component, page, layout
- `_components/cookiebakery.tsx` — Copy Tap Empire component, change names/imports
- `page.tsx` — Copy Tap Empire page, change controls array and component import
- `layout.tsx` — Copy Tap Empire layout, change title to '쿠키 공장'

### Step 6: Register in 6 files
1. `@types/scores.ts`: Add `| 'cookiebakery'` to TGameType
2. `lib/config.ts`: Add menu entry `{ name: { kor: '쿠키 공장', eng: 'Cookie Bakery' }, href: '/cookiebakery', category: 'Idle', platform: 'both' }` after tapempire
3. `components/common/GameCard.tsx`: Import `Cookie` from lucide-react, add `'/cookiebakery': Cookie`
4. `app/api/game-session/route.ts`: Add `'cookiebakery'` to VALID_GAME_TYPES
5. `app/api/scores/route.ts`: Add `'cookiebakery'` to VALID_GAME_TYPES
6. `lib/game-security/config.ts`: Add `cookiebakery: { maxScore: 500000000, minPlayTimeSeconds: 120 }`

### Step 7: Build and verify
Run `yarn build` to check for TypeScript errors. Fix any issues.

### Step 8: Commit
```bash
git add app/\(canvas-mobile\)/cookiebakery/ @types/scores.ts lib/config.ts components/common/GameCard.tsx app/api/game-session/route.ts app/api/scores/route.ts lib/game-security/config.ts
git commit -m "feat: add Cookie Bakery idle game"
```

---

## Task 2: Lemonade Stand (레모네이드 가판대)

**Files:**
- Create: `app/(canvas-mobile)/lemonadestand/_lib/config.ts`
- Create: `app/(canvas-mobile)/lemonadestand/_lib/types.ts`
- Create: `app/(canvas-mobile)/lemonadestand/_lib/game.ts`
- Create: `app/(canvas-mobile)/lemonadestand/_components/lemonadestand.tsx`
- Create: `app/(canvas-mobile)/lemonadestand/page.tsx`
- Create: `app/(canvas-mobile)/lemonadestand/layout.tsx`
- Modify: 6 registration files

### Game Design

**Theme**: Classic lemonade stand management

**Resources**: Gold (earned from sales), Ingredients (Lemon, Sugar, Ice — purchased with gold)

**Ingredients**:
| ID | Name | Icon | Buy Cost (per 10) | Max Stock |
|----|------|------|--------------------|-----------|
| lemon | 레몬 | 🍋 | 20G | 200 |
| sugar | 설탕 | 🍬 | 10G | 200 |
| ice | 얼음 | 🧊 | 15G | 200 |

**Recipe**: Each lemonade costs 1 lemon + 1 sugar + 1 ice. Player adjusts ratios via buttons:
- Lemon ratio: 1-5 (more = tangier, quality↑ cost↑)
- Sugar ratio: 1-5 (more = sweeter, quality↑ cost↑)
- Ice ratio: 1-3 (more = refreshing in hot weather)

**Quality Score**: Based on recipe + weather match:
- Sunny/Hot: Ice ratio matters more (ice x2 weight)
- Cold/Rainy: Sugar ratio matters more (sugar x2 weight)
- Quality = (lemon + sugar_weighted + ice_weighted) / max_possible * 100

**Weather System** (changes every 45 seconds):
| Weather | Icon | Demand Multiplier | Optimal Recipe |
|---------|------|-------------------|----------------|
| Sunny ☀️ | ☀️ | 1.0x | Balanced |
| Hot 🔥 | 🔥 | 1.5x | More ice |
| Rainy 🌧 | 🌧️ | 0.5x | More sugar |
| Cold ❄️ | ❄️ | 0.3x | More sugar, less ice |
| Cloudy ☁️ | ☁️ | 0.8x | Balanced |

**Pricing**: Player sets price $1-$10. Demand = baseDemand * weatherMultiplier * (10 - price) / 5 * (quality / 100)

**Auto-sell**: Customers arrive every 2-3 seconds. Each buys 1 lemonade if in stock and price acceptable.

**Reputation** (0-100): Quality lemonade → rep↑, out of stock → rep↓, overpriced → rep↓. Rep affects base customer arrival rate.

**Upgrades (5)**:
| ID | Name | Icon | Cost | Effect |
|----|------|------|------|--------|
| stand | 큰 가판대 | 🏪 | 500 | Customer rate x1.5 |
| fridge | 냉장고 | ❄️ | 1000 | Ice melts 50% slower |
| sign | 간판 | 📢 | 2000 | Customer rate x2 |
| mixer | 믹서기 | 🫙 | 5000 | Auto-make lemonade |
| franchise | 프랜차이즈 | 🏢 | 20000 | Passive income 10G/s |

**GAME_META**:
```typescript
{ id: 'lemonadestand', title: '레모네이드 가판대', engine: 'canvas', platform: 'both',
  touchControls: 'tap', orientation: 'portrait', category: 'idle', difficulty: 'progressive' }
```

**UI Layout** (CANVAS_SIZE = 620):
```
headerHeight: 50       — Gold + Timer
weatherBarTop: 55       — Weather icon + temp + demand indicator (35px)
weatherBarHeight: 35
standAreaTop: 95        — Stand visualization + customer animation (150px)
standAreaHeight: 150
reputationBarTop: 250   — Star rating bar (20px)
reputationBarHeight: 20
recipeAreaTop: 275      — Price setting + Recipe ratios (80px)
recipeAreaHeight: 80
statsBarTop: 360        — Sales/s, Stock status (25px)
statsBarHeight: 25
tabAreaTop: 390         — [재료 구매] [업그레이드] tab buttons (35px)
tabAreaHeight: 35
listAreaTop: 430        — Ingredient buy list OR upgrade list (185px)
listAreaHeight: 185
```

**Controls**:
```typescript
const controls = [
  { key: 'S / Tap', action: '게임 시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
  { key: '← →', action: '가격 조절' },
  { key: '1~3', action: '재료 구매 (레몬/설탕/얼음)' },
  { key: '4~8', action: '업그레이드 구매' },
];
```

**Security**: `lemonadestand: { maxScore: 100000000, minPlayTimeSeconds: 120 }`

**GameCard icon**: `CupSoda` from lucide-react

### Steps: Same as Task 1 pattern
1. Read Tap Empire for reference
2. Create config.ts, types.ts, game.ts
3. Create component, page, layout
4. Register in 6 files
5. Build and verify
6. Commit: `git commit -m "feat: add Lemonade Stand idle game"`

---

## Task 3: Dungeon Merchant (던전 상인)

**Files:**
- Create: `app/(canvas-mobile)/dungeonmerchant/_lib/config.ts`
- Create: `app/(canvas-mobile)/dungeonmerchant/_lib/types.ts`
- Create: `app/(canvas-mobile)/dungeonmerchant/_lib/game.ts`
- Create: `app/(canvas-mobile)/dungeonmerchant/_components/dungeonmerchant.tsx`
- Create: `app/(canvas-mobile)/dungeonmerchant/page.tsx`
- Create: `app/(canvas-mobile)/dungeonmerchant/layout.tsx`
- Modify: 6 registration files

### Game Design

**Theme**: Weapon shop in front of a dungeon

**Resources (3)**:
| ID | Name | Icon | Starting | Base Regen/s |
|----|------|------|----------|--------------|
| iron | 철 | ⛏ | 0 | 0 |
| wood | 목재 | 🪵 | 0 | 0 |
| gem | 보석 | 💎 | 0 | 0 |

**Resource Buildings (3, each 5 levels)**:
| ID | Name | Icon | Base Cost | Production/s | Cost Multiplier |
|----|------|------|-----------|--------------|-----------------|
| mine | 광산 | ⛏ | 50G | 1 iron/s | 1.5x per level |
| lumber | 벌목장 | 🪓 | 50G | 1 wood/s | 1.5x per level |
| gemmine | 보석광산 | 💎 | 200G | 0.3 gem/s | 1.8x per level |

**Crafting Recipes (6)**:
| ID | Name | Icon | Materials | Sell Price | Craft Time |
|----|------|------|-----------|------------|------------|
| dagger | 단검 | 🗡 | Iron x5 | 50G | 3s |
| shield | 방패 | 🛡 | Iron x3, Wood x5 | 80G | 4s |
| bow | 활 | 🏹 | Wood x8 | 70G | 3s |
| wand | 마법봉 | 🪄 | Wood x3, Gem x2 | 150G | 5s |
| armor | 갑옷 | 🛡 | Iron x10, Gem x1 | 200G | 6s |
| legendary | 전설무기 | ⚔️ | Iron x15, Wood x10, Gem x5 | 800G | 10s |

**Adventurer System**:
- Adventurers visit every 5-8 seconds
- They buy the most expensive available crafted item
- Display bubble: "[Adventurer name] bought [item]!"
- Random adventurer names: 용사, 기사, 마법사, 궁수, 도적

**Shop Upgrades (4)**:
| ID | Name | Cost | Effect |
|----|------|------|--------|
| display | 진열대 | 1000G | Can store 2 crafted items (default 1) |
| sign | 간판 | 3000G | Adventurer visit rate x1.5 |
| workshop | 공방 확장 | 5000G | Craft speed x1.5 |
| autocraft | 자동제작 | 15000G | Auto-craft cheapest recipe when materials available |

**Tap Action**: Tap to speed up current crafting (reduces craft time by 0.5s per tap)

**GAME_META**:
```typescript
{ id: 'dungeonmerchant', title: '던전 상인', engine: 'canvas', platform: 'both',
  touchControls: 'tap', orientation: 'portrait', category: 'idle', difficulty: 'progressive' }
```

**UI Layout** (CANVAS_SIZE = 620):
```
headerHeight: 50       — Gold + Timer
resourceBarTop: 55      — Iron/Wood/Gem counts (30px)
resourceBarHeight: 30
shopAreaTop: 90         — Shop visualization + adventurer animation (140px)
shopAreaHeight: 140
craftingBarTop: 235     — Current crafting progress bar (30px)
craftingBarHeight: 30
tabAreaTop: 270         — [자원] [제작] [상점] tab buttons (35px)
tabAreaHeight: 35
listAreaTop: 310        — Tab content area (260px)
listAreaHeight: 260
upgradeBarTop: 575      — Quick action bar (40px)
upgradeBarHeight: 40
```

**Controls**:
```typescript
const controls = [
  { key: 'S / Tap', action: '게임 시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
  { key: 'Space / Tap', action: '제작 가속' },
  { key: '1~3', action: '자원 건물 업그레이드' },
  { key: '4~9', action: '장비 제작' },
];
```

**Security**: `dungeonmerchant: { maxScore: 200000000, minPlayTimeSeconds: 120 }`

**GameCard icon**: `Sword` from lucide-react

### Steps: Same as Task 1 pattern
1. Read Tap Empire for reference
2. Create config.ts, types.ts, game.ts
3. Create component, page, layout
4. Register in 6 files
5. Build and verify
6. Commit: `git commit -m "feat: add Dungeon Merchant idle game"`

---

## Task 4: Stock Trader (주식왕)

**Files:**
- Create: `app/(canvas-mobile)/stocktrader/_lib/config.ts`
- Create: `app/(canvas-mobile)/stocktrader/_lib/types.ts`
- Create: `app/(canvas-mobile)/stocktrader/_lib/game.ts`
- Create: `app/(canvas-mobile)/stocktrader/_components/stocktrader.tsx`
- Create: `app/(canvas-mobile)/stocktrader/page.tsx`
- Create: `app/(canvas-mobile)/stocktrader/layout.tsx`
- Modify: 6 registration files

### Game Design

**Theme**: Stock market trading simulator

**Starting Capital**: 10,000G

**Stocks (5)**:
| ID | Name | Icon | Start Price | Volatility | Dividend/s | Trend |
|----|------|------|-------------|------------|------------|-------|
| tech | 테크 | 💻 | 100 | High (±8%) | 0 | Random |
| energy | 에너지 | ⚡ | 80 | Low (±2%) | 0.5G/share | Slight up |
| bio | 바이오 | 🧬 | 50 | Very High (±15%) | 0 | Random |
| land | 부동산 | 🏠 | 200 | Very Low (±1%) | 1G/share | Steady up |
| coin | 코인 | 🪙 | 30 | Extreme (±25%) | 0 | Random |

**Price Movement**: Every 2 seconds, each stock price updates:
```
newPrice = currentPrice * (1 + trend + randomGaussian() * volatility)
```
- Price history stored (last 30 data points) for mini chart
- Price cannot go below 1

**Buy/Sell**: Tap stock → buy/sell panel. Buy 1/5/10/All shares. Sell same quantities.

**News Events** (every 30-45 seconds, random):
| Event | Effect | Duration |
|-------|--------|----------|
| "테크 혁신 발표!" | Tech +30% | Instant |
| "에너지 위기" | Energy -20% | Instant |
| "바이오 임상 성공" | Bio +50% | Instant |
| "부동산 버블 경고" | Land -10% | Instant |
| "코인 규제 발표" | Coin -40% | Instant |
| "경기 호황!" | All +10% | Instant |
| "시장 폭락!" | All -15% | Instant |
| "배당금 인상!" | Dividends x2 for 30s | 30s |

**Unlocks** (net worth milestones):
| Net Worth | Unlock |
|-----------|--------|
| 15,000 | Bio stock unlocked |
| 25,000 | Land stock unlocked |
| 50,000 | Coin stock unlocked |
| 100,000 | Auto-trader (buys dips automatically) |

**Score**: Total net worth at 10min (cash + sum of shares × current price)

**GAME_META**:
```typescript
{ id: 'stocktrader', title: '주식왕', engine: 'canvas', platform: 'both',
  touchControls: 'tap', orientation: 'portrait', category: 'idle', difficulty: 'progressive' }
```

**UI Layout** (CANVAS_SIZE = 620):
```
headerHeight: 50       — Total assets + Timer
newsBarTop: 55          — Scrolling news ticker (30px)
newsBarHeight: 30
chartAreaTop: 90        — Selected stock mini chart (160px)
chartAreaHeight: 160
stockListTop: 255       — Stock cards horizontal (70px each)
stockListHeight: 70
tradeAreaTop: 330       — Buy/Sell buttons + quantity (80px)
tradeAreaHeight: 80
portfolioTop: 415       — Portfolio holdings table (155px)
portfolioHeight: 155
statusBarTop: 575       — Cash + Dividends/s (40px)
statusBarHeight: 40
```

**Controls**:
```typescript
const controls = [
  { key: 'S / Tap', action: '게임 시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
  { key: '1~5', action: '주식 선택' },
  { key: 'B', action: '매수' },
  { key: 'V', action: '매도' },
  { key: '← →', action: '수량 조절' },
];
```

**Security**: `stocktrader: { maxScore: 1000000000, minPlayTimeSeconds: 120 }`

**GameCard icon**: `TrendingUp` from lucide-react

### Steps: Same as Task 1 pattern
1. Read Tap Empire for reference
2. Create config.ts, types.ts, game.ts (note: mini chart drawing is key complexity)
3. Create component, page, layout
4. Register in 6 files
5. Build and verify
6. Commit: `git commit -m "feat: add Stock Trader idle game"`

---

## Task 5: Space Colony (우주 식민지)

**Files:**
- Create: `app/(canvas-mobile)/spacecolony/_lib/config.ts`
- Create: `app/(canvas-mobile)/spacecolony/_lib/types.ts`
- Create: `app/(canvas-mobile)/spacecolony/_lib/game.ts`
- Create: `app/(canvas-mobile)/spacecolony/_components/spacecolony.tsx`
- Create: `app/(canvas-mobile)/spacecolony/page.tsx`
- Create: `app/(canvas-mobile)/spacecolony/layout.tsx`
- Modify: 6 registration files

### Game Design

**Theme**: Mars colony building

**Resources (3)**:
| ID | Name | Icon | Starting | Max | Decay/s |
|----|------|------|----------|-----|---------|
| oxygen | 산소 | O₂ | 50 | 100 | -0.5/person |
| energy | 에너지 | ⚡ | 50 | 100 | -0.3/person |
| food | 식량 | 🌾 | 50 | 100 | -0.4/person |

**Population**: Starts at 5. If all 3 resources > 30%: pop grows +1 every 15s. If any resource < 10%: pop shrinks -1 every 10s. Population = workers available.

**Buildings (8, each costs workers to operate)**:
| ID | Name | Icon | Gold Cost | Workers | Effect | Max Level |
|----|------|------|-----------|---------|--------|-----------|
| solar | 태양광 | ☀️ | 100 | 1 | +2 energy/s | 5 |
| o2gen | 산소발생기 | 💨 | 100 | 1 | +2 oxygen/s | 5 |
| farm | 농장 | 🌾 | 100 | 1 | +2 food/s | 5 |
| dome | 거주돔 | 🏠 | 500 | 0 | Pop cap +10 | 3 |
| lab | 연구소 | 🔬 | 1000 | 2 | +1 research/s | 3 |
| miner | 광물채굴 | ⛏ | 300 | 1 | +5 gold/s | 5 |
| shield | 방어막 | 🛡 | 2000 | 0 | Reduces event damage | 1 |
| port | 우주항구 | 🚀 | 5000 | 3 | +20% all production | 1 |

**Gold**: Earned from miner buildings. Used to buy buildings. Starting gold: 500.

**Tech Tree** (research points from labs):
| RP Cost | Name | Effect |
|---------|------|--------|
| 50 | 효율 I | All production +20% |
| 100 | 자동화 | Buildings need 1 fewer worker (min 0) |
| 200 | 효율 II | All production +40% |
| 300 | 테라포밍 | Resource decay -50% |
| 500 | 양자 컴퓨터 | Research speed x2 |

**Random Events** (every 40-60 seconds):
| Event | Effect |
|-------|--------|
| 운석 충돌 | Random building loses 1 level (shield blocks) |
| 무역선 도착 | +200 gold |
| 이민선 도착 | +5 population instantly |
| 태양 폭풍 | Energy -30 (shield reduces to -10) |
| 풍작 | Food +50 |

**Score**: `(population * 100) + (techLevel * 500) + gold + (totalResources * 2)` at 10min

**GAME_META**:
```typescript
{ id: 'spacecolony', title: '우주 식민지', engine: 'canvas', platform: 'both',
  touchControls: 'tap', orientation: 'portrait', category: 'idle', difficulty: 'progressive' }
```

**UI Layout** (CANVAS_SIZE = 620):
```
headerHeight: 50       — Population + Gold + Timer
resourceBarsTop: 55    — O2/Energy/Food progress bars (80px)
resourceBarsHeight: 80
colonyViewTop: 140     — Colony grid visualization with buildings (130px)
colonyViewHeight: 130
eventLogTop: 275       — Event message display (25px)
eventLogHeight: 25
tabAreaTop: 305        — [건설] [연구] [정보] tab buttons (35px)
tabAreaHeight: 35
listAreaTop: 345       — Tab content (building list / tech tree / stats) (270px)
listAreaHeight: 270
```

**Controls**:
```typescript
const controls = [
  { key: 'S / Tap', action: '게임 시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
  { key: '1~8', action: '건물 건설/업그레이드' },
  { key: 'T', action: '연구 탭 전환' },
];
```

**Security**: `spacecolony: { maxScore: 100000000, minPlayTimeSeconds: 120 }`

**GameCard icon**: `Rocket` from lucide-react

### Steps: Same as Task 1 pattern
1. Read Tap Empire for reference
2. Create config.ts, types.ts, game.ts (most complex game — resource balance + tech tree + events)
3. Create component, page, layout
4. Register in 6 files
5. Build and verify
6. Commit: `git commit -m "feat: add Space Colony idle game"`

---

## Post-Implementation

After all 5 games are complete:

### Final Verification
1. Run `yarn build` — no TypeScript errors
2. Run `yarn dev` — navigate to each game, verify:
   - Game starts on S key / tap
   - Timer counts down from 10:00
   - Core mechanics work (tap, buy, upgrade)
   - Game over at 0:00 → score display → save works
   - Mobile layout: hamburger menu with login/controls/ranking
   - Desktop layout: 3-column layout
3. Check all 5 games appear in Idle category tab on main page

### Final Commit
```bash
git add .
git commit -m "feat: add 5 idle games (Cookie Bakery, Lemonade Stand, Dungeon Merchant, Stock Trader, Space Colony)"
```
