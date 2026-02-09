import { TGameType } from '@/@types/scores';
import { GAME_SECURITY_CONFIG, RATE_LIMIT } from '@/lib/game-security/config';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { NextRequest } from 'next/server';

const VALID_GAME_TYPES: TGameType[] = [
  'dodge',
  'snake',
  'tetris',
  'asteroid',
  'breakout',
  'flappybird',
  'pong',
  'dino',
  'doodle',
  '2048',
  'spaceinvaders',
  'missilecommand',
  'platformer',
  'kero33',
  'enhance',
  'slot',
  'highlow',
  'roulette',
  'rps',
  'pacman',
  'burger',
  'stairs',
  'crossyroad',
  'towerblocks',
  'fruitninja',
  'aimtrainer',
];

function isValidGameType(gameType: string): gameType is TGameType {
  return VALID_GAME_TYPES.includes(gameType as TGameType);
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return '127.0.0.1';
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const gameType = searchParams.get('gameType');

  if (!gameType || !isValidGameType(gameType)) {
    return Response.json(
      { error: 'Invalid or missing gameType parameter' },
      { status: 400 },
    );
  }

  try {
    const scores = await prisma.score.findMany({
      where: { gameType },
      orderBy: { score: 'desc' },
      take: 10,
      select: {
        initials: true,
        score: true,
        country: true,
      },
    });

    const rankedScores = scores.map((score, index) => ({
      rank: index + 1,
      ...score,
    }));

    return Response.json({ data: rankedScores }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch scores:', error);
    return Response.json({ error: 'Failed to fetch scores' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameType, score, sessionToken } = body;

    // 1. 사용자 인증 검증 (필수)
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return Response.json(
        { error: 'LOGIN_REQUIRED', message: 'Login is required to save scores' },
        { status: 401 },
      );
    }

    // 2. 사용자 이니셜 확인
    const user = await prisma.user.findUnique({
      where: { id: authSession.user.id },
      select: { initials: true },
    });

    if (!user?.initials) {
      return Response.json(
        { error: 'INITIALS_REQUIRED', message: 'Set your initials first in My Page' },
        { status: 400 },
      );
    }

    // 3. 기본 검증
    if (!gameType || !isValidGameType(gameType)) {
      return Response.json({ error: 'Invalid gameType' }, { status: 400 });
    }

    if (typeof score !== 'number' || score < 0) {
      return Response.json(
        { error: 'Score must be a non-negative number' },
        { status: 400 },
      );
    }

    // 4. 세션 토큰 검증
    if (!sessionToken) {
      return Response.json(
        { error: 'MISSING_SESSION_TOKEN', message: 'Session token is required' },
        { status: 401 },
      );
    }

    const gameSession = await prisma.gameSession.findUnique({
      where: { token: sessionToken },
    });

    if (!gameSession) {
      return Response.json(
        { error: 'INVALID_SESSION_TOKEN', message: 'Invalid session token' },
        { status: 401 },
      );
    }

    if (gameSession.isUsed) {
      return Response.json(
        { error: 'SESSION_ALREADY_USED', message: 'Session token already used' },
        { status: 401 },
      );
    }

    if (gameSession.gameType !== gameType) {
      return Response.json(
        { error: 'GAME_TYPE_MISMATCH', message: 'Session game type mismatch' },
        { status: 400 },
      );
    }

    // 5. 최소 플레이 시간 검증
    const config = GAME_SECURITY_CONFIG[gameType];
    const playTimeSeconds =
      (Date.now() - gameSession.startedAt.getTime()) / 1000;

    if (playTimeSeconds < config.minPlayTimeSeconds) {
      return Response.json(
        {
          error: 'MIN_PLAY_TIME_NOT_MET',
          message: `Minimum play time is ${config.minPlayTimeSeconds} seconds`,
        },
        { status: 400 },
      );
    }

    // 6. 최대 점수 검증
    if (score > config.maxScore) {
      return Response.json(
        {
          error: 'MAX_SCORE_EXCEEDED',
          message: `Maximum score for ${gameType} is ${config.maxScore}`,
        },
        { status: 400 },
      );
    }

    // 7. Rate limit 체크
    const ipAddress = getClientIp(request);
    const windowStart = new Date(
      Date.now() - RATE_LIMIT.score.windowSeconds * 1000,
    );
    const recentScores = await prisma.score.count({
      where: {
        session: { ipAddress },
        createdAt: { gte: windowStart },
      },
    });

    if (recentScores >= RATE_LIMIT.score.maxRequests) {
      return Response.json(
        { error: 'RATE_LIMIT_EXCEEDED', message: 'Too many score submissions' },
        { status: 429 },
      );
    }

    // 8. 기존 최고 점수 확인
    const existingScore = await prisma.score.findFirst({
      where: {
        userId: authSession.user.id,
        gameType,
      },
      orderBy: { score: 'desc' },
    });

    const newScoreValue = Math.floor(score);

    // 기존 점수가 있고, 새 점수가 더 낮거나 같으면 저장하지 않음
    if (existingScore && newScoreValue <= existingScore.score) {
      // 세션은 사용 처리
      await prisma.gameSession.update({
        where: { id: gameSession.id },
        data: { isUsed: true, usedAt: new Date() },
      });

      return Response.json(
        {
          error: 'SCORE_NOT_HIGHER',
          message: `Your best score is ${existingScore.score}. New score must be higher to save.`,
          currentBest: existingScore.score,
        },
        { status: 200 },
      );
    }

    // 9. 트랜잭션: Score 저장/업데이트 + Session 사용 처리
    const country = request.headers.get('x-vercel-ip-country') || null;

    if (existingScore) {
      // 기존 점수가 있으면 업데이트
      const [updatedScore] = await prisma.$transaction([
        prisma.score.update({
          where: { id: existingScore.id },
          data: {
            score: newScoreValue,
            initials: user.initials,
            country,
            sessionId: gameSession.id,
          },
        }),
        prisma.gameSession.update({
          where: { id: gameSession.id },
          data: { isUsed: true, usedAt: new Date() },
        }),
      ]);

      return Response.json({ data: updatedScore, updated: true }, { status: 200 });
    }

    // 새 점수 생성
    const [newScore] = await prisma.$transaction([
      prisma.score.create({
        data: {
          gameType,
          initials: user.initials,
          score: newScoreValue,
          country,
          sessionId: gameSession.id,
          userId: authSession.user.id,
        },
      }),
      prisma.gameSession.update({
        where: { id: gameSession.id },
        data: { isUsed: true, usedAt: new Date() },
      }),
    ]);

    return Response.json({ data: newScore, created: true }, { status: 201 });
  } catch (error) {
    console.error('Failed to save score:', error);
    return Response.json({ error: 'Failed to save score' }, { status: 500 });
  }
}
