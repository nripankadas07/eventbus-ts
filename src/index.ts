/** eventbus-ts — type-safe pub-sub bus with topic globs.
 *
 * Public API:
 *
 *   import { EventBus } from "eventbus-ts";
 *   const bus = new EventBus<{ "user.created": { id: string } }>();
 *   bus.subscribe("user.*", (payload, topic) => { ... });
 *   bus.publish("user.created", { id: "u1" });
 */

export { EventBus } from "./bus";
export type { EventBusOptions } from "./bus";
export {
  EventBusError,
  InvalidPatternError,
  InvalidTopicError,
} from "./errors";
export { match, validatePattern, validateTopic } from "./topic";
export type {
  DispatchErrorInfo,
  ErrorHandler,
  EventMap,
  Handler,
  SubscriptionHandle,
} from "./types";
