import {
  InvalidPatternError,
  InvalidTopicError,
  match,
  validatePattern,
  validateTopic,
} from "../src/index";

describe("validateTopic", () => {
  test("topic_simple_identifier_returns_one_segment", () => {
    expect(validateTopic("user")).toEqual(["user"]);
  });

  test("topic_dotted_returns_segments_in_order", () => {
    expect(validateTopic("user.created.v2")).toEqual(["user", "created", "v2"]);
  });

  test("topic_with_underscore_segments_allowed", () => {
    expect(validateTopic("user_event.foo_bar")).toEqual([
      "user_event",
      "foo_bar",
    ]);
  });

  test("topic_with_numeric_segment_allowed", () => {
    expect(validateTopic("chat.42.message")).toEqual(["chat", "42", "message"]);
  });

  test.each([
    ["", "must be non-empty"],
    [".user", "leading"],
    ["user.", "trailing"],
    ["user..created", "empty segment"],
    ["1user.created", "invalid"],
    ["user-event", "invalid"],
    ["user.evt!", "invalid"],
  ])("topic_invalid_input_%s", (topic) => {
    expect(() => validateTopic(topic)).toThrow(InvalidTopicError);
  });

  test("topic_non_string_input_rejected", () => {
    expect(() =>
      validateTopic(42 as unknown as string),
    ).toThrow(InvalidTopicError);
  });

  test("topic_wildcard_in_topic_rejected", () => {
    expect(() => validateTopic("user.*")).toThrow(InvalidTopicError);
    expect(() => validateTopic("**")).toThrow(InvalidTopicError);
    expect(() => validateTopic("user.?")).toThrow(InvalidTopicError);
  });
});

describe("validatePattern", () => {
  test("pattern_exact_match_returns_segments", () => {
    expect(validatePattern("user.created")).toEqual(["user", "created"]);
  });

  test("pattern_single_star_segment_allowed", () => {
    expect(validatePattern("user.*")).toEqual(["user", "*"]);
  });

  test("pattern_double_star_segment_allowed", () => {
    expect(validatePattern("user.**")).toEqual(["user", "**"]);
  });

  test("pattern_question_mark_segment_allowed", () => {
    expect(validatePattern("user.?")).toEqual(["user", "?"]);
    expect(validatePattern("u?er.?")).toEqual(["u?er", "?"]);
  });

  test("pattern_partial_question_mark_in_segment", () => {
    expect(validatePattern("u?er.??eated")).toEqual(["u?er", "??eated"]);
  });

  test.each([
    ["", "must be non-empty"],
    [".user", "leading"],
    ["user.", "trailing"],
    ["user..*", "empty segment"],
    ["user-evt", "invalid"],
  ])("pattern_invalid_input_%s", (pattern) => {
    expect(() => validatePattern(pattern)).toThrow(InvalidPatternError);
  });

  test("pattern_combined_wildcards_segments_allowed", () => {
    expect(validatePattern("**.*.?abc")).toEqual(["**", "*", "?abc"]);
  });

  test("pattern_non_string_input_rejected", () => {
    expect(() =>
      validatePattern(null as unknown as string),
    ).toThrow(InvalidPatternError);
  });
});

describe("match", () => {
  test("match_exact_pattern_matches_exact_topic", () => {
    expect(match("user.created", "user.created")).toBe(true);
  });

  test("match_exact_pattern_does_not_match_other_topic", () => {
    expect(match("user.created", "user.deleted")).toBe(false);
  });

  test("match_single_star_matches_one_segment", () => {
    expect(match("user.*", "user.created")).toBe(true);
    expect(match("user.*", "user.deleted")).toBe(true);
    expect(match("user.*", "user")).toBe(false);
    expect(match("user.*", "user.created.v2")).toBe(false);
  });

  test("match_double_star_matches_zero_or_more_segments", () => {
    expect(match("user.**", "user")).toBe(true);
    expect(match("user.**", "user.created")).toBe(true);
    expect(match("user.**", "user.created.v2")).toBe(true);
    expect(match("user.**", "userprofile")).toBe(false);
    expect(match("user.**", "other.event")).toBe(false);
  });

  test("match_double_star_alone_matches_anything", () => {
    expect(match("**", "user")).toBe(true);
    expect(match("**", "user.created.v2")).toBe(true);
    expect(match("**", "a.b.c.d.e.f.g")).toBe(true);
  });

  test("match_double_star_in_middle", () => {
    expect(match("user.**.message", "user.message")).toBe(true);
    expect(match("user.**.message", "user.chat.message")).toBe(true);
    expect(match("user.**.message", "user.chat.42.message")).toBe(true);
    expect(match("user.**.message", "user.chat")).toBe(false);
  });

  test("match_question_mark_matches_single_char", () => {
    expect(match("?ser.created", "user.created")).toBe(true);
    expect(match("u?er.created", "user.created")).toBe(true);
    expect(match("user.cr??ted", "user.created")).toBe(true);
    expect(match("u?ser.created", "user.created")).toBe(false);
  });

  test("match_combined_wildcards", () => {
    expect(match("user.*.?eta", "user.profile.beta")).toBe(true);
    expect(match("user.**.*", "user.created")).toBe(true);
    expect(match("user.**.*", "user.profile.beta")).toBe(true);
  });

  test("match_invalid_topic_throws", () => {
    expect(() => match("user.*", "user..bad")).toThrow(InvalidTopicError);
  });

  test("match_invalid_pattern_throws", () => {
    expect(() => match("user.bad-name", "user.x")).toThrow(InvalidPatternError);
  });
});

describe("match question-mark edge cases", () => {
  test("match_question_mark_pattern_same_length_differing_char_returns_false", () => {
    // 'u?er' (4 chars) vs 'abcd' (4 chars): '?' matches any, but 'u' vs 'a' fails.
    expect(match("u?er", "abcd")).toBe(false);
  });

  test("match_question_mark_at_start_with_differing_other_char", () => {
    // '?ser' (4) vs 'uxer' (4): '?' matches, 's' vs 'x' fails.
    expect(match("?ser", "uxer")).toBe(false);
  });
});
