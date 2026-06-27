'use client';

// Builds a 1080×1920 story PNG of the final standings and shares it via the
// Web Share API (download fallback). The home URL is copied to the clipboard.

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

  ctx.fillStyle = C.felt900;
  ctx.fillRect(0, 0, W, H);
  const bg = ctx.createRadialGradient(540, 440, 80, 540, 980, 1250);
  bg.addColorStop(0, C.felt700);
  bg.addColorStop(0.7, C.felt900);
  bg.addColorStop(1, '#082a20');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

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

  ctx.font = `800 54px ${fam}`;
  ctx.fillStyle = C.paper50;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('🏆 Final standings', W / 2, 350);

  const rowX = 80;
  const rowW = W - rowX * 2;

  // Olympic podium: 2nd (left/silver) · 1st (center/gold) · 3rd (right/bronze).
  const [first, second, third, fourth] = data.rows;
  const colW = 284;
  const colGap = 24;
  const podX = 90;
  const yBase = 1320;
  const METAL: Record<number, { from: string; to: string; ring: string }> = {
    1: { from: '#f6c544', to: '#d97e0a', ring: '#b8650a' },
    2: { from: '#e6eaee', to: '#a9b2ba', ring: '#8c959d' },
    3: { from: '#e0a473', to: '#b87333', ring: '#8f561f' },
  };

  const drawSpot = (row: ShareRow | undefined, place: number, colIndex: number) => {
    if (!row) return;
    const height = place === 1 ? 380 : place === 2 ? 290 : 240;
    const x = podX + colIndex * (colW + colGap);
    const top = yBase - height;
    const cx = x + colW / 2;
    const r = place === 1 ? 96 : 80;
    const metal = METAL[place];

    ctx.save();
    if (place === 1) {
      ctx.shadowColor = 'rgba(244,160,28,0.55)';
      ctx.shadowBlur = 45;
    }
    const g = ctx.createLinearGradient(x, top, x, yBase);
    g.addColorStop(0, metal.from);
    g.addColorStop(1, metal.to);
    ctx.beginPath();
    ctx.roundRect(x, top, colW, height, [28, 28, 0, 0]);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.roundRect(x, top, colW, height, [28, 28, 0, 0]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = metal.ring;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `64px ${fam}`;
    ctx.fillText(MEDALS[place - 1], cx, top + 58);

    ctx.textBaseline = 'alphabetic';
    ctx.font = `800 50px ${fam}`;
    ctx.fillStyle = C.gold;
    ctx.fillText(`${row.score}`, cx, top - 18);

    ctx.font = `700 40px ${fam}`;
    ctx.fillStyle = C.paper50;
    ctx.fillText(fitText(ctx, row.name, colW - 16), cx, top - 70);

    const avatarCY = top - 70 - 36 - r;
    avatar(ctx, row.emoji, row.seat, cx, avatarCY, r);

    if (place === 1) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `92px ${fam}`;
      ctx.fillText('👑', cx, avatarCY - r - 30);
    }
  };

  // Draw the winner last so its glow/crown sit cleanly over the neighbours.
  drawSpot(second, 2, 0);
  drawSpot(third, 3, 2);
  drawSpot(first, 1, 1);

  if (fourth) {
    const ry = 1380;
    const rh = 128;
    const rcy = ry + rh / 2;
    roundRect(ctx, rowX, ry, rowW, rh, 28);
    ctx.fillStyle = 'rgba(17,74,57,0.75)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(253,246,227,0.22)';
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 44px ${fam}`;
    ctx.fillStyle = C.paper200;
    ctx.fillText('4', rowX + 60, rcy);
    avatar(ctx, fourth.emoji, fourth.seat, rowX + 150, rcy, 48);
    ctx.textAlign = 'left';
    ctx.font = `700 44px ${fam}`;
    ctx.fillStyle = C.paper50;
    ctx.fillText(fitText(ctx, fourth.name, rowW - 380), rowX + 220, rcy);
    ctx.textAlign = 'right';
    ctx.font = `800 50px ${fam}`;
    ctx.fillStyle = C.gold;
    ctx.fillText(`${fourth.score}`, rowX + rowW - 36, rcy);
  }

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

  // No url in the payload: chat apps unfurl a shared link and drop the image.
  // share() runs before clipboard work to keep the iOS user-activation.
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

  // Plain-HTTP context disables Web Share entirely; else just unsupported.
  const linkCopied = await copyLink(data.origin);
  downloadBlob(blob, file.name);
  const reason: ShareResult['reason'] =
    typeof window !== 'undefined' && !window.isSecureContext
      ? 'insecure'
      : 'unsupported';
  return { method: 'download', linkCopied, reason };
}
