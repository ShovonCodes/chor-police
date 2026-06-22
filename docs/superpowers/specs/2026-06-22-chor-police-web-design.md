# Chor Police (Babu · Police · Dakat · Chor) — Web Edition

**Date:** 2026-06-22
**Status:** Design approved, pending spec review

A web version of the Bangladeshi 4-player game *Chor Police* (Babu, Police, Dakat,
Chor). Private rooms, real-time play, designed to be slick, playful, and
nostalgic. v1 scope: one host creates a private group, shares a code/link, three
friends join, they play a match.

---

## 1. Goals & Non-Goals

**Goals**
- Exactly 4 players per match, real-time, low-friction (no signup).
- Faithful to the traditional rules, with a polished, fun, modern feel.
- Free to host (Vercel + Supabase free tiers).
- Server-authoritative so secret roles cannot be cheated.

**Non-Goals (v1)**
- User accounts / persistent profiles / cross-session stats.
- Public matchmaking, spectators, >4 players, AI opponents.
- Mobile native apps (responsive web only).

---

## 2. Architecture

Server-authoritative model. The server owns the truth (who holds which chit) and
reveals only what each player is allowed to see.

```
┌─────────────┐   server actions / route handlers   ┌──────────────────┐
│  Next.js    │ ──────────────────────────────────▶ │  Game engine     │
│  (browser)  │   (draw chit, submit guess, etc.)    │  (server, authz) │
│             │ ◀────────────────────────────────── │                  │
└─────────────┘   only YOUR role until reveal        └────────┬─────────┘
       ▲                                                       │
       │  Supabase Realtime (push: state changes, presence)    │
       └───────────────────────────────────────────────────────┘
                          Supabase Postgres (rooms, players, rounds, scores)
```

- **Next.js (App Router)** — UI plus authoritative game logic in server actions.
  Server decides role assignment, validates guesses, computes scores.
- **Supabase Postgres** — persists rooms, players, rounds, scores. Survives
  refresh/reconnect.
- **Supabase Realtime** — pure push channel. Broadcasts "state changed → refetch"
  events and presence (who is online/joined). Never carries secret role data.
- **Deploy** — Vercel (app) + Supabase (db/realtime), both free tier.

**Security rule:** the assignments map (player → role) is server-only. During
drawing→guessing the server returns only the requesting player's own role. The
full map is released only at the REVEAL phase. Realtime messages never contain
assignments.

---

## 3. Game Flow (state machine)

The room moves through phases; the server enforces transitions.

```
LOBBY ──(4 joined, host starts)──▶ DEALING ──▶ DRAWING ──▶ ANNOUNCE ──▶ GUESSING ──▶ REVEAL ──▶ SCORING
  ▲                                                                                                  │
  └──────────────── next round (if rounds left / target not hit) ◀────────────────────────────────┘
                                              │
                                     (match over) ──▶ PODIUM
```

- **LOBBY** — host creates room → 4-char code + share link. Players join with a
  display name; avatars auto-assigned. Host sets match mode + value. "Start"
  unlocks once 4 players are present.
- **DEALING** — server shuffles and secretly assigns the four roles. Chit-shuffle
  animation plays for everyone.
- **DRAWING** — each player taps to unfold their chit and sees only their own role.
- **ANNOUNCE** — Babu + Police are auto-revealed to the table; the call-out names the
  round's target ("Police, catch the Chor!" or "…the Dakat!").
- **GUESSING** — the Police picks which of the **two unrevealed players** (Chor / Dakat)
  is the round's target role. Other players fire reactions/taunts.
- **REVEAL** — all chits flip simultaneously. Big moment with sound.
- **SCORING** — apply scoring rules (section 4), animate the score tally.
- **PODIUM** — when the match ends, a ranked celebration crowns the winner.

**Mechanic decision:** the Police guesses only between the two unrevealed players
(Chor/Dakat), since Babu and Police are already known.

**Round target rotation:** each round the Police must catch a specific target —
`chor` or `dakat`. The first round's target is chosen at random; it then strictly
alternates every round (…Chor, Dakat, Chor, Dakat…).

---

## 4. Characters & Scoring

Four roles, one per player:

| Role   | Bangla | Number | Acts? |
|--------|--------|--------|-------|
| Babu   | বাবু   | 1000 (fixed) | No — passive, always 1000 |
| Police | পুলিশ  | 800    | Yes — catches the round's target |
| Dakat  | ডাকাত  | 600    | No (hidden until reveal) |
| Chor   | চোর    | 400    | No (hidden until reveal) |

Per-round resolution (let *target* = the role the Police must catch this round):

- **Babu**: always 1000.
- **Police**: 800 if it catches the target (points at the player holding the target
  role), else 0.
- **Target outlaw**: 0 if caught, else his number (Chor 400 / Dakat 600).
- **Non-target outlaw**: always his number (Chor 400 / Dakat 600) — no deduction.

Worked examples:
- *Catch-Chor round, Police correct:* Babu 1000, Police 800, Chor 0, Dakat 600.
- *Catch-Chor round, Police wrong:* Babu 1000, Police 0, Chor 400, Dakat 600.
- *Catch-Dakat round, Police correct:* Babu 1000, Police 800, Dakat 0, Chor 400.
- *Catch-Dakat round, Police wrong:* Babu 1000, Police 0, Dakat 600, Chor 400.

A running tally persists across rounds.

**Match end** — host chooses at room creation, with a sensible default pre-filled:
- `rounds` mode — play a fixed number of rounds (default e.g. 7).
- `target` mode — play until a player reaches a target score (e.g. 5000).

When the end condition is met, the room transitions to PODIUM; highest total wins.

---

## 5. Data Model (Supabase Postgres)

```
rooms
  id (uuid)
  code            -- 4-char, unique, shareable
  host_player_id
  status          -- lobby | playing | finished
  mode            -- 'rounds' | 'target'
  mode_value      -- e.g. 7 rounds, or 5000 target
  current_round   -- int
  created_at

players
  id (uuid)
  room_id
  name
  avatar          -- auto-assigned
  is_host
  total_score     -- running tally
  connected       -- presence flag
  joined_at

rounds
  id (uuid)
  room_id
  round_number
  phase           -- dealing | drawing | announce | guessing | reveal | scoring
  target          -- 'chor' | 'dakat'  (who the Police must catch this round)
  assignments     -- {player_id: role}  SERVER-ONLY, gated until reveal
  police_guess    -- player_id the Police pointed at
  caught          -- bool (did the Police catch the target?)
  resolved_at

reactions          -- ephemeral; persistence optional
  round_id, from_player_id, emoji, created_at
```

- `rounds.assignments` is the secret. The server returns only the requesting
  player's own role during drawing→guessing; the full map is released at REVEAL.
- **Reconnect:** a player rejoins by code; the server restores their view from
  Postgres.

---

## 6. Fun Layer & Assets

All four fun elements are in v1:

- **Chit draw + reveal** — folded-paper chits shuffle, fly to seats, tap-to-unfold
  flip, synchronized all-flip at REVEAL. Spring physics (Framer Motion).
- **Character art + personality** — four illustrated characters (Babu regal, Police
  alert, Dakat fierce, Chor sneaky) with reaction states (win/lose/caught).
  Bengali flavor in copy; role names in Bangla script + roman.
- **Reactions & taunts** — emoji/sticker burst players fire during GUESSING,
  animated across screen, broadcast via Realtime.
- **Sound + haptics + score drama** — drumroll on guess, win/lose stings, reveal
  whoosh, animated count-up tallies, confetti podium. Haptics via
  `navigator.vibrate` on mobile.

**Asset plan**

| Asset                         | Plan |
|-------------------------------|------|
| Character art (4 + reactions) | Build/ship with self-made **SVG placeholders**. Real art swapped in later (user-provided or refined). |
| Sound effects                 | Source CC0/royalty-free or generated; user can swap favorites. |
| Fonts                         | Google Fonts — Bangla-capable display face (e.g. Hind Siliguri / Baloo Da) + clean Latin. |

Decision: v1 builds entirely with self-made placeholders and is fully playable;
polished art/sound are upgraded later without blocking.

---

## 7. Tech Stack Summary

- **Framework:** Next.js (App Router), server actions for authoritative logic.
- **DB + realtime:** Supabase (Postgres, Realtime, Presence).
- **Animation:** Framer Motion (or equivalent).
- **Styling:** Tailwind CSS.
- **Audio:** Howler.js or native Web Audio.
- **Hosting:** Vercel + Supabase, free tier.

---

## 8. Open Questions / Future

- Real character art and curated sound pack (post-v1).
- Accounts + persistent stats/leaderboards (data model leaves room for this).
- Rejoin grace window / handling a player who abandons mid-match.
