import Router, { useRouter } from "next/router"
import { useEffect, useState } from "react"

import {
  Alert,
  Anchor,
  Box,
  Button,
  Container,
  Grid,
  Group,
  List,
  Paper,
  PasswordInput,
  Radio,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core"

import Confetti from "react-confetti"

import Cal, { getCalApi } from "@calcom/embed-react"

import { useForm } from "@mantine/form"
import { notifications } from "@mantine/notifications"
import {
  IconAnalyze,
  IconArrowRight,
  IconAt,
  IconBuildingStore,
  IconCheck,
  IconCircleCheck,
  IconFolderBolt,
  IconMail,
  IconMessageBolt,
  IconUser,
} from "@tabler/icons-react"

import SocialProof from "@/components/blocks/SocialProof"
import analytics from "@/utils/analytics"
import { fetcher } from "@/utils/fetcher"
import { NextSeo } from "next-seo"
import { useAuth } from "@/utils/auth"
import config from "@/utils/config"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const router = useRouter()

  const auth = useAuth()

  const form = useForm({
    initialValues: {
      email: "",
      name: "",
      projectName: "Project #1",
      orgName: "",
      employeeCount: "",
      password: "",
    },

    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : "Invalid email"),
      name: (val) => (val.length <= 2 ? "Is your name that short :) ?" : null),
      projectName: (val) =>
        val.length <= 3 ? "Can you pick something longer?" : null,
      orgName: (val) =>
        val.length <= 3 ? "Can you pick something longer?" : null,
      employeeCount: (val) =>
        val.length <= 1 ? "Please select a value" : null,
      password: (val) => {
        if (val.length < 6) {
          return "Password must be at least 6 characters"
        }
        return null
      },
    },
  })

  async function handleSignup({
    email,
    password,
    name,
    projectName,
    orgName,
    employeeCount,
  }: {
    email: string
    password: string
    name: string
    projectName: string
    orgName: string
    employeeCount: string
  }) {
    setLoading(true)

    if (orgName.includes("https://")) {
      // shadow ban spam
      await sleep(100000000)
      return
    }

    try {
      const { token } = await fetcher.post("/auth/signup", {
        arg: {
          email,
          password,
          name,
          projectName,
          orgName,
          employeeCount,
          signupMethod: "signup",
        },
      })

      if (!token) {
        throw new Error("No token received")
      }

      auth.setJwt(token)

      if (!config.IS_SELF_HOSTED) {
        notifications.show({
          icon: <IconCheck size={18} />,
          color: "teal",
          title: "Email sent",
          message: "Check your emails for the confirmation link",
        })
      } else {
        nextStep()
      }

      analytics.track("Signup", {
        email,
        name,
        projectName,
        orgName,
        employeeCount,
      })
      nextStep()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  function nextStep() {
    if (step === 1) {
      if (
        ["email", "name", "password"].some(
          (field) => form.validateField(field).hasError,
        )
      ) {
        return
      }
    }

    if (step === 2 && !form.values.orgName) {
      form.setFieldValue("orgName", form.values.name + "'s Org")
    }

    setStep(step + 1)
    router.query.step = String(step + 1)
    router.push(router)
  }

  useEffect(() => {
    if (step === 3) {
      ;(async function () {
        const Cal = await getCalApi()
        Cal("ui", {
          styles: { branding: { brandColor: "#000000" } },
          hideEventTypeDetails: true,
          layout: "month_view",
        })
      })()
    }
  }, [step])

  const isBigCompany = form.values.employeeCount !== "1-5"

  return (
    <Container size={step === 3 ? 1200 : 800} mih="60%">
      <NextSeo title="Sign Up" />

      <Stack align="center" gap={50}>
        {step < 3 && (
          <>
            <Stack align="center">
              <IconAnalyze color={"#206dce"} size={60} />
              <Title order={2} fw={700} size={40} ta="center">
                lunary cloud
              </Title>
            </Stack>
            <Grid gutter={50} align="center" mb="sm">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper radius="md" p="xl" withBorder>
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
                            label="Full Name"
                            autoComplete="name"
                            description="Only used to address you properly."
                            leftSection={<IconUser size="16" />}
                            placeholder="Your full name"
                            error={form.errors.name}
                            {...form.getInputProps("name")}
                            onChange={(e) => {
                              form.setFieldValue("name", e.target.value)
                              form.setFieldValue(
                                "orgName",
                                e.target.value + "'s Org",
                              )
                            }}
                          />

                          <PasswordInput
                            label="Password"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                nextStep()
                              }
                            }}
                            error={form.errors.password}
                            placeholder="Your password"
                            {...form.getInputProps("password")}
                          />

                          <Button
                            size="md"
                            mt="md"
                            onClick={nextStep}
                            fullWidth
                            loading={loading}
                          >
                            {`Continue →`}
                          </Button>

                          <Text size="sm" style={{ textAlign: "center" }}>
                            {`Already have an account? `}
                            <Anchor href="/login">Log In</Anchor>
                          </Text>
                        </>
                      )}

                      {step === 2 && (
                        <>
                          <Title order={2} fw={700} ta="center">
                            Create an organization
                          </Title>

                          <TextInput
                            label="Organization Name"
                            description="Eg. your company name"
                            leftSection={<IconBuildingStore size="16" />}
                            placeholder="Organization name"
                            error={
                              form.errors.projectName &&
                              "This field is required"
                            }
                            {...form.getInputProps("orgName")}
                          />

                          <TextInput
                            label="Project Name"
                            description="Can be changed later."
                            leftSection={<IconFolderBolt size="16" />}
                            placeholder="Your project name"
                            error={
                              form.errors.projectName &&
                              "This field is required"
                            }
                            {...form.getInputProps("projectName")}
                          />

                          <Radio.Group
                            label="Employee count"
                            error={
                              form.errors.employeeCount &&
                              "This field is required"
                            }
                            {...form.getInputProps("employeeCount")}
                          >
                            <Group mt="xs">
                              <Radio value="1-5" label="1-5" />
                              <Radio value="11-50" label="6-49" />
                              <Radio value="51-100" label="50-99" />
                              <Radio value="101-500" label="100+" />
                            </Group>
                          </Radio.Group>

                          <Stack gap="xs">
                            <Button
                              size="md"
                              mt="md"
                              type="submit"
                              fullWidth
                              loading={loading}
                            >
                              {`Create account`}
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => {
                                router.query.step = String(1)
                                router.push(router)
                                setStep(1)
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

              <Grid.Col span={{ base: 12, md: 6 }}>
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
                      <Text fw="bold">Free usage every month</Text>
                      <Text>
                        1K free events per day. Forever.
                        <br />
                        No credit card required.
                      </Text>
                    </List.Item>
                    <List.Item>
                      <Text fw="bold">Collect data immediately</Text>
                      <Text>
                        Integrate with dev-friendly SDKs, with native support
                        for LangChain and OpenAI.
                      </Text>
                    </List.Item>
                    <List.Item>
                      <Text fw="bold">No config required</Text>
                      <Text>Get insights without complicated setup.</Text>
                    </List.Item>
                  </List>
                </Box>
              </Grid.Col>
            </Grid>
            <SocialProof />
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

              {isBigCompany ? (
                <>
                  <Text size="xl" ta="center" my="xl">
                    Are you free in the next days for a quick call?
                    <br />
                    We'd love to understand your use-case and help you directly
                    with the integration.
                  </Text>
                  <Cal
                    // namespace="lunary"
                    calLink="vincelwt/lunary"
                    className="calcom-embed"
                    config={{
                      hideEventTypeDetails: "true",
                      layout: "month_view",
                      name: "vince loewe", //form.values.name,
                      email: "vince@lunary.ai", //form.values.email,
                    }}
                  />
                  <Button
                    onClick={() => {
                      // use this to refresh properly
                      window.location.href = "/"
                    }}
                    variant="subtle"
                    rightSection={<IconArrowRight size={16} />}
                    size="md"
                  >
                    Skip to Dashboard
                  </Button>
                </>
              ) : (
                <>
                  <Alert fw={500} icon={<IconMail />} my="lg">
                    <Text size="md" fw={500}>
                      Check your emails for the confirmation link.
                    </Text>
                  </Alert>

                  <Button
                    onClick={() => {
                      window.location.href = "/"
                    }}
                    variant={isBigCompany ? "outline" : "filled"}
                    mb="xl"
                    rightSection={<IconArrowRight size={18} />}
                    size="lg"
                  >
                    Open Dashboard
                  </Button>

                  <Text size="lg">
                    {`Want to say hi? We'd love to talk to you.`}
                  </Text>

                  <Group>
                    {!config.IS_SELF_HOSTED && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          $crisp.push(["do", "chat:open"])
                        }}
                        rightSection={<IconMessageBolt size={18} />}
                      >
                        Chat
                      </Button>
                    )}

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
        .calcom-embed {
          height: 470px;
          width: 100%;
          overflow: auto;
        }

        iframe main > div > span {
          display: none !important;
        }
      `}</style>
    </Container>
  )
}

export default SignupPage
