import { useEffect, useState } from "react"

import { useSearchParams } from "next/navigation"
import {
  Anchor,
  Button,
  Container,
  Flex,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core"

import { useForm } from "@mantine/form"
import { IconAnalyze, IconAt, IconCheck, IconUser } from "@tabler/icons-react"

import Router from "next/router"
import errorHandler from "@/utils/errorHandler"
import analytics from "@/utils/analytics"
import { NextSeo } from "next-seo"
import { notifications } from "@mantine/notifications"
import Confetti from "react-confetti"
import sql from "@/lib/db"
import { useSessionContext } from "supertokens-auth-react/recipe/session"
import { signUp } from "supertokens-auth-react/recipe/emailpassword"

export async function getServerSideProps(context) {
  const { orgId } = context.query

  const [org] = await sql`
    SELECT name FROM org WHERE id = ${orgId}
  `

  const [orgUserCountResult] = await sql`
    SELECT COUNT(*) FROM profile WHERE org_id = ${orgId}
  `
  const orgUserCount = orgUserCountResult.count

  return { props: { orgUserCount, orgName: org?.name, orgId } }
}

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
          <Anchor
            component="button"
            type="button"
            onClick={() => {
              $crisp.push(["do", "chat:open"])
            }}
          >
            Contact support →
          </Anchor>
        </Flex>
      </Stack>
    </Container>
  )
}
export default function Join({ orgUserCount, orgName }) {
  const searchParams = useSearchParams()
  const orgId = searchParams.get("orgId")

  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  const form = useForm({
    initialValues: {
      email: "",
      name: "",
      password: "",
    },

    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : "Invalid email"),
      name: (val) => (val.length <= 2 ? "Your name that short :) ?" : null),
      password: (val) =>
        val.length < 6 ? "Password must be at least 6 characters" : null,
    },
  })

  const session = useSessionContext()

  useEffect(() => {
    if (session) Router.push("/")
  }, [session])

  const handleSignup = async ({
    email,
    password,
    name,
  }: {
    email: string
    password: string
    name: string
  }) => {
    setLoading(true)

    const ok = await errorHandler(
      signUp({
        formFields: [
          { id: "email", value: email },
          { id: "password", value: password },
          { id: "name", value: name },
          { id: "orgName", value: orgName },
          { id: "signupMethod", value: "signup" },
        ],
      }),
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

  if (orgUserCount > 4) {
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
          <form onSubmit={form.onSubmit(handleSignup)}>
            <Stack gap="xl">
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
                </>
              )}

              {step === 2 && (
                <>
                  <Title order={2} fw={700} ta="center">
                    Almost there...
                  </Title>

                  <TextInput
                    label="Full Name"
                    autoComplete="name"
                    description="Only used to address you properly."
                    leftSection={<IconUser size="16" />}
                    placeholder="Your full name"
                    error={form.errors.name && "This field is required"}
                    {...form.getInputProps("name")}
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
                      You&nbsp;re all set 🎉
                    </Title>

                    <Text size="lg" mt="xs" mb="xl" fw={500}>
                      Check your emails for the confirmation link.
                    </Text>

                    <Button
                      onClick={() => Router.push("/")}
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
