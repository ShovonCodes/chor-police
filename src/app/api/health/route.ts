// Liveness endpoint for uptime pingers / keep-warm crons.
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    { status: 'ok', t: Date.now() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
