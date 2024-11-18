import analytics from "@/utils/analytics";
import { useAuth } from "@/utils/auth";
import { fetcher } from "@/utils/fetcher";
import { Button, Text, useComputedColorScheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useGoogleLogin } from "@react-oauth/google";
import Image from "next/image";
import { useRouter } from "next/router";
import GoogleIconSrc from "public/assets/google-icon.svg";

export default function GoogleButton() {
  const router = useRouter();
  const auth = useAuth();
  const scheme = useComputedColorScheme();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const response = await fetcher.post("/auth/google", {
          arg: {
            accessToken: tokenResponse.access_token,
          },
        });

        const { token, isNewUser } = response;

        if (isNewUser) {
          analytics.track("Signup", {
            email: response.email,
            name: response.name,
            method: "google",
          });
        }

        if (token) {
          auth.setJwt(token);
          router.push("/");
        }
      } catch (error) {
        console.error("Google login error:", error);
        notifications.show({
          color: "red",
          message: "Failed to login with Google. Please try again.",
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
        <Image src={GoogleIconSrc} alt="google-icon" width="18" height="18" />
      }
    >
      <Text ml="xs" size="15px" fw="normal">
        Continue with Google
      </Text>
    </Button>
  );
}
