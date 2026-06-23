'use client';

// Builds a 1080×1920 (9:16 story) PNG of the final standings, fully client-side,
// and pushes it to the native share sheet (Web Share API) with a download
// fallback. The home URL is copied to the clipboard so the sharer can drop it
// into a story link sticker — a story image's pixels can't be tappable links.

export interface ShareRow {
  name: string;
  emoji: string;
  seat: number; // 0..3, picks the avatar backing color (matches <Avatar>)
  score: number;
  rank: number; // 0 = top
  isWinner: boolean;
}

export interface ShareData {
  code: string;
  origin: string; // window.location.origin
  rows: ShareRow[];
}

const W = 1080;
const H = 1920;

const C = {
  felt900: '#0d3b2e',
  felt800: '#114a39',
  felt700: '#1a5c47',
  paper50: '#fdf6e3',
  paper200: '#efdcae',
  paper300: '#e3c485',
  marigold: '#f4a01c',
  marigoldDark: '#d97e0a',
  vermilion: '#e2483a',
  vermilionDark: '#b8281c',
  gold: '#e8b21e',
  ink: '#2b2118',
};

// Mirrors Avatar's BACKINGS so a player's color is identical on the card.
const BACKINGS = [
  { fill: '#f4a01c', ring: '#d97e0a' },
  { fill: '#128f88', ring: '#0c4f4a' },
  { fill: '#5b2a86', ring: '#3c1a5b' },
  { fill: '#e2483a', ring: '#b8281c' },
];

const MEDALS = ['🥇', '🥈', '🥉', '🎖️'];

function family(): string {
  if (typeof document === 'undefined') return 'system-ui, sans-serif';
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue('--font-baloo')
    .trim();
  return v ? `${v}, system-ui, sans-serif` : 'system-ui, sans-serif';
}

async function ensureFonts(fam: string): Promise<void> {
  try {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load(`800 72px ${fam}`),
      document.fonts.load(`700 46px ${fam}`),
    ]);
  } catch {
    // Font loading is best-effort; canvas falls back to system-ui.
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

function avatar(
  ctx: CanvasRenderingContext2D,
  emoji: string,
  seat: number,
  cx: number,
  cy: number,
  r: number,
): void {
  const b = BACKINGS[seat % BACKINGS.length];
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = b.fill;
  ctx.fill();
  ctx.lineWidth = Math.max(3, r * 0.06);
  ctx.strokeStyle = b.ring;
  ctx.stroke();
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(r * 0.95)}px ${family()}`;
  // Nudge for emoji optical centering.
  ctx.fillText(emoji, cx, cy + r * 0.06);
  ctx.restore();
}

function prettyUrl(origin: string): string {
  return origin.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export async function buildShareCard(data: ShareData): Promise<Blob> {
  const fam = family();
  await ensureFonts(fam);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  // Background — felt with a soft radial glow toward the top.
  ctx.fillStyle = C.felt900;
  ctx.fillRect(0, 0, W, H);
  const bg = ctx.createRadialGradient(540, 440, 80, 540, 980, 1250);
  bg.addColorStop(0, C.felt700);
  bg.addColorStop(0.7, C.felt900);
  bg.addColorStop(1, '#082a20');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Header wordmark — "Chor" marigold + "Police" vermilion, centered.
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 76px ${fam}`;
  const w1 = ctx.measureText('Chor ').width;
  const w2 = ctx.measureText('Police').width;
  const startX = (W - (w1 + w2)) / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = C.marigold;
  ctx.fillText('Chor ', startX, 150);
  ctx.fillStyle = C.vermilion;
  ctx.fillText('Police', startX + w1, 150);

  // Room code pill.
  ctx.font = `700 34px ${fam}`;
  const codeText = `ROOM ${data.code}`;
  const cw = ctx.measureText(codeText).width;
  const pillW = cw + 56;
  roundRect(ctx, (W - pillW) / 2, 188, pillW, 60, 30);
  ctx.fillStyle = C.paper200;
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(codeText, W / 2, 220);

  // Winner spotlight card.
  const winner = data.rows[0];
  const cardX = 220;
  const cardY = 300;
  const cardW = W - cardX * 2;
  const cardH = 560;
  ctx.save();
  ctx.shadowColor = 'rgba(244,160,28,0.55)';
  ctx.shadowBlur = 50;
  const paperGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  paperGrad.addColorStop(0, C.paper50);
  paperGrad.addColorStop(1, C.paper300);
  roundRect(ctx, cardX, cardY, cardW, cardH, 44);
  ctx.fillStyle = paperGrad;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, cardX, cardY, cardW, cardH, 44);
  ctx.lineWidth = 7;
  ctx.strokeStyle = C.marigold;
  ctx.stroke();

  if (winner) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `96px ${fam}`;
    ctx.fillText('👑', W / 2, cardY + 110);
    avatar(ctx, winner.emoji, winner.seat, W / 2, cardY + 280, 110);
    ctx.font = `700 38px ${fam}`;
    ctx.fillStyle = C.marigoldDark;
    ctx.fillText('CHAMPION', W / 2, cardY + 420);
    ctx.font = `800 64px ${fam}`;
    ctx.fillStyle = C.vermilionDark;
    ctx.fillText(fitText(ctx, winner.name, cardW - 80), W / 2, cardY + 478);
    ctx.font = `800 56px ${fam}`;
    ctx.fillStyle = C.marigoldDark;
    ctx.fillText(`${winner.score}`, W / 2, cardY + 530);
  }

  // Standings rows.
  const rowX = 80;
  const rowW = W - rowX * 2;
  const rowH = 156;
  const gap = 22;
  let y = 920;
  for (const r of data.rows) {
    const cy = y + rowH / 2;
    roundRect(ctx, rowX, y, rowW, rowH, 30);
    if (r.isWinner) {
      ctx.fillStyle = 'rgba(26,92,71,0.92)';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.marigold;
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(17,74,57,0.75)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(253,246,227,0.22)';
      ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `60px ${fam}`;
    ctx.fillText(MEDALS[r.rank] ?? `${r.rank + 1}`, rowX + 80, cy);
    avatar(ctx, r.emoji, r.seat, rowX + 220, cy, 52);
    ctx.textAlign = 'left';
    ctx.font = `700 46px ${fam}`;
    ctx.fillStyle = C.paper50;
    ctx.fillText(fitText(ctx, r.name, rowW - 480), rowX + 300, cy);
    ctx.textAlign = 'right';
    ctx.font = `800 52px ${fam}`;
    ctx.fillStyle = C.gold;
    ctx.fillText(`${r.score}`, rowX + rowW - 36, cy);
    y += rowH + gap;
  }

  // Footer CTA — visible home URL.
  const ctaY = 1700;
  const ctaH = 150;
  const ctaGrad = ctx.createLinearGradient(rowX, ctaY, rowX, ctaY + ctaH);
  ctaGrad.addColorStop(0, C.marigold);
  ctaGrad.addColorStop(1, C.marigoldDark);
  roundRect(ctx, rowX, ctaY, rowW, ctaH, 36);
  ctx.fillStyle = ctaGrad;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.vermilionDark;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.ink;
  ctx.font = `800 40px ${fam}`;
  ctx.fillText('🎮 Play now', W / 2, ctaY + 52);
  ctx.font = `700 44px ${fam}`;
  ctx.fillText(fitText(ctx, prettyUrl(data.origin), rowW - 80), W / 2, ctaY + 104);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/png',
    );
  });
}

export type ShareMethod = 'share' | 'download';

export interface ShareResult {
  method: ShareMethod;
  linkCopied: boolean;
  // Only set when we had to download: why the native sheet wasn't used.
  reason?: 'insecure' | 'unsupported';
}

async function copyLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard?.writeText(url);
    return true;
  } catch {
    return false;
  }
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareResult(data: ShareData): Promise<ShareResult> {
  const blob = await buildShareCard(data);
  const file = new File([blob], `chor-police-${data.code}.png`, {
    type: 'image/png',
  });

  const nav = navigator as Navigator & {
    canShare?: (d: { files?: File[] }) => boolean;
  };

  // Native share first — the image IS the payload. Deliberately NO url/link in
  // the payload: chat apps (iMessage/Messenger) unfurl a shared URL into an OG
  // link card and drop the image. The home URL is printed on the card itself
  // and copied to the clipboard instead. Calling share() before any clipboard
  // work preserves the user-activation iOS Safari requires.
  if (typeof navigator.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Chor Police',
        text: '🎴 Chor Police — final standings!',
      });
      const linkCopied = await copyLink(data.origin);
      return { method: 'share', linkCopied };
    } catch (err) {
      // User cancel is not a failure; only fall back on genuine errors.
      if ((err as Error)?.name === 'AbortError') {
        return { method: 'share', linkCopied: false };
      }
    }
  }

  // Fallback: secure context but no file-share support → unsupported; otherwise
  // the page is served over plain HTTP, which disables Web Share entirely.
  const linkCopied = await copyLink(data.origin);
  downloadBlob(blob, file.name);
  const reason: ShareResult['reason'] =
    typeof window !== 'undefined' && !window.isSecureContext
      ? 'insecure'
      : 'unsupported';
  return { method: 'download', linkCopied, reason };
}
