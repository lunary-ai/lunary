import { useRouter } from "next/router";
import { useEffect, Component } from "react";
import Script from "next/script";

import { PostHogProvider } from "posthog-js/react";

import posthog from "posthog-js";

import analytics from "@/utils/analytics";

export default function AnalyticsWrapper({ children }) {
  const router = useRouter();

  useEffect(() => {
    analytics.handleRouteChange();

    router.events.on("routeChangeComplete", analytics.handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", analytics.handleRouteChange);
    };
  }, []);

  return (
    <>
      {process.env.NEXT_PUBLIC_CUSTOM_SCRIPT && (
        <Script
          id="custom-script"
          dangerouslySetInnerHTML={{
            __html: process.env.NEXT_PUBLIC_CUSTOM_SCRIPT,
          }}
          onLoad={() => console.info("Custom script loaded.")}
          onError={() => console.info("Custom script failed to load.")}
        />
      )}

      {process.env.NEXT_PUBLIC_POSTHOG_KEY ? (
        <PostHogProvider client={posthog}>{children}</PostHogProvider>
      ) : (
        children
      )}
    </>
  );
}
