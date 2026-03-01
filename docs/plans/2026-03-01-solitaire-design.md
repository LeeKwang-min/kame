# Klondike Solitaire Design

## Overview

Klondike Solitaire (Windows 솔리테어) — 가장 유명한 카드 게임을 Canvas 2D + 모바일 터치로 구현.

## Decisions

- **엔진**: Canvas 2D (`(canvas-mobile)` 라우트 그룹)
- **드로우 방식**: Draw 1 / Draw 3 둘 다 지원 (설정으로 전환)
- **점수**: 시간 기반 (빠를수록 고득점)
- **조작**: 탭 자동 이동 (파운데이션 > 태블로 우선순위)
- **플랫폼**: both (데스크탑 + 모바일)
- **화면 방향**: portrait
- **카테고리**: puzzle
- **난이도**: selectable (Draw 1 = 쉬움, Draw 3 = 어려움)

## GAME_META

```typescript
export const GAME_META: TGameMeta = {
  id: 'solitaire',
  title: '솔리테어',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'puzzle',
  difficulty: 'selectable',
};
```

## Board Layout

```
[Stock] [Waste]     [F1] [F2] [F3] [F4]    <- 상단
[  1 ] [  2 ] [  3 ] [  4 ] [  5 ] [  6 ] [  7 ]  <- 태블로 7열
```

- **Stock**: 남은 카드 뒤집어 놓은 더미
- **Waste**: Stock에서 넘긴 카드
- **Foundation x4**: A->K 같은 무늬 오름차순
- **Tableau 7열**: 다른 색상 내림차순. 1열=1장 ~ 7열=7장, 맨 위만 앞면

## Rules

- 태블로 이동: 다른 색상 + 내림차순 (검은 6 위에 빨간 5)
- 파운데이션 이동: 같은 무늬 + 오름차순 (A -> 2 -> 3 ... -> K)
- 여러 장 한 번에 이동 가능 (정렬된 카드 뭉치)
- 빈 열에는 K만 놓을 수 있음
- 승리: 4개 파운데이션에 52장 모두 정리

## Scoring

- `score = max(0, BASE_SCORE - elapsed_seconds * PENALTY_PER_SEC)`
- BASE_SCORE: 10000, PENALTY_PER_SEC: 2
- 클리어 실패(포기): 점수 0 (저장 안 함)

## Controls

### Desktop
| Input | Action |
|-------|--------|
| Card click | 자동 이동 |
| Stock click | 카드 넘기기 |
| S | 게임 시작 |
| R | 재시작 |
| P | 일시정지 |
| M | 음소거 |

### Mobile
| Input | Action |
|-------|--------|
| Card tap | 자동 이동 |
| Stock tap | 카드 넘기기 |
| Screen tap | 게임 시작 (시작 화면에서) |

## Canvas Size

620 x 900 (portrait)

## Tech Stack

- Canvas 2D API로 카드 직접 그리기
- CSS transform 스케일링 (기존 canvas-mobile 패턴)
- 모바일 Sheet 햄버거 메뉴 (로그인, 조작법, 랭킹)
- 카드 이동 lerp 애니메이션
