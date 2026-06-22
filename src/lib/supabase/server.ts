// Server-only: the service-role key must never reach the client.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
  isSupabaseServerConfigured,
} from './config';

// Not cached across requests by design — service-role usage should be explicit.
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseServerConfigured) return null;
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export { isSupabaseConfigured, isSupabaseServerConfigured };
