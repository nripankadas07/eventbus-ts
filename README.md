# eventbus-ts

[![Tests](https://img.shields.io/badge/tests-78%20passing-brightgreen)](#running-tests)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](#running-tests)
[![Type](https://img.shields.io/badge/typed-strict-blue)](#running-tests)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Type-safe pub-sub bus with dotted topics and `*`, `**`, `?` glob
subscriptions. Zero runtime dependencies.

```typescript
import { EventBus } from "eventbus-ts";

interface AppEvents {
  "user.created": { id: string };
  "user.deleted": { id: string; reason: string };
  "chat.message": { roomId: string; text: string };
}

const bus = new EventBus<AppEvents>();

bus.subscribe("user.*", (payload, topic) => {
  console.log(topic, payload);
});

bus.subscribe("**", (_payload, topic) => {
  console.log("any event:", topic);
});

bus.publish("user.created", { id: "u1" });
// "user.created" { id: "u1" }
// "any event: user.created"
```

`eventbus-ts` differs from a typical typed event emitter (e.g.
[`emitter-ts`](https://github.com/nripankadas07/emitter-ts) sibling
package) by treating each event as a hierarchical *topic* — subscribers
can match topics with glob wildcards instead of binding to a single
event name. Topic semantics scale up to large message-style buses
without per-event boilerplate.

## Install

```bash
npm install eventbus-ts
# or
yarn add eventbus-ts
# or
pnpm add eventbus-ts
```

Requires Node 18+.

## Topic / pattern grammar

| Construct       | Meaning                                                  |
|-----------------|----------------------------------------------------------|
| `user.created`  | Exact match (must equal the published topic).            |
| `user.*`        | Matches exactly one segment in that position.            |
| `user.**`       | Matches **zero or more** segments (incl. trailing none). |
| `user.?reated`  | `?` matches a single character within a segment.         |
| `**`            | Match anything (root-level catch-all).                   |
| `user.**.message` | `**` may appear in the middle of a pattern.            |

Topics are dotted ASCII identifiers (`[A-Za-z_][A-Za-z0-9_]*` per
segment, plus pure-numeric segments like `chat.42.message`). Empty
topics, leading/trailing `.`, or `..` are rejected with
`InvalidTopicError`.

## API

```typescript
class EventBus<TMap = Record<string, unknown>> {
  constructor(options?: { onError?: (info: DispatchErrorInfo) => void });

  subscribe<K extends keyof TMap & string>(
    pattern: K, handler: Handler<TMap[K]>): SubscriptionHandle;
  subscribe(pattern: string, handler: Handler<unknown>): SubscriptionHandle;

  subscribeOnce<K extends keyof TMap & string>(
    pattern: K, handler: Handler<TMap[K]>): SubscriptionHandle;
  subscribeOnce(pattern: string, handler: Handler<unknown>): SubscriptionHandle;

  publish<K extends keyof TMap & string>(topic: K, payload: TMap[K]): void;
  publish(topic: string, payload: unknown): void;

  unsubscribe(handle: SubscriptionHandle | number): boolean;
  clear(): void;
  subscriberCount(topic?: string): number;
}

function match(pattern: string, topic: string): boolean;
function validateTopic(topic: string): readonly string[];
function validatePattern(pattern: string): readonly string[];
```

### Type-safe vs untyped subscriptions

When the pattern is a **literal key** of the `TMap` parameter, the
handler payload is precisely typed. Wildcard patterns fall through to
the untyped overload (`payload: unknown`) — narrow with a type guard
or cast, since the bus cannot statically know which concrete event
matches.

```typescript
const bus = new EventBus<AppEvents>();

bus.subscribe("user.created", ({ id }) => {});  // id: string

bus.subscribe("user.*", (payload) => {
  // payload: unknown — narrow before use
});
```

### Handler errors

A throwing handler does not break dispatch. Subsequent handlers still
run. If `onError` is supplied to the constructor, it receives one
`DispatchErrorInfo` per failed handler:

```typescript
const bus = new EventBus({
  onError: ({ error, topic, pattern, payload }) => {
    console.error("handler failed:", { error, topic, pattern, payload });
  },
});
```

If the `onError` callback itself throws, the failure is swallowed so
that the dispatch loop can continue.

### Subscribe-once

```typescript
bus.subscribeOnce("user.created", (payload) => {
  console.log("first user:", payload.id);
});
```

The handler unsubscribes itself before being invoked, so a re-entrant
publish during the first call does not re-fire it.

### Snapshot semantics during dispatch

`publish` takes a snapshot of the subscription map before invoking
handlers. If a handler modifies the subscription set:

- Newly added subscribers do **not** receive the in-flight event.
- Subscribers removed during dispatch do **not** receive the
  in-flight event (a `has()` guard before each invocation enforces
  this).

This keeps dispatch deterministic in the presence of bus mutations.

## Errors

```text
EventBusError              (base class)
├── InvalidTopicError      thrown by publish/match/subscriberCount
└── InvalidPatternError    thrown by subscribe/match
```

## Running tests

```bash
npm install
npm test
npm run typecheck
```

The full suite is **78 tests** across 4 modules with **100% line /
branch / function / statement** coverage and a `tsc --strict --noEmit`
clean type check.

## Design notes

- Pattern matching is recursive descent: `**` enumerates 0…N
  remaining-segment splits; `*` and `?` consume exactly one segment
  / one character respectively. The recursion depth is bounded by the
  pattern length, which is operator-controlled.
- Subscriber dispatch is O(N × match-cost) per publish. For
  high-fan-out buses, group related events under common prefixes and
  prefer narrow `*` patterns over `**` to keep match cost low.

## Non-goals

- No request/response (`ask` style) primitive — wire that on top with
  a correlation-id payload if needed.
- No persistence, no cross-process delivery — `eventbus-ts` is an
  in-memory bus.

## Licence

MIT.
