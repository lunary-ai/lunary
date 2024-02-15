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
import { IconAnalyze, IconAt } from "@tabler/icons-react"

import { useState } from "react"

import analytics from "@/utils/analytics"
import { fetcher } from "@/utils/fetcher"
import { NextSeo } from "next-seo"
import { useAuth } from "@/utils/auth"

function LoginPage() {
  const [loading, setLoading] = useState(false)
  const auth = useAuth()

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
  })

  async function handleLoginWithPassword({
    email,
    password,
  }: {
    email: string
    password: string
  }) {
    setLoading(true)

    try {
      const { token } = await fetcher.post("/auth/login", {
        arg: {
          email,
          password,
        },
      })

      if (!token) {
        throw new Error("No token received")
      }

      auth.setJwt(token)

      analytics.track("Login", { method: "password" })
    } catch (error) {
      console.error(error)

      // empty local storage
      auth.setJwt(null)
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
                error={form.errors.email}
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
                  error={form.errors.password}
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
