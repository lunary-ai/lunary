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
      password: "",
    },

    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : "Invalid email"),
      password: (val) =>
        val.length < 5 ? "Password must be at least 5 characters" : null,
    },
  })

  const user = useUser()

  useEffect(() => {
    if (user) Router.push("/")
  }, [user])

  const handleLoginWithPassword = async ({
    email,
    password,
  }: {
    email: string
    password: string
  }) => {
    setLoading(true)

    const ok = await errorHandler(
      supabaseClient.auth.signInWithPassword({ email, password }),
    )

    analytics.track("Login", { method: "password" })

    if (ok) {
      Router.push("/")
    }

    setLoading(false)
  }

  return (
    <Container pt="60" size="600">
      <NextSeo title="Login" />
      <Stack align="center" gap="50">
        <Stack align="center">
          <IconAnalyze color="#206dce" size="60" />
          <Title order={2} fw="700" size="40" ta="center">
            Welcome back
          </Title>
        </Stack>
        <Paper radius="md" p="xl" withBorder miw="350">
          <Text size="lg" mb="xl" fw="500">
            Sign In
          </Text>

          <form onSubmit={form.onSubmit(handleLoginWithPassword)}>
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
                error={form.errors.email && "Invalid email"}
                placeholder="Your email"
              />

              <div>
                <TextInput
                  type="password"
                  autoComplete="current-password"
                  label="Password"
                  value={form.values.password}
                  onChange={(event) =>
                    form.setFieldValue("password", event.currentTarget.value)
                  }
                  error={
                    form.errors.password &&
                    "Password must be at least 6 characters"
                  }
                  placeholder="Your password"
                />
                <Anchor
                  display="block"
                  pt="xs"
                  size="sm"
                  href="/request-password-reset"
                >
                  Forgot password?
                </Anchor>
              </div>

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
