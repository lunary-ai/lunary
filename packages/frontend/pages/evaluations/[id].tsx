import ResultsMatrix from "@/components/Evals/ResultsMatrix"
import { useProjectSWR } from "@/utils/dataHooks"
import { Anchor, Loader, Title } from "@mantine/core"
import { useRouter } from "next/router"

// We create a matrix of results for each prompt, variable and model.
// The matrix is a 3D array, where each dimension represents a different

export default function EvalResults() {
  const router = useRouter()

  const { data, isLoading } = useProjectSWR(
    router.query.id && `/evaluations/result/${router.query.id}`,
  )

  return (
    <div>
      <Anchor href="/evaluations" mb="xl">
        ← Back to evaluations
      </Anchor>
      <Title>Results</Title>
      {isLoading && <Loader />}
      {!!data?.length ? <ResultsMatrix data={data} /> : <p>No data</p>}
    </div>
  )
}
