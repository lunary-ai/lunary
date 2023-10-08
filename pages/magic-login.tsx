import {
  Anchor,
  Button,
  Container,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core"

import { useForm } from "@mantine/form"
import { useSessionContext, useUser } from "@supabase/auth-helpers-react"
import { IconAnalyze, IconAt, IconCheck } from "@tabler/icons-react"

import Router from "next/router"
import { useEffect, useState } from "react"
import errorHandler from "@/utils/errorHandler"
import analytics from "@/utils/analytics"
import { NextSeo } from "next-seo"
import { notifications } from "@mantine/notifications"

function LoginPage() {
  const [loading, setLoading] = useState(false)

  const { supabaseClient } = useSessionContext()

  const form = useForm({
    initialValues: {
      email: "",
    },

    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : "Invalid email"),
    },
  })

  const user = useUser()

  useEffect(() => {
    if (user) Router.push("/")
  }, [user])

  const handleMagicLogin = async ({ email }: { email: string }) => {
    setLoading(true)

    const ok = await errorHandler(
      supabaseClient.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          shouldCreateUser: false,
        },
      })
    )

    if (ok) {
      notifications.show({
        icon: <IconCheck size={18} />,
        color: "teal",
        title: "Email sent 💌",
        message:
          "Check your emails to verify your email. Please check your spam folder as we currently have deliverability issues.",
      })

      setLoading(false)
    }
  }

  return (
    <Container py={100} size={600}>
      <NextSeo title="Login" />
      <Stack align="center" spacing={50}>
        <Stack align="center">
          <IconAnalyze color={"#206dce"} size={60} />
          <Title order={2} weight={700} size={40} ta="center">
            Welcome back
          </Title>
        </Stack>
        <Paper radius="md" p="xl" withBorder miw={350}>
          <Text size="lg" mb="xl" weight={500}>
            Sign In
          </Text>

          <form onSubmit={form.onSubmit(handleMagicLogin)}>
            <Stack>
              <TextInput
                icon={<IconAt size={16} />}
                label="Email"
                type="email"
                autoComplete="email"
                value={form.values.email}
                onChange={(event) =>
                  form.setFieldValue("email", event.currentTarget.value)
                }
                error={form.errors.email && "Invalid email"}
                placeholder="Your email"
              />

              <Button mt="md" type="submit" fullWidth loading={loading}>
                Login
              </Button>

              <Text size="sm" style={{ textAlign: "center" }}>
                {`Don't have an account? `}
                <Anchor href="/signup">Sign Up</Anchor>
              </Text>
            </Stack>
          </form>
        </Paper>
      </Stack>
    </Container>
  )
}

export default LoginPage
