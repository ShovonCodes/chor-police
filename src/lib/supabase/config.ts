// Detects dummy placeholder credentials so callers degrade to MemoryGameStore.
// Never throws on import.

const PLACEHOLDER_MARKERS = [
  'dummy',
  'example',
  'your-project',
  'your_project',
  'placeholder',
  'changeme',
  'xxxx',
];

function looksReal(value: string | undefined, kind: 'url' | 'key'): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  if (PLACEHOLDER_MARKERS.some((m) => lower.includes(m))) return false;
  if (kind === 'url') {
    return /^https:\/\/[a-z0-9-]+\.supabase\.(co|in|net)/.test(lower);
  }
  // Real Supabase anon/service keys are long JWTs (or sb_ tokens).
  return value.length >= 40;
}

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured: boolean =
  looksReal(SUPABASE_URL, 'url') && looksReal(SUPABASE_ANON_KEY, 'key');

export const isSupabaseServerConfigured: boolean =
  isSupabaseConfigured && looksReal(SUPABASE_SERVICE_ROLE_KEY, 'key');
