import ratelimit from "koa-ratelimit";

const db = new Map();

const MAX_REQUESTS_PER_MINUTE = parseInt(
  process.env.MAX_REQUESTS_PER_MINUTE || "150",
  10,
);

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
  max: MAX_REQUESTS_PER_MINUTE,
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
  max: 10,
  disableHeader: false,
});
