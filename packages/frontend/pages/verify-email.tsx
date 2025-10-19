import { useUser } from "@/utils/dataHooks";
import { fetcher } from "@/utils/fetcher";
import { Container, Loader, Stack, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAnalyze, IconCheck, IconCross } from "@tabler/icons-react";
import { NextSeo } from "@/utils/seo";
import Router, { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";

function VerifiedContent() {
  return (
    <>
      <IconCheck color={"#206dce"} size={60} />
      <Title order={2} fw={700} size={40} ta="center">
        Email verified
      </Title>
    </>
  );
}

function VerifyingContent() {
  return (
    <>
      <Loader color={"#206dce"} type="dots" />
      <Title order={2} fw={700} size={40} ta="center">
        Verifying your email
      </Title>
    </>
  );
}

function ErrorContent() {
  return (
    <>
      <IconAnalyze color={"#206dce"} size={60} />
      <Title order={2} fw={700} size={40} ta="center">
        Verify your email
      </Title>
      <Text c="dimmed" fz="sm" ta="center">
        Please check your email for the verification link
      </Text>
    </>
  );
}

function VerificationContent({ status }) {
  if (status === "verified") return <VerifiedContent />;
  if (status === "verifying") return <VerifyingContent />;
  return <ErrorContent />;
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const { isReady, query } = router;
  const { user } = useUser();
  const token = Array.isArray(query.token) ? query.token[0] : query.token;

  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "verifying" | "verified" | "error"
  >("idle");

  const verifyEmail = useCallback(async (token: string) => {
    setVerificationStatus("verifying");
    try {
      await fetcher.get(`/users/verify-email?token=${token}`);
      setVerificationStatus("verified");

      notifications.show({
        icon: <IconCheck size={18} />,
        color: "teal",
        title: "Success",
        message: "Email verified successfully",
      });

      if (user) {
        setTimeout(() => Router.push("/"), 100);
      }
    } catch (err: any) {
      console.error(err);
      setVerificationStatus("error");

      notifications.show({
        icon: <IconCross size={18} />,
        color: "red",
        title: "Error",
        message: err.message ?? "Something went wrong",
      });
    }
  }, []);

  useEffect(() => {
    if (isReady && token) verifyEmail(token);
  }, [isReady, token, verifyEmail]);

  if (!isReady) return <Loader />;

  return (
    <Container py={100} size={600}>
      <NextSeo title="verify email" />
      <Stack align="center" gap={50}>
        <Stack align="center">
          <VerificationContent status={verificationStatus} />
        </Stack>
      </Stack>
    </Container>
  );
}
