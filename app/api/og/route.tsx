import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { MENU_LIST } from '@/lib/config';

export const runtime = 'edge';

const CATEGORY_GRADIENTS: Record<string, string> = {
  Arcade: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b69 50%, #1a1a2e 100%)',
  Action: 'linear-gradient(135deg, #1a0a2e 0%, #6b1010 50%, #1a1a2e 100%)',
  Puzzle: 'linear-gradient(135deg, #0a1a2e 0%, #0f4c5c 50%, #1a1a2e 100%)',
  Reflex: 'linear-gradient(135deg, #1a0a2e 0%, #4a1a6b 50%, #2e1a1a 100%)',
  Idle: 'linear-gradient(135deg, #0a2e1a 0%, #1a4a2e 50%, #1a2e1a 100%)',
  'Good Luck': 'linear-gradient(135deg, #2e2a0a 0%, #6b5a1a 50%, #2e1a1a 100%)',
  Utility: 'linear-gradient(135deg, #1a1a2e 0%, #2e2e3e 50%, #1a1a2e 100%)',
};

const CATEGORY_EMOJI: Record<string, string> = {
  Arcade: '🕹️',
  Action: '⚡',
  Puzzle: '🧩',
  Reflex: '🎯',
  Idle: '📈',
  'Good Luck': '🍀',
  Utility: '🔧',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const game = searchParams.get('game');

  if (!game) {
    return new Response('Missing game parameter', { status: 400 });
  }

  const menu = MENU_LIST.find((m) => m.href === `/${game}`);

  if (!menu) {
    return new Response('Game not found', { status: 404 });
  }

  const bg =
    CATEGORY_GRADIENTS[menu.category] ||
    'linear-gradient(135deg, #1a0a2e 0%, #0f1729 50%, #1a1a2e 100%)';
  const emoji = CATEGORY_EMOJI[menu.category] || '🎮';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: bg,
          fontFamily: 'system-ui, sans-serif',
        }}>
        {/* Decorative emoji */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 60,
            fontSize: 64,
            opacity: 0.3,
            display: 'flex',
          }}>
          {emoji}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            right: 80,
            fontSize: 48,
            opacity: 0.25,
            display: 'flex',
          }}>
          🎮
        </div>

        {/* Game title (English) */}
        <div
          style={{
            display: 'flex',
            fontSize: 80,
            fontWeight: 900,
            letterSpacing: '-0.02em',
            background:
              'linear-gradient(90deg, #a855f7 0%, #6366f1 50%, #22d3ee 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            textAlign: 'center',
            padding: '0 40px',
          }}>
          {menu.name.eng}
        </div>

        {/* Game title (Korean) */}
        <div
          style={{
            display: 'flex',
            fontSize: 36,
            color: '#e2e8f0',
            marginTop: 12,
          }}>
          {menu.name.kor}
        </div>

        {/* Category badge */}
        <div
          style={{
            display: 'flex',
            marginTop: 32,
            padding: '10px 24px',
            background: 'rgba(139, 92, 246, 0.2)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            borderRadius: 999,
            fontSize: 18,
            color: '#c4b5fd',
            gap: 8,
          }}>
          {emoji} {menu.category}
        </div>

        {/* Kame branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            fontSize: 24,
            fontWeight: 700,
            background:
              'linear-gradient(90deg, #a855f7 0%, #22d3ee 100%)',
            backgroundClip: 'text',
            color: 'transparent',
          }}>
          KAME
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
