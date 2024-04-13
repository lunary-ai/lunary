import { Next } from "koa"
import Context from "./koa"

const TWO_HOURS = 2 * 60 * 60 * 1000
const cache = {
  license: {
    // Everything is set to true by default in case there's a problem connecting to the license server
    radarEnabled: true,
    evalEnabled: true,
    samlEnabled: true,
    accessControlEnabled: true,
  },
  lastFetch: TWO_HOURS + 200,
}

async function licenseMiddleware(ctx: Context, next: Next) {
  const { LICENSE_KEY } = process.env
  if (!LICENSE_KEY) {
    console.error("Please set the `LICENSE_KEY` environment variable.")
    process.exit(0)
  }

  try {
    if (Date.now() - cache.lastFetch > TWO_HOURS) {
      console.log("Fetching")
      const licenseData = await fetch(
        `https://license.lunary.ai/v1/licenses/${LICENSE_KEY}`,
      ).then((res) => res.json())

      cache.license = licenseData
      cache.lastFetch = Date.now()
    }
  } catch (error) {
    console.error(error)
  } finally {
    ctx.state.license = cache.license
    await next()
  }
}

export default licenseMiddleware
