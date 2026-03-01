# Random Defense: 원형 → 사각형 범위 전환 설계

## 개요

randomdefense 게임의 모든 범위 표시(오라 + 공격 범위)를 원형에서 그리드 정렬 사각형으로 변경한다.
Ground zone(슬로우 착탄 장판)은 자유 좌표 기반이므로 원형 유지.

## 결정사항

- **범위 단위**: 픽셀 → 셀 단위로 스냅 (정수 칸)
- **범위 형태**: 전부 사각형 (공격 범위 + 오라 모두)
- **거리 판정**: 체비셰프 거리 (`max(|dx|, |dy|)`)
- **Ground zone**: 원형 유지 (자유 좌표 기반)

## 변경 파일

### 1. types.ts - 범위 타입 변경

기존 필드 유지하되, 값의 의미가 "픽셀 반지름" → "셀 단위 범위"로 변경.
`range`, `slowRadius`, `buffRadius`, `debuffRadius` 모두 셀 단위 정수로.

### 2. units.ts - 범위 값 재설정

| 필드 | 현재 (px) | 변경 (셀) | 비고 |
|------|----------|----------|------|
| range (shooter) | 155~180 | 3→3→3→3→4→4 | 고사거리 |
| range (splash) | 125~150 | 2→2→3→3→3→3 | 중간 사거리 |
| range (slow) | 145~170 | 3→3→3→3→3→3 | 중간 사거리 |
| range (buffer) | 125~150 | 2→2→3→3→3→3 | 근접 지원 |
| range (debuffer) | 135~160 | 3→3→3→3→3→3 | 중간 사거리 |
| slowRadius | 115~190 | 2→2→3→3→3→4 | 슬로우 오라 |
| buffRadius | 115~190 | 2→2→3→3→3→4 | 버프 오라 |
| debuffRadius | 115~190 | 2→2→3→3→3→4 | 디버프 오라 |

### 3. combat.ts - 충돌 판정 변경

모든 거리 계산을 체비셰프 거리로:
```typescript
// Before
const dist = Math.sqrt(dx * dx + dy * dy);
if (dist > radius_px) continue;

// After
const dist = Math.max(Math.abs(dx), Math.abs(dy));
if (dist > rangeCells * CELL_SIZE) continue;
```

영향받는 함수:
- `findTarget()` - 공격 범위 판정
- `applyBuffAuras()` - 버프 오라 판정
- `applySlowAuras()` - 슬로우 오라 판정
- `applyDebuffAuras()` - 디버프 오라 판정

영향받지 않는 함수 (원형 유지):
- `updateGroundZones()` - ground zone 판정
- `applySplashDamage()` - 스플래시 범위 판정
- `moveProjectile()` - 투사체 충돌 판정

### 4. renderer.ts - 시각적 변경

#### 공격 범위 (선택 시)
- `ctx.arc()` → `ctx.strokeRect()`
- 점선 원형 → 점선 사각형
- 유닛 중심 기준 `range * CELL_SIZE` 확장

#### Buffer 오라 (금색, 항상 표시)
- `ctx.arc()` → `ctx.fillRect()` + `ctx.strokeRect()`
- 색상 유지: `rgba(255, 215, 0, 0.05)` fill, `rgba(255, 215, 0, 0.15)` stroke

#### Debuffer 오라 (보라색, 항상 표시)
- `ctx.arc()` → `ctx.fillRect()` + `ctx.strokeRect()`
- buffMultiplier 스케일링 유지
- 색상 유지: `rgba(168, 85, 247, 0.05/0.15)`

#### Slow field 오라 (파란색, 항상 표시)
- `drawSlowField()` 함수 전면 변경
- 원형 그래디언트 → 사각형 그래디언트 (혹은 균일 fill)
- 회전 점선 원형 → 가장자리를 따라 흐르는 점선 사각형 (dash offset 애니메이션)
- 색상 유지

### 5. config.ts - CELL_SIZE export 확인

`CELL_SIZE`가 combat.ts에서도 사용되도록 import 확인.

## 밸런스 영향

사각형(체비셰프)은 원형보다 대각선 방향에서 약 41% 더 넓은 커버리지를 가짐.
셀 단위로 스냅하면서 일부 티어의 범위가 줄거나 늘 수 있으므로,
전체적인 게임 밸런스는 유지되도록 셀 값을 조정함.
