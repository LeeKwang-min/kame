import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userScores = await prisma.score.groupBy({
      by: ['gameType'],
      where: { userId: session.user.id },
      _max: { score: true },
      _count: { id: true },
    });

    const result = await Promise.all(
      userScores.map(async (item) => {
        const highScore = item._max.score || 0;

        const rank = await prisma.score.count({
          where: {
            gameType: item.gameType,
            score: { gt: highScore },
          },
        });

        return {
          gameType: item.gameType,
          highScore,
          totalGames: item._count.id,
          rank: rank + 1,
        };
      }),
    );

    result.sort((a, b) => b.totalGames - a.totalGames);

    return Response.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch user scores:', error);
    return Response.json(
      { error: 'Failed to fetch user scores' },
      { status: 500 },
    );
  }
}
