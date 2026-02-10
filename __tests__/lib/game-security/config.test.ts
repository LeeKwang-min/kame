import { describe, expect, it } from 'vitest';
import { GAME_SECURITY_CONFIG, RATE_LIMIT } from '@/lib/game-security/config';

describe('GAME_SECURITY_CONFIG', () => {
  const gameTypes = Object.keys(GAME_SECURITY_CONFIG);

  it('모든 게임 타입에 보안 설정이 존재', () => {
    expect(gameTypes.length).toBeGreaterThan(0);
  });

  it.each(gameTypes)('%s: maxScore > 0', (gameType) => {
    const config = GAME_SECURITY_CONFIG[gameType as keyof typeof GAME_SECURITY_CONFIG];
    expect(config.maxScore).toBeGreaterThan(0);
  });

  it.each(gameTypes)('%s: minPlayTimeSeconds > 0', (gameType) => {
    const config = GAME_SECURITY_CONFIG[gameType as keyof typeof GAME_SECURITY_CONFIG];
    expect(config.minPlayTimeSeconds).toBeGreaterThan(0);
  });
});

describe('RATE_LIMIT', () => {
  it('session rate limit 설정 유효', () => {
    expect(RATE_LIMIT.session.maxRequests).toBeGreaterThan(0);
    expect(RATE_LIMIT.session.windowSeconds).toBeGreaterThan(0);
  });

  it('score rate limit 설정 유효', () => {
    expect(RATE_LIMIT.score.maxRequests).toBeGreaterThan(0);
    expect(RATE_LIMIT.score.windowSeconds).toBeGreaterThan(0);
  });
});
