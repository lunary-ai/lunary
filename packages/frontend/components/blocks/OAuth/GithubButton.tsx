import analytics from "@/utils/analytics";
import { useAuth } from "@/utils/auth";
import { fetcher } from "@/utils/fetcher";
import { Button, Text, useComputedColorScheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useGoogleLogin } from "@react-oauth/google";
import Image from "next/image";
import { useRouter } from "next/router";
import GithubIconWhiteSrc from "public/assets/github-icon-white.svg";
import GithubIconBlackSrc from "public/assets/github-icon-black.svg";
import { useEffect, useState } from "react";

export default function GithubButton({ accessToken }) {
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const auth = useAuth();
  const scheme = useComputedColorScheme();

  function getToken() {
    window.location.assign(
      `https://github.com/login/oauth/authorize?scope=user:email&client_id=${process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID}&redirect_uri=${window.location.origin}/login`,
    );
  }

  async function login(tokenResponse) {
    try {
      setIsLoading(true);
      const response = await fetcher.post("/auth/github", {
        arg: {
          accessToken,
        },
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
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (accessToken) {
      login(accessToken);
    }
  }, [accessToken]);

  return (
    <Button
      size="md"
      variant="outline"
      color={scheme === "light" ? "black" : "white"}
      loading={isLoading}
      onClick={getToken}
      justify="flex-start"
      leftSection={
        <Image
          src={scheme === "light" ? GithubIconBlackSrc : GithubIconWhiteSrc}
          alt="google-icon"
          width="18"
          height="18"
        />
      }
    >
      <Text ml="xs" size="15px" fw="normal">
        Continue with Github
      </Text>
    </Button>
  );
}
