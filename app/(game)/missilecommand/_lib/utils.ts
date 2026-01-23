import { TCity } from './types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CITY_WIDTH,
  CITY_HEIGHT,
  CITY_COUNT,
} from './config';

// 도시 초기 배치 생성
export const createCities = (): TCity[] => {
  const cities: TCity[] = [];
  const groundY = CANVAS_HEIGHT - CITY_HEIGHT;

  // 도시를 균등하게 배치 (화면을 CITY_COUNT+1 구간으로 나눔)
  const spacing = CANVAS_WIDTH / (CITY_COUNT + 1);

  for (let i = 0; i < CITY_COUNT; i++) {
    cities.push({
      x: spacing * (i + 1) - CITY_WIDTH / 2,
      y: groundY,
      width: CITY_WIDTH,
      height: CITY_HEIGHT,
      alive: true,
    });
  }

  return cities;
};

// 살아있는 도시 중 랜덤으로 하나 선택
export const getRandomAliveCity = (cities: TCity[]): TCity | null => {
  const aliveCities = cities.filter((c) => c.alive);
  if (aliveCities.length === 0) return null;

  const index = Math.floor(Math.random() * aliveCities.length);
  return aliveCities[index];
};

// 두 점 사이의 거리
export const distance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};

// 원-원 충돌 (폭발 vs 적 미사일)
export const circleCircleHit = (
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
): boolean => {
  return distance(x1, y1, x2, y2) < r1 + r2;
};