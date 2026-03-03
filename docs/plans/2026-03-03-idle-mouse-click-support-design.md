# Idle Games Mouse Click Support Design

## 날짜: 2026-03-03

## 목표

6개 idle 게임에 데스크톱 마우스 클릭 지원을 추가하여 키보드 없이도 모든 기능을 사용할 수 있도록 한다.

## 현황

모든 idle 게임은 **터치(모바일) + 키보드(데스크톱)** 만 지원. 마우스 클릭은 미지원.

| 게임 | 마우스 | 터치 | 주요 인터랙션 |
|------|:---:|:---:|---|
| Tap Empire | ❌ | ✅ | 탭 영역, 생산자 구매/업그레이드 |
| Cookie Bakery | ❌ | ✅ | 쿠키 탭, 생산자 구매, Prestige |
| Lemonade Stand | ❌ | ✅ | 가격/비율 ± 버튼, 탭, 재료/업그레이드 |
| Dungeon Merchant | ❌ | ✅ | 크래프팅, 탭, 건물/레시피/업그레이드 |
| Stock Trader | ❌ | ✅ | 주식 선택, 수량 버튼, 매수/매도 |
| Space Colony | ❌ | ✅ | 탭 전환, 건물/연구 구매 |

## 접근 방식: 방식 A — mousedown 이벤트 직접 추가

기존 터치 핸들러는 변경하지 않고, 각 게임의 `game.ts`에 `mousedown` 이벤트를 추가한다.

### 패턴

```typescript
const getMousePos = (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_SIZE / rect.width;
  const scaleY = CANVAS_SIZE / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
};

const handleMouseDown = (e: MouseEvent) => {
  const pos = getMousePos(e);
  // handleTouchStart와 동일한 hit detection 로직
};

canvas.addEventListener('mousedown', handleMouseDown);

// cleanup
return () => {
  canvas.removeEventListener('mousedown', handleMouseDown);
  // ... 기존 cleanup
};
```

### 게임별 클릭 가능 영역

#### 1. Tap Empire
- 탭 영역 (코인 클릭 → doTap)
- 생산자 6행 (왼쪽: 구매, 오른쪽: 업그레이드)
- 업그레이드 바 (탭 파워, 효율성)
- 게임 시작/재개/일시정지 상태 전환

#### 2. Cookie Bakery
- 쿠키 탭 영역 (클릭 → doTap)
- 생산자 6행 구매
- 업그레이드 바 (탭 업그레이드, Prestige)
- 게임 시작/재개/일시정지 상태 전환

#### 3. Lemonade Stand
- 가격 조정 ± 버튼
- 비율 조정 ± 버튼
- 탭 전환 (재료/업그레이드)
- 재료/업그레이드 구매 행
- 게임 시작/재개/일시정지 상태 전환

#### 4. Dungeon Merchant
- 크래프팅 바 (클릭으로 속도 향상)
- 탭 전환 (자원/크래프팅/업그레이드)
- 목록 행 클릭 (건물/레시피/업그레이드)
- 게임 시작/재개/일시정지 상태 전환

#### 5. Stock Trader
- 주식 카드 선택
- 수량 버튼 (1, 5, 10, All)
- 매수/매도 버튼
- 게임 시작/재개/일시정지 상태 전환

#### 6. Space Colony
- 탭 전환 (Build/Research/Info)
- 건물/연구 행 클릭
- 게임 시작/재개/일시정지 상태 전환

## 게임 오버 상태 처리

`gameOverHud.onTouchStart(x, y, score)` 메서드가 이미 존재하므로, 마우스 클릭에서도 동일하게 호출한다.

## 제외 사항

- 마우스 hover 효과 (추가하지 않음)
- 마우스 drag 지원 (필요 없음)
- 기존 터치/키보드 핸들러 변경 (건드리지 않음)
