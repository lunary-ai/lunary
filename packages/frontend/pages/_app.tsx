import "@mantine/charts/styles.css";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "../styles/globals.css";

import { MantineProvider } from "@mantine/core";
import type { AppProps } from "next/app";
import Head from "next/head";
import { NuqsAdapter } from "nuqs/adapters/next/pages";

import Layout from "@/components/layout";
import AnalyticsWrapper from "@/components/layout/Analytics";
import { DefaultSeo } from "next-seo";

import ErrorBoundary from "@/components/blocks/ErrorBoundary";
import { AuthProvider } from "@/utils/auth";
import { ProjectContext } from "@/utils/context";
import { fetcher } from "@/utils/fetcher";
import { useProjectIdStorage } from "@/utils/hooks";
import { circularPro, themeOverride } from "@/utils/theme";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { SWRConfig } from "swr";
import Intercom from "@intercom/messenger-js-sdk";
import config from "@/utils/config";

export default function App({ Component, pageProps }: AppProps) {
  const [projectId, setProjectId] = useProjectIdStorage();

  if (config.IS_CLOUD) {
    Intercom({
      app_id: "pv95fmzm",
    });
  }

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
      <ErrorBoundary>
        <NuqsAdapter>
          <GoogleOAuthProvider
            clientId={
              (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID as string) ||
              "OAUTH DISABLED"
            }
          >
            <AuthProvider>
              <SWRConfig
                value={{
                  fetcher: fetcher.get,
                }}
              >
                <DefaultSeo
                  title="Dashboard"
                  titleTemplate="%s | Lunary"
                  defaultTitle="Dashboard | Lunary"
                />
                <MantineProvider
                  theme={themeOverride}
                  defaultColorScheme="auto"
                >
                  <AnalyticsWrapper>
                    <ProjectContext.Provider
                      value={{ projectId, setProjectId }}
                    >
                      <DndProvider backend={HTML5Backend}>
                        <Layout>
                          <Component {...pageProps} />
                        </Layout>
                      </DndProvider>
                    </ProjectContext.Provider>
                  </AnalyticsWrapper>
                </MantineProvider>
              </SWRConfig>
            </AuthProvider>
          </GoogleOAuthProvider>
        </NuqsAdapter>
      </ErrorBoundary>
    </>
  );
}
