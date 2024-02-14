import ResultsMatrix from "@/components/Evals/ResultsMatrix"
import { useProjectSWR } from "@/utils/dataHooks"
import { Anchor, Box, Container, Loader, Title } from "@mantine/core"
import { useRouter } from "next/router"

// We create a matrix of results for each prompt, variable and model.
// The matrix is a 3D array, where each dimension represents a different

export default function EvalResults() {
  const router = useRouter()

  const { data, isLoading } = useProjectSWR(
    router.query.id && `/evaluations/result/${router.query.id}`,
  )

  if (isLoading) {
    return <Loader />
  }

  return (
    <Container size="100%">
      <Box mb="md">
        <Anchor href="/evaluations">← Back to evaluations</Anchor>
      </Box>
      <Box>
        <Title>Results</Title>
        {data.length > 0 ? <ResultsMatrix data={data} /> : <p>No data</p>}
      </Box>
    </Container>
  )
}
