# RhythmBeat - 리듬 비트 게임 설계

## 개요

4키 하강형 리듬 게임. 프로시저럴 비트 생성(Web Audio API)으로 외부 음악 파일 없이 구현.
무한 모드로 BPM이 점진적으로 가속되며, HP가 0이 되면 게임 오버.

## GAME_META

```typescript
{
  id: 'rhythmbeat',
  title: '리듬 비트',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'reflex',
  difficulty: 'progressive',
}
```

## 디렉토리 구조

```
app/(canvas-mobile)/rhythmbeat/
├── _lib/
│   ├── config.ts      # GAME_META + 캔버스/게임 상수
│   ├── types.ts       # TNote, TPattern, TJudgment 등
│   ├── game.ts        # 메인 게임 루프, 입력 처리, 렌더링
│   ├── patterns.ts    # 리듬 패턴 테이블 (Lv1~3)
│   └── audio.ts       # Web Audio API 사운드 엔진
├── _components/
│   └── RhythmBeat.tsx # React 컴포넌트 (동적 높이 + CSS transform)
├── layout.tsx
└── page.tsx           # 모바일 햄버거 + 데스크탑 3칼럼
```

## 코어 메카닉

### 4레인 시스템

| 레인 | 키 (e.code) | 색상 | 터치 영역 |
|------|------------|------|----------|
| D | KeyD | #00f5ff (cyan) | 좌측 1/4 |
| F | KeyF | #ff00ff (magenta) | 좌중 1/4 |
| J | KeyJ | #ffff00 (yellow) | 우중 1/4 |
| K | KeyK | #00ff88 (green) | 우측 1/4 |

### 판정 시스템

| 판정 | 타이밍 오차 | 기본 점수 | 색상 | HP 변화 |
|------|-----------|----------|------|---------|
| Perfect | +-30ms | 300 | 금색 | +3 |
| Great | +-60ms | 200 | cyan | +1 |
| Good | +-100ms | 100 | 흰색 | -2 |
| Miss | >100ms / 노트 지나감 | 0 | 빨간색 | -10 |

### 콤보 & 점수

- 콤보: Miss 없이 연속 히트한 횟수
- 점수 = 판정 기본점수 x (1 + floor(combo / 10) x 0.1)
- 10콤보마다 배율 +0.1 (10콤보=1.1x, 50콤보=1.5x, 100콤보=2.0x)

### HP 시스템

- HP: 100에서 시작
- HP <= 0 -> 게임 오버
- HP 바: 상단 가로 바 (초록->노랑->빨강 그라데이션)

### BPM 프로그레션

| 시간(초) | BPM | 구간 이름 | 패턴 난이도 |
|---------|-----|----------|-----------|
| 0~30 | 100 | Warm Up | Lv1 |
| 30~60 | 115 | Build Up | Lv1~2 |
| 60~90 | 100 | Rest | Lv1 |
| 90~130 | 130 | Intensity | Lv2~3 |
| 130~150 | 115 | Rest | Lv1 |
| 150~200 | 145 | Peak | Lv2~3 |
| 200~220 | 130 | Rest | Lv1 |
| 220+ | 160~ | Endless | Lv2~3 (점진 가속, 상한 200) |

Build -> Peak -> Rest 사이클로 Pacing 조절.

## 프로시저럴 사운드 (Web Audio API)

### 사운드 요소

- 킥 드럼: OscillatorNode (사인파 150Hz->50Hz 급하강) + 짧은 노이즈
- 스네어: 화이트 노이즈 + 밴드패스 필터
- 하이햇: 고주파 노이즈 + 하이패스 필터 + 짧은 감쇄
- 히트음: 삼각파 (레인별 주파수 D:C4, F:E4, J:G4, K:B4)
- 미스음: 사각파 낮은 주파수 짧은 버즈

### 음소거

- KeyM으로 토글
- 초기 상태: 음소거
- 음소거 시에도 판정은 정상 작동

## 패턴 시스템

```typescript
type TBeat = number | number[] | 0;  // 0=없음, 1=D, 2=F, 3=J, 4=K, [1,4]=동시
type TPattern = {
  beats: TBeat[];
  difficulty: 1 | 2 | 3;
};
```

- Lv1: 4비트 단순 패턴
- Lv2: 8비트 혼합 패턴
- Lv3: 동시노트 + 복잡 패턴
- 같은 패턴 3연속 방지

## 시각적 디자인

- 배경: #0a0a0f (짙은 남색/검정) + 미세한 그리드
- 레인 구분선: rgba(255,255,255,0.05)
- 판정 라인: 네온 글로우, 히트 시 레인 색상으로 밝아짐
- 노트: 둥근 모서리 직사각형 (레인폭 80%, 높이 20px) + 네온 글로우
- 판정 피드백: 판정 라인 위 텍스트 + 위로 떠오르며 페이드아웃
- HP 바: 상단 가로 (초록->노랑->빨강)
- 콤보: 화면 중앙 상단 큰 숫자

## 캔버스 크기

- 너비: 400px (고정)
- 높이: 동적 (가용 공간 기반, 최소 600px, 최대 900px)
- CSS transform으로 스케일링

## 모바일 지원

- 터치 영역: 캔버스 하단 25%를 4등분
- 멀티터치 지원 (동시노트)
- 게임오버: gameOverHud.onTouchStart() 처리
- 좌표 변환: getTouchPos() 필수

## 상태 흐름

```
[start] --S/탭--> [loading] --1초--> [playing]
                                       |
                                  P키: [paused] --S/탭--> [playing]
                                       |
                                  HP<=0: [gameover] --R/탭--> [start]
```

## 등록 필요 파일 (6개)

1. @types/scores.ts - TGameType에 'rhythmbeat' 추가
2. lib/config.ts - MENU_LIST에 추가
3. components/common/GameCard.tsx - 아이콘 추가
4. app/api/game-session/route.ts - VALID_GAME_TYPES에 추가
5. app/api/scores/route.ts - VALID_GAME_TYPES에 추가
6. lib/game-security/config.ts - 보안 설정 추가

## 보안 설정

```typescript
rhythmbeat: { maxScore: 9999999, minPlayTimeSeconds: 10 }
```

## MDA Framework

- Mechanics: 4키 입력 -> 타이밍 판정 -> 콤보/HP 변화
- Dynamics: BPM 가속 + 패턴 복잡화 -> 생존 압박 + 콤보 유지 긴장
- Aesthetics: Flow 상태 (리듬에 몰입) + 성취감 (고득점/고콤보)
