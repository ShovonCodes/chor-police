export class InvalidPlayersError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPlayersError';
  }
}

export class IllegalGuessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IllegalGuessError';
  }
}

export class InvalidTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTransitionError';
  }
}
