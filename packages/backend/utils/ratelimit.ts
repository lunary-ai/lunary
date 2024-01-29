import ratelimit from "koa-ratelimit"

const db = new Map()

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
  max: 150, // limit unlogged IPs to 50 requests per minute
  disableHeader: false,
  whitelist: (ctx) => {
    // don't limit logged in users
    if (ctx.state.userId) return true
    return false
    // some logic that returns a boolean
  },
  // blacklist: (ctx) => {
  //   // some logic that returns a boolean
  // },
})
