import { describe, expect, it } from 'vitest';
import {
  INITIALS_KEY_COLS,
  INITIALS_KEY_ROWS,
  INITIALS_KEY_GRID,
  INITIALS_MOVE_DIR,
} from '@/lib/game/config';

describe('키보드 그리드 설정', () => {
  it('COLS * ROWS >= GRID 길이', () => {
    expect(INITIALS_KEY_COLS * INITIALS_KEY_ROWS).toBeGreaterThanOrEqual(
      INITIALS_KEY_GRID.length,
    );
  });

  it('그리드에 A-Z가 모두 포함', () => {
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i);
      expect(INITIALS_KEY_GRID).toContain(letter);
    }
  });

  it('그리드에 DEL, SPC 포함', () => {
    expect(INITIALS_KEY_GRID).toContain('DEL');
    expect(INITIALS_KEY_GRID).toContain('SPC');
  });
});

describe('방향키 매핑', () => {
  it('4방향 모두 정의', () => {
    expect(INITIALS_MOVE_DIR).toHaveProperty('ArrowLeft');
    expect(INITIALS_MOVE_DIR).toHaveProperty('ArrowRight');
    expect(INITIALS_MOVE_DIR).toHaveProperty('ArrowUp');
    expect(INITIALS_MOVE_DIR).toHaveProperty('ArrowDown');
  });

  it('좌우는 dc만 변경', () => {
    expect(INITIALS_MOVE_DIR.ArrowLeft).toEqual({ dr: 0, dc: -1 });
    expect(INITIALS_MOVE_DIR.ArrowRight).toEqual({ dr: 0, dc: 1 });
  });

  it('상하는 dr만 변경', () => {
    expect(INITIALS_MOVE_DIR.ArrowUp).toEqual({ dr: -1, dc: 0 });
    expect(INITIALS_MOVE_DIR.ArrowDown).toEqual({ dr: 1, dc: 0 });
  });
});
