import posthog from "posthog-js"
import { H } from "@highlight-run/next/client"

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: window.location.origin + "/ingest", // Uses Next.js rewrite in next.config.js
    // Enable debug mode in development
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") posthog.debug()
    },
  })
}

const w = {
  // @ts-ignore
  get crisp() {
    if (
      typeof window !== "undefined" &&
      typeof window["$crisp"] !== "undefined"
    )
      return window["$crisp"]

    return () => {}
  },
  get plausible() {
    if (
      typeof window !== "undefined" &&
      typeof window["plausible"] !== "undefined"
    )
      return window["plausible"]

    return () => {}
  },
}

const handleRouteChange = async () => {
  posthog?.capture("$pageview")

  // w.gosquared("track")
}

const track = (event: string, data?: any) => {
  try {
    posthog?.capture(event, data)

    w.plausible(event, { props: data })

    w?.crisp?.push(["set", "session:event", [[[event, data]]]])
  } catch (e) {
    console.error(e)
  }
}

const alreadyTracked = new Set<string>()
const trackOnce = (event: string, data?: any) => {
  // Prevent sending too many events
  if (alreadyTracked.has(event)) return

  try {
    posthog?.capture(event, data)
  } catch (e) {
    console.error(e)
  }
}

const identify = (userId: string, traits: any) => {
  try {
    posthog?.identify(userId, traits)

    // TODO: w.crisp.push undefined?
    if (!w?.crisp?.push) return
    if (traits.email) w?.crisp?.push(["set", "user:email", traits.email])
    if (traits.name) w?.crisp?.push(["set", "user:nickname", traits.name])

    w?.crisp.push([
      "set",
      "session:data",
      [
        [
          ...Object.entries(traits)
            .map(([key, value]) => [key, value])
            .filter(([key]) => key !== "email" && key !== "name")
            .filter(([key, value]) => value),
          ["user-id", userId],
        ],
      ],
    ])

    H?.identify(userId, traits)
  } catch (e) {
    console.error(e)
  }
}

const analytics = {
  track,
  trackOnce,
  identify,
  handleRouteChange,
}

export default analytics
