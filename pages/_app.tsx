import { AppProps } from "next/app"
import Head from "next/head"
import { MantineProvider } from "@mantine/core"
import "../styles/globals.css"

import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs"
import { SessionContextProvider } from "@supabase/auth-helpers-react"

import Layout from "@/components/Layout"
import { Database } from "@/utils/supaTypes"
import { useState } from "react"
import Link from "next/link"
import AnalyticsWrapper from "@/components/Layout/Analytics"

export default function App(props: AppProps) {
  const { Component, pageProps } = props

  const [supabase] = useState(() => createPagesBrowserClient<Database>())

  return (
    <>
      <Head>
        <title>llmonitor</title>
      </Head>

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
          <AnalyticsWrapper>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </AnalyticsWrapper>
        </MantineProvider>
      </SessionContextProvider>
    </>
  )
}
