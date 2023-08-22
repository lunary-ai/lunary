import { AppProps } from "next/app"
import Head from "next/head"
import { MantineProvider } from "@mantine/core"
import "../styles/globals.css"

import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs"
import { SessionContextProvider } from "@supabase/auth-helpers-react"

import Layout from "@/components/Layout"
import { Database } from "@/utils/supaTypes"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Analytics } from "@vercel/analytics/react"

import { useRouter } from "next/router"
import { analytics } from "@/utils/analytics"

import { PostHogProvider } from "posthog-js/react"
import posthog from "posthog-js"
import Script from "next/script"

export default function App(props: AppProps) {
  const { Component, pageProps } = props
  const router = useRouter()

  const [supabase] = useState(() => createPagesBrowserClient<Database>())

  const handleRouteChange = async () => {
    analytics?.page()
  }

  useEffect(() => {
    handleRouteChange()

    router.events.on("routeChangeComplete", handleRouteChange)
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange)
    }
  }, [])

  return (
    <>
      <Head>
        <title>llmonitor</title>
      </Head>

      <PostHogProvider client={posthog}>
        <SessionContextProvider
          supabaseClient={supabase}
          initialSession={pageProps.initialSession}
        >
          <MantineProvider
            withNormalizeCSS
            theme={{
              colorScheme: "light",
              defaultRadius: "md",
              // primaryColor: "pink",
              headings: {
                fontWeight: 700,
              },
              components: {
                Anchor: {
                  defaultProps: {
                    component: Link,
                  },
                },
              },
            }}
          >
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </MantineProvider>
          <Analytics />
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
        </SessionContextProvider>
      </PostHogProvider>
    </>
  )
}
