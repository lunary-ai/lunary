import { useRouter } from "next/router"
import { useEffect, Component } from "react"
import Script from "next/script"

import { PostHogProvider } from "posthog-js/react"
import PlausibleProvider from "next-plausible"
import posthog from "posthog-js"

import analytics from "@/utils/analytics"
import { HighlightInit } from "@highlight-run/next/client"

import { Crisp } from "crisp-sdk-web"

class CrispChat extends Component {
  componentDidMount() {
    if (process.env.NEXT_PUBLIC_CRISP_ID) {
      Crisp.configure(process.env.NEXT_PUBLIC_CRISP_ID)
    }
  }

  render() {
    return null
  }
}

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
    <>
      {process.env.NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID && (
        <HighlightInit
          projectId={process.env.NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID}
          serviceName="llmonitor-frontend"
          tracingOrigins
          disableConsoleRecording
          networkRecording={{
            enabled: false,
            recordHeadersAndBody: true,
            urlBlocklist: [],
          }}
        />
      )}
      {process.env.NEXT_PUBLIC_CRISP_ID && <CrispChat />}
      <PlausibleProvider
        domain="app.llmonitor.com,rollup.llmonitor.com"
        scriptProps={{
          src: "https://www.llmonitor.com/p/js/script.js",
          // @ts-ignore
          "data-api": "https://www.llmonitor.com/p/event",
        }}
        customDomain="www.llmonitor.com"
      >
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

        {process.env.NEXT_PUBLIC_POSTHOG_KEY ? (
          <PostHogProvider client={posthog}>{children}</PostHogProvider>
        ) : (
          children
        )}
      </PlausibleProvider>
    </>
  )
}
