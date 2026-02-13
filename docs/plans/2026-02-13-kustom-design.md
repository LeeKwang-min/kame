# Kustom - 보스전 액션 닷지 게임 디자인

## 개요

- **게임명**: Kustom
- **장르**: 보스전 액션 닷지
- **목표**: 보스의 공격 패턴을 회피하며 최대한 오래 생존
- **점수**: 생존 시간(초) 기반 (소수점 버림)
- **캔버스**: 800x600px
- **비주얼**: 미니멀 기하학 스타일

## 플레이어

- **형태**: 원형 (반지름 12px), 시안(#00d4ff)
- **이동**: 화살표키로 8방향 이동, 속도 200px/s
- **HP**: 3칸 (하트 아이콘 HUD 표시)
- **대시**: Space 발동, 이동 방향 속도 3배, 0.2초 무적, 쿨다운 1.5초, 잔상 효과
- **피격 무적**: 1초간 깜빡임 + 무적 (연속 피격 방지)

## 보스

- **형태**: 팔각형, 어두운 레드/퍼플(#8b0000), 미세한 회전 애니메이션
- **위치**: 캔버스 상단 중앙 고정
- **체력 없음**: 공격만 수행, 파괴 불가
- **공격 주기**: 2~4초마다 패턴 실행, 시간 경과 시 주기 단축

## 공격 패턴 (타임 기반 난이도 에스컬레이션)

시간대별 패턴 풀에서 랜덤 선택. 확장성 있는 패턴 레지스트리 시스템.

### 기본 패턴 (0초~)

1. **직선 탄막 (Aimed Shot)**: 플레이어 방향 3~5발 연사, 속도 250px/s, 반지름 5px
2. **방사형 탄막 (Radial Burst)**: 360도 8~12발 동시 발사, 균일 각도, 속도 200px/s

### 중급 패턴 (15초~)

3. **레이저 빔 (Laser Beam)**: 1초 경고선 후 0.5초 발사, 폭 20px, 보스→플레이어 방향 고정
4. **장판 공격 (Area Hazard)**: 2~3개 원형 위험 지역 1.5초 경고 후 0.5초 폭발, 반지름 60~80px

### 고급 패턴 (30초~)

5. **안/밖 패턴 (In/Out)**: 보스 중심 반지름 150px 기준, 안쪽 또는 바깥쪽 폭발, 1.5초 경고
6. **나선형 탄막 (Spiral)**: 보스에서 나선형 회전 발사, 2~3초 지속
7. **벽 탄막 (Bullet Wall)**: 화면 한쪽→반대쪽 탄환 벽 이동, 1~2개 빈 틈

### 극한 (60초~)

- 패턴 2개 동시 조합
- 공격 주기 단축 (2초 → 1.5초)
- 탄환 속도/밀도 증가

## 아키텍처

```
_lib/
├── config.ts           # 게임 설정 상수
├── types.ts            # 모든 타입 정의
├── game.ts             # 게임 루프, 상태 관리, HUD
├── player.ts           # 플레이어 이동, 대시, 피격
├── boss.ts             # 보스 렌더링, 패턴 스케줄링
├── patterns/
│   ├── registry.ts     # 패턴 등록/관리 (시간대별 풀)
│   ├── aimed-shot.ts   # 직선 탄막
│   ├── radial-burst.ts # 방사형 탄막
│   ├── laser-beam.ts   # 레이저 빔
│   ├── area-hazard.ts  # 장판 공격
│   ├── in-out.ts       # 안/밖 패턴
│   ├── spiral.ts       # 나선형 탄막
│   └── bullet-wall.ts  # 벽 탄막
└── renderer.ts         # 공통 렌더링 유틸
```

### 패턴 인터페이스

각 패턴은 동일한 인터페이스를 구현하여 확장성 확보:

```typescript
type TPattern = {
  name: string;
  tier: 'basic' | 'mid' | 'advanced';
  duration: number;
  init: (bossPos, playerPos) => TPatternState;
  update: (state, dt, playerPos) => void;
  render: (state, ctx) => void;
  getProjectiles: (state) => TProjectile[];
  isFinished: (state) => boolean;
};
```

새 패턴 추가: 파일 생성 → TPattern 구현 → registry.ts에 등록

### 데이터 흐름

```
game.ts → boss.ts (패턴 스케줄러) → patterns/ (업데이트/렌더/투사체)
       → player.ts (이동/대시/충돌)
       → renderer.ts (HUD/이펙트)
```

## 비주얼

- **배경**: #111~#1a1a2e, 미세한 그리드 패턴
- **플레이어**: 시안(#00d4ff) 원형, 대시 시 잔상
- **보스**: 레드/퍼플(#8b0000) 팔각형, 미세 회전
- **탄환**: 빨간 계열 작은 원, 깔끔한 스타일
- **레이저**: 반투명 빨강 경고선 → 밝은 빨강 본체
- **장판/안밖**: 반투명 주황 경고 → 밝은 주황 폭발
- **피격**: 1초간 투명도 토글 깜빡임

## HUD

- **좌상단**: HP (하트 3개, 빈 하트로 잃은 HP)
- **우상단**: 생존 시간 (초, 실시간)
- **플레이어 하단**: 대시 쿨다운 게이지

## 조작

| 키 | 동작 |
|---|---|
| 화살표키 | 8방향 이동 |
| Space | 대시 (무적 0.2초, 쿨다운 1.5초) |
| S | 시작 / 재개 |
| P | 일시정지 |
| R | 재시작 |

## 게임 흐름

시작 화면 → 로딩(3,2,1) → 플레이 → P: 일시정지 / HP 0: 게임 오버 (점수 저장, R 재시작)

## 게임 등록 (6개 파일 수정)

1. `@types/scores.ts` - TGameType에 'kustom' 추가
2. `lib/config.ts` - MENU_LIST에 추가 (Action 카테고리)
3. `components/common/GameCard.tsx` - 아이콘 추가
4. `app/api/game-session/route.ts` - VALID_GAME_TYPES에 추가
5. `app/api/scores/route.ts` - VALID_GAME_TYPES에 추가
6. `lib/game-security/config.ts` - 보안 설정 추가 (maxScore: 9999, minPlayTimeSeconds: 5)
