/** Topic + pattern validation and glob matching. */

import { InvalidPatternError, InvalidTopicError } from "./errors";

const SEGMENT_TOPIC = /^[A-Za-z_][A-Za-z0-9_]*$|^\d+$/;
const SEGMENT_PATTERN = /^(?:\*\*|\*|[A-Za-z_?][A-Za-z0-9_?]*|\d+)$/;

type ErrCtor =
  | typeof InvalidTopicError
  | typeof InvalidPatternError;

/** Validate a topic string. Throws InvalidTopicError on bad input. */
export function validateTopic(topic: string): readonly string[] {
  return validateDotted(topic, SEGMENT_TOPIC, "topic", InvalidTopicError);
}

/** Validate a subscription pattern. Throws InvalidPatternError. */
export function validatePattern(pattern: string): readonly string[] {
  return validateDotted(
    pattern,
    SEGMENT_PATTERN,
    "pattern",
    InvalidPatternError,
  );
}

function validateDotted(
  value: string,
  segmentRe: RegExp,
  what: string,
  ErrType: ErrCtor,
): readonly string[] {
  guardDottedShape(value, what, ErrType);
  const segments = value.split(".");
  for (const segment of segments) {
    validateSegment(segment, value, what, segmentRe, ErrType);
  }
  return segments;
}

function guardDottedShape(value: string, what: string, ErrType: ErrCtor): void {
  if (typeof value !== "string") {
    throw new ErrType(String(value), `${what} must be a string`);
  }
  if (value.length === 0) {
    throw new ErrType(value, `${what} must be non-empty`);
  }
  if (value.startsWith(".") || value.endsWith(".")) {
    throw new ErrType(value, `${what} must not start or end with '.'`);
  }
}

function validateSegment(
  segment: string,
  value: string,
  what: string,
  segmentRe: RegExp,
  ErrType: ErrCtor,
): void {
  if (segment.length === 0) {
    throw new ErrType(value, `${what} contains an empty segment`);
  }
  if (!segmentRe.test(segment)) {
    throw new ErrType(
      value,
      `invalid ${what} segment ${JSON.stringify(segment)}`,
    );
  }
}

/** Test whether `pattern` matches `topic`. Inputs validated. */
export function match(pattern: string, topic: string): boolean {
  const patternSegs = validatePattern(pattern);
  const topicSegs = validateTopic(topic);
  return matchSegments(patternSegs, 0, topicSegs, 0);
}

/** Recursive descent matcher with `*` / `**` / `?` wildcards. */
function matchSegments(
  patSegs: readonly string[],
  patIdx: number,
  topSegs: readonly string[],
  topIdx: number,
): boolean {
  if (patIdx === patSegs.length) {
    return topIdx === topSegs.length;
  }
  const patternSeg = patSegs[patIdx]!;
  if (patternSeg === "**") {
    return matchDoubleStar(patSegs, patIdx, topSegs, topIdx);
  }
  if (topIdx === topSegs.length) {
    return false;
  }
  const topicSeg = topSegs[topIdx]!;
  if (!matchSegment(patternSeg, topicSeg)) {
    return false;
  }
  return matchSegments(patSegs, patIdx + 1, topSegs, topIdx + 1);
}

/** Helper: handle the `**` zero-or-more-segments wildcard. */
function matchDoubleStar(
  patSegs: readonly string[],
  patIdx: number,
  topSegs: readonly string[],
  topIdx: number,
): boolean {
  for (let consume = topIdx; consume <= topSegs.length; consume += 1) {
    if (matchSegments(patSegs, patIdx + 1, topSegs, consume)) {
      return true;
    }
  }
  return false;
}

/** Match a single pattern segment against a topic segment. */
function matchSegment(patternSeg: string, topicSeg: string): boolean {
  if (patternSeg === "*") return true;
  if (!patternSeg.includes("?")) return patternSeg === topicSeg;
  if (patternSeg.length !== topicSeg.length) return false;
  for (let i = 0; i < patternSeg.length; i += 1) {
    const pc = patternSeg[i];
    if (pc === "?") continue;
    if (pc !== topicSeg[i]) return false;
  }
  return true;
}
