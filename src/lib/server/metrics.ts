// Structured stdout logging for Render: [cp:event] and [cp:metrics] lines.

type Fields = Record<string, string | number | boolean | null | undefined>;

function fmt(fields: Fields): string {
  return Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      const s = String(v);
      return `${k}=${/\s/.test(s) ? JSON.stringify(s) : s}`;
    })
    .join(' ');
}

export function logEvent(event: string, fields: Fields = {}): void {
  console.log(`[cp:event] event=${event} ${fmt(fields)}`.trimEnd());
}

export function logMetrics(fields: Fields): void {
  console.log(`[cp:metrics] ${fmt(fields)}`);
}

export interface MetricsSnapshot {
  rooms: number;
  players: number;
  humans: number;
  bots: number;
  connected: number;
  byPhase: Record<string, number>;
}

// Periodic snapshot; single-process, once per process.
export function startMetricsHeartbeat(getSnapshot: () => MetricsSnapshot): void {
  const g = globalThis as unknown as {
    __cpHeartbeat?: ReturnType<typeof setInterval>;
  };
  if (g.__cpHeartbeat) return;
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return;

  const interval = Number(process.env.CP_METRICS_INTERVAL_MS ?? 60_000);
  if (!(interval > 0)) return;

  const timer = setInterval(() => {
    const s = getSnapshot();
    if (s.rooms === 0) return;
    const phases: Fields = {};
    for (const [phase, count] of Object.entries(s.byPhase)) {
      phases[`phase_${phase}`] = count;
    }
    logMetrics({
      rooms: s.rooms,
      players: s.players,
      humans: s.humans,
      bots: s.bots,
      connected: s.connected,
      ...phases,
    });
  }, interval);

  (timer as { unref?: () => void }).unref?.();
  g.__cpHeartbeat = timer;
  logEvent('metrics_heartbeat_started', { interval_ms: interval });
}
