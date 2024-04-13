import { useEffect, useState } from "react"

import {
  Anchor,
  Button,
  Container,
  Flex,
  Loader,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core"

import { useForm } from "@mantine/form"
import { IconAnalyze, IconAt, IconCheck, IconUser } from "@tabler/icons-react"

import analytics from "@/utils/analytics"
import { useAuth } from "@/utils/auth"
import errorHandler from "@/utils/errors"
import { fetcher } from "@/utils/fetcher"
import { SEAT_ALLOWANCE } from "@/utils/pricing"
import { decodeJwt } from "jose"
import { NextSeo } from "next-seo"
import Router, { useRouter } from "next/router"
import Confetti from "react-confetti"
import { notifications } from "@mantine/notifications"
import { useJoinData } from "@/utils/dataHooks"
import config from "@/utils/config"

function TeamFull({ orgName }) {
  return (
    <Container py={100} size={600}>
      <NextSeo title="Signup" />
      <Stack align="center" gap={30}>
        <IconAnalyze color={"#206dce"} size={60} />
        <Title order={2} fw={700} size={40} ta="center">
          Sorry, ${orgName} is full
        </Title>

        <Flex align="center" gap={30}>
          <Button size="md" onClick={() => Router.push("/")}>
            Go back home
          </Button>
          {!config.IS_SELF_HOSTED && (
            <Anchor
              component="button"
              type="button"
              onClick={() => {
                $crisp.push(["do", "chat:open"])
              }}
            >
              Contact support →
            </Anchor>
          )}
        </Flex>
      </Stack>
    </Container>
  )
}
export default function Join() {
  const router = useRouter()
  const { token } = router.query

  const { data: joinData } = useJoinData(token as string)

  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  useEffect(() => {
    if (router.isReady) {
      router.query.step = String(step)
      router.replace(router)
    }
  }, [step, router.isReady])

  const form = useForm({
    initialValues: {
      email: "",
      name: "",
      password: "",
      confirmPassword: "",
    },

    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : "Invalid email"),
      name: (val) => (val.length <= 2 ? "Your name that short :) ?" : null),
      password: (val) =>
        step === 2 && val.length < 6
          ? "Password must be at least 6 characters"
          : null,
      confirmPassword: (val) =>
        step === 2 && val !== form.values.password
          ? "Passwords do not match"
          : null,
    },
  })

  const handleSignup = async ({
    email,
    name,
    redirectUrl,
    password,
  }: {
    email: string
    name: string
    redirectUrl?: string
    password?: string
  }) => {
    setLoading(true)

    const signupData = {
      email,
      name,
      orgId,
      signupMethod: "join",
      token,
      password,
      redirectUrl,
    }

    const ok = await errorHandler(
      fetcher.post("/auth/signup", {
        arg: signupData,
      }),
    )

    if (ok) {
      analytics.track("Join", { email, name, orgId })

      notifications.show({
        icon: <IconCheck size={18} />,
        color: "teal",
        message: `You have joined ${orgName}`,
      })

      window.location.href = redirectUrl || "/login"
    }

    setLoading(false)
  }

  const continueStep = async () => {
    const { email, name, password } = form.values

    setLoading(true)
    try {
      if (step === 1) {
        const { method, redirect } = await fetcher.post("/auth/method", {
          arg: {
            email,
          },
        })

        if (method === "saml") {
          await handleSignup({
            email,
            name,
            redirectUrl: redirect,
          })
        } else {
          setStep(2)
        }
      } else if (step === 2) {
        await handleSignup({
          email,
          name,
          password,
        })

        setStep(3)
      }
    } catch (error) {
      console.error(error)
    }
    setLoading(false)
  }

  if (!joinData) {
    return <Loader />
  }

  const { orgUserCount, orgName, orgId, orgPlan } = joinData

  if (orgUserCount >= SEAT_ALLOWANCE[orgPlan]) {
    return <TeamFull orgName={orgName} />
  }

  return (
    <Container py={100} size={600}>
      <NextSeo title="Join" />

      <Stack align="center" gap={50}>
        <Stack align="center">
          <IconAnalyze color={"#206dce"} size={60} />
          <Title order={2} fw={700} size={40} ta="center">
            Join {orgName}
          </Title>
        </Stack>
        <Paper radius="md" p="xl" withBorder miw={350}>
          <form onSubmit={form.onSubmit(continueStep)}>
            <Stack gap="lg">
              {step < 3 && (
                <>
                  <TextInput
                    label="Full Name"
                    autoComplete="name"
                    description="Only used to address you properly."
                    leftSection={<IconUser size="16" />}
                    placeholder="Your full name"
                    error={form.errors.name && "This field is required"}
                    {...form.getInputProps("name")}
                  />

                  <TextInput
                    leftSection={<IconAt size="16" />}
                    label="Email"
                    type="email"
                    autoComplete="email"
                    error={form.errors.email && "Invalid email"}
                    placeholder="Your email"
                    {...form.getInputProps("email")}
                  />

                  {step === 2 && (
                    <>
                      <PasswordInput
                        label="Password"
                        autoComplete="new-password"
                        error={form.errors.password && "Invalid password"}
                        placeholder="Your password"
                        {...form.getInputProps("password")}
                      />
                      <PasswordInput
                        label="Confirm Password"
                        autoComplete="new-password"
                        error={form.errors.password && "Invalid password"}
                        placeholder="Your password"
                        {...form.getInputProps("confirmPassword")}
                      />
                    </>
                  )}

                  <Button
                    size="md"
                    mt="md"
                    type="submit"
                    fullWidth
                    loading={loading}
                  >
                    {step === 2 ? `Confirm signup →` : `Continue →`}
                  </Button>
                </>
              )}

              {step === 3 && (
                <>
                  <Confetti
                    recycle={false}
                    numberOfPieces={500}
                    gravity={0.3}
                  />

                  <Stack align="center">
                    <IconAnalyze color={"#206dce"} size={60} />
                    <Title order={2} fw={700} size={40} ta="center">
                      You're all set 🎉
                    </Title>

                    {!config.IS_SELF_HOSTED && (
                      <>
                        <Text size="lg" mt="xs" mb="xl" fw={500}>
                          Check your emails for the confirmation link.
                        </Text>
                      </>
                    )}

                    <Button
                      onClick={() => router.push("/")}
                      variant="outline"
                      size="lg"
                    >
                      Open Dashboard
                    </Button>
                  </Stack>
                </>
              )}
            </Stack>
          </form>
        </Paper>
      </Stack>
    </Container>
  )
}
