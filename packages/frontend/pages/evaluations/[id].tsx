import ResultsMatrix from "@/components/Evals/ResultsMatrix"
import { useProjectSWR } from "@/utils/dataHooks"
import { Anchor, Container, Loader, Stack, Title } from "@mantine/core"

import { useRouter } from "next/router"
import { useState } from "react"

// We create a matrix of results for each prompt, variable and model.
// The matrix is a 3D array, where each dimension represents a different

export default function EvalResults() {
  const router = useRouter()
  const [groupBy, setGroupBy] = useState("none")

  const { data, isLoading } = useProjectSWR(
    router.query.id && `/evaluations/result/${router.query.id}`,
  )

  if (isLoading) {
    return <Loader />
  }

  return (
    <Container size="100%">
      <Stack>
        <Anchor href="/evaluations">← Back to evaluations</Anchor>
        <Title>Results</Title>
        {/* 
        TODO: FIX GROUPING (currently it hides half of the results)
        <Group>
          <Text>Group by:</Text>
          <SegmentedControl
            w={200}
            size="xs"
            data={[
              {
                value: "none",
                label: "None",
              },
              {
                value: "model",
                label: "Model",
              },
              {
                value: "prompt",
                label: "Prompt",
              },
            ]}
            value={groupBy}
            onChange={setGroupBy}
          />
        </Group> */}
        {data?.length > 0 ? (
          <ResultsMatrix data={data} groupBy={groupBy} />
        ) : (
          <p>No data</p>
        )}
      </Stack>
    </Container>
  )
}
