/** Error hierarchy for eventbus-ts. */

export class EventBusError extends Error {
  public override readonly name: string = "EventBusError";

  public constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidTopicError extends EventBusError {
  public override readonly name = "InvalidTopicError";
  public readonly topic: string;

  public constructor(topic: string, reason: string) {
    super(`Invalid topic ${JSON.stringify(topic)}: ${reason}`);
    this.topic = topic;
  }
}

export class InvalidPatternError extends EventBusError {
  public override readonly name = "InvalidPatternError";
  public readonly pattern: string;

  public constructor(pattern: string, reason: string) {
    super(`Invalid pattern ${JSON.stringify(pattern)}: ${reason}`);
    this.pattern = pattern;
  }
}
