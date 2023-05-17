import {
  Anchor,
  Button,
  Container,
  Paper,
  Stack,
  Text,
  TextInput,
} from "@mantine/core"

import { useForm } from "@mantine/form"
import { notifications } from "@mantine/notifications"
import { useSessionContext, useUser } from "@supabase/auth-helpers-react"
import { IconAt, IconCheck } from "@tabler/icons-react"

import Router from "next/router"
import { useEffect, useState } from "react"
import errorHandler from "@/utils/errorHandler"

function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { supabaseClient } = useSessionContext()

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },

    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : "Invalid email"),
      //password: (val) =>
      //        val.length < 6 ? "Password must be at least 6 characters" : null,
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
          emailRedirectTo: `${window.location.origin}/app/`,
          shouldCreateUser: false,
        },
      })
    )

    console.log(ok)

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

  const handleLoginWithPassword = async ({
    email,
    password,
  }: {
    email: string
    password: string
  }) => {
    if (!password?.length) return handleMagicLogin({ email })

    setLoading(true)

    const ok = await errorHandler(
      supabaseClient.auth.signInWithPassword({ email, password })
    )

    if (ok) {
      Router.push("/")
    }

    setLoading(false)
  }

  return (
    <Container py={100} size={400}>
      <Paper radius="md" p="xl" withBorder>
        <Text size="lg" mb="xl" weight={500}>
          Welcome back.
        </Text>

        <form onSubmit={form.onSubmit(handleLoginWithPassword)}>
          <Stack>
            <TextInput
              icon={<IconAt size={16} />}
              label="Email"
              description="Enter your email."
              value={form.values.email}
              onChange={(event) =>
                form.setFieldValue("email", event.currentTarget.value)
              }
              error={form.errors.email && "Invalid email"}
              placeholder="Your email"
            />

            {showPassword && (
              <TextInput
                type="password"
                label="Password"
                description="Enter your password or leave empty for a magic login link."
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
            )}

            <Button mt="md" type="submit" fullWidth loading={loading}>
              {form.values.password ? "Login with Password" : "Send Login Link"}
            </Button>
          </Stack>
        </form>

        {!showPassword && (
          <Text size="sm" mt="md" align="center">
            <Anchor onClick={() => setShowPassword(!showPassword)}>
              Use password instead
            </Anchor>
          </Text>
        )}
      </Paper>
    </Container>
  )
}

export default LoginPage
