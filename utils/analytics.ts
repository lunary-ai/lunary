import posthog from "posthog-js"
import va from "@vercel/analytics"

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: window.location.origin + "/ingest", // Uses Next.js rewrite in next.config.js
    // Enable debug mode in development
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") posthog.debug()
    },
  })
}

const gosquared = {
  // @ts-ignore
  get _gs() {
    if (typeof window !== "undefined" && typeof window["_gs"] !== "undefined")
      return window["_gs"]

    return () => {}
  },
}

const handleRouteChange = async () => {
  posthog?.capture("$pageview")

  gosquared._gs("track")
}

const track = (event: string, data?: any) => {
  posthog?.capture(event, data)

  gosquared._gs("event", event, data)

  va.track(event, data)
}

const identify = (userId: string, traits: any) => {
  posthog?.identify(userId, traits)

  // @ts-ignore
  gosquared._gs("identify", traits)
}

const analytics = {
  track,
  identify,
  handleRouteChange,
}

export default analytics
