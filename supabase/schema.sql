-- Chor Police — Postgres schema (DOCUMENTATION / DEFERRED).
--
-- This DDL is the target shape for the future SupabaseGameStore adapter. It is
-- NOT run automatically; the live backbone currently uses the in-memory
-- MemoryGameStore. See src/lib/server/store.ts (`// TODO: SupabaseGameStore`).
--
-- THE INVARIANT: rounds.assignments is SERVER-ONLY. RLS must forbid clients
-- from selecting it before reveal; only the server (service-role key) reads it
-- and projects each player's own role via the application's `viewFor`.

create extension if not exists "pgcrypto";

-- Match end mode.
do $$ begin
  create type match_mode as enum ('rounds', 'target');
exception when duplicate_object then null; end $$;

-- Room lifecycle status.
do $$ begin
  create type room_status as enum ('lobby', 'playing', 'finished');
exception when duplicate_object then null; end $$;

-- Round phase (mirrors the engine's Phase type, round-scoped subset).
do $$ begin
  create type round_phase as enum (
    'dealing', 'drawing', 'announce', 'guessing', 'reveal', 'scoring'
  );
exception when duplicate_object then null; end $$;

-- Roles (mirrors engine Role).
do $$ begin
  create type player_role as enum ('raja', 'mantri', 'sipahi', 'chor');
exception when duplicate_object then null; end $$;

create table if not exists rooms (
  id              uuid primary key default gen_random_uuid(),
  code            char(4) not null unique,        -- 4-char shareable code
  host_player_id  uuid,                            -- FK added after players exists
  status          room_status not null default 'lobby',
  mode            match_mode not null,
  mode_value      integer not null check (mode_value > 0),
  current_round   integer not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists players (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references rooms(id) on delete cascade,
  name         text not null,
  avatar       text not null,
  is_host      boolean not null default false,
  total_score  integer not null default 0,        -- running tally
  connected    boolean not null default true,     -- presence flag
  joined_at    timestamptz not null default now()
);

alter table rooms
  drop constraint if exists rooms_host_player_id_fkey;
alter table rooms
  add constraint rooms_host_player_id_fkey
  foreign key (host_player_id) references players(id) on delete set null;

create table if not exists rounds (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references rooms(id) on delete cascade,
  round_number  integer not null,
  phase         round_phase not null default 'dealing',
  -- SERVER-ONLY secret: {player_id: role}. Gated until phase = 'reveal'.
  assignments   jsonb not null,
  mantri_guess  uuid references players(id) on delete set null,
  guess_correct boolean,
  deltas        jsonb,                              -- {player_id: points}
  resolved_at   timestamptz,
  unique (room_id, round_number)
);

create table if not exists reactions (
  id             uuid primary key default gen_random_uuid(),
  round_id       uuid not null references rounds(id) on delete cascade,
  from_player_id uuid not null references players(id) on delete cascade,
  emoji          text not null,
  created_at     timestamptz not null default now()
);

create index if not exists players_room_idx   on players(room_id);
create index if not exists rounds_room_idx     on rounds(room_id);
create index if not exists reactions_round_idx on reactions(round_id);

-- ---------------------------------------------------------------------------
-- Row Level Security (the secret-role gate at the DB layer).
-- The server uses the service-role key (bypasses RLS) and is the ONLY reader
-- of rounds.assignments before reveal. Client policies below intentionally do
-- NOT grant select on rounds; clients receive gated views from the app server.
-- ---------------------------------------------------------------------------
alter table rooms      enable row level security;
alter table players    enable row level security;
alter table rounds     enable row level security;
alter table reactions  enable row level security;

-- Example permissive read policies for non-secret tables (refine per auth):
create policy rooms_read   on rooms      for select using (true);
create policy players_read on players    for select using (true);
-- NOTE: deliberately no client select policy on `rounds` — assignments must
-- never be readable by anon clients. Reads go through the server projection.
