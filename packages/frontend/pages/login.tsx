import {
  Anchor,
  Button,
  Container,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";

import { useForm } from "@mantine/form";
import { IconAt } from "@tabler/icons-react";

import { useEffect, useState } from "react";

import GoogleLoginButton from "@/components/blocks/GoogleLoginButton";
import AuthLayout from "@/components/layout/AuthLayout";
import analytics from "@/utils/analytics";
import { useAuth } from "@/utils/auth";
import { fetcher } from "@/utils/fetcher";
import { notifications } from "@mantine/notifications";
import { NextSeo } from "next-seo";
import { useRouter } from "next/router";
import config from "@/utils/config";

function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"email" | "password" | "saml">("email");
  const [ssoURI, setSsoURI] = useState<string | null>(null);
  const auth = useAuth();

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },

    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : "Invalid email"),
      password: (val) =>
        val.length < 6 ? "Password must be at least 6 characters" : null,
    },
  });

  async function determineAuthMethod(email: string) {
    setLoading(true);
    try {
      // clear any leftover token
      window.localStorage.clear();

      const { method, redirect } = await fetcher.post("/auth/method", {
        arg: {
          email,
        },
      });

      if (method === "password") {
        setStep("password");

        // if autofilled, submit the form
        if (form.values.password) {
          await handleLoginWithPassword({
            email,
            password: form.values.password,
          });
        }
      } else if (method === "saml") {
        setSsoURI(redirect);
        setStep("saml");
        window.location.href = redirect;
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }

  async function handleLoginWithPassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    setLoading(true);

    try {
      const { token, message } = await fetcher.post("/auth/login", {
        arg: {
          email,
          password,
        },
      });

      if (message && !token) {
        notifications.show({
          message,
        });
        setLoading(false);
        return;
      }

      if (!token) {
        throw new Error("No token received");
      }

      auth.setJwt(token);
      router.push("/");
      analytics.track("Login", { method: "password" });
    } catch (error) {
      console.error(error);
      auth.setJwt(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    const exchangeToken = async (ott) => {
      setLoading(true);
      try {
        const { token } = await fetcher.post("/auth/exchange-token", {
          arg: {
            onetimeToken: ott,
          },
        });
        if (token) {
          auth.setJwt(token);
          analytics.track("Login", { method: "saml" });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const ott = router.query.ott;

    if (ott) exchangeToken(ott);
  }, [router.query.ott]);

  useEffect(() => {
    const email = router.query.email
      ? decodeURIComponent(router.query.email as string)
      : "";
    if (email && !form.values.email) {
      form.setFieldValue("email", email);
      determineAuthMethod(email);
    }
  }, [router.query.email]);

  return (
    <AuthLayout>
      <Container size="600" pt="60">
        <NextSeo title="Login" />
        <Stack align="center" gap="50">
          <Paper radius="md" p="xl" miw="350" shadow="md">
            <Text size="xl" mb="lg" fw="700" ta="center">
              Welcome back!
            </Text>

            {step !== "saml" && (
              <form
                onSubmit={
                  step === "email"
                    ? (e) => {
                        determineAuthMethod(form.values.email);
                        e.preventDefault();
                      }
                    : form.onSubmit(handleLoginWithPassword)
                }
              >
                <Stack>
                  <TextInput
                    leftSection={<IconAt size="16" />}
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={form.values.email}
                    onChange={(event) =>
                      form.setFieldValue("email", event.currentTarget.value)
                    }
                    error={form.errors.email}
                    placeholder="Your email"
                  />

                  <Stack gap="sm">
                    <TextInput
                      type="password"
                      opacity={step === "email" ? 0 : 1}
                      h={step === "email" ? 0 : "auto"}
                      autoComplete="current-password"
                      label="Password"
                      value={form.values.password}
                      onChange={(event) =>
                        form.setFieldValue(
                          "password",
                          event.currentTarget.value,
                        )
                      }
                      error={form.errors.password}
                      placeholder="Your password"
                    />
                    {step === "password" && (
                      <Text size="sm">
                        <Anchor href="/request-password-reset">
                          Forgot password?
                        </Anchor>
                      </Text>
                    )}
                  </Stack>

                  <Button
                    mt={step === "email" ? 0 : "sm"}
                    type="submit"
                    fullWidth
                    size="md"
                    loading={loading}
                    data-testid="continue-button"
                  >
                    {step === "email" ? "Continue" : "Login"}
                  </Button>
                </Stack>
              </form>
            )}

            {step === "saml" && (
              <p>
                Redirecting to your SSO login.
                <br />
                If you are not redirected in 5s,{" "}
                <Anchor href={ssoURI || ""}>click here</Anchor>.
              </p>
            )}

            <Text size="sm" mt="sm" style={{ textAlign: "center" }}>
              {`Don't have an account? `}
              <Anchor href="/signup">Sign Up</Anchor>
            </Text>

            {!config.IS_SELF_HOSTED && (
              <Stack mt="lg">
                <Group w="100%">
                  <Divider
                    size="xs"
                    w="100%"
                    c="dimmed"
                    label={<Text size="sm">OR</Text>}
                  />
                </Group>
                <GoogleLoginButton />
              </Stack>
            )}
          </Paper>
        </Stack>
      </Container>
    </AuthLayout>
  );
}
export default LoginPage;
