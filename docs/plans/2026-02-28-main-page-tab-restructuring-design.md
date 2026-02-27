# Main Page Tab Restructuring Design

## Overview

메인 화면을 배너+게임 나열 구조에서 **상단 배너(광고/공지) + 카테고리 탭** 구조로 변경한다.

## Motivation

- 게임 수 증가로 카테고리별 탐색 필요성 증가
- 상단 배너를 광고/공지/신규 게임 안내 영역으로 활용
- 드롭다운 셀렉트 → 탭 바로 탐색 UX 개선

## Architecture

### Layout Structure

```
MainSection
├── MainBanner (하이브리드 캐러셀, width 100%)
├── MainSearchBar (배너 아래, 탭 위)
├── MainCategoryTabs (필 탭 바, 8개 탭)
└── MainMenuList (탭에 따라 그룹핑/플랫 전환)
```

### State Flow

```
MainSection
├── state: category (탭 ID, default: 'ALL')
├── state: search (검색어, default: '')
│
├── MainBanner → 독립 동작 (자체 캐러셀 상태)
├── MainSearchBar → search 변경 시 category를 'ALL'로 자동 전환
├── MainCategoryTabs → category 변경 시 search를 '' 로 초기화
└── MainMenuList → category에 따라 표시 방식 결정
```

## Component Designs

### 1. MainBanner (replaces FeaturedCarousel)

**Data Type (Hybrid):**

```typescript
type TBannerItem =
  | {
      type: 'image';
      src: string;
      title: { kor: string; eng: string };
      description: { kor: string; eng: string };
      href?: string;
      ctaText?: { kor: string; eng: string };
    }
  | {
      type: 'card';
      icon: string;
      bgColor: string;
      title: { kor: string; eng: string };
      description: { kor: string; eng: string };
      href?: string;
      ctaText?: { kor: string; eng: string };
    }
  | {
      type: 'announcement';
      title: { kor: string; eng: string };
      description: { kor: string; eng: string };
      bgColor: string;
      badge?: { kor: string; eng: string };
    };
```

**Behavior:**
- Width 100% (컨텐츠 영역 가득 채움)
- 좌/우 화살표 없음
- 5초 자동 회전
- 도트 인디케이터 하단 중앙
- 호버 시 일시정지
- 높이: 데스크탑 200px, 모바일 160px
- 로고 영역 확보 가능

### 2. MainCategoryTabs (replaces MainCategorySelect)

**Tab Order:**
1. 전체 (ALL) - Dice5
2. 추천 (FEATURED) - Star
3. 아케이드 (Arcade) - Dice5
4. 액션 (Action) - Gamepad2
5. 퍼즐 (Puzzle) - Puzzle
6. 반응 (Reflex) - Zap
7. 행운 (Good Luck) - Clover
8. 유틸 (Utility) - Wrench

**Style:**
- 필 탭: 선택 시 cyan underline (2px) + cyan 텍스트
- 비선택: muted 텍스트, hover 시 밝아짐
- 모바일: 가로 스크롤 (scrollbar-hide)
- 데스크탑: 한 줄 표시

### 3. MainMenuList Changes

| Tab | Display |
|-----|---------|
| ALL | 카테고리별 그룹핑 (현재와 동일) |
| FEATURED | FEATURED_GAMES 게임만 플랫 그리드 |
| Others | 해당 카테고리만 플랫 그리드 |

### 4. Search + Tab Interaction

- 검색어 입력 → 자동으로 '전체' 탭 전환
- 탭 클릭 → 검색어 초기화

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `@types/menus.ts` | Modify | TBannerItem 타입 추가 |
| `lib/config.ts` | Modify | BANNER_ITEMS, CATEGORY_TABS 추가 |
| `app/(main)/_components/MainSection.tsx` | Modify | 탭 상태 추가, 레이아웃 변경 |
| `app/(main)/_components/MainBanner.tsx` | Create | 하이브리드 배너 캐러셀 |
| `app/(main)/_components/MainCategoryTabs.tsx` | Create | 필 탭 바 |
| `app/(main)/_components/MainMenuList.tsx` | Modify | 탭 모드 대응 |
| `app/(main)/_components/FeaturedCarousel.tsx` | Delete | MainBanner로 대체 |
| `app/(main)/_components/MainCategorySelect.tsx` | Delete | MainCategoryTabs로 대체 |

## Approach

방식 A: 기존 컴포넌트 리팩토링. API/데이터 흐름 유지하면서 UI만 탭 구조로 전환.
