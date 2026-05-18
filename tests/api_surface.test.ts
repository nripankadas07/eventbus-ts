import * as bus from "../src/index";

describe("api_surface", () => {
  test("api_surface_exports_eventbus_class", () => {
    expect(typeof bus.EventBus).toBe("function");
  });

  test("api_surface_exports_match_helper", () => {
    expect(typeof bus.match).toBe("function");
  });

  test("api_surface_exports_validation_helpers", () => {
    expect(typeof bus.validateTopic).toBe("function");
    expect(typeof bus.validatePattern).toBe("function");
  });

  test("api_surface_error_classes_exported", () => {
    expect(typeof bus.EventBusError).toBe("function");
    expect(typeof bus.InvalidTopicError).toBe("function");
    expect(typeof bus.InvalidPatternError).toBe("function");
  });

  test("api_surface_error_hierarchy", () => {
    const topicError = new bus.InvalidTopicError("bad", "reason");
    const patternError = new bus.InvalidPatternError("bad", "reason");
    expect(topicError).toBeInstanceOf(bus.EventBusError);
    expect(patternError).toBeInstanceOf(bus.EventBusError);
    expect(topicError).toBeInstanceOf(Error);
  });

  test("api_surface_error_carries_inputs", () => {
    const topicError = new bus.InvalidTopicError("a..b", "empty segment");
    expect(topicError.topic).toBe("a..b");
    const patternError = new bus.InvalidPatternError(".bad", "leading dot");
    expect(patternError.pattern).toBe(".bad");
  });

  test("api_surface_eventbus_default_constructible", () => {
    const instance = new bus.EventBus();
    expect(instance).toBeInstanceOf(bus.EventBus);
  });
});
