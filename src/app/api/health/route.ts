// Lightweight liveness endpoint for uptime pingers / keep-warm crons.
// Cheap on purpose: no game state touched, never cached.

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    { status: 'ok', t: Date.now() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
