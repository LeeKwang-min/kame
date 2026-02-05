import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 사용자별 총합 점수 계산 (userId가 있는 점수만)
    const userScores = await prisma.score.groupBy({
      by: ['userId'],
      where: {
        userId: { not: null },
      },
      _sum: {
        score: true,
      },
      orderBy: {
        _sum: {
          score: 'desc',
        },
      },
      take: 10,
    });

    // 사용자 정보 가져오기
    const userIds = userScores
      .map((s) => s.userId)
      .filter((id): id is string => id !== null);

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, initials: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u.initials]));

    const rankedScores = userScores
      .filter((s) => s.userId && userMap.get(s.userId))
      .map((s, index) => ({
        rank: index + 1,
        initials: userMap.get(s.userId!) || '???',
        totalScore: s._sum.score || 0,
      }));

    return Response.json({ data: rankedScores }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch total ranking:', error);
    return Response.json(
      { error: 'Failed to fetch total ranking' },
      { status: 500 },
    );
  }
}
