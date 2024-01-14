import TemplateInputArea from "@/components/Prompts/TemplateInputArea"
import { useDataset } from "@/utils/dataHooks"
import { Box, Container, Flex, SimpleGrid, Stack, Title } from "@mantine/core"
import { useRouter } from "next/router"

export default function Dataset() {
  const router = useRouter()
  const { id } = router.query as { id: string }
  // const input = useInput([])

  const { dataset } = useDataset(id)
  return (
    <Container>
      <Stack>
        <Title>{dataset?.slug}</Title>
        {/* <pre>{JSON.stringify(dataset, null, 2)}</pre> */}
        <SimpleGrid cols={2} spacing="md">
          <div>
            <Title order={4}>Input</Title>
            {/* <TemplateInputArea /> */}
          </div>
          <div>
            <Title order={4}>Output</Title>
            {/* <pre>{JSON.stringify(dataset, null, 2)}</pre> */}
          </div>
        </SimpleGrid>
        {dataset?.runs?.map((run) => (
          <Flex key={run.id} align="center" justify="space-between">
            <Box>{run.input}</Box>
            <Box>{run.output}</Box>
          </Flex>
        ))}
      </Stack>
    </Container>
  )
}
