import { Box, Flex, Loader, useComputedColorScheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ReactNode, useEffect } from "react";

import { useRouter } from "next/router";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

import analytics from "@/utils/analytics";
import { useAuth } from "@/utils/auth";
import { useOrg, useProject, useProjects, useUser } from "@/utils/dataHooks";
import { showErrorNotification } from "@/utils/errors";
import { ModalsProvider } from "@mantine/modals";
import UpgradeModal from "./UpgradeModal";

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useUser();
  const { org } = useOrg();
  const { projects } = useProjects();
  const { project } = useProject();

  const colorScheme = useComputedColorScheme();
  const { isSignedIn, signOut } = useAuth();

  const isAuthPage = !![
    "/login",
    "/signup",
    "/join",
    "/request-password-reset",
    "/reset-password",
    "/auth",
    "/verify-email",
  ].find((path) => router.pathname.startsWith(path));

  const isSignupPage = router.pathname.startsWith("/signup");

  const isSignupLastStep =
    router.pathname === "/signup" && router.query.step === "3";

  const isMaintenanceMode =
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "on" &&
    router.pathname !== "/maintenance";

  const isLLMCallPage = router.pathname.startsWith("/logs/[id]");

  const isPublicPage = isLLMCallPage;

  useEffect(() => {
    if (isMaintenanceMode) {
      router.push("/maintenance");
      return;
    }

    if (isAuthPage && isSignedIn && !isSignupPage && project?.id) {
      if (project.activated) {
        router.push("/dashboards");
      } else {
        router.push("/logs?type=llm");
      }
      return;
    }

    if (isSignedIn && isSignupPage && project?.id) {
      router.push("/logs?type=llm");
      return;
    }

    if (!isAuthPage && !isSignedIn && !isPublicPage) {
      router.push("/login");
      return;
    }
  }, [isSignedIn, router.pathname, project]);

  useEffect(() => {
    if (isSignedIn && org?.license?.expiresAt) {
      const expiresAt = new Date(org.license.expiresAt);
      if (expiresAt < new Date()) {
        showErrorNotification(
          "License expired",
          "Please renew your license to access Lunary.",
        );
        signOut();
      } else {
      }
    }
  }, [isSignedIn, org]);

  const isPromptPage = router.pathname.startsWith("/prompt");
  const isTracePage = router.pathname.startsWith("/traces");
  const isIntelligencePage = router.pathname.startsWith("/intelligence");
  const disablePagePadding =
    isPromptPage || isTracePage || isAuthPage || isIntelligencePage;

  useEffect(() => {
    if (user) {
      analytics.identify(user.id, {
        email: user.email,
        name: user.user_metadata?.name,
      });
    }
  }, [user]);

  if (
    !isAuthPage &&
    !isPublicPage &&
    (!user || !org || projects.length === 0)
  ) {
    return (
      <Flex align="center" justify="center" h="100vh">
        <Loader />
      </Flex>
    );
  }

  return (
    <>
      <Notifications position="top-right" />
      <ModalsProvider modals={{ upgrade: UpgradeModal }}>
        <Flex
          h={"100vh"}
          className={org?.limited ? "limited" : ""}
          style={{
            backgroundColor: "var(--mantine-color-body)",
            color: colorScheme === "dark" ? "#eee" : "#333",
          }}
        >
          {!isAuthPage && !isPublicPage && <Sidebar />}
          <Box
            p={disablePagePadding ? 0 : 24}
            pos="relative"
            flex={1}
            style={{
              overflowY: "auto",
              backgroundColor: colorScheme === "light" ? "#fcfcfc" : "inherit",
            }}
          >
            {!isAuthPage && !isPublicPage && <Navbar />}
            {children}
          </Box>
        </Flex>
      </ModalsProvider>
    </>
  );
}
