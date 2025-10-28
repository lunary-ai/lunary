type TypedValuePayload =
  | {
      type: "null";
      value?: unknown;
    }
  | {
      type: string;
      value: unknown;
    };

function isTypedValuePayload(value: unknown): value is TypedValuePayload {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "type" in value &&
    typeof (value as { type: unknown }).type === "string" &&
    ("value" in value || (value as { type: string }).type === "null")
  );
}

function unwrapTypedValuePayload(payload: TypedValuePayload): unknown {
  return payload.type === "null" ? null : payload.value;
}

function parseTypedPayloadString(value: string): unknown {
  const trimmed = value.trim();

  if (!trimmed.startsWith("{")) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (isTypedValuePayload(parsed)) {
      return unwrapTypedValuePayload(parsed);
    }
  } catch {
    // fall through and return undefined
  }

  return undefined;
}

export function normalizeUserPropertyValue(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (isTypedValuePayload(value)) {
    return unwrapTypedValuePayload(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed.length) {
      return value;
    }

    const parsed = parseTypedPayloadString(trimmed);
    if (parsed !== undefined) {
      return parsed;
    }

    return trimmed;
  }

  return value;
}
