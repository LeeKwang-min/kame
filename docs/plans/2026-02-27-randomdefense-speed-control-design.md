# Random Defense 배속 기능 설계

## 개요
랜덤디펜스 게임에 1x/2x/3x 배속 전환 기능을 추가한다.

## 요구사항
- 배속 단계: 1x, 2x, 3x (순환)
- 조작: 상단 HUD 클릭 + Tab 키 단축키
- 위치: 상단 HUD 오른쪽 끝

## 기술 설계

### 접근법: dt 전체 곱셈
```typescript
const rawDt = Math.min((timestamp - lastTime) / 1000, 0.05);
const dt = rawDt * speedMultiplier;
```
- 모든 dt 기반 로직에 일괄 적용 (적 이동, 공격, 스폰, 이펙트)
- 한 곳만 수정하여 일관성 보장

### 수정 파일
1. `config.ts` - SPEED_OPTIONS 상수
2. `game.ts` - speedMultiplier 변수, Tab 키 핸들링, 클릭 핸들링
3. `renderer.ts` - 상단 HUD에 배속 버튼 렌더링
4. `page.tsx` - ControlInfoTable에 Tab 키 설명 추가

### UI
```
[Wave 5] [Gold: 350] [Score: 1200] [Enemies: 23/100]  [▶▶ 2x]
```
- 1x: `▶ 1x`, 2x: `▶▶ 2x`, 3x: `▶▶▶ 3x`
- 게임 플레이 중에만 활성화
