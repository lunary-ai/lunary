import { AnalyticsBrowser } from "@segment/analytics-next"
import posthog from "posthog-js"

// Add PostHog manually alongside Segment for auto capture & A/B test features
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    // Enable debug mode in development
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") posthog.debug()
    },
  })
}

// we can export this instance to share with rest of our codebase.
export const analytics = process.env.NEXT_PUBLIC_SEGMENT_KEY
  ? AnalyticsBrowser.load(
      {
        writeKey: process.env.NEXT_PUBLIC_SEGMENT_KEY,
        cdnURL: process.env.NEXT_PUBLIC_SEGMENT_CDN_URL,
      },
      {
        integrations: {
          "Segment.io": {
            apiHost: process.env.NEXT_PUBLIC_SEGMENT_API_URL,
            protocol: "https",
          },
        },
      }
    )
  : undefined
