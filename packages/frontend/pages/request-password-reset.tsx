import { Button, Paper, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconAt, IconCheck } from "@tabler/icons-react";
import { NextSeo } from "next-seo";
import { useState } from "react";
import errorHandler from "../utils/errors";
import AuthLayout from "@/components/layout/AuthLayout";

export default function PasswordReset() {
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      email: "",
    },

    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : "Invalid email"),
    },
  });

  async function handlePasswordReset({ email }) {
    setLoading(true);

    const res = await errorHandler(
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/request-password-reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      }),
    );

    if (res.ok) {
      notifications.show({
        icon: <IconCheck size={18} />,
        color: "teal",
        title: "Email sent 💌",
        message:
          "Check your emails to verify your email. Please check your spam folder as we currently have deliverability issues.",
      });
    }
    setLoading(false);
  }

  return (
    <AuthLayout>
      <NextSeo title="Request password reset" />

      <Paper radius="md" p="xl" maw={400} miw={350} shadow="md">
        <Text size="lg" mb="lg" fw={500} ta="center">
          Password Recovery
        </Text>

        <Text mb="lg" opacity={0.8}>
          Enter your email address and if it is registered, we will send you a
          link to reset your password.
        </Text>

        <form onSubmit={form.onSubmit(handlePasswordReset)}>
          <Stack gap="lg">
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

            <Button type="submit" fullWidth size="md" loading={loading}>
              Request reset link
            </Button>
          </Stack>
        </form>
      </Paper>
    </AuthLayout>
  );
}
