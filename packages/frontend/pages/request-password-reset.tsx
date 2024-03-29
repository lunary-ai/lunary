import {
  Button,
  Container,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core"
import { useForm } from "@mantine/form"
import { notifications } from "@mantine/notifications"
import { IconAnalyze, IconAt, IconCheck } from "@tabler/icons-react"
import { NextSeo } from "next-seo"
import { useState } from "react"
import errorHandler from "../utils/errors"

export default function PasswordReset() {
  const [loading, setLoading] = useState(false)

  const form = useForm({
    initialValues: {
      email: "",
    },

    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : "Invalid email"),
    },
  })

  async function handlePasswordReset({ email }) {
    setLoading(true)

    const res = await errorHandler(
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/request-password-reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      }),
    )

    if (res.ok) {
      notifications.show({
        icon: <IconCheck size={18} />,
        color: "teal",
        title: "Email sent 💌",
        message:
          "Check your emails to verify your email. Please check your spam folder as we currently have deliverability issues.",
      })
    }
    setLoading(false)
  }

  return (
    <Container py={100} size={600}>
      <NextSeo title="Login" />
      <Stack align="center" gap={50}>
        <Stack align="center">
          <IconAnalyze color={"#206dce"} size={60} />
          <Title order={2} fw={700} size={40} ta="center">
            Forgot password
          </Title>
        </Stack>

        <Paper radius="md" p="xl" withBorder miw={350}>
          <Text size="lg" mb="xl" fw={500}>
            Request reset link
          </Text>

          <form onSubmit={form.onSubmit(handlePasswordReset)}>
            <Stack>
              <TextInput
                leftSection={<IconAt size="16" />}
                label="Email"
                type="email"
                value={form.values.email}
                onChange={(event) =>
                  form.setFieldValue("email", event.currentTarget.value)
                }
                error={form.errors.email && "Invalid email"}
                placeholder="Your email"
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
