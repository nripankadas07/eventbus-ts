/** Public type aliases. */

/**
 * EventMap is the (string-keyed) record of topic -> payload type.
 * The default `Record<string, unknown>` keeps the bus untyped; pass
 * a literal-keyed object/interface to get strong typing for known
 * topics while still allowing arbitrary string topics through the
 * untyped subscribe/publish overload.
 */
export type EventMap = Record<string, unknown>;

export type Handler<P> = (payload: P, topic: string) => void;

export interface SubscriptionHandle {
  readonly id: number;
  readonly pattern: string;
}

export interface DispatchErrorInfo<P = unknown> {
  readonly error: unknown;
  readonly topic: string;
  readonly pattern: string;
  readonly payload: P;
}

export type ErrorHandler = (info: DispatchErrorInfo) => void;
