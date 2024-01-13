import "@mantine/core/styles.css"
import "@mantine/notifications/styles.css"
import "../styles/globals.css"

import { MantineProvider, createTheme } from "@mantine/core"
import type { AppProps } from "next/app"
import Head from "next/head"

import Layout from "@/components/Layout"
import AnalyticsWrapper from "@/components/Layout/Analytics"
import { DefaultSeo } from "next-seo"
import Link from "next/link"

import { fetcher } from "@/utils/fetcher"
import localFont from "next/font/local"
import { SWRConfig } from "swr"

import Router from "next/router"
import SuperTokensReact, { SuperTokensWrapper } from "supertokens-auth-react"
import EmailPasswordReact from "supertokens-auth-react/recipe/emailpassword"
import SessionReact from "supertokens-auth-react/recipe/session"
import ErrorBoundary from "@/components/Blocks/ErrorBoundary"

const appInfo = {
  apiDomain: "http://localhost:3333",
  apiBasePath: "/auth",
  appName: "...",
  websiteDomain: "http://localhost:8080",
}

const frontendConfig = () => {
  return {
    appInfo,
    recipeList: [EmailPasswordReact.init(), SessionReact.init()],
    windowHandler: (oI: any) => {
      return {
        ...oI,
        location: {
          ...oI.location,
          setHref: (href: string) => {
            Router.push(href)
          },
        },
      }
    },
  }
}

if (typeof window !== "undefined") {
  SuperTokensReact.init(frontendConfig())
}

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
    NavLink: {
      defaultProps: {
        h: 36,
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

      <SuperTokensWrapper>
        <SWRConfig
          value={{
            fetcher: fetcher.get,
            dedupingInterval: 10000,
            onError: (err) => {
              console.log("SWR Error", err)
            },
          }}
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
        </SWRConfig>
      </SuperTokensWrapper>
    </>
  )
}
