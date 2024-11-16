import { fetcher } from "@/utils/fetcher";
import { Container, Loader, Stack, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAnalyze, IconCheck, IconCross } from "@tabler/icons-react";
import { NextSeo } from "next-seo";
import Router from "next/router";
import { useEffect, useState } from "react";

function VerifiedContent() {
  return (
    <>
      <IconCheck color={"#206dce"} size={60} />
      <Title order={2} fw={700} size={40} ta="center">
        Email verified
      </Title>
      <Text c="dimmed" fz="sm" ta="center">
        Redirecting...
      </Text>
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
  const [verificationStatus, setVerificationStatus] = useState("error");
  const { token } = Router.query;

  const verifyEmail = async ({ token }: { token: string }) => {
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

      setTimeout(() => Router.push("/"), 100);
    } catch (error) {
      console.error(error);

      setVerificationStatus("error");
      notifications.show({
        icon: <IconCross size={18} />,
        color: "red",
        title: "Error",
        message: error.message,
      });
    }
  };

  useEffect(() => {
    if (token) {
      verifyEmail({ token: token as string });
    }
  }, [token]);

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
