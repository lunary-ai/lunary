import { useRouter } from "next/router";
import { useMemo, useState } from "react";

import {
  Alert,
  Anchor,
  Box,
  Button,
  Center,
  Container,
  Grid,
  Group,
  List,
  Paper,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  useComputedColorScheme,
} from "@mantine/core";

import Confetti from "react-confetti";

import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconArrowRight,
  IconAt,
  IconBuildingStore,
  IconCheck,
  IconCircleCheck,
  IconFolderBolt,
  IconMail,
  IconMessageBolt,
  IconUser,
} from "@tabler/icons-react";

import SocialProof from "@/components/blocks/SocialProof";
import analytics from "@/utils/analytics";
import { fetcher } from "@/utils/fetcher";
import { NextSeo } from "next-seo";
import { useAuth } from "@/utils/auth";
import config from "@/utils/config";
import AuthLayout from "@/components/layout/AuthLayout";

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
  const [step, setStep] = useState(1);

  const choices = useMemo(() => getRandomizedChoices(), []);

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
    // employeeCount,
    whereFindUs,
  }: {
    email: string;
    password: string;
    name: string;
    projectName: string;
    orgName: string;
    // employeeCount: string;
    whereFindUs: string;
  }) {
    setLoading(true);

    if (orgName.includes("https://")) {
      // shadow ban spam
      await sleep(100000000);
      return;
    }

    try {
      const { token } = await fetcher.post("/auth/signup", {
        arg: {
          email,
          password,
          name,
          projectName,
          orgName,
          // employeeCount,
          whereFindUs,
          signupMethod: "signup",
        },
      });

      if (!token) {
        throw new Error("No token received");
      }

      auth.setJwt(token);

      analytics.track("Signup", {
        email,
        name,
        projectName,
        orgName,
        whereFindUs,
        // employeeCount,
      });

      if (!config.IS_SELF_HOSTED) {
        notifications.show({
          icon: <IconCheck size={18} />,
          color: "teal",
          title: "Email sent",
          message: "Check your emails for the confirmation link",
        });
      }

      nextStep();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function nextStep() {
    if (step === 1) {
      if (
        ["email", "name", "password"].some(
          (field) => form.validateField(field).hasError,
        )
      ) {
        return;
      }
    }

    if (step === 2 && !form.values.orgName) {
      form.setFieldValue("orgName", form.values.name + "'s Org");
    }

    analytics.track("Signup Step " + (step + 1), {
      email: form.values.email,
      name: form.values.name,
    });

    setStep(step + 1);

    router.query.step = String(step + 1);
    router.push(router);
  }

  const isBigCompany = form.values.employeeCount !== "1-5";

  const scheme = useComputedColorScheme();

  return (
    <AuthLayout>
      <Container size={step === 1 ? 1200 : 800}>
        <NextSeo title="Sign Up" />

        <Stack align="center" gap={50}>
          {step < 3 && (
            <>
              <Grid gutter={50} align="center">
                <Grid.Col span={{ base: 12, md: step === 1 ? 6 : 12 }}>
                  <Paper miw={350} radius="md" p="xl" shadow="md">
                    <form onSubmit={form.onSubmit(handleSignup)}>
                      <Stack gap="lg">
                        {step === 1 && (
                          <>
                            <Title order={2} fw={700} ta="center">
                              Get Started
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
                                  nextStep();
                                }
                              }}
                              error={form.errors.password}
                              placeholder="Pick a  password"
                              {...form.getInputProps("password")}
                            />

                            <Button
                              size="md"
                              mt="md"
                              radius="md"
                              data-testid="continue-button"
                              className="CtaBtn"
                              onClick={nextStep}
                              fullWidth
                              loading={loading}
                            >
                              {`Create Account`}
                            </Button>

                            <Text size="sm" style={{ textAlign: "center" }}>
                              {`Already have an account? `}
                              <Anchor href="/login">Log In</Anchor>
                            </Text>
                          </>
                        )}

                        {step === 2 && (
                          <>
                            <TextInput
                              label="Organization Name"
                              description="E.g. your company name"
                              leftSection={<IconBuildingStore size="16" />}
                              placeholder="Organization name"
                              error={
                                form.errors.orgName && "This field is required"
                              }
                              {...form.getInputProps("orgName")}
                            />

                            <TextInput
                              label="Project Name"
                              description="Can be changed later"
                              leftSection={<IconFolderBolt size="16" />}
                              placeholder="Your project name"
                              error={
                                form.errors.projectName &&
                                "This field is required"
                              }
                              {...form.getInputProps("projectName")}
                            />

                            {/* <Radio.Group
                            label="Company Size"
                            error={
                              form.errors.employeeCount &&
                              "This field is required"
                            }
                            {...form.getInputProps("employeeCount")}
                          >
                            <Group mt="xs">
                              <Radio value="1-5" label="1-5" />
                              <Radio value="6-49" label="6-49" />
                              <Radio value="50-99" label="50-99" />
                              <Radio value="100+" label="100+" />
                            </Group>
                          </Radio.Group> */}

                            <Select
                              searchable
                              label="Where did you find us?"
                              description="This helps us focus our efforts :)"
                              placeholder="Select an option"
                              data={choices}
                              {...form.getInputProps("whereFindUs")}
                            />

                            <Stack gap="xs">
                              <Button
                                size="md"
                                mt="md"
                                className="CtaBtn"
                                type="submit"
                                data-testid="finish-button"
                                fullWidth
                                loading={loading}
                              >
                                {`Finish`}
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => {
                                  router.query.step = String(1);
                                  router.push(router);
                                  setStep(1);
                                }}
                                fullWidth
                                variant="transparent"
                                color="dimmed"
                              >
                                {`← Go back`}
                              </Button>
                            </Stack>
                          </>
                        )}
                      </Stack>
                    </form>
                  </Paper>
                </Grid.Col>

                {step === 1 && (
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
                )}
              </Grid>
            </>
          )}

          {step === 3 && (
            <>
              {typeof window !== "undefined" && !isBigCompany && (
                <Confetti
                  recycle={false}
                  numberOfPieces={500}
                  gravity={0.3}
                  width={window.innerWidth}
                  height={window.innerHeight}
                />
              )}

              <Stack align="center" w={800}>
                {/* <IconAnalyze color={"#206dce"} size={60} /> */}

                <Title order={2} fw={700} size={40} ta="center">
                  {`You're all set 🎉`}
                </Title>

                <Alert fw={500} icon={<IconMail />} my="lg">
                  <Text size="md" fw={500}>
                    Check your emails for the confirmation link.
                  </Text>
                </Alert>

                <Button
                  onClick={() => {
                    window.location.href = "/";
                  }}
                  variant={isBigCompany ? "outline" : "filled"}
                  mb="xl"
                  data-testid="open-dashboard-button"
                  rightSection={<IconArrowRight size={18} />}
                  size="lg"
                >
                  Open Dashboard
                </Button>

                {!config.IS_SELF_HOSTED && (
                  <>
                    <Text size="lg">
                      {`Want to say hi? We'd love to talk to you.`}
                    </Text>

                    <Group>
                      <Button
                        variant="outline"
                        onClick={() => {
                          $crisp.push(["do", "chat:open"]);
                        }}
                        rightSection={<IconMessageBolt size={18} />}
                      >
                        Chat
                      </Button>

                      <Button
                        variant="outline"
                        color="teal.8"
                        component="a"
                        href="mailto:hello@lunary.ai"
                        rightSection={<IconMail size={18} />}
                      >
                        Email
                      </Button>
                    </Group>
                  </>
                )}
              </Stack>
            </>
          )}
        </Stack>
        <style jsx global>{`
          #booking-page {
            width: 1200px;
            max-width: 90vw;
          }
        `}</style>
      </Container>
    </AuthLayout>
  );
}

export default SignupPage;
