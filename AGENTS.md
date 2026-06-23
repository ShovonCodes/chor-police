<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Chor Police — Web Edition

Real-time 4-player web version of the Bangladeshi game *Chor Police* (Babu, Police,
Dakat, Chor). Private rooms, no signup, playful and nostalgic.

## Stack (verified versions)

- **Next.js 16.2.9** (App Router, `src/`, TS, alias `@/*`) — UI + authoritative server actions.
- **React 19.2.4**, **Tailwind v4** (CSS-first, `@import "tailwindcss"` in globals.css).
- **Supabase** (`@supabase/supabase-js`) — Postgres + Realtime + Presence.
- **motion** (Framer Motion) — animation. **howler** — sound. **canvas-confetti** — podium.
- **vitest** — unit tests for the game engine.

## Next 16 / React 19 gotchas (DO NOT use older patterns)

- `params`, `searchParams`, `cookies()`, `headers()` are **Promises** — always `await` them.
- Route handler signature: `(req: NextRequest, ctx: RouteContext<'/path/[id]'>)`, `await ctx.params`.
- `fetch` is **not cached by default**; stream live data with `<Suspense>`. Do NOT wrap live
  multiplayer data in `'use cache'`.
- Server Actions are stable: `'use server'` files, importable into client components; use
  `useActionState` for form/pending state. Client components cannot be `async`.
- Tailwind v4: no `tailwind.config.js`; theme tokens via `@theme inline { }` in globals.css.
- `NEXT_PUBLIC_` env vars are inlined at build time; server-only secrets read at request time.

## The one invariant that matters

**The server is authoritative. Roles are secret.**

`rounds.assignments` (player → role) is server-only. During drawing→guessing the server
returns to each client ONLY that client's own role. The full map is released only at the
REVEAL phase. Realtime messages NEVER carry assignments — they carry "phase changed →
refetch" events and presence. Sending all roles to the client before REVEAL = a cheat. Don't.

## Game rules (canonical)

- 4 players. Roles: **Babu** (1000, fixed, passive), **Police** (the catcher), **Dakat** (600), **Chor** (400).
- Each round has a **target** the Police must catch: `chor` or `dakat`. First round's target is
  random; it then **strictly alternates** every round. The scoreboard follows the same rotation.
- At the guess, **Babu + Police are public**; **Chor + Dakat stay hidden**. The Police picks which
  of the two hidden players is the target role (50/50). Correct iff that player holds the target role.
- Per-round scoring:
  - **Babu**: always 1000.
  - **Police**: 800 if it catches the target, else 0.
  - **Target outlaw** (the hunted one this round): 0 if caught, else his number (Chor 400 / Dakat 600).
  - **Non-target outlaw**: always his number (Chor 400 / Dakat 600) — no deduction.
- Running tally across rounds. Match end: host picks `rounds` (fixed count) or `target` score
  (first to reach). Highest total wins. NB: the match mode value `'target'` (a score) is unrelated
  to a round's catch-target (`chor`/`dakat`).

## Layout

- `src/lib/game/` — pure rules engine (no I/O, no React). Fully unit-tested with vitest.
- `src/app/` — routes + server actions (authoritative mutations).
- `src/components/` — UI + animations.
- `src/lib/supabase/` — client/server Supabase wiring + realtime.

## Commands

- `npm run dev` — dev server.   `npm run build` — production build.
- `npm test` — vitest game-engine tests.   `npm run lint` — lint.

## Conventions

- **Tests: minimal.** Only test game-logic math/scoring/state-machine correctness in
  `src/lib/game/*.test.ts`. Do NOT add store/SSE/action/e2e/UI tests unless asked.
- **Comments: minimal.** Don't narrate obvious code. No explanatory comment unless a non-obvious
  decision genuinely needs it.
- All rule decisions live in `src/lib/game/` as pure functions.
- Server actions validate every mutation against the DB's current phase; never trust the client.
- `.env.local` ships a **dummy** Supabase URL/keys; code must degrade gracefully (no crash) until
  the owner adds real keys.
- Bangla flavor in user-facing copy (e.g. *"Police, chor dhoro!"*); identifiers stay English.

## Subagents (.claude/agents/)

- `game-logic` — pure rules engine + tests (TDD).
- `realtime-sync` — Supabase schema, server actions, realtime/presence.
- `frontend-motion` — React components, Framer Motion, sound, haptics.
- `playtest-qa` — drives the running app to verify a full match.
