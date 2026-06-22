'use client';

import { play } from '@/lib/client/sound';
import { vibrate } from '@/lib/client/haptics';

export const REACTION_EMOJIS = ['😂', '😱', '🤔', '👑', '🚨', '🦹', '🔥', '💸'];

// Centralized emoji row. Sound/haptics fire locally; the flying emoji itself is
// rendered by ReactionsOverlay once the server echoes the reaction back to all
// clients (including the sender), so we don't spawn an optimistic local burst.
export function ReactionBar({
  onPick,
}: {
  onPick: (emoji: string) => void | Promise<unknown>;
}) {
  const fire = (emoji: string) => {
    play('tap');
    vibrate('tap');
    void onPick(emoji);
  };

  return (
    <div className="safe-px safe-pb pointer-events-none w-full pt-2">
      <div className="no-scrollbar pointer-events-auto mx-auto flex max-w-md items-center gap-1.5 overflow-x-auto rounded-full border-2 border-paper-50/25 bg-felt-800/70 px-2 py-1.5 backdrop-blur">
        {REACTION_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            aria-label={`React ${e}`}
            onClick={() => fire(e)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl transition-transform hover:scale-110 active:scale-90"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
