// Per-client SSE stream: GET /api/rooms/[code]/stream?playerId=...
// Pushes only this player's gated viewFor(...) — never raw state — on each room change.

import { gameStore } from '@/lib/server/store';

// SSE must not be statically cached or buffered.
export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  ctx: RouteContext<'/api/rooms/[code]/stream'>,
) {
  const { code: rawCode } = await ctx.params;
  const code = rawCode.toUpperCase();
  const playerId = new URL(req.url).searchParams.get('playerId');

  if (!playerId) {
    return new Response('playerId query param required', { status: 400 });
  }

  const room = await gameStore.getRoom(code);
  if (!room) {
    return new Response('Room not found', { status: 404 });
  }
  if (!room.players.some((p) => p.id === playerId)) {
    return new Response('Not a player in this room', { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const pushView = async () => {
        const view = await gameStore.viewFor(code, playerId);
        if (!view) {
          safeEnqueue('event: gone\ndata: {}\n\n');
          return;
        }
        safeEnqueue(`data: ${JSON.stringify(view)}\n\n`);
      };

      await gameStore.addConnection(code, playerId);
      await pushView();

      const unsubscribe = gameStore.subscribe(code, () => {
        void pushView();
      });

      const unsubReactions = gameStore.subscribeReactions(code, (r) => {
        safeEnqueue(`event: reaction\ndata: ${JSON.stringify(r)}\n\n`);
      });

      // Periodic keep-alive comments so proxies don't drop the connection.
      const keepAlive = setInterval(() => {
        safeEnqueue(`: keep-alive ${Date.now()}\n\n`);
      }, 15_000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(keepAlive);
        unsubscribe();
        unsubReactions();
        void gameStore.removeConnection(code, playerId);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      req.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
