# Block Puzzle 게임 디자인

## 개요
8x8 그리드에 다양한 블록을 배치하여 줄을 완성하는 퍼즐 게임.
3개의 블록이 제공되며 모두 배치하면 새로운 3개가 제공됨.
더 이상 배치할 수 없으면 게임 오버.

## 기술 스택
- 순수 Canvas 2D 렌더링 (프로젝트 기존 패턴)
- 마우스/터치 드래그 앤 드롭 조작

## 캔버스 레이아웃
- **캔버스 크기**: 600 x 700
- **점수 영역**: y: 0~60
- **그리드 영역**: y: 60~540, 셀 크기 60x60, 좌측 여백 60px
- **블록 선택 영역**: y: 560~700, 블록 0.5x 축소 표시

## 블록 종류 (19종)
각 블록은 `number[][]` 2D 배열로 정의 (1=채움, 0=빈칸).

- 1x1, 1x2, 1x3, 1x4, 1x5
- 2x1, 3x1, 4x1, 5x1
- 2x2, 3x3
- L, J, T, S, Z 및 변형들

## 블록 색상
7가지 색상: 빨강, 주황, 노랑, 초록, 파랑, 남색, 보라.
한 번에 제공되는 3개 블록은 서로 다른 색상 배정.

## 게임 흐름
1. 시작: 3개의 랜덤 블록 제공
2. 배치: 블록을 드래그하여 그리드에 놓음
3. 줄 체크: 가로/세로 완성된 줄 즉시 삭제 + 애니메이션
4. 반복: 3개 모두 배치하면 새로운 3개 제공
5. 게임 오버: 남은 블록 중 하나라도 배치할 곳이 없으면 종료

## 줄 완성 방식
가로 8칸 또는 세로 8칸을 완전히 채우면 해당 줄 삭제.

## 점수 시스템
- 블록 배치: 배치한 블록의 셀 수만큼 점수
- 줄 삭제: 줄당 10점
- 콤보 보너스: 2줄=+5, 3줄=+15, 4줄이상=+30

## 드래그 앤 드롭 인터랙션
- mousedown/touchstart: 블록 선택, 원래 크기로 커서 위치에 표시
- mousemove/touchmove: 블록이 커서를 따라 이동, 그리드 위 스냅 처리
  - 배치 가능: 반투명 초록 미리보기
  - 배치 불가: 반투명 빨강 미리보기
- mouseup/touchend: 배치 가능 시 배치, 불가 시 원래 자리로 복귀

## 키보드 이벤트
- KeyS: 게임 시작 / 재개
- KeyP: 일시정지
- KeyR: 재시작

## 시각 효과
- 줄 삭제: 밝게 번쩍이며 사라지는 애니메이션 (0.3초)
- 블록 배치: 셀이 약간 확대 후 안착 효과
- 배치 불가 블록: 하단에서 어둡게 표시
- 빈 셀: 어두운 테두리로 그리드 구분

## 게임 상태
start → loading → playing ⇄ paused → gameover

## 파일 구조
```
app/(canvas)/blockpuzzle/
├── _lib/
│   ├── config.ts
│   ├── types.ts
│   └── game.ts
├── _components/
│   └── BlockPuzzle.tsx
├── layout.tsx
└── page.tsx
```

## 등록 파일 (6개)
1. @types/scores.ts - TGameType에 'blockpuzzle' 추가
2. lib/config.ts - MENU_LIST에 메뉴 추가 (Puzzle 카테고리)
3. components/common/GameCard.tsx - 아이콘 추가
4. app/api/game-session/route.ts - VALID_GAME_TYPES에 추가
5. app/api/scores/route.ts - VALID_GAME_TYPES에 추가
6. lib/game-security/config.ts - 보안 설정 추가
