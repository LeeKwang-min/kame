# Game Icon Thumbnails Design

## Overview

KAME 프로젝트의 모든 게임에 커스텀 SVG 썸네일 아이콘을 추가한다. 기존 Lucide 아이콘(`GAME_ICONS` 레코드)을 완전히 교체하여, 각 게임의 상징성을 직관적으로 보여주는 Soft Gradient 스타일의 아이콘으로 전환한다.

## Design Decisions

| 항목 | 결정 |
|------|------|
| 스타일 | Soft Gradient (그라데이션 배경 + 그림자 입체감) |
| 색상 전략 | 카테고리별 색상 계열 |
| 통합 방식 | Lucide 아이콘 완전 교체 |
| 표현 수준 | 게임별 유연 — 핵심 메카닉 명확하면 상세, 아니면 대표 심볼 |
| 파일 형식 | SVG 파일 (`public/image/games/{gameId}.svg`) |
| 로딩 방식 | Next.js `Image` 컴포넌트 (`<Image src="/image/games/{id}.svg">`) |
| 제작 방식 | 카테고리별 템플릿 기반 배치 생성 |

## SVG Template Specification

### 공통 규격

- **viewBox**: `0 0 120 120`
- **배경**: `<rect width="120" height="120" rx="16" fill="url(#gradient)"/>`
- **그라데이션**: 카테고리별 대각선 `linearGradient` (x1=0, y1=0 → x2=1, y2=1)
- **내부 요소**: 흰색(`white`) + `fill-opacity` 0.4~0.9로 깊이감
- **그림자**: `feDropShadow dx=0 dy=1 stdDeviation=1.5~2` (필요한 요소에만)
- **파일명**: `{gameId}.svg`
- **저장 위치**: `public/image/games/`

### 카테고리별 그라데이션 팔레트

| 카테고리 | from | to | 느낌 |
|---------|------|-----|------|
| Arcade | `#f97316` | `#ef4444` | 오렌지 → 레드 |
| Action | `#3b82f6` | `#6366f1` | 블루 → 인디고 |
| Puzzle | `#10b981` | `#06b6d4` | 에메랄드 → 시안 |
| Reflex | `#eab308` | `#f97316` | 옐로 → 오렌지 |
| Good Luck | `#a855f7` | `#ec4899` | 퍼플 → 핑크 |
| Idle | `#14b8a6` | `#0ea5e9` | 틸 → 스카이블루 |
| Utility | `#64748b` | `#475569` | 슬레이트 → 다크슬레이트 |
| Multiplayer | `#f43f5e` | `#e11d48` | 로즈 → 다크로즈 |

### SVG 템플릿 예시

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{FROM_COLOR}"/>
      <stop offset="100%" stop-color="{TO_COLOR}"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.12"/>
    </filter>
  </defs>
  <rect width="120" height="120" rx="16" fill="url(#bg)"/>
  <!-- 게임별 내부 요소 -->
</svg>
```

## Game Icon Concepts (전체 목록)

### Arcade (13개) — 오렌지→레드

| gameId | 게임명 | 아이콘 컨셉 |
|--------|-------|------------|
| tetrix | 테트릭스 | T블록 + 쌓인 줄 |
| snake | 뱀 게임 | 뱀 몸통(원 연결) + 사과 |
| pacmaze | 팩 메이즈 | 팩맨 + 점 + 미로벽 |
| kero33 | 키어로33 | 별/스파클 심볼 |
| brickout | 벽돌 깨기 | 패들 + 벽돌 + 공 |
| paddlerally | 탁구 | 양쪽 패들 + 공 |
| asteroid | 소행성 | 우주선 + 소행성 |
| spaceraiders | 스페이스 레이더 | 적기 대열 + 자기 우주선 |
| missileguard | 미사일 가드 | 도시 실루엣 + 미사일 궤적 |
| bubbleshooter | 버블 슈터 | 버블 클러스터 + 발사대 |
| kracing | K-레이싱 | 레이싱 차 + 도로 |
| kracing2 | K-레이싱 2 | 레이싱 차 2대 + 도로 |
| randomdefense | 랜덤 디펜스 | 타워 + 적 경로 |

### Action (13개) — 블루→인디고

| gameId | 게임명 | 아이콘 컨셉 |
|--------|-------|------------|
| dodge | 닷지 | 플레이어 + 탄막 |
| flappywings | 플래피 윙즈 | 새 + 파이프 |
| dino | 공룡 달리기 | 공룡 실루엣 + 선인장 |
| doodlehop | 두들 홉 | 캐릭터 + 플랫폼 + 상승 화살표 |
| roadcross | 길건너기 | 캐릭터 + 도로 + 차 |
| endlessstairs | 끝없는 계단 | 계단 패턴 + 캐릭터 |
| burger | 햄버거 쌓기 | 햄버거 레이어 쌓기 |
| towerblocks | 타워 블록 | 쌓인 블록 타워 |
| kustom | 쿠스텀 | 검 2개 교차 |
| survivors | 서바이버스 | 캐릭터 + 둘러싼 적 |
| helicopter | 헬리콥터 | 헬리콥터 + 장애물 |
| dropwell | 드롭 웰 | 떨어지는 블록 + 우물 |
| hexaspin | 헥사 스핀 | 회전 육각형 + 공 |

### Puzzle (18개) — 에메랄드→시안

| gameId | 게임명 | 아이콘 컨셉 |
|--------|-------|------------|
| 2048 | 2048 | 2/4/8/16 숫자 타일 |
| colorflood | 컬러 플러드 | 컬러 그리드 (4색) |
| lightsout | 라이츠 아웃 | 3x3 그리드 (켜진/꺼진 셀) |
| slidingpuzzle | 슬라이딩 퍼즐 | 3x3 퍼즐 (빈칸 하나) |
| nonogram | 노노그램 | 그리드 + 상단/좌측 숫자 힌트 |
| numberchain | 넘버 체인 | 1→2→3 연결선 |
| minesweeper | 지뢰 찾기 | 그리드 + 깃발 + 지뢰 |
| matchpairs | 카드 짝 맞추기 | 뒤집힌 카드 2장 + 앞면 카드 |
| maze | 미로 탈출 | 미로 패턴 + 출구 화살표 |
| jellypop | 젤리 팝 | 젤리 클러스터 (둥근 사각형) |
| jewelcrush | 쥬얼 크러쉬 | 보석 3개 매칭 |
| blockpuzzle | 블록 퍼즐 | L/T 블록 + 그리드 |
| queens | 퀸즈 | 체스판 + 왕관 |
| ripple | 리플 | 동심원 + 숫자 |
| solitaire | 솔리테어 | 카드 3장 팬형 |
| suikagame | 수박 게임 | 과일(체리→수박) 크기순 |
| watersort | 워터 소트 | 색깔 물 시험관 |
| gomoku | 오목 | 바둑판 + 흑/백돌 |

### Reflex (5개) — 옐로→오렌지

| gameId | 게임명 | 아이콘 컨셉 |
|--------|-------|------------|
| aimtrainer | 에임 트레이너 | 크로스헤어 |
| fruitslash | 후르츠 슬래시 | 과일 + 칼자국 |
| typingfall | 타이핑 폴 | 떨어지는 글자들 |
| colormemory | 컬러 메모리 | 색상 카드 시퀀스 |
| rhythmbeat | 리듬 비트 | 음표 + 리듬 레인 |

### Good Luck (5개) — 퍼플→핑크

| gameId | 게임명 | 아이콘 컨셉 |
|--------|-------|------------|
| enhance | 강화 시뮬레이터 | 검 + 상승 화살표 + 별 |
| slot | 슬롯머신 | 777 슬롯 릴 |
| highlow | 하이로우 | 카드 + 위/아래 화살표 |
| roulette | 룰렛 | 룰렛 휠 |
| rps | 가위바위보 | 주먹/가위/보 심볼 |

### Idle (3개) — 틸→스카이블루

| gameId | 게임명 | 아이콘 컨셉 |
|--------|-------|------------|
| tapempire | 탭 제국 | 왕관 + 상승 막대그래프 |
| dungeonmerchant | 던전 상인 | 검 + 금화 |
| stocktrader | 주식왕 | 주식 차트 (캔들스틱) |

### Utility (2개) — 슬레이트→다크슬레이트

| gameId | 게임명 | 아이콘 컨셉 |
|--------|-------|------------|
| ladder | 사다리 타기 | 세로줄 + 가로 다리 + 상단 점 |
| wheel | 돌림판 | 분할 원 + 화살표 |

### Multiplayer (2개) — 로즈→다크로즈

| gameId | 게임명 | 아이콘 컨셉 |
|--------|-------|------------|
| whiteboard | 멀티 칠판 | 화이트보드 + 펜 |
| gomoku-online | 오목 온라인 | 바둑판 + 흑/백돌 + 사람 2명 |

## Component Changes

### GameCard.tsx

**삭제:**
- `GAME_ICONS` 레코드 전체
- 모든 Lucide 아이콘 import (Lock 제외 — disabled 상태에서 사용)

**추가:**
- `next/image`의 `Image` 컴포넌트 import
- SVG 이미지 렌더링:

```tsx
<Image
  src={`/image/games/${menu.href.slice(1)}.svg`}
  alt={gameName}
  width={48}
  height={48}
  className="mb-2 relative z-10"
/>
```

### Disabled 상태 처리

기존 Lucide 아이콘은 `text-arcade-text/30`으로 muted 처리했으나, `<Image>`는 CSS text color가 적용되지 않는다. 대신 CSS `filter`와 `opacity`를 사용한다:

```tsx
// disabled 카드의 이미지
<Image
  src={`/image/games/${menu.href.slice(1)}.svg`}
  alt={gameName}
  width={48}
  height={48}
  className="mb-2 grayscale opacity-30"
/>
```

### Hover 상태 처리

기존 Lucide 아이콘은 `text-arcade-cyan/70 → text-arcade-cyan`으로 hover 색상 전환을 했으나, `<Image>`는 내부 fill 색상을 CSS로 변경할 수 없다. 커스텀 SVG 아이콘은 이미 자체 색상을 가지고 있으므로, 아이콘 색상 전환은 제거한다. 대신:

- 기존 hover 그라데이션 오버레이 (`.from-arcade-cyan/10 .to-arcade-magenta/10`)는 유지
- hover 시 아이콘에 `brightness` 필터 추가로 살짝 밝아지는 효과:

```tsx
<Image
  src={`/image/games/${menu.href.slice(1)}.svg`}
  alt={gameName}
  width={48}
  height={48}
  className={cn(
    'mb-2 relative z-10',
    'group-hover:brightness-110',
    'transition-[filter] duration-300',
  )}
/>
```

### Missing SVG Fallback

SVG 파일이 누락된 경우를 대비해 default placeholder를 사용한다:

- `public/image/games/default.svg` — 기본 게임패드 아이콘 (Utility 그라데이션 적용)
- `<Image>` 컴포넌트의 `onError`로 fallback 처리:

```tsx
const [imgSrc, setImgSrc] = useState(`/image/games/${menu.href.slice(1)}.svg`);

<Image
  src={imgSrc}
  onError={() => setImgSrc('/image/games/default.svg')}
  ...
/>
```

### 기존 calcudoku.svg 처리

`public/image/games/calcudoku.svg`는 다른 프로젝트에서 참조용으로 가져온 파일이며, KAME의 `MENU_LIST`에는 없다. 구현 시 삭제하거나 그대로 둔다 (사용되지 않으므로 무해).

### 파일 구조

```
public/image/games/
├── default.svg       # fallback 기본 아이콘
├── tetrix.svg
├── snake.svg
├── pacmaze.svg
├── ... (총 61개 SVG 파일)
└── gomoku-online.svg
```

## Implementation Strategy

1. **카테고리별 SVG 템플릿 정의** — 8개 카테고리 그라데이션 설정
2. **전체 게임 SVG 일괄 생성** — 템플릿 기반으로 61개 SVG 파일 + default.svg 작성
3. **GameCard.tsx 수정** — Lucide → Image 교체, disabled/hover/fallback 처리
4. **검증** — 빌드 확인 + `MENU_LIST`의 모든 href에 대응하는 SVG 존재 확인
