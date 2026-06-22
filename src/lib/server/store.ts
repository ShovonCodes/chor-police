import {
  advance,
  dealRoles,
  initMatch,
  type Action,
  type MatchMode,
  type MatchState,
  type Phase,
  type PlayerId,
  type Role,
  type RoundTarget,
} from '@/lib/game';

export interface Player {
  id: PlayerId;
  name: string;
  avatar: string;
  connected: boolean;
  isHost: boolean;
}

const REVEALED_PHASES: ReadonlySet<Phase> = new Set<Phase>([
  'reveal',
  'scoring',
  'podium',
]);

export function isRevealedPhase(phase: Phase): boolean {
  return REVEALED_PHASES.has(phase);
}

export interface ClientViewPlayer {
  id: PlayerId;
  name: string;
  avatar: string;
  connected: boolean;
  isHost: boolean;
}

export interface ClientView {
  code: string;
  phase: Phase;
  mode: MatchMode;
  modeValue: number;
  players: ClientViewPlayer[];
  me: PlayerId;
  myRole: Role | null;
  // How many players have looked at their chit this round (drawing phase).
  seenCount: number;
  totals: Record<PlayerId, number>;
  round: {
    roundNumber: number;
    target: RoundTarget;
    policeGuess: PlayerId | null;
    caught: boolean | null;
    deltas: Record<PlayerId, number> | null;
  } | null;
  // Secret-role gate: full player→role map is null until reveal/scoring/podium.
  assignments: Record<PlayerId, Role> | null;
  // Roles public mid-round (Babu/Police callout); Chor/Dakat stay hidden until reveal.
  publicRoles: Record<PlayerId, Role>;
  winners: PlayerId[] | null;
  canStart: boolean;
}

export type RoomListener = () => void;

export interface ReactionEvent {
  id: string;
  fromId: PlayerId;
  fromName: string;
  emoji: string;
}

export interface Room {
  code: string;
  players: Player[];
  match: MatchState;
}

export interface CreateRoomResult {
  code: string;
  hostId: PlayerId;
}

export interface JoinRoomResult {
  code: string;
  playerId: PlayerId;
}

export interface GameStore {
  createRoom(
    hostName: string,
    mode: MatchMode,
    modeValue: number,
  ): Promise<CreateRoomResult>;

  getRoom(code: string): Promise<Room | undefined>;

  joinRoom(code: string, name: string): Promise<JoinRoomResult>;

  advanceRoom(code: string, action: Action): Promise<Room>;

  addConnection(code: string, playerId: PlayerId): Promise<void>;

  removeConnection(code: string, playerId: PlayerId): Promise<void>;

  markDrawn(code: string, playerId: PlayerId): Promise<{ allDrawn: boolean }>;

  scheduleAnnounce(code: string, delayMs: number): void;

  scheduleScore(code: string, delayMs: number): void;

  subscribe(code: string, listener: RoomListener): () => void;

  subscribeReactions(
    code: string,
    fn: (r: ReactionEvent) => void,
  ): () => void;

  broadcastReaction(code: string, r: ReactionEvent): void;

  emitChange(code: string): void;

  viewFor(code: string, playerId: PlayerId): Promise<ClientView | undefined>;
}

// Unambiguous alphabet — no 0/O/1/I/L.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(rng: () => number): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  }
  return code;
}

const AVATARS = ['🦁', '🦊', '🐯', '🦉', '🐼', '🐸', '🦅', '🐢'];

let idCounter = 0;
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

let reactionCounter = 0;
export function newReactionId(): string {
  reactionCounter += 1;
  return `r_${reactionCounter}`;
}

interface RoomEntry {
  room: Room;
  listeners: Set<RoomListener>;
  reactionListeners: Set<(r: ReactionEvent) => void>;
  conns: Map<PlayerId, number>;
  drawn: Set<PlayerId>;
  announceArmed: boolean;
  scoreArmed: boolean;
}

export class MemoryGameStore implements GameStore {
  private readonly rooms = new Map<string, RoomEntry>();
  private readonly rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  async createRoom(
    hostName: string,
    mode: MatchMode,
    modeValue: number,
  ): Promise<CreateRoomResult> {
    let code = generateCode(this.rng);
    while (this.rooms.has(code)) code = generateCode(this.rng);

    const hostId = newId('p');
    const host: Player = {
      id: hostId,
      name: hostName,
      avatar: AVATARS[0],
      connected: true,
      isHost: true,
    };

    const match = initMatch({ players: [hostId], mode, modeValue });

    this.rooms.set(code, {
      room: { code, players: [host], match },
      listeners: new Set(),
      reactionListeners: new Set(),
      conns: new Map(),
      drawn: new Set(),
      announceArmed: false,
      scoreArmed: false,
    });
    return { code, hostId };
  }

  async getRoom(code: string): Promise<Room | undefined> {
    return this.rooms.get(code)?.room;
  }

  async joinRoom(code: string, name: string): Promise<JoinRoomResult> {
    const entry = this.requireEntry(code);
    const { room } = entry;
    if (room.match.phase !== 'lobby') {
      throw new StoreError('ROOM_IN_PROGRESS', 'Match already started.');
    }
    if (room.players.length >= 4) {
      throw new StoreError('ROOM_FULL', 'Room already has 4 players.');
    }
    const playerId = newId('p');
    room.players.push({
      id: playerId,
      name,
      avatar: AVATARS[room.players.length % AVATARS.length],
      connected: true,
      isHost: false,
    });
    this.notify(code);
    return { code, playerId };
  }

  async advanceRoom(code: string, action: Action): Promise<Room> {
    const entry = this.requireEntry(code);
    entry.room.match = advance(entry.room.match, action);
    if (action.type === 'START_DEAL') {
      entry.drawn.clear();
      entry.announceArmed = false;
      entry.scoreArmed = false;
    }
    this.notify(code);
    return entry.room;
  }

  // Tracks which players have viewed their chit this round; true once all have.
  async markDrawn(
    code: string,
    playerId: PlayerId,
  ): Promise<{ allDrawn: boolean }> {
    const entry = this.rooms.get(code);
    if (!entry) return { allDrawn: false };
    entry.drawn.add(playerId);
    const allDrawn = entry.room.players.every((p) => entry.drawn.has(p.id));
    return { allDrawn };
  }

  // Grace window: after everyone has looked, hold briefly (so the last player sees
  // their card) then advance drawing→announce. One-shot per round.
  scheduleAnnounce(code: string, delayMs: number): void {
    const entry = this.rooms.get(code);
    if (!entry || entry.announceArmed) return;
    entry.announceArmed = true;
    setTimeout(() => {
      const e = this.rooms.get(code);
      if (!e || !e.announceArmed) return;
      e.announceArmed = false;
      if (e.room.match.phase === 'drawing') {
        void this.advanceRoom(code, { type: 'ANNOUNCE' });
      }
    }, delayMs);
  }

  // Reveal dwell: after the guess flips the cards, hold so everyone reads the
  // outcome, then advance reveal→scoring. Host-independent; the host may skip sooner.
  scheduleScore(code: string, delayMs: number): void {
    const entry = this.rooms.get(code);
    if (!entry || entry.scoreArmed) return;
    entry.scoreArmed = true;
    setTimeout(() => {
      const e = this.rooms.get(code);
      if (!e || !e.scoreArmed) return;
      e.scoreArmed = false;
      if (e.room.match.phase === 'reveal') {
        void this.advanceRoom(code, { type: 'SCORE' });
      }
    }, delayMs);
  }

  // Presence is ref-counted: a player is connected while ≥1 live stream exists.
  // A stale connection closing must not knock a player with another live stream offline.
  async addConnection(code: string, playerId: PlayerId): Promise<void> {
    const entry = this.rooms.get(code);
    if (!entry) return;
    const next = (entry.conns.get(playerId) ?? 0) + 1;
    entry.conns.set(playerId, next);
    if (next === 1) this.setConnected(entry, playerId, true);
  }

  async removeConnection(code: string, playerId: PlayerId): Promise<void> {
    const entry = this.rooms.get(code);
    if (!entry) return;
    const next = (entry.conns.get(playerId) ?? 0) - 1;
    if (next <= 0) {
      entry.conns.delete(playerId);
      this.setConnected(entry, playerId, false);
    } else {
      entry.conns.set(playerId, next);
    }
  }

  private setConnected(
    entry: RoomEntry,
    playerId: PlayerId,
    connected: boolean,
  ): void {
    const player = entry.room.players.find((p) => p.id === playerId);
    if (!player || player.connected === connected) return;
    player.connected = connected;
    this.notify(entry.room.code);
  }

  subscribe(code: string, listener: RoomListener): () => void {
    const entry = this.rooms.get(code);
    if (!entry) return () => {};
    entry.listeners.add(listener);
    return () => {
      entry.listeners.delete(listener);
    };
  }

  subscribeReactions(
    code: string,
    fn: (r: ReactionEvent) => void,
  ): () => void {
    const entry = this.rooms.get(code);
    if (!entry) return () => {};
    entry.reactionListeners.add(fn);
    return () => {
      entry.reactionListeners.delete(fn);
    };
  }

  broadcastReaction(code: string, r: ReactionEvent): void {
    const entry = this.rooms.get(code);
    if (!entry) return;
    for (const fn of entry.reactionListeners) {
      try {
        fn(r);
      } catch {
        // A failing subscriber must not break others.
      }
    }
  }

  emitChange(code: string): void {
    this.notify(code);
  }

  async viewFor(
    code: string,
    playerId: PlayerId,
  ): Promise<ClientView | undefined> {
    const entry = this.rooms.get(code);
    if (!entry) return undefined;
    const { room } = entry;
    const { match } = room;
    const round = match.currentRound;
    const revealed = isRevealedPhase(match.phase);

    // Secret-role gate: hidden roles must not leak before reveal — expose only
    // the player's own role until the reveal phase releases the full map.
    const myRole: Role | null = round?.assignments[playerId] ?? null;
    const assignments: Record<PlayerId, Role> | null =
      revealed && round ? { ...round.assignments } : null;

    let publicRoles: Record<PlayerId, Role> = {};
    if (round) {
      if (revealed) {
        publicRoles = { ...round.assignments };
      } else if (match.phase === 'announce' || match.phase === 'guessing') {
        for (const [pid, role] of Object.entries(round.assignments)) {
          if (role === 'babu' || role === 'police') publicRoles[pid] = role;
        }
      }
    }

    return {
      code: room.code,
      phase: match.phase,
      mode: match.mode,
      modeValue: match.modeValue,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        connected: p.connected,
        isHost: p.isHost,
      })),
      me: playerId,
      myRole,
      seenCount: entry.drawn.size,
      totals: { ...match.totals },
      round: round
        ? {
            roundNumber: round.roundNumber,
            target: round.target,
            policeGuess: round.policeGuess,
            caught: round.caught,
            deltas: round.deltas ? { ...round.deltas } : null,
          }
        : null,
      assignments,
      publicRoles,
      winners: match.winners,
      canStart:
        match.phase === 'lobby' &&
        room.players.length === 4 &&
        room.players.every((p) => p.connected),
    };
  }

  dealAssignments(playerIds: PlayerId[]) {
    return dealRoles(playerIds, this.rng);
  }

  // Rebuild the match with the final seated roster (createRoom only knew the host).
  seatPlayers(code: string): Room {
    const entry = this.requireEntry(code);
    const { room } = entry;
    const ids = room.players.map((p) => p.id);
    room.match = initMatch({
      players: ids,
      mode: room.match.mode,
      modeValue: room.match.modeValue,
    });
    return room;
  }

  private requireEntry(code: string): RoomEntry {
    const entry = this.rooms.get(code);
    if (!entry) throw new StoreError('ROOM_NOT_FOUND', 'Room not found.');
    return entry;
  }

  private notify(code: string): void {
    const entry = this.rooms.get(code);
    if (!entry) return;
    for (const listener of entry.listeners) {
      try {
        listener();
      } catch {
        // A failing subscriber must not break others.
      }
    }
  }
}

export class StoreError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'StoreError';
  }
}

// Stashed on globalThis so room state survives Next dev hot reloads.
// TODO: SupabaseGameStore — swap for a GameStore impl backed by Supabase when configured.
const globalForStore = globalThis as unknown as {
  __chorPoliceStore?: MemoryGameStore;
};

export const gameStore: GameStore & MemoryGameStore =
  globalForStore.__chorPoliceStore ??
  (globalForStore.__chorPoliceStore = new MemoryGameStore());
