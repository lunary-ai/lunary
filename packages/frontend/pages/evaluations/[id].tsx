import ResultsMatrix from "@/components/Evals/ResultsMatrix"
import { Container, Title } from "@mantine/core"
import { useParams } from "next/navigation"

// We create a matrix of results for each prompt, variable and model.
// The matrix is a 3D array, where each dimension represents a different

export default function EvalResults() {
  return (
    <div>
      <Title>Evaluation Results</Title>
      <ResultsMatrix />
    </div>
  )
}
