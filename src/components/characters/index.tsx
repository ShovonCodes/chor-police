import type { Role } from '@/lib/game';
import { Babu } from './Babu';
import { Police } from './Police';
import { Dakat } from './Dakat';
import { Chor } from './Chor';
import type { CharacterProps } from './types';

export { Babu, Police, Dakat, Chor };
export { Face } from './Face';
export * from './types';

const BY_ROLE: Record<Role, (p: CharacterProps) => React.ReactNode> = {
  babu: Babu,
  police: Police,
  dakat: Dakat,
  chor: Chor,
};

export function CharacterByRole({ role, ...props }: { role: Role } & CharacterProps) {
  const Comp = BY_ROLE[role];
  return <Comp {...props} />;
}
