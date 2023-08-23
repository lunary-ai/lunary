import { useRouter } from "next/router"
import { useEffect } from "react"
import Script from "next/script"

import { PostHogProvider } from "posthog-js/react"
import posthog from "posthog-js"

import { Analytics } from "@vercel/analytics/react"

import analytics from "@/utils/analytics"
import Head from "next/head"

export default function AnalyticsWrapper({ children }) {
  const router = useRouter()

  useEffect(() => {
    analytics.handleRouteChange()

    router.events.on("routeChangeComplete", analytics.handleRouteChange)
    return () => {
      router.events.off("routeChangeComplete", analytics.handleRouteChange)
    }
  }, [])

  return (
    <PostHogProvider client={posthog}>
      <Head>
        {process.env.NEXT_PUBLIC_CUSTOM_SCRIPT && (
          <Script
            id="custom-script"
            dangerouslySetInnerHTML={{
              __html: process.env.NEXT_PUBLIC_CUSTOM_SCRIPT,
            }}
            onLoad={() => console.log("Custom script loaded.")}
            onError={() => console.log("Custom script failed to load.")}
          />
        )}

        {process.env.NEXT_PUBLIC_LIVECHAT_SCRIPT && (
          <Script
            id="livechat-script"
            dangerouslySetInnerHTML={{
              __html: process.env.NEXT_PUBLIC_LIVECHAT_SCRIPT,
            }}
            onLoad={() => console.log("LiveChat script loaded.")}
            onError={() => console.log("LiveChat script failed to load.")}
          />
        )}
      </Head>

      {children}

      <Analytics />
    </PostHogProvider>
  )
}
