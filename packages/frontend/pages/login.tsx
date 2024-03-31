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

import { useEffect, useState } from "react"

import analytics from "@/utils/analytics"
import { fetcher } from "@/utils/fetcher"
import { NextSeo } from "next-seo"
import { useAuth } from "@/utils/auth"
import { useRouter } from "next/router"
import { notifications } from "@mantine/notifications"

function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"email" | "password" | "saml">("email")
  const [ssoURI, setSsoURI] = useState<string | null>(null)
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

  async function determineAuthMethod(email: string) {
    setLoading(true)
    try {
      // clear any leftover token
      window.localStorage.clear()

      const { method, redirect } = await fetcher.post("/auth/method", {
        arg: {
          email,
        },
      })

      if (method === "password") {
        setStep("password")

        // if autofilled, submit the form
        if (form.values.password) {
          await handleLoginWithPassword({
            email,
            password: form.values.password,
          })
        }
      } else if (method === "saml") {
        setSsoURI(redirect)
        setStep("saml")
        window.location.href = redirect
      }
    } catch (error) {
      console.error(error)
    }
    setLoading(false)
  }

  async function handleLoginWithPassword({
    email,
    password,
  }: {
    email: string
    password: string
  }) {
    setLoading(true)

    try {
      const { token, message } = await fetcher.post("/auth/login", {
        arg: {
          email,
          password,
        },
      })

      if (message && !token) {
        notifications.show({
          message,
        })
        setLoading(false)
        return
      }

      if (!token) {
        throw new Error("No token received")
      }

      auth.setJwt(token)
      analytics.track("Login", { method: "password" })
    } catch (error) {
      console.error(error)
      auth.setJwt(null)
    }

    setLoading(false)
  }

  useEffect(() => {
    const exchangeToken = async (ott) => {
      setLoading(true)
      try {
        const { token } = await fetcher.post("/auth/exchange-token", {
          arg: {
            onetimeToken: ott,
          },
        })
        if (token) {
          auth.setJwt(token)
          analytics.track("Login", { method: "saml" })
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    const ott = router.query.ott

    if (ott) exchangeToken(ott)
  }, [router.query.ott])

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
          <Text size="lg" mb="xl" fw="700">
            Sign In
          </Text>

          {step !== "saml" && (
            <form
              onSubmit={
                step === "email"
                  ? (e) => {
                      determineAuthMethod(form.values.email)
                      e.preventDefault()
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
                <TextInput
                  type="password"
                  opacity={step === "email" ? 0 : 1}
                  h={step === "email" ? 0 : "auto"}
                  autoComplete="current-password"
                  label="Password"
                  value={form.values.password}
                  onChange={(event) =>
                    form.setFieldValue("password", event.currentTarget.value)
                  }
                  error={form.errors.password}
                  placeholder="Your password"
                />
                <Button
                  mt={step === "email" ? 0 : "md"}
                  type="submit"
                  fullWidth
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

          {step === "password" && (
            <Text size="sm" mt="sm" style={{ textAlign: "center" }}>
              <Anchor href="/request-password-reset">Forgot password?</Anchor>
            </Text>
          )}
        </Paper>
      </Stack>
    </Container>
  )
}
export default LoginPage
