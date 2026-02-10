import { describe, expect, it } from 'vitest';
import {
  clamp,
  rand,
  circleRectHit,
  circleCircleHit,
  rectRectHit,
  pointRectHit,
  pointCircleHit,
  isPointInRect,
  makeCategoryMenuList,
} from '@/lib/utils';
import { TMenuList } from '@/@types/menus';

describe('clamp', () => {
  it('값이 범위 내이면 그대로 반환', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('값이 min 미만이면 min 반환', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('값이 max 초과이면 max 반환', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('경계값 min과 같으면 그대로 반환', () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  it('경계값 max와 같으면 그대로 반환', () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('rand', () => {
  it('범위 내 값을 반환', () => {
    for (let i = 0; i < 100; i++) {
      const value = rand(5, 10);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThan(10);
    }
  });

  it('min === max이면 min을 반환', () => {
    expect(rand(5, 5)).toBe(5);
  });
});

describe('circleRectHit', () => {
  it('원이 사각형 내부에 있으면 충돌', () => {
    expect(circleRectHit(50, 50, 10, 0, 0, 100, 100)).toBe(true);
  });

  it('원이 사각형과 멀리 떨어져 있으면 비충돌', () => {
    expect(circleRectHit(200, 200, 10, 0, 0, 100, 100)).toBe(false);
  });

  it('원이 사각형 모서리에 접하면 충돌', () => {
    // 원 중심(110, 50), 반지름 10, 사각형(0,0,100,100) → 접함
    expect(circleRectHit(110, 50, 10, 0, 0, 100, 100)).toBe(true);
  });
});

describe('circleCircleHit', () => {
  it('두 원이 겹치면 충돌', () => {
    expect(circleCircleHit(0, 0, 10, 5, 0, 10)).toBe(true);
  });

  it('두 원이 떨어져 있으면 비충돌', () => {
    expect(circleCircleHit(0, 0, 10, 30, 0, 10)).toBe(false);
  });

  it('두 원이 접하면 충돌 (<=)', () => {
    expect(circleCircleHit(0, 0, 10, 20, 0, 10)).toBe(true);
  });
});

describe('rectRectHit', () => {
  it('두 사각형이 겹치면 충돌', () => {
    expect(rectRectHit(0, 0, 50, 50, 25, 25, 50, 50)).toBe(true);
  });

  it('두 사각형이 떨어져 있으면 비충돌', () => {
    expect(rectRectHit(0, 0, 50, 50, 100, 100, 50, 50)).toBe(false);
  });

  it('인접하지만 겹치지 않으면 비충돌', () => {
    // ax + aw === bx 이므로 ax < bx + bw 이지만 ax + aw > bx는 false
    expect(rectRectHit(0, 0, 50, 50, 50, 0, 50, 50)).toBe(false);
  });
});

describe('pointRectHit', () => {
  it('점이 사각형 내부에 있으면 충돌', () => {
    expect(pointRectHit(50, 50, 0, 0, 100, 100)).toBe(true);
  });

  it('점이 사각형 외부에 있으면 비충돌', () => {
    expect(pointRectHit(150, 150, 0, 0, 100, 100)).toBe(false);
  });

  it('점이 사각형 꼭짓점에 있으면 충돌 (>=, <=)', () => {
    expect(pointRectHit(0, 0, 0, 0, 100, 100)).toBe(true);
    expect(pointRectHit(100, 100, 0, 0, 100, 100)).toBe(true);
  });
});

describe('pointCircleHit', () => {
  it('점이 원 내부에 있으면 충돌', () => {
    expect(pointCircleHit(5, 5, 10, 10, 20)).toBe(true);
  });

  it('점이 원 외부에 있으면 비충돌', () => {
    expect(pointCircleHit(100, 100, 10, 10, 5)).toBe(false);
  });

  it('점이 원 경계에 있으면 충돌 (<=)', () => {
    expect(pointCircleHit(20, 0, 0, 0, 20)).toBe(true);
  });
});

describe('isPointInRect', () => {
  it('점이 사각형 내부에 있으면 true', () => {
    expect(isPointInRect(50, 50, 0, 0, 100, 100)).toBe(true);
  });

  it('점이 사각형 외부에 있으면 false', () => {
    expect(isPointInRect(150, 50, 0, 0, 100, 100)).toBe(false);
  });

  it('점이 경계에 있으면 true (>=, <=)', () => {
    expect(isPointInRect(0, 0, 0, 0, 100, 100)).toBe(true);
    expect(isPointInRect(100, 100, 0, 0, 100, 100)).toBe(true);
  });
});

describe('makeCategoryMenuList', () => {
  it('카테고리별로 그룹화', () => {
    const menus: TMenuList = [
      { name: { kor: '게임1', eng: 'game1' }, href: '/g1', category: '아케이드' },
      { name: { kor: '게임2', eng: 'game2' }, href: '/g2', category: '퍼즐' },
      { name: { kor: '게임3', eng: 'game3' }, href: '/g3', category: '아케이드' },
    ];

    const result = makeCategoryMenuList(menus);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result['아케이드']).toHaveLength(2);
    expect(result['퍼즐']).toHaveLength(1);
  });

  it('빈 배열이면 빈 객체 반환', () => {
    expect(makeCategoryMenuList([])).toEqual({});
  });
});
