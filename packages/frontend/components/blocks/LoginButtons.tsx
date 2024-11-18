import analytics from "@/utils/analytics";
import { useAuth } from "@/utils/auth";
import { fetcher } from "@/utils/fetcher";
import { Button, Text, useComputedColorScheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useGoogleLogin } from "@react-oauth/google";
import Image from "next/image";
import { useRouter } from "next/router";
import GithubIconSrc from "public/assets/github-mark.svg";
import GoogleIconSrc from "public/assets/google-icon.svg";
import { useEffect } from "react";

function LoginButton(
  authHook: any,
  method: string,
  label: string,
  iconSrc: string,
) {
  const router = useRouter();
  const auth = useAuth();
  const scheme = useComputedColorScheme();

  const login = authHook({
    onSuccess: async (tokenResponse) => {
      try {
        const response = await fetcher.post(`/auth/${method}`, {
          arg: {
            accessToken: tokenResponse.access_token,
          },
        });

        const { token, isNewUser } = response;

        if (isNewUser) {
          analytics.track("Signup", {
            email: response.email,
            name: response.name,
            method,
          });
        }

        if (token) {
          auth.setJwt(token);
          router.push("/");
        }
      } catch (error) {
        console.error(`${label} login error:`, error);
        notifications.show({
          color: "red",
          message: `Failed to login with ${label}. Please try again.`,
        });
      }
    },
  });

  return (
    <Button
      size="md"
      variant="outline"
      color={scheme === "light" ? "black" : "white"}
      onClick={() => login()}
      justify="flex-start"
      leftSection={
        <Image src={iconSrc} alt={`${method}-icon`} width="18" height="18" />
      }
    >
      <Text ml="xs" size="15px" fw="normal">
        Continue with {label}
      </Text>
    </Button>
  );
}

export function GoogleLoginButton() {
  return LoginButton(useGoogleLogin, "google", "Google", GoogleIconSrc);
}

export function GithubLoginButton() {
  return LoginButton(
    () => () => {
      window.location.assign(
        `https://github.com/login/oauth/authorize?scope=user:email&client_id=${process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID}&redirect_uri=${window.location.origin}/auth/github/callback`,
      );
    },
    "github",
    "Github",
    GithubIconSrc,
  );
}
