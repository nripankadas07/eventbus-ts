import { EventBus } from "../src/index";

interface ChatMap {
  "chat.message.created": { roomId: string; text: string };
  "chat.message.edited": { roomId: string; text: string };
  "chat.room.created": { roomId: string };
  "user.online": { userId: string };
  "user.offline": { userId: string };
}

interface MessagePayload {
  roomId: string;
  text: string;
}

interface UserPayload {
  userId: string;
}

describe("integration: chat-bus scenario", () => {
  test("bus_routes_typed_payloads_to_correct_handlers", () => {
    const bus = new EventBus<ChatMap>();
    const messageEvents: string[] = [];
    const userEvents: string[] = [];
    const everything: string[] = [];

    bus.subscribe("chat.message.*", (payload, topic) => {
      const message = payload as MessagePayload;
      messageEvents.push(`${topic}:${message.text}`);
    });
    bus.subscribe("user.*", (payload, topic) => {
      const user = payload as UserPayload;
      userEvents.push(`${topic}:${user.userId}`);
    });
    bus.subscribe("**", (_payload, topic) => {
      everything.push(topic);
    });

    bus.publish("chat.room.created", { roomId: "r1" });
    bus.publish("chat.message.created", { roomId: "r1", text: "hi" });
    bus.publish("chat.message.edited", { roomId: "r1", text: "hi!" });
    bus.publish("user.online", { userId: "u1" });
    bus.publish("user.offline", { userId: "u1" });

    expect(messageEvents).toEqual([
      "chat.message.created:hi",
      "chat.message.edited:hi!",
    ]);
    expect(userEvents).toEqual(["user.online:u1", "user.offline:u1"]);
    expect(everything).toEqual([
      "chat.room.created",
      "chat.message.created",
      "chat.message.edited",
      "user.online",
      "user.offline",
    ]);
  });

  test("bus_supports_high_volume_dispatch_without_corruption", () => {
    const bus = new EventBus();
    let count = 0;
    bus.subscribe("e.**", () => {
      count += 1;
    });
    for (let i = 0; i < 1000; i += 1) {
      bus.publish("e.test", null);
    }
    expect(count).toBe(1000);
  });

  test("bus_handles_rapid_subscribe_unsubscribe_cycles", () => {
    const bus = new EventBus();
    let lastCount = 0;
    for (let i = 0; i < 100; i += 1) {
      const handle = bus.subscribe("e.test", () => {
        lastCount += 1;
      });
      bus.publish("e.test", null);
      bus.unsubscribe(handle);
    }
    expect(lastCount).toBe(100);
    expect(bus.subscriberCount()).toBe(0);
  });

  test("bus_clears_state_between_test_runs_cleanly", () => {
    const bus = new EventBus();
    bus.subscribe("**", () => undefined);
    bus.subscribe("user.*", () => undefined);
    expect(bus.subscriberCount()).toBe(2);
    bus.clear();
    expect(bus.subscriberCount()).toBe(0);
    expect(bus.subscriberCount("user.created")).toBe(0);
  });

  test("once_subscribers_fire_in_subscription_order_and_self_remove", () => {
    const bus = new EventBus();
    const order: string[] = [];
    bus.subscribeOnce("user.*", () => order.push("a"));
    bus.subscribeOnce("user.created", () => order.push("b"));
    bus.subscribe("user.created", () => order.push("c"));
    bus.publish("user.created", null);
    bus.publish("user.created", null);
    expect(order).toEqual(["a", "b", "c", "c"]);
  });

  test("bus_typed_publish_validates_payload_types_at_compile_time", () => {
    const bus = new EventBus<ChatMap>();
    // The exact-match overload requires the payload type to match.
    bus.publish("chat.room.created", { roomId: "r1" });
    bus.publish("user.online", { userId: "u1" });
    expect(bus.subscriberCount()).toBe(0);
  });
});
