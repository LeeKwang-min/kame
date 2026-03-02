# Idle Category Games Design

## Overview

5개의 아이들/경영 게임을 추가하여 Idle 카테고리를 채운다.
모든 게임은 `(canvas-mobile)` 라우트 그룹, Canvas 2D 엔진, 10분 제한시간.

## Common Spec

| Item | Value |
|------|-------|
| Engine | Canvas 2D |
| Route Group | `(canvas-mobile)` |
| Platform | `both` |
| Duration | 600s (10min) |
| Canvas Size | 620px |
| Score | Final accumulated resources/gold |
| Template | Tap Empire pattern |

## Game 1: Cookie Bakery (쿠키 공장)

- **ID**: `cookiebakery`
- **Touch**: tap, **Orientation**: portrait
- **Resources**: Cookies (1 type)
- **Producers** (6): Cursor → Grandma → Oven → Factory → Bank → Franchise
- **Recipe Unlock** (8): Milestone-based, each gives production multiplier
- **Prestige**: Reset mid-game for permanent multiplier bonus
- **Score**: Total cookies produced over 10min
- **Security**: maxScore: 500000000, minPlayTime: 120s

## Game 2: Dungeon Merchant (던전 상인)

- **ID**: `dungeonmerchant`
- **Touch**: tap, **Orientation**: portrait
- **Resources** (3): Iron, Wood, Gem
- **Production Buildings**: Mine, Lumber, Gem Mine (each 3 levels)
- **Crafting**: Combine resources → Equipment → Auto-sell to adventurers
- **Adventurer System**: Periodic visits, auto-purchase equipment
- **Shop Upgrades**: Display(sell capacity), Sign(visit frequency), Workshop(craft speed)
- **Score**: Total gold earned
- **Security**: maxScore: 200000000, minPlayTime: 120s

## Game 3: Stock Trader (주식왕)

- **ID**: `stocktrader`
- **Touch**: tap, **Orientation**: portrait
- **Starting Capital**: 10,000G
- **Stocks** (5): Tech(high volatility), Energy(stable), Bio(high risk/reward), Land(low volatility+dividend), Coin(extreme volatility)
- **Real-time Charts**: Mini line chart with random walk + trends
- **Dividends**: Auto income from held stocks
- **News Events**: Every 30s, random news affects stock prices
- **Unlocks**: Net worth milestones unlock new investments
- **Score**: Total assets (cash + portfolio value) at 10min
- **Security**: maxScore: 1000000000, minPlayTime: 120s

## Game 4: Space Colony (우주 식민지)

- **ID**: `spacecolony`
- **Touch**: tap, **Orientation**: portrait
- **Resources** (3): Oxygen, Energy, Food
- **Population**: Auto-grows when resources sufficient, decreases when not
- **Buildings** (8): Solar Panel, O2 Generator, Farm, Dome, Lab, Mineral Miner, Shield, Spaceport
- **Tech Tree**: Research points unlock efficiency boosts, new buildings, automation
- **Random Events**: Meteor(damage), Trade Ship(bonus), Immigration(population surge)
- **Score**: Population × Tech Level + surplus resources
- **Security**: maxScore: 100000000, minPlayTime: 120s

## Game 5: Lemonade Stand (레모네이드 가판대)

- **ID**: `lemonadestand`
- **Touch**: tap, **Orientation**: portrait
- **Ingredients** (3): Lemon, Sugar, Ice (purchasable)
- **Recipe Slider**: Adjust ratios → affects taste quality
- **Weather System**: Changes every 30s (Sunny/Rainy/Hot/Cold) → affects demand
- **Pricing**: Player sets price → demand curve determines sales volume
- **Auto-sell**: Customers visit periodically → auto purchase
- **Upgrades**: Bigger Stand, Fridge, Sign, Franchise
- **Reputation**: Quality lemonade → reputation up → more customers
- **Score**: Total gold earned
- **Security**: maxScore: 100000000, minPlayTime: 120s

## Implementation Order

1. Cookie Bakery (closest to Tap Empire)
2. Lemonade Stand (simple economy + weather)
3. Dungeon Merchant (multi-resource + crafting)
4. Stock Trader (real-time charts + events)
5. Space Colony (most complex: resource balance + tech tree)

## Files to Modify per Game (6 files)

1. `@types/scores.ts` — TGameType
2. `lib/config.ts` — MENU_LIST
3. `components/common/GameCard.tsx` — game icon
4. `app/api/game-session/route.ts` — VALID_GAME_TYPES
5. `app/api/scores/route.ts` — VALID_GAME_TYPES
6. `lib/game-security/config.ts` — security config
