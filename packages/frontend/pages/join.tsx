import {
  Anchor,
  Button,
  Container,
  Divider,
  Flex,
  Group,
  Loader,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconAnalyze,
  IconAt,
  IconCheck,
  IconMailCheck,
  IconUser,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import GoogleButton from "@/components/blocks/OAuth/GoogleButton";

import analytics from "@/utils/analytics";
import { useAuth } from "@/utils/auth";
import config from "@/utils/config";
import { useJoinData } from "@/utils/dataHooks";
import { fetcher } from "@/utils/fetcher";
import { SEAT_ALLOWANCE } from "@/utils/pricing";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { NextSeo } from "next-seo";
import Router, { useRouter } from "next/router";
import Confetti from "react-confetti";
import { show } from "@intercom/messenger-js-sdk";

function TeamFull({ orgName }: { orgName: string }) {
  return (
    <Container py={100} size={600}>
      <NextSeo title="Signup" />
      <Stack align="center" gap={30}>
        <IconAnalyze color="#206dce" size={60} />
        <Title order={2} fw={700} size={40} ta="center">
          Sorry, {orgName} is full
        </Title>

        <Flex align="center" gap={30}>
          <Button size="md" onClick={() => Router.push("/")}>
            Go back home
          </Button>
          {!config.IS_SELF_HOSTED && (
            <Anchor
              component="button"
              type="button"
              onClick={() => {
                config.IS_CLOUD && show();
              }}
            >
              Contact support →
            </Anchor>
          )}
        </Flex>
      </Stack>
    </Container>
  );
}

async function sendVerificationEmail(email: string, name: string) {
  await fetcher.post("/users/send-verification", { arg: { email, name } });
  notifications.show({
    icon: <IconMailCheck size={18} />,
    message: `Verification link sent to ${email}`,
  });
}

export default function Join() {
  const router = useRouter();
  const { token } = router.query;

  const { data: joinData } = useJoinData(token as string);
  const [samlRedirected, setSamlRedirected] = useState(false);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [acknowledged, setAck] = useState(false);
  const modalOpened = useRef(false);
  const auth = useAuth();

  useEffect(() => {
    if (!joinData || modalOpened.current) return;

    const { oldRole, orgName } = joinData;
    const isOwner = oldRole === "owner";
    const inOrg = oldRole && oldRole !== "owner";

    if (!inOrg && !isOwner) {
      setAck(true);
      return;
    }

    modalOpened.current = true;

    modals.openConfirmModal({
      centered: true,
      withCloseButton: false,
      closeOnEscape: false,
      closeOnClickOutside: false,
      title: (
        <Flex align="center" gap="sm">
          <Text fw={700} size="lg">
            Confirmation Required
          </Text>
        </Flex>
      ),
      children: (
        <Stack gap="xs">
          <Text>
            You are currently {isOwner ? "the owner" : "a member"} of an
            organisation.
          </Text>

          {isOwner ? (
            <Text>
              By joining <b>Lunary</b>, your current organisation&nbsp;
              <b>{orgName}</b> will be&nbsp;
              <Text span fw={700} c="red">
                permanently deleted
              </Text>{" "}
              along with all its data.
            </Text>
          ) : (
            <Text>
              By joining <b>Lunary</b>, you will&nbsp;
              <Text span fw={700} c="red">
                leave your current organisation
              </Text>
              .
            </Text>
          )}
        </Stack>
      ),
      labels: {
        confirm: isOwner
          ? "Delete organisation & continue"
          : "Leave organisation & continue",
        cancel: "Cancel",
      },
      confirmProps: { color: "red" },
      onConfirm: () => setAck(true),
      onCancel: () => Router.push("/"),
    });
  }, [joinData]);

  useEffect(() => {
    if (router.isReady) {
      router.query.step = String(step);
      router.replace(router);
    }
  }, [step, router.isReady]);

  useEffect(() => {
    async function checkSamlRedirect() {
      if (!joinData || !acknowledged || samlRedirected) return;
      
      const { samlEnabled, orgId } = joinData;
      
      if (samlEnabled) {
        setSamlRedirected(true);
        try {
          const { url } = await fetcher.get(`/auth/saml-url/${orgId}?joinToken=${token}`);
          window.location.href = url;
        } catch (error) {
          console.error("Failed to get SAML URL:", error);
          setSamlRedirected(false);
        }
      }
    }
    
    checkSamlRedirect();
  }, [joinData, acknowledged, samlRedirected, token]);

  const form = useForm({
    initialValues: {
      email: "",
      name: "",
      password: "",
      confirmPassword: "",
    },

    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : "Invalid email"),
      name: (val) => (val.length <= 2 ? "Your name that short :) ?" : null),
      password: (val) =>
        step === 3 && val.length < 6
          ? "Password must be at least 6 characters"
          : null,
      confirmPassword: (val) =>
        step === 3 && val !== form.values.password
          ? "Passwords do not match"
          : null,
    },
  });

  async function handleSignup({
    email,
    name,
    redirectUrl,
    password,
  }: {
    email: string;
    name: string;
    redirectUrl?: string;
    password?: string;
  }) {
    setLoading(true);

    const signupData = {
      email,
      name,
      orgId,
      signupMethod: "join",
      token,
      password,
      redirectUrl,
    } as any;

    try {
      const { authToken } = await fetcher.post("/auth/signup", {
        arg: signupData,
      });

      auth.setJwt(authToken);
      notifications.show({
        icon: <IconCheck size={18} />,
        color: "teal",
        message: `You have joined ${orgName}`,
      });
      analytics.track("Join", { email, name, orgId });
    } catch (error) {
      setLoading(false);
      throw error;
    }
    setLoading(false);
  }

  const continueStep = async () => {
    const { email, name, password } = form.values;

    setLoading(true);
    try {
      if (step === 1) {
        const { method, redirect } = await fetcher.post("/auth/method", {
          arg: { email, joinToken: token },
        });

        const mustVerify = !!joinData?.oldRole && method === "password";

        if (mustVerify) {
          await sendVerificationEmail(email, name);
          setStep(2);
          setLoading(false);
          return;
        }

        if (method === "saml") {
          await handleSignup({
            email,
            name,
            redirectUrl: redirect,
          });
          setStep(4);
        } else {
          setStep(3);
        }
      } else if (step === 2) {
        setStep(3);
      } else if (step === 3) {
        try {
          await handleSignup({
            email,
            name,
            password,
          });
          setStep(4);
        } catch (error) {
          alert("Email not verified");
        }
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  if (!joinData) {
    return <Loader />;
  }

  const { orgUserCount, orgName, orgId, orgPlan, orgSeatAllowance, samlEnabled } = joinData;
  const seatAllowance = orgSeatAllowance || SEAT_ALLOWANCE[orgPlan];

  if (orgUserCount >= seatAllowance) {
    return <TeamFull orgName={orgName} />;
  }

  if (samlEnabled && acknowledged && !samlRedirected) {
    return (
      <Container py={100} size={600}>
        <Stack align="center" gap={30}>
          <Loader size="lg" />
          <Title order={3}>Redirecting to your organization's login...</Title>
        </Stack>
      </Container>
    );
  }

  return (
    <Container py={100} size={600}>
      <NextSeo title="Join" />

      <Stack align="center" gap={50}>
        <Stack align="center">
          <IconAnalyze color="#206dce" size={60} />
          <Title order={2} fw={700} size={40} ta="center">
            Join {orgName}
          </Title>
        </Stack>
        <Paper radius="md" p="xl" withBorder miw={350}>
          <form onSubmit={form.onSubmit(continueStep)}>
            <Stack gap="lg">
              {step === 1 && (
                <>
                  <TextInput
                    label="Full Name"
                    autoComplete="name"
                    description="Only used to address you properly."
                    leftSection={<IconUser size={16} />}
                    placeholder="Your full name"
                    error={form.errors.name && "This field is required"}
                    {...form.getInputProps("name")}
                  />

                  <TextInput
                    leftSection={<IconAt size="16" />}
                    label="Email"
                    type="email"
                    autoComplete="email"
                    error={form.errors.email && "Invalid email"}
                    placeholder="Your email"
                    {...form.getInputProps("email")}
                  />

                  <Button
                    size="md"
                    mt="md"
                    type="submit"
                    fullWidth
                    loading={loading}
                    disabled={!acknowledged}
                  >
                    Continue →
                  </Button>
                </>
              )}

              {step === 2 && (
                <Stack align="center" gap="lg">
                  <IconMailCheck size={48} stroke={1.2} color="#206dce" />
                  <Title order={3} ta="center">
                    Verify your email
                  </Title>
                  <Text ta="center" c="dimmed">
                    We’ve sent a verification link to {form.values.email}. Click
                    it, then come back here.
                  </Text>
                  <Button size="md" loading={loading} fullWidth type="submit">
                    I have verified →
                  </Button>
                  <Anchor
                    component="button"
                    size="sm"
                    onClick={async () => {
                      await sendVerificationEmail(
                        form.values.email,
                        form.values.name,
                      );
                    }}
                  >
                    Resend email
                  </Anchor>
                </Stack>
              )}

              {step === 3 && (
                <>
                  <PasswordInput
                    label="Password"
                    autoComplete="new-password"
                    error={form.errors.password && "Invalid password"}
                    placeholder="Your password"
                    {...form.getInputProps("password")}
                  />
                  <PasswordInput
                    label="Confirm Password"
                    autoComplete="new-password"
                    error={
                      form.errors.confirmPassword && "Passwords do not match"
                    }
                    placeholder="Your password"
                    {...form.getInputProps("confirmPassword")}
                  />

                  <Button
                    size="md"
                    mt="md"
                    type="submit"
                    fullWidth
                    loading={loading}
                  >
                    Confirm signup →
                  </Button>
                </>
              )}

              {step === 4 && (
                <>
                  <Confetti
                    recycle={false}
                    numberOfPieces={500}
                    gravity={0.3}
                  />

                  <Stack align="center">
                    <IconAnalyze color="#206dce" size={60} />
                    <Title order={2} fw={700} size={40} ta="center">
                      You're all set 🎉
                    </Title>

                    {!config.IS_SELF_HOSTED && (
                      <Text size="lg" mt="xs" mb="xl" fw={500}>
                        Check your emails for the confirmation link.
                      </Text>
                    )}

                    <Button
                      onClick={() => router.push("/")}
                      variant="outline"
                      size="lg"
                    >
                      Open Dashboard
                    </Button>
                  </Stack>
                </>
              )}
            </Stack>
          </form>

          {step === 1 && (
            <Stack mt="lg">
              <Group w="100%">
                <Divider
                  size="xs"
                  w="100%"
                  c="dimmed"
                  label={<Text size="sm">OR</Text>}
                />
              </Group>

              <GoogleButton joinToken={token} />
            </Stack>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
