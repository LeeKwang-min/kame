# Gomoku (오목) Game Design Document

## Overview

15x15 보드에서 흑/백 돌을 번갈아 놓아 5개를 먼저 연결하면 승리하는 턴제 전략 게임. 렌주 규칙 적용, AI 싱글 대전 + WebSocket 멀티플레이어 대전을 별도 페이지로 제공.

## Game Meta

```typescript
// 싱글 AI 대전
export const GAME_META: TGameMeta = {
  id: 'gomoku',
  title: '오목',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'puzzle',
  difficulty: 'selectable',
};
```

---

## 1. Core Mechanics

### MDA Framework

- **Mechanics**: 15x15 보드, 흑/백 교대 착수, 렌주 규칙 (흑 금수), 5목 승리
- **Dynamics**: 공격/수비 동시 판단, 렌주 금수로 인한 비대칭 전략
- **Aesthetics**: 성취감 (AI 격파), 경쟁 (랭킹), 사회성 (멀티 대전)

### Core Game Loop

1. **INPUT** - 보드 위 교차점 클릭/탭
2. **PROCESS** - 렌주 규칙 검증 → 돌 배치 → 승리 판정
3. **FEEDBACK** - 돌 놓이는 애니메이션 + 사운드, 금수 위치 표시
4. **REWARD** - 승리 시 승률 갱신 + 랭킹 반영
5. **REPEAT** - 다음 판 시작

### Renju Rules (흑돌만 적용)

| 금수 | 설명 |
|------|------|
| 3-3 | 두 개의 열린 3이 동시에 만들어지는 수 |
| 4-4 | 두 개의 4가 동시에 만들어지는 수 |
| 장목 | 6목 이상이 되는 수 |

백돌은 제약 없이 자유롭게 둘 수 있음 (6목 이상도 승리).

---

## 2. Architecture

### Directory Structure

```
lib/gomoku/                          # 공유 라이브러리
├── board.ts                         # 보드 상태 관리, 돌 배치, 승리 판정
├── renju.ts                         # 렌주 규칙 검증 (33, 44, 장목)
├── ai.ts                            # AI 엔진 (Minimax + Alpha-Beta)
├── evaluate.ts                      # 보드 평가 함수 (패턴 점수)
├── types.ts                         # 공유 타입 (TBoard, TStone, TPosition)
└── constants.ts                     # 보드 크기, 패턴 정의

app/(canvas-mobile)/gomoku/          # 싱글 AI 대전
├── _lib/
│   ├── config.ts                    # GAME_META + 캔버스 설정
│   ├── types.ts                     # 싱글 전용 타입
│   └── game.ts                      # 캔버스 렌더링 + 게임 루프
├── _components/
│   └── gomoku.tsx                   # 캔버스 컴포넌트
├── layout.tsx
└── page.tsx

app/(multi)/gomoku-online/           # 멀티 WebSocket 대전
├── _lib/
│   ├── config.ts                    # 멀티 전용 설정
│   └── types.ts                     # 멀티 전용 타입
├── _components/
│   ├── gomoku-lobby.tsx             # 방 목록/생성
│   ├── gomoku-board.tsx             # 게임 보드 캔버스
│   └── player-info.tsx              # 대전 상대 정보
├── [roomId]/
│   └── page.tsx                     # 게임 방 페이지
├── layout.tsx
└── page.tsx                         # 로비 페이지

server/src/socket/handlers/
└── gomoku.ts                        # 서버 측 오목 핸들러
```

### Data Flow

**싱글 플레이:**
```
유저 탭/클릭 → 렌주 규칙 검증 → 돌 배치 → 보드 렌더링
                                    ↓
                              AI 차례 시작
                                    ↓
                           Minimax 탐색 → AI 수 결정 → 돌 배치
                                    ↓
                           승리 판정 → (종료 시) 스코어 저장
```

**멀티플레이:**
```
유저 탭/클릭 → 렌주 규칙 검증 → emit('gomoku:place', {x, y})
                                    ↓ (Server)
                              서버 측 규칙 재검증 → 보드 업데이트
                                    ↓
                   broadcast('gomoku:placed', {x, y, stone})
                                    ↓
                           승리 판정 → broadcast('gomoku:gameover', {winner})
```

### Scoring System (싱글)

기존 score 필드 활용, 승률 x 1000으로 정수 변환:
- 예: 70% 승률 → score: 700
- 랭킹보드: 높은 점수 = 높은 승률
- DB 스키마 변경 불필요

---

## 3. UI/UX Design

### Board Visual

- **배경**: 나무결 색상 (#DEB887 ~ #D2A86E)
- **격자선**: 진한 갈색 (#4A3728)
- **흑돌**: 검정 + 미세한 그라데이션 광택
- **백돌**: 순백 + 부드러운 그림자
- **마지막 수**: 돌 위 빨간 작은 원
- **금수 표시**: 반투명 X 마크
- **호버** (데스크탑): 반투명 돌 미리보기
- **화점**: 보드 주요 교차점에 검정 점 5개

### Desktop Layout (싱글)

3칼럼: 조작법 | 게임 보드 | 랭킹보드
- 보드 아래: 돌 카운트, 현재 차례, 난이도 선택

### Mobile Layout (싱글)

- 햄버거 메뉴 (로그인/조작법/랭킹)
- 난이도 선택 드롭다운
- CSS transform 스케일링 보드
- 하단: 돌 카운트 + 재시작/되돌리기 버튼

### Multiplayer Layout

- 로비: 방 목록 + 방 만들기 버튼
- 게임 방: 상대 정보 + 보드 + 내 정보 + 항복/나가기

---

## 4. Level Design (AI Difficulty)

### Flow Channel

```
     좌절감
         ↑
  고급   │                    ████
         │              ████████
  중급   │         ████████████     ← FLOW ZONE
         │    ████████████████
  입문   │████████████████████
         └──────────────────────→
           플레이어 실력 향상
```

### Difficulty Tiers

| | 입문 | 초급 | 중급 | 고급 |
|---|------|------|------|------|
| **전략** | 랜덤 + 즉각 위협 대응 | 패턴 기반 | Minimax (깊이 4) | Minimax (깊이 6) |
| **실수율** | 30% 랜덤 수 | 15% 차선수 | 5% 차선수 | 0% 최선수 |
| **반응 속도** | 즉시 | 0.5초 | 1초 | 1.5초 |
| **렌주 활용** | 금수 모름 | 기본 인식 | 금수 유도 | 금수 트랩 활용 |
| **대상** | 오목 처음 | 기본 규칙 숙지 | 전략적 플레이어 | 오목 고수 |

### Pacing

- **초반 (1~15수)**: 포석 단계, 낮은 긴장감
- **중반 (16~40수)**: 공격/수비 교차, 긴장감 상승
- **후반 (40수+)**: 결정적 한 수, 최고 긴장감

### Visual Feedback

- 위협 감지: AI 4목 시 경고 표시
- 마지막 수 강조: 빨간 점
- 착수 사운드: "딱" 소리
- 승리 연출: 5목 라인 하이라이트 애니메이션

---

## 5. Registration (6 files to modify)

1. `@types/scores.ts` - TGameType에 'gomoku' 추가
2. `lib/config.ts` - MENU_LIST에 오목 메뉴 추가
3. `components/common/GameCard.tsx` - 게임 아이콘 추가
4. `app/api/game-session/route.ts` - VALID_GAME_TYPES에 추가
5. `app/api/scores/route.ts` - VALID_GAME_TYPES에 추가
6. `lib/game-security/config.ts` - 보안 설정 추가 (maxScore: 1000, minPlayTime: 30s)

---

## 6. Multiplayer Server Extension

기존 화이트보드 WebSocket 패턴 활용:

### Socket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `gomoku:place` | Client → Server | `{ x, y }` |
| `gomoku:placed` | Server → Client | `{ x, y, stone, turnPlayer }` |
| `gomoku:gameover` | Server → Client | `{ winner, winLine }` |
| `gomoku:surrender` | Client → Server | `{}` |
| `gomoku:restart` | Client → Server | `{}` |
| `gomoku:request-sync` | Client → Server | `{}` |
| `gomoku:sync` | Server → Client | `{ board, turn, players }` |

### Server-Side Validation

- 현재 차례인 플레이어만 착수 가능
- 렌주 규칙 서버 측 재검증 (치팅 방지)
- 빈 교차점에만 착수 가능
- 승리 판정 서버 측 처리

### Room Configuration

```typescript
{
  gameType: 'gomoku',
  maxPlayers: 2,
  gameState: {
    board: number[][],    // 0: 빈칸, 1: 흑, 2: 백
    turn: 1 | 2,
    moveHistory: { x, y, stone }[],
    winner: null | 1 | 2,
  }
}
```
