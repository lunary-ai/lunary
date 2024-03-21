import { Button, Container, Group, Loader, Stack, Text } from "@mantine/core"

import RunInputOutput from "@/components/blocks/RunInputOutput"
import Logo from "@/components/blocks/Logo"

import useSWR from "swr"
import { useRouter } from "next/router"
import { useAuth } from "@/utils/auth"
import Link from "next/link"

export default function PublicRun() {
  const router = useRouter()
  const id = router.query?.id as string

  const { isSignedIn } = useAuth()

  const { data, isLoading, error } = useSWR(
    id && `/runs/${id}${isSignedIn ? "" : `/public`}`,
  )

  return (
    <Container size="sm">
      <Stack gap="xl">
        <Group justify="space-between">
          <Logo />
          {isSignedIn ? (
            <Button component={Link} href="/">
              Dashboard
            </Button>
          ) : (
            <Text>The developer toolkit for LLM apps.</Text>
          )}
        </Group>
        {isLoading && <Loader />}
        {error && <Text>Could not get this log, it might not be public.</Text>}
        {data && (
          <RunInputOutput
            initialRun={data}
            withPlayground={false}
            withShare={false}
          />
        )}
      </Stack>
    </Container>
  )
}
