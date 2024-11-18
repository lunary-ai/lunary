import analytics from "@/utils/analytics";
import { useAuth } from "@/utils/auth";
import { fetcher } from "@/utils/fetcher";
import { Alert, Loader, useComputedColorScheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconX } from "@tabler/icons-react";
import router, { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

// Using useMemo runs the callback twice
function runOnce(callback: any) {
  let isRunning = false,
    result: any;
  return async (...args: any[]) => {
    if (isRunning) return;
    isRunning = true;
    result = await callback(...args);
    isRunning = false;
    return result;
  };
}

async function handleLoginWithGithub(auth: any, code: string) {
  try {
    const response = await fetcher.post("/auth/github", {
      arg: { code },
    });

    const { token, isNewUser } = response;

    if (isNewUser) {
      analytics.track("Signup", {
        email: response.email,
        name: response.name,
        method: "github",
      });
    }

    if (token) {
      auth.setJwt(token);
      router.push("/");
    }
  } catch (error) {
    console.error("Github login error:", error);
    notifications.show({
      color: "red",
      message: "Failed to login with Github. Please try again.",
    });
  }
}

export default function GithubOAuthCalllbackPage() {
  const router = useRouter();
  const auth = useAuth();
  const scheme = useComputedColorScheme();
  const { code, error, error_description } = router.query;

  useMemo(() => {
    if (code) {
      runOnce(handleLoginWithGithub)(auth, code as string)
        .then(() => router.push("/"))
        .catch(() => router.push("/login"));
    }

    if (error) {
      notifications.show({
        color: "red",
        title: error === "access_denied" ? "Access Denied" : error,
        icon: <IconAlertTriangle size={14} />,
        message: error_description,
      });
    }
  }, [code, error]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: scheme === "dark" ? "#1a1b1e" : "#f3f4f6",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 20,
          width: 400,
          padding: 20,
        }}
      >
        {error ? (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 600 }}>Access Denied</h1>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <IconAlertTriangle color="red" size={70} />
            </div>
            <p style={{ fontSize: 16, color: "#666" }}>{error_description}</p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 600 }}>Signing in...</h1>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Loader />
            </div>
            <p style={{ fontSize: 16, color: "#666" }}>
              Please wait while we sign you in with Github.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
