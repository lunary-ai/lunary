import Router from "next/router"
import { useEffect, useState } from "react"

import {
  Anchor,
  Box,
  Button,
  Container,
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
} from "@mantine/core"

import Confetti from "react-confetti"

import { useForm } from "@mantine/form"
import { notifications } from "@mantine/notifications"
import { useSessionContext, useUser } from "@supabase/auth-helpers-react"
import {
  IconAnalyze,
  IconAt,
  IconBrandDiscord,
  IconCalendar,
  IconCheck,
  IconCircleCheck,
  IconFolderBolt,
  IconMail,
  IconMessageBolt,
  IconUser,
} from "@tabler/icons-react"

import analytics from "@/utils/analytics"
import errorHandler from "@/utils/errorHandler"
import { NextSeo } from "next-seo"

function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  const { supabaseClient } = useSessionContext()

  const form = useForm({
    initialValues: {
      email: "",
      name: "",
      projectName: "Project #1",
      password: "",
      companyName: "",
    },

    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : "Invalid email"),
      name: (val) => (val.length <= 2 ? "Your name that short :) ?" : null),
      projectName: (val) =>
        val.length <= 1 ? "Can you pick something longer?" : null,

      password: (val) =>
        val.length < 6 ? "Password must be at least 6 characters" : null,
    },
  })

  const user = useUser()

  useEffect(() => {
    if (user) Router.push("/")
  }, [user])

  const handleSignup = async ({
    email,
    password,
    name,
    projectName,
  }: {
    email: string
    password: string
    name: string
    projectName: string
  }) => {
    setLoading(true)

    const ok = await errorHandler(
      supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name,
            projectName,
          },
        },
      })
    )

    analytics.track("Signup", { email, name })

    if (ok) {
      notifications.show({
        icon: <IconCheck size={18} />,
        color: "teal",
        title: "Email sent 💌",
        message: "Check your emails to verify your email.",
      })

      setStep(3)
    }

    setLoading(false)
  }

  const nextStep = () => {
    if (step === 1) {
      if (
        form.validateField("email").hasError ||
        form.validateField("password").hasError
      ) {
        return
      }
    }

    setStep(step + 1)
  }

  return (
    <Container py={100} size={800}>
      <NextSeo title="Sign Up" />

      <Stack align="center" spacing={50}>
        {step < 3 && (
          <>
            <Stack align="center">
              <IconAnalyze color={"#206dce"} size={60} />
              <Title order={2} weight={700} size={40} ta="center">
                llmonitor cloud
              </Title>
            </Stack>
            <Grid gutter={50} align="center">
              <Grid.Col span={12} md={6}>
                <Paper radius="md" p="xl" withBorder>
                  <form onSubmit={form.onSubmit(handleSignup)}>
                    <Stack spacing="xl">
                      {step === 1 && (
                        <>
                          <Title order={2} weight={700} ta="center">
                            Get Started
                          </Title>
                          <TextInput
                            icon={<IconAt size={16} />}
                            label="Email"
                            type="email"
                            autoComplete="email"
                            error={form.errors.email && "Invalid email"}
                            placeholder="Your email"
                            {...form.getInputProps("email")}
                          />

                          <PasswordInput
                            label="Password"
                            autoComplete="new-password"
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                nextStep()
                              }
                            }}
                            error={form.errors.password && "Invalid password"}
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
                          <Title order={2} weight={700} ta="center">
                            Almost there...
                          </Title>

                          <TextInput
                            label="Full Name"
                            autoComplete="name"
                            description="Only used to address you properly."
                            icon={<IconUser size={16} />}
                            placeholder="Your full name"
                            error={form.errors.name && "This field is required"}
                            {...form.getInputProps("name")}
                          />

                          <TextInput
                            label="Project Name"
                            description="Can be changed later."
                            icon={<IconFolderBolt size={16} />}
                            placeholder="Your project name"
                            error={
                              form.errors.projectName &&
                              "This field is required"
                            }
                            {...form.getInputProps("projectName")}
                          />

                          <Stack>
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
                              onClick={() => setStep(1)}
                              fullWidth
                              variant="link"
                              color="gray.4"
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

              <Grid.Col span={12} md={6}>
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
                        <IconCircleCheck size={16} />
                      </ThemeIcon>
                    }
                  >
                    <List.Item>
                      <Text weight="bold">Free usage every month</Text>
                      <Text>
                        1K free events per day. Forever.
                        <br />
                        No credit card required.
                      </Text>
                    </List.Item>
                    <List.Item>
                      <Text weight="bold">
                        Start collecting data immediately
                      </Text>
                      <Text>
                        Integrate with developer-friendly SDKs, with native
                        support for LangChain and OpenAI.
                      </Text>
                    </List.Item>
                    <List.Item>
                      <Text weight="bold">No configuration required</Text>
                      <Text>
                        Start getting insights without any complicated setup.
                      </Text>
                    </List.Item>
                  </List>
                </Box>
              </Grid.Col>
            </Grid>
          </>
        )}

        {step === 3 && (
          <>
            <Confetti recycle={false} numberOfPieces={500} gravity={0.3} />

            <Stack align="center">
              <IconAnalyze color={"#206dce"} size={60} />
              <Title order={2} weight={700} size={40} ta="center">
                You're all set 🎉
              </Title>

              <Text size="lg" mt="xs" mb="xl" weight={500}>
                Check your emails for the confirmation to open the dashboard.
              </Text>

              <Text>Want to say hi? We'd love to talk to you:</Text>

              <Group>
                <Button
                  variant="outline"
                  onClick={() => {
                    $crisp.push(["do", "chat:open"])
                  }}
                  rightIcon={<IconMessageBolt size={18} />}
                >
                  Chat
                </Button>

                <Button
                  variant="outline"
                  color="teal.8"
                  component="a"
                  href="mailto:vince@llmonitor.com"
                  rightIcon={<IconMail size={18} />}
                >
                  Email
                </Button>

                <Button
                  variant="outline"
                  color="violet"
                  target="_blank"
                  component="a"
                  href="https://discord.gg/8PafSG58kK"
                  rightIcon={<IconBrandDiscord size={18} />}
                >
                  Discord
                </Button>

                <Button
                  variant="outline"
                  color="red.8"
                  target="_blank"
                  component="a"
                  href="https://savvycal.com/vince/chat"
                  rightIcon={<IconCalendar size={18} />}
                >
                  Call with founder
                </Button>
              </Group>
            </Stack>
          </>
        )}
      </Stack>
    </Container>
  )
}

export default SignupPage
