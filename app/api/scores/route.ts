import { TGameType, TScoreCreate } from '@/@types/scores';
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
];

function isValidGameType(gameType: string): gameType is TGameType {
  return VALID_GAME_TYPES.includes(gameType as TGameType);
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
    const body: TScoreCreate = await request.json();
    const { gameType, initials, score } = body;

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

    const country = request.headers.get('x-vercel-ip-country') || null;

    const newScore = await prisma.score.create({
      data: {
        gameType,
        initials: initials.toUpperCase(),
        score: Math.floor(score),
        country,
      },
    });

    return Response.json({ data: newScore }, { status: 201 });
  } catch (error) {
    console.error('Failed to save score:', error);
    return Response.json({ error: 'Failed to save score' }, { status: 500 });
  }
}
