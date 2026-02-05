import { TGameType } from '@/@types/scores';
import { GAME_SECURITY_CONFIG, RATE_LIMIT } from '@/lib/game-security/config';
import { prisma } from '@/lib/prisma';
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
    const { gameType, initials, score, sessionToken } = body;

    // 1. 기본 검증
    if (!gameType || !isValidGameType(gameType)) {
      return Response.json({ error: 'Invalid gameType' }, { status: 400 });
    }

    if (!initials || initials.length < 1 || initials.length > 5) {
      return Response.json(
        { error: 'Initials must be 1-5 characters' },
        { status: 400 },
      );
    }

    if (typeof score !== 'number' || score < 0) {
      return Response.json(
        { error: 'Score must be a non-negative number' },
        { status: 400 },
      );
    }

    // 2. 세션 토큰 검증
    if (!sessionToken) {
      return Response.json(
        { error: 'MISSING_SESSION_TOKEN', message: 'Session token is required' },
        { status: 401 },
      );
    }

    const session = await prisma.gameSession.findUnique({
      where: { token: sessionToken },
    });

    if (!session) {
      return Response.json(
        { error: 'INVALID_SESSION_TOKEN', message: 'Invalid session token' },
        { status: 401 },
      );
    }

    if (session.isUsed) {
      return Response.json(
        { error: 'SESSION_ALREADY_USED', message: 'Session token already used' },
        { status: 401 },
      );
    }

    if (session.gameType !== gameType) {
      return Response.json(
        { error: 'GAME_TYPE_MISMATCH', message: 'Session game type mismatch' },
        { status: 400 },
      );
    }

    // 3. 최소 플레이 시간 검증
    const config = GAME_SECURITY_CONFIG[gameType];
    const playTimeSeconds =
      (Date.now() - session.startedAt.getTime()) / 1000;

    if (playTimeSeconds < config.minPlayTimeSeconds) {
      return Response.json(
        {
          error: 'MIN_PLAY_TIME_NOT_MET',
          message: `Minimum play time is ${config.minPlayTimeSeconds} seconds`,
        },
        { status: 400 },
      );
    }

    // 4. 최대 점수 검증
    if (score > config.maxScore) {
      return Response.json(
        {
          error: 'MAX_SCORE_EXCEEDED',
          message: `Maximum score for ${gameType} is ${config.maxScore}`,
        },
        { status: 400 },
      );
    }

    // 5. Rate limit 체크
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

    // 6. 트랜잭션: Score 저장 + Session 사용 처리
    const country = request.headers.get('x-vercel-ip-country') || null;

    const [newScore] = await prisma.$transaction([
      prisma.score.create({
        data: {
          gameType,
          initials: initials.toUpperCase(),
          score: Math.floor(score),
          country,
          sessionId: session.id,
        },
      }),
      prisma.gameSession.update({
        where: { id: session.id },
        data: { isUsed: true, usedAt: new Date() },
      }),
    ]);

    return Response.json({ data: newScore }, { status: 201 });
  } catch (error) {
    console.error('Failed to save score:', error);
    return Response.json({ error: 'Failed to save score' }, { status: 500 });
  }
}
