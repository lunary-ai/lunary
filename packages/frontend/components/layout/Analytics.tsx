import { useRouter } from "next/router";
import { useEffect } from "react";

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

  return process.env.NEXT_PUBLIC_POSTHOG_KEY ? (
    <PostHogProvider client={posthog}>{children}</PostHogProvider>
  ) : (
    children
  );
}
