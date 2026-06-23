# Continue with Bots — Design

**Date:** 2026-06-23
**Status:** Approved, ready for implementation plan

## Problem

A match needs exactly 4 players. When friends are short, the host can't start.
"Continue with bots" lets the host fill empty seats with bots so a 1–3 human group
can still play. Bots act as normal players — dealt roles, earn points, appear on the
leaderboard/podium — and play autonomously on a natural delay so they don't read as
obviously robotic.

## Decisions (locked)

- **Entry:** lobby-fill only. Host adds bots in the lobby before starting; bots stay
  for the whole match. No mid-match dropout replacement.
- **Disguise:** fully disguised. Human-like names, normal avatars, no bot badge in any
  match screen.
- **Police skill:** fair 50/50. A bot Police guesses randomly between the two hidden
  suspects; it never consults server-side role knowledge. Preserves the secret-role
  invariant; bots can't cheat.
- **Reactions:** none. Bots draw and (if Police) guess. Nothing else.

## Non-goals

- No mid-match seat replacement when a human disconnects.
- No bot difficulty levels or smart play.
- No bot emoji reactions or chatter.
- No game-engine (`src/lib/game/`) changes — bots add zero scoring/state-machine math.

## Architecture

The server is authoritative and runs in a single Node process. Bots are driven entirely
server-side via `setTimeout`, reusing the existing one-shot "armed flag" timer pattern
(`scheduleAnnounce` / `scheduleScore`). Bots have no client and no SSE stream, so the
secret-role gate (`viewFor` is per-player; a bot's view is never sent anywhere) is
untouched.

> Single-process constraint: this confirms the app must run as a single always-on
> instance (Render single instance), not serverless/multi-instance.

### Data model (`src/lib/server/store.ts`)

- `Player` gains `isBot: boolean` (humans `false`).
- Bots are created with `connected: true` permanently. They never get an SSE stream, so
  the presence ref-counter (`addConnection`/`removeConnection`) never touches them, and
  `canStart` (requires all players connected) is satisfied.
- `ClientViewPlayer` gains `isBot: boolean`, exposed for lobby management only. Match
  screens ignore it. It is not role-secret, so exposing it is acceptable (a devtools
  peek revealing "this seat is a bot" is harmless for a party game).
- Bot names: a pool of human first names (e.g. Rafi, Tania, Nadia, Hasan, Mim, Arif,
  Sakib, Priya). On add, pick the first name not already used in the room; assign the
  next avatar from the existing `AVATARS` set. Bot ids use a distinct prefix (e.g.
  `newId('b')`).
- `RoomEntry` gains:
  - `botDrawScheduled: Set<PlayerId>` — bots with a pending draw timer this round.
  - `botGuessArmed: boolean` — whether the bot-Police guess timer is armed this round.
  - Both reset on `START_DEAL`, alongside the existing `drawn` / `announceArmed` /
    `scoreArmed` reset.

### Lobby management (`store.ts` + `src/app/actions.ts`)

Two host-only, lobby-only operations:

- `addBot(code, hostId)`:
  - Validate: room exists, actor is host, phase is `lobby`, `players.length < 4`.
  - Append a bot player (`isBot: true`, `connected: true`, unused human name, next
    avatar). Notify.
- `removeBot(code, hostId, botId)`:
  - Validate: room exists, actor is host, phase is `lobby`, target exists and `isBot`.
  - Remove from `players`. Notify.

`canStart` is unchanged (4 players, all connected). `seatPlayers` already rebuilds the
match from the full roster, so bots are included automatically.

### Bot driver (`store.ts`)

A private `scheduleBots(code)` called at the end of `advanceRoom` (covers every phase
transition). It inspects the current phase and arms bot timers idempotently:

- **`drawing`** — for each bot not in `drawn` and not in `botDrawScheduled`: add to
  `botDrawScheduled`, set a timer with a randomized human-like delay (~1500–3500 ms,
  jittered per bot). On fire: re-check phase is still `drawing`, call `markDrawn(botId)`,
  `emitChange`. When `allDrawn`, call `scheduleAnnounce(code, 2000)` (same path as the
  human action).
- **`announce`** — find the Police seat. If it is a bot and `botGuessArmed` is false:
  set `botGuessArmed = true`, set a timer (~2000–5000 ms). On fire: re-check phase is
  `announce` and `policeGuess` is null, pick a random target uniformly among the two
  hidden seats (assignments `chor` / `dakat`), then `advanceRoom(GUESS)` →
  `advanceRoom(REVEAL)` → `scheduleScore(code, 6000)` (same path as `submitGuess`).
- **`reveal` → `scoring`** — already auto-advances host-independently via `scheduleScore`.
- **`scoring` → next round** — stays host-driven (`advancePhase('next')` requires host).
  In lobby-fill the host is always a present human, so no stall.

Recursion safety: `scheduleBots` is called from `advanceRoom`, and bot timers call
`advanceRoom` again. The armed flags + per-fire phase re-checks prevent double-scheduling
and stale firing, exactly as the existing announce/score timers do.

Randomness: bot delays and the 50/50 pick use `Math.random` (server runtime; not a
workflow script). Per-bot jitter on draws prevents lockstep behavior.

### Fairness / secret-role invariant

The bot Police selects among the two seats whose role is `chor` or `dakat` and picks one
at random. It does not read which of the two is the round's target. `scoreRound` then
validates the guess as it would for a human. No role data crosses to any client; bots
never produce a `viewFor` payload.

### UI (`src/components/Lobby.tsx` + `src/lib/client/useRoom.ts`)

- `useRoom` gains `addBot()` and `removeBot(botId)` wrappers, mirroring the existing
  action wrappers (`startMatch`, `markSeen`, …) — calling the new server actions with
  `code` + stored player id.
- `Lobby` (host view only): empty seats show a "➕ Add bot" affordance; bot seats show a
  small "✕" to remove. Non-hosts see normal seats with no bot indicator.

## Testing

No new unit tests. Bots introduce no game-logic math — all scoring/state transitions
remain in `src/lib/game/` unchanged and already covered. Per project convention, tests
are only for game-logic math. Manual playtest: start a match with 1–3 humans + bots,
confirm bots draw, a bot Police guesses on a delay, scoring/podium include bots.

## Files touched

- `src/lib/server/store.ts` — `isBot` on `Player`/`ClientViewPlayer`, `RoomEntry` bot
  flags, `addBot`/`removeBot`, `scheduleBots` driver, `scheduleBots` call in
  `advanceRoom`, bot-flag reset on `START_DEAL`, bot-name pool, bot id prefix.
- `src/app/actions.ts` — `addBot`, `removeBot` server actions (host + lobby validation).
- `src/lib/client/useRoom.ts` — `addBot` / `removeBot` wrappers + interface entries.
- `src/components/Lobby.tsx` — host add/remove bot UI.
