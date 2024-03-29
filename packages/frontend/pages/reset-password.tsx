import {
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Title,
} from "@mantine/core"

import { useForm } from "@mantine/form"
import { IconAnalyze } from "@tabler/icons-react"

import { NextSeo } from "next-seo"
import { useRouter } from "next/router"
import { useState } from "react"
import { fetcher } from "@/utils/fetcher"
import { useAuth } from "@/utils/auth"
import analytics from "@/utils/analytics"

export default function UpdatePassword() {
  const { setJwt } = useAuth()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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

        return null
      },
    },
  })

  const handlePasswordReset = async ({ password }: { password: string }) => {
    setLoading(true)

    try {
      const { token } = await fetcher.post("/auth/reset-password", {
        arg: {
          password,
          token: router.query.token,
        },
      })

      setJwt(token)

      analytics.track("Password Reset")
    } catch (error) {
      console.error(error)
      setLoading(false)
    }
  }

  return (
    <Container py={100} size={600}>
      <NextSeo title="Reset password" />
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
