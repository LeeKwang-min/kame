import { describe, expect, it } from 'vitest';
import { initialLabelAt } from '@/lib/game/utils';

describe('initialLabelAt', () => {
  it('첫 번째 행 첫 번째 열은 A', () => {
    expect(initialLabelAt(0, 0)).toBe('A');
  });

  it('첫 번째 행의 문자들이 알파벳 순서', () => {
    expect(initialLabelAt(0, 0)).toBe('A');
    expect(initialLabelAt(0, 1)).toBe('B');
    expect(initialLabelAt(0, 6)).toBe('G');
  });

  it('두 번째 행 시작은 H', () => {
    expect(initialLabelAt(1, 0)).toBe('H');
  });

  it('마지막 알파벳 Z는 올바른 위치', () => {
    // Z는 26번째 문자, 인덱스 25 → row 3, col 4 (7*3 + 4 = 25)
    expect(initialLabelAt(3, 4)).toBe('Z');
  });

  it('DEL 키', () => {
    // DEL은 인덱스 26 → row 3, col 5
    expect(initialLabelAt(3, 5)).toBe('DEL');
  });

  it('SPC 키', () => {
    // SPC는 인덱스 27 → row 3, col 6
    expect(initialLabelAt(3, 6)).toBe('SPC');
  });
});
