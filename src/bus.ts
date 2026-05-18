/** EventBus implementation. */

import { match, validatePattern, validateTopic } from "./topic";
import type {
  ErrorHandler,
  EventMap,
  Handler,
  SubscriptionHandle,
} from "./types";

interface Subscription {
  readonly id: number;
  readonly pattern: string;
  readonly patternSegments: readonly string[];
  // Use `any` here only because TypeScript's strict parameter-bivariance
  // rules block `Handler<unknown>` from accepting `Handler<T>` callers.
  // The cast happens once at registration; callers see precise types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly handler: Handler<any>;
  readonly once: boolean;
}

export interface EventBusOptions {
  readonly onError?: ErrorHandler;
}

export class EventBus<TMap = EventMap> {
  private readonly _subscriptions: Map<number, Subscription> = new Map();
  private _nextId = 1;
  private readonly _onError: ErrorHandler | undefined;

  public constructor(options: EventBusOptions = {}) {
    this._onError = options.onError;
  }

  /** Subscribe a handler to a topic pattern. */
  public subscribe<K extends keyof TMap & string>(
    pattern: K,
    handler: Handler<TMap[K]>,
  ): SubscriptionHandle;
  public subscribe(
    pattern: string,
    handler: Handler<unknown>,
  ): SubscriptionHandle;
  public subscribe(
    pattern: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: Handler<any>,
  ): SubscriptionHandle {
    return this._addSubscription(pattern, handler, false);
  }

  /** Subscribe a handler that auto-unsubscribes after the first match. */
  public subscribeOnce<K extends keyof TMap & string>(
    pattern: K,
    handler: Handler<TMap[K]>,
  ): SubscriptionHandle;
  public subscribeOnce(
    pattern: string,
    handler: Handler<unknown>,
  ): SubscriptionHandle;
  public subscribeOnce(
    pattern: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: Handler<any>,
  ): SubscriptionHandle {
    return this._addSubscription(pattern, handler, true);
  }

  /** Publish a payload to a topic. Validates the topic, then dispatches. */
  public publish<K extends keyof TMap & string>(topic: K, payload: TMap[K]): void;
  public publish(topic: string, payload: unknown): void;
  public publish(topic: string, payload: unknown): void {
    validateTopic(topic);
    const snapshot = Array.from(this._subscriptions.values());
    for (const subscription of snapshot) {
      if (!this._subscriptions.has(subscription.id)) continue;
      if (!match(subscription.pattern, topic)) continue;
      this._invokeHandler(subscription, topic, payload);
    }
  }

  /** Remove a subscription by handle or numeric id. */
  public unsubscribe(handleOrId: SubscriptionHandle | number): boolean {
    const id = typeof handleOrId === "number" ? handleOrId : handleOrId.id;
    return this._subscriptions.delete(id);
  }

  /** Remove all subscriptions. */
  public clear(): void {
    this._subscriptions.clear();
  }

  /**
   * Count subscriptions. With no argument, returns the total. With a topic,
   * returns the number of patterns that would match the topic.
   */
  public subscriberCount(topic?: string): number {
    if (topic === undefined) return this._subscriptions.size;
    validateTopic(topic);
    let count = 0;
    for (const subscription of this._subscriptions.values()) {
      if (match(subscription.pattern, topic)) count += 1;
    }
    return count;
  }

  private _addSubscription(
    pattern: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: Handler<any>,
    once: boolean,
  ): SubscriptionHandle {
    if (typeof handler !== "function") {
      throw new TypeError("handler must be a function");
    }
    const segments = validatePattern(pattern);
    const id = this._nextId;
    this._nextId += 1;
    const subscription: Subscription = {
      id,
      pattern,
      patternSegments: segments,
      handler,
      once,
    };
    this._subscriptions.set(id, subscription);
    return { id, pattern };
  }

  private _invokeHandler(
    subscription: Subscription,
    topic: string,
    payload: unknown,
  ): void {
    if (subscription.once) this._subscriptions.delete(subscription.id);
    try {
      subscription.handler(payload, topic);
    } catch (error) {
      this._reportError(error, subscription, topic, payload);
    }
  }

  private _reportError(
    error: unknown,
    subscription: Subscription,
    topic: string,
    payload: unknown,
  ): void {
    if (this._onError === undefined) return;
    try {
      this._onError({
        error,
        topic,
        pattern: subscription.pattern,
        payload,
      });
    } catch {
      /* the error handler itself threw — swallow to keep dispatch alive */
    }
  }
}
