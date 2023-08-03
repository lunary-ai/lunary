import { AnalyticsBrowser } from "@segment/analytics-next"

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
