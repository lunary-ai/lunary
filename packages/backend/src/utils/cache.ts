import { Next } from "koa";
import { LRUCache } from "lru-cache";
import config from "./config";
import Context from "./koa";

const ONE_DAY = 1000 * 60 * 60 * 24;
const ONE_MB = 1024 * 1024;
const ONE_HUNDREd_MB = ONE_MB * 100;
const TWO_GB = ONE_MB * 2000;


const cache = new LRUCache<string, object>({
  maxSize: config.IS_SELF_HOSTED ? ONE_HUNDREd_MB : TWO_GB,
  ttl: ONE_DAY,
  sizeCalculation: (value, key) =>
    Buffer.byteLength(key, "utf8") +
    Buffer.byteLength(JSON.stringify(value), "utf8"),
});

export async function cacheAnalyticsMiddleware(ctx: Context, next: Next) {
  if (ctx.method !== "GET" || !ctx.path.startsWith("/v1/analytics")) {
    return await next();
  }

  const key = `${ctx.path}?${ctx.querystring}::${ctx.state.projectId}`;

  if (cache.has(key)) {
    ctx.body = cache.get(key)!;
    return;
  }

  await next();

  if (ctx.status === 200 && ctx.body !== undefined) {
    cache.set(key, ctx.body);
  }
}
