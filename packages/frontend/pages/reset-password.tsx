import {
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Title,
} from "@mantine/core"

import { useForm } from "@mantine/form"
import { IconAnalyze, IconCheck } from "@tabler/icons-react"

import errorHandler from "@/utils/errorHandler"
import { notifications } from "@mantine/notifications"
import { NextSeo } from "next-seo"
import Router, { useRouter } from "next/router"
import { useState } from "react"
import { submitNewPassword } from "supertokens-web-js/recipe/emailpassword"
import { fetcher } from "@/utils/fetcher"

export default function UpdatePassword() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const { token, email } = router.query as {
    token: string
    email: string
  }

  const form = useForm({
    initialValues: {
      password: "",
    },

    validate: {
      password: (val) => {
        // TODO: refactor with other forms
        if (val.length < 6) {
          return "Password must be at least 6 characters"
        }

        if (!/\d/.test(val)) {
          return "Password must contain at least one number"
        }
        return null
      },
    },
  })

  const handlePasswordReset = async ({ password }: { password: string }) => {
    setLoading(true)

    const body = await errorHandler(
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/request-reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password, token }),
      }),
    )

    notifications.show({
      icon: <IconCheck size={18} />,
      color: "teal",
      title: "Success",
      message: "Password updated successfully",
    })

    Router.push("/")

    setLoading(false)
  }

  return (
    <Container py={100} size={600}>
      <NextSeo title="Login" />
      <Stack align="center" gap={50}>
        <Stack align="center">
          <IconAnalyze color={"#206dce"} size={60} />
          <Title order={2} fw={700} size={40} ta="center">
            Reset password
          </Title>
        </Stack>
        <Paper radius="md" p="xl" withBorder miw={350}>
          <form onSubmit={form.onSubmit(handlePasswordReset)}>
            <Stack>
              <PasswordInput
                label="New Password"
                type="password"
                autoComplete="new-password"
                value={form.values.password}
                onChange={(event) =>
                  form.setFieldValue("password", event.currentTarget.value)
                }
                error={form.errors.password && "Invalid password"}
                placeholder="Your new password"
              />

              <Button mt="md" type="submit" fullWidth loading={loading}>
                Submit
              </Button>
            </Stack>
          </form>
        </Paper>
      </Stack>
    </Container>
  )
}
