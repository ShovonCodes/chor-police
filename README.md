# Chor Police 🎴

**Real-time, 4-player web remake of the Bangladeshi party classic — _Chor Police_ (বাবু · পুলিশ · ডাকাত · চোর).** 🇧🇩
Spin up a private room 🏠, share a 4-letter code with three friends 👯, draw your secret chit 🤫, and find out: can the Police catch the thief? 🚨

![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)
![Tests](https://img.shields.io/badge/tests-26%20passing-128f88)
![License](https://img.shields.io/badge/license-MIT-f4a01c)
[![Play live](https://img.shields.io/badge/▶_play-chorpolice.fun-e2483a)](https://chorpolice.fun)

### ▶️ Play now → **[chorpolice.fun](https://chorpolice.fun)** 🎉

> No signup. No installs. Just a link, four friends, and one sneaky thief — the playground game, online. 🎮

---

## ✨ Features

- 🔒 **Private rooms** — host creates a room, shares a 4-char code/link; no accounts.
- 🃏 **Secret roles, server-enforced** — your chit is yours alone until the reveal. Roles never reach other clients early (no devtools cheating 🕵️).
- 🎯 **Rotating hunt** — each round the Police must catch the **Chor** or the **Dakat**; the target alternates and the scoreboard follows.
- 🤖 **Play with bots** — short of four? The host fills empty seats with bots that draw, guess, and score like real players (on a natural delay), so 1–3 friends can still play a full match. Remove a bot anytime to free a seat for a late arrival.
- 🎴 **Animated chits** — folded-paper shuffle 🔀, tap-to-unfold, and a synchronized flip-open reveal.
- 🥁 **Dramatic reveal** — drumroll, then 🎉 confetti on a catch or 😈 escape-rain on a miss, with a plain-language recap.
- 😂 **Live emoji reactions** — broadcast to everyone in the room, flying across the table.
- 🏆 **Live leaderboard & podium** — animated score tallies and an Olympic-style 🥇🥈🥉 podium.
- 📤 **Shareable results** — export the final standings as a story-ready image and share it anywhere (Web Share); pasted links unfurl a branded preview.
- 🔊 **Sound + haptics** — synthesized cues and vibration 📳, fully muteable.
- 📱 **Mobile-first** — built for iOS/Android browsers: dynamic-viewport layout, safe-area aware, no horizontal scroll.
- 🪔 **Bangla flavor** — _"পুলিশ, চোর ধরো!"_ throughout, English-friendly.

## 🎲 The game

Four players, one of each role:

| Role | বাংলা | Points | Plays? |
|------|-------|:------:|--------|
| 👑 **Babu** | বাবু | 1000 | Passive — always 1000 |
| 👮 **Police** | পুলিশ | 800 | The catcher |
| 🗡️ **Dakat** | ডাকাত | 600 | Hidden outlaw |
| 🦝 **Chor** | চোর | 400 | Hidden outlaw |

Each round the Police must catch a **target** — the Chor or the Dakat (random first round, then strictly alternating 🔄). Babu and Police are public at the guess; the Chor and Dakat stay hidden, and the Police picks which of the two is the target.

**🧮 Per-round scoring**
- 👑 **Babu** — always **1000**.
- 👮 **Police** — **800** if it catches the target, else **0**.
- 🎯 **Target outlaw** — **0** if caught, else its number (Chor 400 / Dakat 600).
- 🪙 **Other outlaw** — always its number, no deduction.

Running tally across rounds. The host sets the match to a fixed number of **rounds** or a **target score**; highest total wins. 🏅

## 🧱 How it works

The server is authoritative and **roles are secret** 🔐. Clients only ever receive their own role until the reveal phase — the secret never crosses the wire early.

```
┌─────────────┐   server actions (create/draw/guess/…)   ┌────────────────────┐
│  Next.js    │ ───────────────────────────────────────▶ │  Game engine        │
│  (browser)  │                                           │  (authoritative)    │
│             │ ◀─────────────────────────────────────── │  secret-role gate   │
└─────────────┘   only YOUR role until reveal             └─────────┬──────────┘
       ▲                                                             │
       │  live push (phase changed → refetch, presence, reactions)   │
       └─────────────────────────────────────────────────────────────┘
                       authoritative game state
```

- 🧠 **`src/lib/game/`** — a pure, fully-tested rules engine (no I/O, no React). All scoring and state transitions live here.
- 🗄️ **`src/lib/server/`** — an authoritative in-memory store that drives every decision through the engine and gates secret roles. It also runs the server-side bot driver, reclaims idle rooms, and logs key events to stdout (`[cp:event]` / `[cp:metrics]`) for observability.
- 📡 **Transport** — per-client **Server-Sent Events**: each connection only ever receives its own gated view, plus presence and reactions.
- 🧩 **`src/lib/supabase/`** — a deferred Postgres/Realtime adapter behind the same `GameStore` interface, for scaled/serverless deployment (see [Deployment](#️-deployment)).

## 🛠️ Tech stack

⚡ Next.js 16 (App Router, Server Actions) · ⚛️ React 19 · 🟦 TypeScript · 🎨 Tailwind CSS v4 · 🎞️ Motion (Framer Motion) · 🔉 Howler / Web Audio · 🎊 canvas-confetti · ✅ Vitest.

## 🚀 Getting started

**Prerequisites:** Node.js 22+. 🟢

```bash
git clone git@github.com:ShovonCodes/chor-police.git
cd chor-police
npm install
npm run dev
```

Open http://localhost:3000 🌐. A `.env.local` ships with dummy Supabase keys — the app runs fully on the in-memory backend without any real keys.

📲 **Play with friends on the same network:** open the printed Network URL (e.g. `http://192.168.x.x:3000`) on each phone. That LAN host is allowlisted in `next.config.ts` (`allowedDevOrigins`) — add yours if it differs.

```bash
npm run dev     # 🔧 dev server
npm run build   # 📦 production build
npm run start   # ▶️  serve the build
npm test        # ✅ game-engine unit tests (Vitest)
npm run lint    # 🧹 eslint
```

## 📁 Project structure

```
src/
├─ app/                 # 🧭 routes, server actions, SSE stream, layout
│  ├─ actions.ts        #    authoritative mutations
│  └─ api/rooms/[code]/stream/   # 📡 per-client SSE
├─ components/          # 🎨 screens, brand marks, SVG characters
└─ lib/
   ├─ game/             # 🧠 pure rules engine (Vitest-tested)
   ├─ server/           # 🗄️ in-memory store, bot driver, metrics, idle eviction
   ├─ client/           # 🪝 realtime hook, sound, haptics
   └─ supabase/         # 🧩 deferred adapter (not wired)
supabase/schema.sql     # 🗃️ deferred Postgres DDL
```

## ☁️ Deployment

**Live at [chorpolice.fun](https://chorpolice.fun)** 🌐 — deployed on **Render** (single always-on instance) behind a custom domain (DNS at Hostinger: apex `A → 216.24.57.1`, `www` `CNAME → *.onrender.com`).

The backend keeps room state **in memory in a single Node process** with long-lived SSE connections. That means:

- ✅ **Single always-on host** (Render, Railway, Fly, a VPS — one `next start` instance): works as-is. _Caveat: in-progress games reset on redeploy/restart; idle rooms are auto-reclaimed._
- ⚠️ **Vercel / serverless / multi-instance:** not supported as-is — separate instances don't share the in-memory state and SSE connections get cut by function timeouts. For that, wire the deferred **Supabase** backend (Postgres for shared state + Supabase Realtime for push) via the existing `GameStore` interface and `supabase/schema.sql`.

**Useful env vars:** `NEXT_PUBLIC_SITE_URL` (canonical/OG/share URL — set to `https://chorpolice.fun`), `CP_ROOM_TTL_MS` / `CP_SWEEP_INTERVAL_MS` (idle-room eviction), `CP_METRICS_INTERVAL_MS` (metrics cadence).

## 🗺️ Roadmap

- [ ] 🧩 `SupabaseGameStore` — Postgres + Realtime for Vercel/scaled multiplayer
- [ ] 👤 Persistent accounts, stats & leaderboards
- [ ] 🎨 Commissioned character art & a curated sound pack
- [ ] 👀 Spectator mode

## 📄 License

[MIT](LICENSE) © Shovon

---

<sub>Built as a nostalgic, slick take on the chits-and-pencil classic. পুলিশ, চোর ধরো! 🚨</sub>
