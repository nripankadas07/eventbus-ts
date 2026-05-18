import {
  EventBus,
  InvalidPatternError,
  InvalidTopicError,
  type DispatchErrorInfo,
  type SubscriptionHandle,
} from "../src/index";

interface DemoMap {
  "user.created": { id: string };
  "user.deleted": { id: string; reason: string };
  "chat.message": { text: string };
}

describe("publish & subscribe", () => {
  test("publish_with_no_subscribers_is_a_noop", () => {
    const bus = new EventBus<DemoMap>();
    expect(() => bus.publish("user.created", { id: "u1" })).not.toThrow();
  });

  test("publish_delivers_to_exact_pattern_subscriber", () => {
    const bus = new EventBus<DemoMap>();
    const seen: Array<{ id: string }> = [];
    bus.subscribe("user.created", (payload) => seen.push(payload));
    bus.publish("user.created", { id: "u1" });
    expect(seen).toEqual([{ id: "u1" }]);
  });

  test("publish_delivers_to_single_segment_wildcard", () => {
    const bus = new EventBus<DemoMap>();
    const seen: string[] = [];
    bus.subscribe("user.*", (_payload, topic) => seen.push(topic));
    bus.publish("user.created", { id: "u1" });
    bus.publish("user.deleted", { id: "u1", reason: "spam" });
    expect(seen).toEqual(["user.created", "user.deleted"]);
  });

  test("publish_delivers_to_double_star_subscriber", () => {
    const bus = new EventBus();
    const seen: string[] = [];
    bus.subscribe("**", (_payload, topic) => seen.push(topic));
    bus.publish("user.created", { id: "u1" });
    bus.publish("chat.room.42.message", { text: "hi" });
    expect(seen).toEqual(["user.created", "chat.room.42.message"]);
  });

  test("publish_topic_invocation_passes_topic_to_handler", () => {
    const bus = new EventBus();
    const topics: string[] = [];
    bus.subscribe("**", (_payload, topic) => topics.push(topic));
    bus.publish("a.b.c", null);
    expect(topics).toEqual(["a.b.c"]);
  });

  test("publish_validates_topic_string", () => {
    const bus = new EventBus();
    bus.subscribe("**", () => undefined);
    expect(() => bus.publish("user..bad", null)).toThrow(InvalidTopicError);
  });

  test("subscribe_validates_pattern", () => {
    const bus = new EventBus();
    expect(() => bus.subscribe("bad-name", () => undefined)).toThrow(
      InvalidPatternError,
    );
  });

  test("subscribe_rejects_non_function_handler", () => {
    const bus = new EventBus();
    expect(() =>
      bus.subscribe("user", "nope" as unknown as () => void),
    ).toThrow(TypeError);
  });

  test("subscribe_returns_handle_with_pattern_and_id", () => {
    const bus = new EventBus();
    const handle = bus.subscribe("user.*", () => undefined);
    expect(handle.pattern).toBe("user.*");
    expect(typeof handle.id).toBe("number");
    expect(handle.id).toBeGreaterThan(0);
  });

  test("subscribe_assigns_unique_increasing_ids", () => {
    const bus = new EventBus();
    const a = bus.subscribe("user.*", () => undefined);
    const b = bus.subscribe("chat.*", () => undefined);
    const c = bus.subscribe("**", () => undefined);
    expect(b.id).toBe(a.id + 1);
    expect(c.id).toBe(b.id + 1);
  });

  test("publish_calls_multiple_subscribers_in_subscription_order", () => {
    const bus = new EventBus();
    const order: number[] = [];
    bus.subscribe("**", () => order.push(1));
    bus.subscribe("user.*", () => order.push(2));
    bus.subscribe("user.created", () => order.push(3));
    bus.publish("user.created", null);
    expect(order).toEqual([1, 2, 3]);
  });
});

describe("subscriberCount", () => {
  test("count_no_argument_returns_total", () => {
    const bus = new EventBus();
    expect(bus.subscriberCount()).toBe(0);
    bus.subscribe("user.*", () => undefined);
    bus.subscribe("**", () => undefined);
    expect(bus.subscriberCount()).toBe(2);
  });

  test("count_with_topic_returns_only_matching_patterns", () => {
    const bus = new EventBus();
    bus.subscribe("user.*", () => undefined);
    bus.subscribe("user.created", () => undefined);
    bus.subscribe("chat.**", () => undefined);
    expect(bus.subscriberCount("user.created")).toBe(2);
    expect(bus.subscriberCount("user.deleted")).toBe(1);
    expect(bus.subscriberCount("chat.message")).toBe(1);
    expect(bus.subscriberCount("other.event")).toBe(0);
  });

  test("count_with_invalid_topic_throws", () => {
    const bus = new EventBus();
    expect(() => bus.subscriberCount("..")).toThrow(InvalidTopicError);
  });
});

describe("unsubscribe & clear", () => {
  test("unsubscribe_removes_subscription_by_handle", () => {
    const bus = new EventBus();
    const seen: number[] = [];
    const handle = bus.subscribe("user.*", () => seen.push(1));
    bus.publish("user.created", null);
    expect(bus.unsubscribe(handle)).toBe(true);
    bus.publish("user.created", null);
    expect(seen).toEqual([1]);
  });

  test("unsubscribe_by_numeric_id_works_too", () => {
    const bus = new EventBus();
    const seen: number[] = [];
    const handle = bus.subscribe("user.*", () => seen.push(1));
    expect(bus.unsubscribe(handle.id)).toBe(true);
    bus.publish("user.created", null);
    expect(seen).toEqual([]);
  });

  test("unsubscribe_returns_false_for_unknown_id", () => {
    const bus = new EventBus();
    const phantom: SubscriptionHandle = { id: 999, pattern: "anything.*" };
    expect(bus.unsubscribe(phantom)).toBe(false);
  });

  test("unsubscribe_during_dispatch_skips_remaining_handlers_safely", () => {
    const bus = new EventBus();
    const calls: string[] = [];
    const handleB = bus.subscribe("**", () => {
      calls.push("a");
      bus.unsubscribe(handleB);
    });
    bus.subscribe("**", () => calls.push("b"));
    bus.publish("test.event", null);
    expect(calls).toEqual(["a", "b"]);
    bus.publish("test.event", null);
    expect(calls).toEqual(["a", "b", "b"]);
  });

  test("unsubscribe_during_dispatch_removes_a_pending_handler", () => {
    const bus = new EventBus();
    const calls: string[] = [];
    const handleA = bus.subscribe("**", () => calls.push("a"));
    const handleB = bus.subscribe("**", () => {
      calls.push("b");
      bus.unsubscribe(handleA);
    });
    void handleB;
    // First dispatch: 'a' fires before 'b' (subscription order); 'b' then
    // unsubscribes 'a'. Second dispatch: only 'b' fires.
    bus.publish("e.x", null);
    bus.publish("e.x", null);
    expect(calls).toEqual(["a", "b", "b"]);
  });

  test("clear_removes_all_subscriptions", () => {
    const bus = new EventBus();
    const seen: number[] = [];
    bus.subscribe("**", () => seen.push(1));
    bus.subscribe("user.*", () => seen.push(2));
    bus.clear();
    expect(bus.subscriberCount()).toBe(0);
    bus.publish("user.created", null);
    expect(seen).toEqual([]);
  });
});

describe("subscribeOnce", () => {
  test("once_handler_fires_only_once", () => {
    const bus = new EventBus();
    const seen: number[] = [];
    bus.subscribeOnce("user.*", () => seen.push(1));
    bus.publish("user.created", null);
    bus.publish("user.deleted", null);
    bus.publish("user.created", null);
    expect(seen).toEqual([1]);
  });

  test("once_decreases_subscriber_count_after_first_match", () => {
    const bus = new EventBus();
    bus.subscribeOnce("user.*", () => undefined);
    expect(bus.subscriberCount()).toBe(1);
    bus.publish("user.created", null);
    expect(bus.subscriberCount()).toBe(0);
  });

  test("once_can_be_unsubscribed_before_firing", () => {
    const bus = new EventBus();
    const seen: number[] = [];
    const handle = bus.subscribeOnce("user.*", () => seen.push(1));
    bus.unsubscribe(handle);
    bus.publish("user.created", null);
    expect(seen).toEqual([]);
  });
});

describe("error isolation", () => {
  test("handler_error_does_not_break_dispatch", () => {
    const bus = new EventBus();
    const seen: string[] = [];
    bus.subscribe("**", () => {
      throw new Error("boom");
    });
    bus.subscribe("**", () => seen.push("ok"));
    bus.publish("a.b", null);
    expect(seen).toEqual(["ok"]);
  });

  test("on_error_callback_receives_dispatch_info", () => {
    const errors: DispatchErrorInfo[] = [];
    const bus = new EventBus({ onError: (info) => errors.push(info) });
    const error = new Error("boom");
    bus.subscribe("user.*", () => {
      throw error;
    });
    bus.publish("user.created", { id: "u1" });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.error).toBe(error);
    expect(errors[0]!.topic).toBe("user.created");
    expect(errors[0]!.pattern).toBe("user.*");
    expect(errors[0]!.payload).toEqual({ id: "u1" });
  });

  test("on_error_callback_throwing_does_not_break_dispatch", () => {
    const bus = new EventBus({
      onError: () => {
        throw new Error("error handler exploded");
      },
    });
    const seen: string[] = [];
    bus.subscribe("**", () => {
      throw new Error("boom");
    });
    bus.subscribe("**", () => seen.push("ok"));
    expect(() => bus.publish("a.b", null)).not.toThrow();
    expect(seen).toEqual(["ok"]);
  });

  test("no_on_error_means_handler_errors_silently_dropped", () => {
    const bus = new EventBus();
    const seen: string[] = [];
    bus.subscribe("**", () => {
      throw new Error("boom");
    });
    bus.subscribe("**", () => seen.push("ok"));
    expect(() => bus.publish("a.b", null)).not.toThrow();
    expect(seen).toEqual(["ok"]);
  });
});

describe("dispatch snapshot semantics", () => {
  test("handler_unsubscribing_later_subscriber_skips_that_handler_in_same_dispatch", () => {
    const bus = new EventBus();
    const calls: string[] = [];
    let handleB: ReturnType<typeof bus.subscribe> | null = null;
    bus.subscribe("**", () => {
      calls.push("a");
      if (handleB !== null) bus.unsubscribe(handleB);
    });
    handleB = bus.subscribe("**", () => calls.push("b"));
    bus.publish("e.x", null);
    // 'a' fires; 'a' unsubscribes 'b'; snapshot still contains 'b' but the
    // pre-loop has() guard rejects it, so it never fires.
    expect(calls).toEqual(["a"]);
  });
});
