import { Badge, Group, Progress, Stack, Text } from "@mantine/core"
import classes from "./index.module.css"
// We create a matrix of results for each prompt, variable and model.
// The matrix is a 3D array, where each dimension represents a different

type EvalResult = {
  model: string
  prompt: string
  variables: {
    [key: string]: string
  }
  latency: number
  output: string
  passed: boolean
}

const evalResults: EvalResult[] = [
  {
    model: "gpt-3.5-turbo",
    prompt: "prompt1",
    variables: {
      name: "John",
      question: "What is the best way to clean my shoes?",
    },
    latency: 320,
    output:
      "The best way to clean your shoes is to use a soft cloth and a mild soap. You can also use a toothbrush to scrub the dirt off of your shoes. If you have any questions, please feel free to contact us at any time.",
    passed: true,
  },
  {
    model: "gpt-3.5-turbo",
    prompt: "prompt1",
    variables: {
      name: "Mary",
      question: "How to clean my car",
    },
    latency: 530,
    output:
      "The best way to clean your car is to use a soft cloth and a mild soap. You can also use a toothbrush to scrub the dirt off of your car. If you have any questions, please feel free to contact us at any time.",
    passed: true,
  },
  {
    model: "gpt-4",
    prompt: "prompt1",
    variables: {
      name: "John",
      question: "What is the best way to clean my shoes?",
    },
    latency: 2304,
    output:
      "The best way to clean your shoes is to use a soft cloth and a mild soap. You can also use a toothbrush to scrub the dirt off of your shoes. If you have any questions, please feel free to contact us at any time.",
    passed: true,
  },
  {
    model: "gpt-4",
    prompt: "prompt1",
    variables: {
      name: "Mary",
      question: "How to clean my car",
    },
    latency: 3543,
    output:
      "The best way to clean your car is to use a soft cloth and a mild soap. You can also use a toothbrush to scrub the dirt off of your car. If you have any questions, please feel free to contact us at any time.",
    passed: false,
  },
]

const getResultForVariation = (
  prompt: string,
  variables: { [key: string]: string },
  model: string,
): EvalResult | undefined => {
  return evalResults.find(
    (result) =>
      result.prompt === prompt &&
      result.model === model &&
      Object.keys(variables).every(
        (variable) => result.variables[variable] === variables[variable],
      ),
  )
}

const getAggegateForVariation = (
  prompt: string,
  model: string,
): {
  passed: number // percentage passed
  failed: number // percentage failed
  latency: number // average latency
} => {
  const results = evalResults.filter(
    (result) => result.prompt === prompt && result.model === model,
  )

  return {
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    latency: Math.floor(
      results.reduce((acc, result) => acc + result.latency, 0) / results.length,
    ),
  }
}

const getVariableVariations = (results: EvalResult[]) => {
  const variations = results.map((result) => result.variables)
  const uniqueVariations = Array.from(
    new Set(variations.map((variation) => JSON.stringify(variation))),
  ).map((variation) => JSON.parse(variation))
  return uniqueVariations as { [key: string]: string }[]
}

const getPromptModelVariations = (results: EvalResult[]) => {
  const variations = results.map((result) => ({
    prompt: result.prompt,
    model: result.model,
  }))
  const uniqueVariations = Array.from(
    new Set(variations.map((variation) => JSON.stringify(variation))),
  )
    .map((variation) => JSON.parse(variation))
    .map((variation) => ({
      ...variation,
      ...getAggegateForVariation(variation.prompt, variation.model),
    }))

  return uniqueVariations as {
    prompt: string
    model: string
    passed: number
    failed: number
    latency: number
  }[]
}

export default function ResultsMatrix() {
  const variableVariations = getVariableVariations(evalResults)
  const pmVariations = getPromptModelVariations(evalResults)

  const variables = Object.keys(variableVariations[0])

  return (
    <table className={classes["matrix-table"]}>
      <thead>
        <tr>
          <th colSpan={variables.length}>Variables</th>
          <th colSpan={evalResults.length}>Outputs</th>
        </tr>
        <tr>
          {variables.map((variable) => (
            <th>{variable}</th>
          ))}
          {pmVariations.map(
            ({ model, prompt, passed, failed, latency }, index) => {
              return (
                <th>
                  <Stack align="center" gap="xs">
                    <Group>
                      <Progress.Root size={20} w={100}>
                        <Progress.Section
                          value={(passed / (passed + failed)) * 100}
                          color="green"
                        >
                          <Progress.Label>{`${passed}`}</Progress.Label>
                        </Progress.Section>
                        <Progress.Section
                          value={(failed / (passed + failed)) * 100}
                          color="red"
                        >
                          <Progress.Label>{failed}</Progress.Label>
                        </Progress.Section>
                      </Progress.Root>
                      <Text size="xs" c="dimmed">
                        avg. {latency}ms
                      </Text>
                    </Group>
                    <Badge variant="outline">{model}</Badge>
                    <Text>{prompt}</Text>
                  </Stack>
                </th>
              )
            },
          )}
        </tr>
      </thead>
      <tbody>
        {variableVariations.map((variableVariation) => (
          <tr>
            {variables.map((variable) => (
              <td>{variableVariation[variable]}</td>
            ))}
            {pmVariations.map((pmVariation) => {
              const result = getResultForVariation(
                pmVariation.prompt,
                variableVariation,
                pmVariation.model,
              )
              return (
                <td>
                  {result ? (
                    <Stack align="center">
                      <Text>{result.output}</Text>
                      <Group gap="xs">
                        <Badge color={result.passed ? "green" : "red"}>
                          {result.passed ? "Passed" : "Failed"}
                        </Badge>
                        <Text c="dimmed" size="xs">
                          {result.latency}ms
                        </Text>
                      </Group>
                    </Stack>
                  ) : (
                    <Badge color="gray">N/A</Badge>
                  )}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
