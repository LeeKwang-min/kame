import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { initials } = body;

    if (!initials || typeof initials !== 'string') {
      return Response.json(
        { error: 'Initials are required' },
        { status: 400 },
      );
    }

    const trimmed = initials.toUpperCase().trim();

    if (trimmed.length < 1 || trimmed.length > 5) {
      return Response.json(
        { error: 'Initials must be 1-5 characters' },
        { status: 400 },
      );
    }

    if (!/^[A-Z][A-Z ]{0,4}$/.test(trimmed) || trimmed.startsWith(' ')) {
      return Response.json(
        { error: 'Only A-Z and spaces (not at start) allowed' },
        { status: 400 },
      );
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { initials: trimmed },
      select: {
        id: true,
        initials: true,
      },
    });

    return Response.json({ data: user }, { status: 200 });
  } catch (error) {
    console.error('Failed to update initials:', error);
    return Response.json(
      { error: 'Failed to update initials' },
      { status: 500 },
    );
  }
}
