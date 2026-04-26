export class BedrockError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
  ) {
    super(message);
    this.name = 'BedrockError';
  }
}

export class TextractError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
  ) {
    super(message);
    this.name = 'TextractError';
  }
}

export class QuotaExceededError extends Error {
  constructor(public userId: string) {
    super(`AI quota exceeded for user ${userId}`);
    this.name = 'QuotaExceededError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
