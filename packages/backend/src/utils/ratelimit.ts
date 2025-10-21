import ratelimit from "koa-ratelimit";
import { z } from "zod";

const db = new Map();

export default ratelimit({
  driver: "memory",
  db: db,
  duration: 60000,
  errorMessage: "Sometimes You Just Have to Slow Down.",
  id: (ctx) => ctx.request.ip || ctx.ip || ctx.state.userId,
  headers: {
    remaining: "Rate-Limit-Remaining",
    reset: "Rate-Limit-Reset",
    total: "Rate-Limit-Total",
  },
  max: z
    .coerce.number()
    .int()
    .nonnegative()
    .catch(150)
    .parse(process.env.MAX_REQUESTS_PER_MINUTE),
  disableHeader: false,
  whitelist: (ctx) => {
    // don't limit logged in users
    if (ctx.state.userId) return true;
    return false;
  },
});

export const aggressiveRatelimit = ratelimit({
  driver: "memory",
  db: db,
  duration: 60000,
  errorMessage: "Sometimes You Just Have to Slow Down.",
  id: (ctx) => ctx.request.ip || ctx.ip || ctx.state.userId,
  headers: {
    remaining: "Rate-Limit-Remaining",
    reset: "Rate-Limit-Reset",
    total: "Rate-Limit-Total",
  },
  max: z
    .coerce.number()
    .int()
    .nonnegative()
    .catch(10)
    .parse(process.env.AGGRESSIVE_MAX_REQUESTS_PER_MINUTE),
  disableHeader: false,
});
