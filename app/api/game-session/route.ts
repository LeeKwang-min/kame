import { TGameType } from '@/@types/scores';
import { RATE_LIMIT } from '@/lib/game-security/config';
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
  'pacman',
  'burger',
  'stairs',
  'crossyroad',
  'towerblocks',
  'fruitninja',
  'aimtrainer',
  'simon',
  'matchpairs',
  'bubbleshooter',
  'typingfall',
  'colorflood',
  'lightsout',
  'slidingpuzzle',
  'nonogram',
  'numberchain',
  'minesweeper',
  'maze',
  'randomdefense',
  'puyopuyo',
  'jewelcrush',
  'kustom',
  'survivors',
  'geometrydash',
  'helicopter',
  'downwell',
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameType } = body;

    if (!gameType || !isValidGameType(gameType)) {
      return Response.json({ error: 'Invalid gameType' }, { status: 400 });
    }

    const ipAddress = getClientIp(request);

    // Rate limit 체크
    const windowStart = new Date(
      Date.now() - RATE_LIMIT.session.windowSeconds * 1000,
    );
    const recentSessions = await prisma.gameSession.count({
      where: {
        ipAddress,
        startedAt: { gte: windowStart },
      },
    });

    if (recentSessions >= RATE_LIMIT.session.maxRequests) {
      return Response.json(
        { error: 'RATE_LIMIT_EXCEEDED', message: 'Too many session requests' },
        { status: 429 },
      );
    }

    // 세션 토큰 생성
    const token = crypto.randomUUID();

    const session = await prisma.gameSession.create({
      data: {
        gameType,
        token,
        ipAddress,
      },
    });

    return Response.json(
      { data: { token: session.token, sessionId: session.id } },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create game session:', error);
    return Response.json(
      { error: 'Failed to create game session' },
      { status: 500 },
    );
  }
}
