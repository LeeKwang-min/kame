import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { CHARACTER_CONFIG } from '@/lib/character/config';

export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { character } = await request.json();

    // 유효성 검사
    if (!CHARACTER_CONFIG.types.includes(character)) {
      return Response.json(
        { error: 'Invalid character type' },
        { status: 400 },
      );
    }

    // 캐릭터 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { character },
      select: { character: true },
    });

    return Response.json({ data: updatedUser }, { status: 200 });
  } catch (error) {
    console.error('Failed to update character:', error);
    return Response.json(
      { error: 'Failed to update character' },
      { status: 500 },
    );
  }
}
