import "@mantine/core/styles.css"
import "@mantine/notifications/styles.css"
import "../styles/globals.css"

import { MantineProvider, createTheme } from "@mantine/core"
import type { AppProps } from "next/app"
import Head from "next/head"

import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs"
import { SessionContextProvider } from "@supabase/auth-helpers-react"

import Layout from "@/components/Layout"
import AnalyticsWrapper from "@/components/Layout/Analytics"
import { Database } from "@/utils/supaTypes"
import { DefaultSeo } from "next-seo"
import Link from "next/link"
import { useState } from "react"

import localFont from "next/font/local"

export const circularPro = localFont({
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

const theme = createTheme({
  defaultRadius: "md",
  fontFamily: circularPro.style.fontFamily,
  headings: {
    fontWeight: "700",
  },
  components: {
    Anchor: {
      defaultProps: {
        component: Link,
      },
    },

    Button: {
      defaultProps: {
        fw: "500",
      },
    },
  },
})

export default function App({ Component, pageProps }: AppProps) {
  const [supabase] = useState(() => createPagesBrowserClient<Database>())

  return (
    <>
      <style jsx global>{`
        html {
          font-family: ${circularPro.style.fontFamily};
        }
      `}</style>
      <Head>
        <link href="https://lunary.ai/logo.png" rel="icon" type="image/png" />
      </Head>
      <SessionContextProvider
        supabaseClient={supabase}
        initialSession={pageProps.initialSession}
      >
        <DefaultSeo
          title="Dashboard"
          titleTemplate="%s | Lunary"
          defaultTitle="Dashboard | Lunary"
        />
        <MantineProvider theme={theme} defaultColorScheme="auto">
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
