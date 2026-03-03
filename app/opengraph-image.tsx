import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Kame - 무료 웹 게임 모음';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
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
          background: 'linear-gradient(135deg, #1a0a2e 0%, #0f1729 50%, #1a1a2e 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}>
        {/* 배경 장식 요소들 */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 60,
            fontSize: 48,
            opacity: 0.3,
            display: 'flex',
          }}>
          🎮
        </div>
        <div
          style={{
            position: 'absolute',
            top: 80,
            right: 100,
            fontSize: 36,
            opacity: 0.25,
            display: 'flex',
          }}>
          🕹️
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            left: 120,
            fontSize: 32,
            opacity: 0.2,
            display: 'flex',
          }}>
          👾
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            right: 80,
            fontSize: 40,
            opacity: 0.3,
            display: 'flex',
          }}>
          🎯
        </div>
        <div
          style={{
            position: 'absolute',
            top: 200,
            left: 80,
            fontSize: 28,
            opacity: 0.2,
            display: 'flex',
          }}>
          🐍
        </div>
        <div
          style={{
            position: 'absolute',
            top: 180,
            right: 140,
            fontSize: 30,
            opacity: 0.25,
            display: 'flex',
          }}>
          🧱
        </div>

        {/* 메인 로고 */}
        <div
          style={{
            display: 'flex',
            fontSize: 120,
            fontWeight: 900,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(90deg, #a855f7 0%, #6366f1 50%, #22d3ee 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 0 80px rgba(168, 85, 247, 0.5)',
          }}>
          KAME
        </div>

        {/* 서브타이틀 */}
        <div
          style={{
            display: 'flex',
            fontSize: 36,
            color: '#e2e8f0',
            marginTop: 16,
            letterSpacing: '0.1em',
          }}>
          무료 웹 게임 모음
        </div>

        {/* 게임 개수 배지 */}
        <div
          style={{
            display: 'flex',
            marginTop: 32,
            padding: '12px 28px',
            background: 'rgba(139, 92, 246, 0.2)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            borderRadius: 999,
            fontSize: 20,
            color: '#c4b5fd',
          }}>
          50+ 무료 게임 | 브라우저에서 바로 플레이
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
