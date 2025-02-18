import { useRouter } from "next/router";
import { useMemo, useState } from "react";

import {
  Anchor,
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Group,
  List,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";

import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconAt,
  IconCheck,
  IconCircleCheck,
  IconUser,
} from "@tabler/icons-react";

import SocialProof from "@/components/blocks/SocialProof";
import AuthLayout from "@/components/layout/AuthLayout";
import analytics from "@/utils/analytics";
import { useAuth } from "@/utils/auth";
import config from "@/utils/config";
import { fetcher } from "@/utils/fetcher";
import { NextSeo } from "next-seo";
import GoogleButton from "@/components/blocks/OAuth/GoogleButton";
import GithubButton from "@/components/blocks/OAuth/GithubButton";
import Head from "next/head";

function getRandomizedChoices() {
  const choices = [
    { label: "Google", value: "seo" },
    { label: "X / Twitter", value: "twitter" },
    { label: "LangChain", value: "langchain" },
    { label: "LiteLLM", value: "litellm" },
    { label: "Hacker News", value: "hackernews" },
    { label: "Friend", value: "friend" },
    { label: "LangFlow", value: "langflow" },
    { label: "Flowise", value: "flowise" },
    { label: "GitHub", value: "github" },
    { label: "Other", value: "other" },
  ];

  return choices.sort(() => Math.random() - 0.5);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function SignupPage() {
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const auth = useAuth();

  const form = useForm({
    initialValues: {
      email: "",
      name: "",
      projectName: "Project #1",
      orgName: "",
      // employeeCount: "",
      whereFindUs: "",
      password: "",
    },

    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : "Invalid email"),
      name: (val) =>
        val.length <= 2 ? "Is your name really that short? :)" : null,
      projectName: (val) =>
        val.length <= 3 ? "Can you pick something longer?" : null,
      orgName: (val) =>
        val.length <= 3 ? "Can you pick something longer?" : null,
      // employeeCount: (val) =>
      //   val.length <= 1 ? "Please select a value" : null,
      password: (val) => {
        if (val.length < 6) {
          return "Password must be at least 6 characters";
        }
        return null;
      },
    },
  });

  async function handleSignup({
    email,
    password,
    name,
    projectName,
    orgName,
    whereFindUs,
  }: {
    email: string;
    password: string;
    name: string;
    projectName: string;
    orgName: string;
    whereFindUs: string;
  }) {
    setLoading(true);

    if (orgName.includes("https://")) {
      // shadow ban spam
      await sleep(100000000);
      return;
    }

    async function performSignup(recaptchaToken?: string) {
      try {
        const { token } = await fetcher.post("/auth/signup", {
          arg: {
            email,
            password,
            name,
            projectName,
            orgName,
            whereFindUs,
            signupMethod: "signup",
            recaptchaToken,
          },
        });

        if (!token) {
          throw new Error("No token received");
        }
        auth.setJwt(token);
        analytics.track("Signup", {
          email,
          name,
          method: "email_password",
        });

        if (!config.IS_SELF_HOSTED) {
          notifications.show({
            icon: <IconCheck size={18} />,
            color: "teal",
            title: "Email sent",
            message: "Check your emails for the confirmation link",
            autoClose: 10000,
          });
        }

        router.push("/");
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    if (!config.IS_SELF_HOSTED) {
      grecaptcha.ready(async () => {
        try {
          const recaptchaToken = await grecaptcha.execute(
            config.RECAPTCHA_SITE_KEY,
            { action: "signup" },
          );
          await performSignup(recaptchaToken);
        } catch (error) {
          notifications.show({
            title: "Error",
            message: "Failed to verify reCAPTCHA",
            color: "red",
            autoClose: 10000,
          });
          console.error(error);
          setLoading(false);
        }
      });
    } else {
      await performSignup();
    }
  }

  return (
    <>
      <Head>
        {!config.IS_SELF_HOSTED && (
          <script
            src={`https://www.google.com/recaptcha/api.js?render=${config.RECAPTCHA_SITE_KEY}`}
            async
            defer
          ></script>
        )}
      </Head>
      <AuthLayout>
        <Container size={1200}>
          <NextSeo title="Sign Up" />

          <Stack align="center" gap={50}>
            <>
              <Grid gutter={50} align="center">
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper miw={350} radius="md" p="xl" shadow="md">
                    <form onSubmit={form.onSubmit(handleSignup)}>
                      <Stack gap="lg">
                        <Title order={2} fw={700} ta="center">
                          Create your account
                        </Title>
                        <TextInput
                          leftSection={<IconAt size="16" />}
                          label="Email"
                          type="email"
                          autoComplete="email"
                          error={form.errors.email}
                          placeholder="Your email"
                          {...form.getInputProps("email")}
                        />

                        <TextInput
                          label="Name"
                          autoComplete="name"
                          leftSection={<IconUser size="16" />}
                          placeholder="Your full name"
                          error={form.errors.name}
                          {...form.getInputProps("name")}
                          onChange={(e) => {
                            form.setFieldValue("name", e.target.value);
                            form.setFieldValue(
                              "orgName",
                              e.target.value + "'s Org",
                            );
                          }}
                        />

                        <PasswordInput
                          label="Password"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSignup(form.values);
                            }
                          }}
                          error={form.errors.password}
                          placeholder="Pick a  password"
                          {...form.getInputProps("password")}
                        />

                        <Button
                          size="md"
                          mt="xs"
                          radius="md"
                          data-testid="continue-button"
                          type="submit"
                          fullWidth
                          loading={loading}
                        >
                          {`Create Account`}
                        </Button>

                        <Text size="sm" style={{ textAlign: "center" }}>
                          {`Already have an account? `}
                          <Anchor href="/login">Log In</Anchor>
                        </Text>

                        {!config.IS_SELF_HOSTED && (
                          <Stack>
                            <Group w="100%">
                              <Divider
                                size="xs"
                                w="100%"
                                c="dimmed"
                                label={<Text size="sm">OR</Text>}
                              />
                            </Group>
                            <GoogleButton />
                            <GithubButton accessToken={router.query.code} />
                          </Stack>
                        )}
                      </Stack>
                    </form>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Stack gap={50}>
                    <Box>
                      <List
                        spacing="xl"
                        size="md"
                        icon={
                          <ThemeIcon
                            variant="light"
                            color="teal"
                            size={24}
                            radius="xl"
                          >
                            <IconCircleCheck size="16" />
                          </ThemeIcon>
                        }
                      >
                        <List.Item>
                          <Text fw="bold">No credit card required.</Text>
                          <Text size="sm" opacity={0.8}>
                            1K free events per day. Forever.
                          </Text>
                        </List.Item>
                        <List.Item>
                          <Text fw="bold">Collect data immediately</Text>
                          <Text size="sm" opacity={0.8}>
                            10+ integrations like LangChain and OpenAI.
                          </Text>
                        </List.Item>
                        <List.Item>
                          <Text fw="bold">Improve your chatbot</Text>
                          <Text size="sm" opacity={0.8}>
                            Get insights without a complicated setup.
                          </Text>
                        </List.Item>
                      </List>
                    </Box>
                    <SocialProof />
                  </Stack>
                </Grid.Col>
              </Grid>
            </>
          </Stack>
          <style jsx global>{`
            #booking-page {
              width: 1200px;
              max-width: 90vw;
            }
          `}</style>
        </Container>
      </AuthLayout>
    </>
  );
}

export default SignupPage;
