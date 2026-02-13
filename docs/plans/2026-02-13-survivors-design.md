# Survivors Game Design Document

## Overview

Vampire Survivors 스타일의 풀 스케일 로그라이크 서바이벌 게임.
순수 Canvas API로 구현하며, KAME 프로젝트의 기존 게임 아키텍처 패턴을 그대로 따른다.

- **게임명:** `survivors` (폴더), `Survivors` (컴포넌트)
- **캔버스:** 1080x720 (16:10)
- **게임 시간:** 10분 (600초), 생존 시간 = 점수
- **조작:** WASD / 화살표 (8방향 이동), 무기는 자동 공격
- **시각 스타일:** 픽셀 아트 (레트로)

---

## 핵심 메커니즘

1. 플레이어가 WASD/화살표로 무한 맵을 이동
2. 무기가 자동으로 적을 공격
3. 적 처치 → 경험치 젬 드롭
4. 경험치 수집 → 레벨업 → 3개 선택지 중 택 1 (새 무기 / 무기 강화 / 패시브)
5. 시간 경과 → 적 웨이브 강화
6. 10분 생존 → Death 등장 (보너스 도전)
7. HP 0 → 게임 오버

### 플레이어 스탯

| 스탯 | 기본값 | 최대값 |
|------|--------|--------|
| HP | 3 하트 | 5 |
| 이동속도 | 150 px/s | 패시브로 증가 |
| 픽업 범위 | 30px | 패시브로 증가 |

---

## 무기 시스템

무기는 자동 발사. 레벨업 시 획득/강화. 최대 레벨 8. 특정 패시브와 조합 시 진화.

### 기본 무기 (10종)

| 무기 | 공격 패턴 | 진화 조건 | 진화 무기 |
|------|-----------|-----------|-----------|
| Magic Wand | 가장 가까운 적에게 직선 투사체 | + Empty Tome | Holy Wand |
| Knife | 바라보는 방향 단검 다수 | + Bracer | Thousand Edge |
| Axe | 위로 던져서 포물선 낙하 | + Candelabrador | Death Spiral |
| Cross | 부메랑 (왕복) | + Clover | Heaven Sword |
| Fire Wand | 랜덤 방향 화염구 (관통) | + Spinach | Hellfire |
| Garlic | 플레이어 주변 원형 오라 | + Pummarola | Soul Eater |
| Holy Water | 바닥 데미지 영역 | + Attractorb | Blessed Water |
| Whip | 전방 근접 휘두름 | + Hollow Heart | Bloody Tear |
| Lightning Ring | 화면 내 랜덤 적 번개 | + Duplicator | Thunder Loop |
| Runetracer | 벽 반사 투사체 | + Armor | NO FUTURE |

### 패시브 아이템 (10종)

| 아이템 | 효과 (per level) |
|--------|------------------|
| Spinach | 공격력 +10% |
| Armor | 방어력 +1 |
| Hollow Heart | 최대 HP +1 |
| Pummarola | HP 회복 0.2/s |
| Empty Tome | 쿨타임 -8% |
| Bracer | 투사체 속도 +10% |
| Clover | 크리티컬 확률 +10% |
| Attractorb | 픽업 범위 +25% |
| Duplicator | 투사체 수 +1 |
| Candelabrador | 범위 +10% |

### 슬롯 제한

- 무기: 최대 6슬롯
- 패시브: 최대 6슬롯
- 슬롯 꽉 차면 해당 카테고리 선택지 제외

---

## 적 시스템

### 적 타입 (6종)

| 타입 | HP | 속도 | 경험치 | 특징 |
|------|----|------|--------|------|
| Bat | 1 | 빠름 | 1 | 대량 스폰, 기본 |
| Zombie | 3 | 느림 | 2 | 물량 |
| Skeleton | 5 | 보통 | 3 | 밸런스 |
| Mummy | 10 | 느림 | 5 | 높은 HP, 큰 접촉 데미지 |
| Witch | 7 | 보통 | 5 | 원거리 투사체 공격 |
| Boss | 100+ | 느림 | 50 | 5분/8분 등장, 거대 사이즈 |

### 웨이브 스케줄

| 시간 | 이벤트 |
|------|--------|
| 0:00~1:00 | Bat 소량 |
| 1:00~3:00 | Bat + Zombie 증가 |
| 3:00~5:00 | Skeleton + Mummy 추가, 밀도 증가 |
| 5:00 | Boss #1 등장 |
| 5:00~7:00 | Witch 추가, 전체 적 HP/속도 배율 증가 |
| 7:00~9:00 | 모든 적 대량 스폰, 엘리트 |
| 8:00 | Boss #2 등장 (강화) |
| 9:00~10:00 | 적 무한 러시 |
| 10:00 | Death 등장 (즉사, 게임 종료) |

### 스폰 로직

- 화면 밖 가장자리에서 플레이어 방향으로 스폰
- 스폰 간격: 2초 → 0.3초 (시간 경과에 따라 감소)
- 동시 최대 적: 300 (오브젝트 풀링)
- 처치 시 경험치 젬 드롭 (자석처럼 플레이어에게 끌림)

---

## 무한 맵 및 카메라

### 카메라

- 뷰포트 = 캔버스 크기 (1080x720)
- 플레이어가 항상 화면 중앙
- 좌표 변환: `screenX = worldX - camera.x`, `screenY = worldY - camera.y`

### 타일맵 배경

- 64x64 픽셀 풀밭 타일 반복 렌더링
- 뷰포트 + 여유 영역만 렌더링 (무한 확장)

### 장식물

- 나무, 바위, 풀 등 시드 기반 랜덤 배치
- 256x256 청크 단위 관리
- 플레이어 주변 3x3 청크만 활성화

---

## 성능 최적화

- **컬링:** 뷰포트 밖 오브젝트 렌더링 스킵 (update는 유지)
- **오브젝트 풀링:** 적, 투사체, 젬을 사전 할당 배열로 관리 (GC 방지)
- **공간 해싱:** 충돌 감지 최적화, 128px 셀 그리드 기반 공간 분할

---

## 레벨업 시스템

### 경험치 테이블

레벨 1→2: 5 젬, 이후 레벨당 +10 필요량 증가 (5, 15, 25, 35...)

### 레벨업 UI

- 게임 일시정지 → 반투명 오버레이
- 3개 카드 가로 배치 (아이콘 + 이름 + 레벨 + 설명)
- **1, 2, 3 숫자 키** 또는 마우스 클릭으로 선택

### 선택지 구성

- 미보유 무기 (새 획득)
- 보유 무기 강화 (다음 레벨)
- 패시브 아이템 (새 획득 or 강화)

---

## HUD

| 위치 | 내용 |
|------|------|
| 좌상단 | 경과 시간 (mm:ss) |
| 좌상단 아래 | HP 하트 |
| 상단 중앙 | 경험치 바 + 현재 레벨 |
| 좌하단 | 보유 무기 아이콘 (최대 6) |
| 우하단 | 보유 패시브 아이콘 (최대 6) |
| 우상단 | 처치 수 |

---

## 게임 플로우

```
시작 화면 (S키) → 로딩 → 플레이
  ├── 레벨업 → 선택지 → 플레이 (반복)
  ├── 일시정지 (P키) → 재개 (S키)
  ├── HP 0 → 게임 오버 → 결과 (리더보드 저장)
  └── 10분 생존 → Death → 사망 → 게임 오버
```

---

## 파일 구조

```
app/(canvas)/survivors/
├── layout.tsx
├── page.tsx
├── _components/
│   └── Survivors.tsx
└── _lib/
    ├── config.ts          # 모든 상수
    ├── types.ts           # 모든 타입 정의
    ├── game.ts            # setupSurvivors 메인 엔트리 + 게임 루프
    ├── player.ts          # 플레이어 이동, 렌더링, 스탯
    ├── camera.ts          # 카메라 추적 및 좌표 변환
    ├── enemies.ts         # 적 스폰, AI, 업데이트, 오브젝트 풀
    ├── weapons.ts         # 무기별 공격 로직 및 투사체 관리
    ├── items.ts           # 경험치 젬, 드롭 아이템
    ├── levelup.ts         # 레벨업 선택지 생성 및 UI 렌더링
    ├── waves.ts           # 웨이브 스케줄러
    ├── collision.ts       # 공간 해싱 + 충돌 감지
    ├── renderer.ts        # 타일맵 배경, 장식물, HUD
    ├── sprites.ts         # 픽셀 아트 스프라이트 데이터
    └── pool.ts            # 범용 오브젝트 풀 유틸리티
```

---

## 게임 등록 (6개 파일 수정)

1. `@types/scores.ts` → `TGameType`에 `'survivors'` 추가
2. `lib/config.ts` → `MENU_LIST` Action 카테고리에 추가
3. `components/common/GameCard.tsx` → 아이콘 추가
4. `app/api/game-session/route.ts` → `VALID_GAME_TYPES`에 추가
5. `app/api/scores/route.ts` → `VALID_GAME_TYPES`에 추가
6. `lib/game-security/config.ts` → 보안 설정 (최대 점수: 660, 최소 플레이 시간: 30초)

---

## 데이터 흐름

```
game.ts (메인 루프, 60FPS)
  ├── player.update(keys, dt)
  ├── camera.follow(player)
  ├── waves.update(elapsed) → enemies.spawn()
  ├── weapons.update(dt, player, enemies) → 투사체 생성
  ├── collision.check(projectiles, enemies) → 적 HP 감소, 경험치 드롭
  ├── collision.check(enemies, player) → 플레이어 데미지
  ├── items.update(dt, player) → 젬 수집, 경험치 증가
  ├── levelup.check(exp) → 레벨업 시 일시정지, UI 표시
  └── renderer.draw(camera, player, enemies, projectiles, items, hud)
```
