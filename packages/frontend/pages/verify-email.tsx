import {
  Button,
  Container,
  Loader,
  Paper,
  PasswordInput,
  Stack,
  Text,
  Title,
} from "@mantine/core"

import { useForm } from "@mantine/form"
import { IconAnalyze, IconCheck, IconCross } from "@tabler/icons-react"

import { NextSeo } from "next-seo"
import Router from "next/router"
import { Fragment, useEffect, useMemo, useState } from "react"

import { notifications } from "@mantine/notifications"
import { fetcher } from "@/utils/fetcher"

const API_URL = process.env.API_URL

const VerifyEmailPage = () => {
  const [verificationStatus, setVerificationStatus] = useState("error")
  const { token } = Router.query

  const verifyEmail = async ({ token }: { token: string }) => {
    setVerificationStatus("verifying")

    try {
      await fetcher.get(`/users/verify-email?token=${token}`)

      setVerificationStatus("verified")
      notifications.show({
        icon: <IconCheck size={18} />,
        color: "teal",
        title: "Success",
        message: "Email verified successfully",
      })

      setTimeout(() => Router.push("/"), 100)
    } catch (error) {
      console.error(error)

      setVerificationStatus("error")
      notifications.show({
        icon: <IconCross size={18} />,
        color: "red",
        title: "Error",
        message: error.message,
      })
    }
  }

  useEffect(() => {
    if (token) {
      verifyEmail({ token: token as string })
    }
  }, [token])

  return (
    <Container py={100} size={600}>
      <NextSeo title="verify email" />
      <Stack align="center" gap={50}>
        <Stack align="center">
          {verificationStatus === "verified" ? (
            <Fragment>
              <IconCheck color={"#206dce"} size={60} />
              <Title order={2} fw={700} size={40} ta="center">
                Email verified
              </Title>
              <Text c="dimmed" fz="sm" ta="center">
                Redirecting...
              </Text>
            </Fragment>
          ) : verificationStatus === "verifying" ? (
            <Fragment>
              <Loader color={"#206dce"} type="dots" />
              <Title order={2} fw={700} size={40} ta="center">
                Verifying your email
              </Title>
            </Fragment>
          ) : (
            <Fragment>
              <IconAnalyze color={"#206dce"} size={60} />
              <Title order={2} fw={700} size={40} ta="center">
                Verify your email
              </Title>
              <Text c="dimmed" fz="sm" ta="center">
                Please check your email for the verification link
              </Text>
            </Fragment>
          )}
        </Stack>
      </Stack>
    </Container>
  )
}

export default VerifyEmailPage
