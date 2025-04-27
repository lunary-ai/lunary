/* ---------- helpers ---------------------------------------------------- */

export const nsToIso = (
  ns: number | string | { high?: number; low?: number } | undefined | null,
): string => {
  // Fallback to “now” if the field is missing
  if (ns == null) return new Date().toISOString();

  // Plain string | number
  if (typeof ns === "string" || typeof ns === "number")
    return new Date(Number(BigInt(ns) / 1_000_000n)).toISOString();

  // Protobuf Long variant with high/low
  if (typeof ns.high === "number" && typeof ns.low === "number") {
    const big = (BigInt(ns.high) << 32n) | BigInt(ns.low >>> 0);
    return new Date(Number(big / 1_000_000n)).toISOString();
  }

  // Any other “Long” that only has toString()
  if (typeof (ns as any).toString === "function") {
    return new Date(
      Number(BigInt((ns as any).toString()) / 1_000_000n),
    ).toISOString();
  }

  // Worst-case fallback
  return new Date().toISOString();
};

const anyVal = (v: any): any => {
  if (!v) return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("boolValue" in v) return v.boolValue;
  if ("intValue" in v) return Number(v.intValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("bytesValue" in v) return Buffer.from(v.bytesValue).toString("base64");
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(anyVal);
  if ("kvlistValue" in v)
    return Object.fromEntries(
      (v.kvlistValue.values || []).map((kv: any) => [kv.key, anyVal(kv.value)]),
    );
  return v;
};

export const attrsToMap = (
  arr: Array<{ key: string; value: any }> | undefined,
): Record<string, any> => {
  if (!Array.isArray(arr)) return {};
  const out: Record<string, any> = {};
  for (const { key, value } of arr) out[key] = anyVal(value);
  return out;
};

/* ★ new — helper to turn indexed prompt / completion keys into arrays */
export const buildMessages = (
  prefix: string,
  attrs: Record<string, any>,
): Array<{ role: string; content: string }> | undefined => {
  const buf: Record<number, { role?: string; content?: string }> = {};

  for (const [key, val] of Object.entries(attrs)) {
    if (!key.startsWith(prefix)) continue; // skip unrelated keys
    const rest = key.slice(prefix.length); // "0.role", "0.finish_reason", …
    const [idxStr, field] = rest.split(".");
    if (field === "finish_reason") continue; // <<-- ignore this field

    const idx = Number(idxStr);
    if (!buf[idx]) buf[idx] = {};
    (buf[idx] as any)[field] = val;
  }

  const ordered = Object.keys(buf)
    .map(Number)
    .sort((a, b) => a - b)
    .map((i) => buf[i]);

  return ordered.length ? (ordered as any) : undefined;
};

export const digForSpan = (obj: any): any => {
  if (!obj) return {};
  if (Array.isArray(obj.attributes)) return obj; // got it
  if (Array.isArray(obj.spans)) return digForSpan(obj.spans[0]);
  if (Array.isArray(obj.scopeSpans)) return digForSpan(obj.scopeSpans[0]);
  if (Array.isArray(obj.resourceSpans)) return digForSpan(obj.resourceSpans[0]);
  return obj; // last resort
};

/* --------------------------------------------------------------- */
/* omitKeys ⇒ drops the noisy attributes                        */
/* --------------------------------------------------------------- */
/* keys you don’t want after prefix removal */
const OMIT_KEYS = new Set([
  "prompt.0.content",
  "completion.0.role",
  "request.model",
  "usage.completion_tokens",
  "llm.usage.total_tokens",
  "prompt.0.role",
]);

/**
 *  stripAndOmit ─ remove known prefixes, then drop unwanted keys
 */
export const omitKeys = (obj: Record<string, any>): Record<string, any> => {
  const out: Record<string, any> = {};

  for (const [fullKeyOrig, value] of Object.entries(obj)) {
    /* 2.1  strip known prefixes */
    let key = fullKeyOrig;
    if (key.startsWith("gen_ai.")) key = key.slice("gen_ai.".length);
    else if (key.startsWith("genAI.")) key = key.slice("genAI.".length);
    if (key.startsWith("openai.")) key = key.slice("openai.".length);

    /* 2.2  omit by *full* key (after prefix strip) */
    if (OMIT_KEYS.has(key)) continue;

    /* 2.3  keep only the last segment */
    const tail = key.slice(key.lastIndexOf(".") + 1);
    out[tail] = value;
  }

  return out;
};
