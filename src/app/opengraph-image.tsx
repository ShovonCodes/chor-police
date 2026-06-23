import { ImageResponse } from 'next/og';

// Branded link-preview card (auto-wired as og:image + twitter:image by Next's
// file convention). Roman text only — Satori's default font has no Bengali
// glyphs, so Bangla would render as tofu here.
export const alt = 'Chor Police — real-time 4-player party game';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at 50% 32%, #1a5c47 0%, #0d3b2e 68%, #082a20 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 132, fontWeight: 800 }}>
          <span style={{ color: '#f4a01c' }}>Chor</span>
          <span style={{ width: 30 }} />
          <span style={{ color: '#e2483a' }}>Police</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 46,
            fontWeight: 700,
            color: '#efdcae',
            marginTop: 28,
            letterSpacing: 2,
          }}
        >
          Babu · Police · Dakat · Chor
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 32,
            color: '#fdf6e3',
            opacity: 0.85,
            marginTop: 22,
          }}
        >
          Real-time 4-player party game · private rooms · no signup
        </div>
      </div>
    ),
    { ...size },
  );
}
