import { describe, expect, test } from "bun:test";

import { normalizeUserPropertyValue } from "@/src/checks/normalize-user-prop";

describe("normalizeUserPropertyValue", () => {
  test("keeps plain numeric-looking strings as strings", () => {
    const result = normalizeUserPropertyValue("12345");
    expect(result).toBe("12345");
    expect(typeof result).toBe("string");
  });

  test("keeps literal boolean strings unchanged", () => {
    expect(normalizeUserPropertyValue("true")).toBe("true");
    expect(normalizeUserPropertyValue("FALSE")).toBe("FALSE");
  });

  test("trims whitespace around string values", () => {
    expect(normalizeUserPropertyValue("  abc  ")).toBe("abc");
  });

  test("unwraps explicitly typed payloads embedded as strings", () => {
    expect(
      normalizeUserPropertyValue(
        ' { "type": "boolean", "value": true } ',
      ),
    ).toBe(true);
  });

  test("unwraps typed payload objects", () => {
    expect(
      normalizeUserPropertyValue({ type: "number", value: 42 }),
    ).toBe(42);
  });

  test("converts typed payloads declaring null", () => {
    expect(normalizeUserPropertyValue('{"type": "null"}')).toBeNull();
  });

  test("returns non-string inputs as-is", () => {
    expect(normalizeUserPropertyValue(99)).toBe(99);
    expect(normalizeUserPropertyValue(false)).toBe(false);
  });
});
