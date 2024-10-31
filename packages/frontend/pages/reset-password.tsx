import { Button, Paper, PasswordInput, Stack, Text } from "@mantine/core";

import { useForm } from "@mantine/form";

import { NextSeo } from "next-seo";
import { useRouter } from "next/router";
import { useState } from "react";
import { fetcher } from "@/utils/fetcher";
import { useAuth } from "@/utils/auth";
import analytics from "@/utils/analytics";
import AuthLayout from "@/components/layout/AuthLayout";

export default function UpdatePassword() {
  const { setJwt } = useAuth();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm({
    initialValues: {
      password: "",
    },

    validate: {
      password: (val) => {
        // TODO: refactor with other forms
        if (val.length < 6) {
          return "Password must be at least 6 characters";
        }

        return null;
      },
    },
  });

  const handlePasswordReset = async ({ password }: { password: string }) => {
    setLoading(true);

    try {
      const { token } = await fetcher.post("/auth/reset-password", {
        arg: {
          password,
          token: router.query.token,
        },
      });

      setJwt(token);

      analytics.track("Password Reset");
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <NextSeo title="Reset password" />
      <Paper radius="md" p="xl" miw={350} shadow="md">
        <Text size="lg" mb="lg" fw="700" ta="center">
          Reset your password
        </Text>
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

            <Button mt="md" size="md" type="submit" fullWidth loading={loading}>
              Confirm
            </Button>
          </Stack>
        </form>
      </Paper>
    </AuthLayout>
  );
}
