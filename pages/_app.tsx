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
import { DefaultSeo } from "next-seo"

import localFont from "next/font/local"

const circularPro = localFont({
  display: "swap",
  fallback: [
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Helvetica",
    "Arial",
    "sans-serif",
  ],
  src: [
    {
      path: "../public/fonts/circular-pro-book.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/circular-pro-medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/circular-pro-bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/circular-pro-black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
})

export default function App(props: AppProps) {
  const { Component, pageProps } = props

  const [supabase] = useState(() => createPagesBrowserClient<Database>())

  return (
    <>
      <style jsx global>{`
        html {
          font-family: ${circularPro.style.fontFamily};
        }
      `}</style>
      <Head>
        <link
          href="https://llmonitor.com/logo.png"
          rel="icon"
          type="image/png"
        />
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
            fontFamily: circularPro.style.fontFamily,
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
              <DefaultSeo
                title="Dashboard"
                titleTemplate="%s | LLMonitor"
                defaultTitle="Dashboard | LLMonitor"
              />
              <Component {...pageProps} />
            </Layout>
          </AnalyticsWrapper>
        </MantineProvider>
      </SessionContextProvider>
    </>
  )
}
