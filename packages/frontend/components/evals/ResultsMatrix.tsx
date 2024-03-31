import {
  Badge,
  Code,
  Group,
  HoverCard,
  Progress,
  Stack,
  Text,
} from "@mantine/core"
import classes from "./index.module.css"
import { formatCost } from "@/utils/format"
import { ChatMessage } from "../SmartViewer/Message"
import SmartViewer from "../SmartViewer"
import { MODELS, Provider } from "shared"

// We create a matrix of results for each prompt, variable and model.
// The matrix is a 3D array, where each dimension represents a different variable, prompt and model.

const compareObjects = (a, b) => {
  return JSON.stringify(a) === JSON.stringify(b)
}

const getAggegateForVariation = (
  results,
): {
  passed: number // percentage passed
  failed: number // percentage failed
  duration: number // average duration
  cost: number // average cost
} => {
  return {
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    duration: +(
      results.reduce((acc, result) => acc + parseInt(result.duration), 0) /
      results.length /
      1000
    ).toFixed(2),
    cost:
      results.reduce((acc, result) => acc + result.cost, 0) / results.length,
  }
}

function ResultDetails({ details }) {
  if (typeof details !== "object") {
    return <Text>Details not available</Text>
  }

  return (
    <Stack>
      {details.map(({ passed, reason, filterId }) => {
        return (
          <Group>
            <Text fw="bold">{filterId}</Text>
            <Badge color={passed ? "green" : "red"}>
              {passed ? "Passed" : "Failed"}
            </Badge>
            <Text>{reason}</Text>
          </Group>
        )
      })}
    </Stack>
  )
}

function ResultCell({ result }) {
  return result ? (
    <>
      {result.status === "success" ? (
        <Stack align="center" justify="between">
          <ChatMessage data={result.output} mah={150} compact w="100%" />

          <HoverCard width={500} disabled={!result.results.length}>
            <HoverCard.Target>
              <Badge color={result.passed ? "green" : "red"}>
                {result.passed ? "Passed" : "Failed"}
              </Badge>
            </HoverCard.Target>
            <HoverCard.Dropdown>
              <ResultDetails details={result.results} />
            </HoverCard.Dropdown>
          </HoverCard>
          <Group gap="xs">
            <Text c="dimmed" size="xs">
              {(+result.duration / 1000).toFixed(2)}s -{" "}
              {formatCost(result.cost)}
            </Text>
          </Group>
        </Stack>
      ) : (
        <Text color="red">{result.error || "Error"}</Text>
      )}
    </>
  ) : (
    <Badge color="gray">N/A</Badge>
  )
}

function AggregateContent({ results }) {
  const { passed, failed, duration, cost } = getAggegateForVariation(results)

  return (
    <>
      {passed + failed > 1 && (
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
      )}
      <Group>
        {duration && (
          <Text size="xs" c="dimmed">
            avg. {duration}s
          </Text>
        )}
        {cost && (
          <Text size="xs" c="dimmed">
            avg. {formatCost(cost)}
          </Text>
        )}
      </Group>
    </>
  )
}

export default function ResultsMatrix({ data }) {
  const prompts = Array.from(
    new Set(data.map((result) => JSON.stringify(result.messages))),
  ).map((result: any) => JSON.parse(result))

  const providers: Provider[] = Array.from(
    new Set(data.map((result) => JSON.stringify(result.provider))),
  ).map((provider: any) => JSON.parse(provider))

  function getVariableKeysForPrompt(messages) {
    return Object.keys(
      data.find((result) => compareObjects(result.messages, messages))
        .variables || {},
    )
  }

  function getVariableVariationsForPrompt(messages) {
    const variations = [
      ...new Set(
        data
          .filter((result) => compareObjects(result.messages, messages))
          .map((result) => JSON.stringify(result.variables)),
      ),
    ]

    return variations.map((variation: any) => JSON.parse(variation))
  }

  function getResultForPromptVariationProvider(messages, variables, provider) {
    return data.find(
      (result) =>
        compareObjects(result.messages, messages) &&
        compareObjects(result.variables, variables) &&
        compareObjects(result.provider, provider),
    )
  }

  const highestNumberOfVariables = Math.max(
    ...prompts.map((messages) => getVariableKeysForPrompt(messages).length),
  )

  return (
    <Stack>
      <div className={classes["matrix-container"]}>
        <table className={classes["matrix-table"]}>
          <thead>
            <tr>
              <th>Prompt</th>
              {!!highestNumberOfVariables && <th>Variables</th>}
              {providers.map((provider, i) => (
                <th key={i}>
                  <Stack align="center">
                    <HoverCard
                      width={500}
                      position="bottom"
                      disabled={!Object.keys(provider.config).length}
                    >
                      <HoverCard.Target>
                        <Badge variant="outline">
                          {MODELS.find((model) => model.id === provider.model)
                            ?.name || provider.model}
                        </Badge>
                      </HoverCard.Target>
                      <HoverCard.Dropdown>
                        <Stack gap="xs">
                          <SmartViewer data={provider.config} />
                        </Stack>
                      </HoverCard.Dropdown>
                    </HoverCard>
                    <AggregateContent
                      results={data.filter((result) =>
                        compareObjects(result.provider, provider),
                      )}
                    />
                  </Stack>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prompts.map((messages, i) => {
              const variableKeys = getVariableKeysForPrompt(messages)
              const variableVariations =
                getVariableVariationsForPrompt(messages)

              return variableVariations.map((variableVariation, k) => (
                <tr key={k}>
                  {k === 0 && (
                    <td rowSpan={variableVariations.length}>
                      <Stack gap="xs" align="center">
                        <HoverCard width={500} position="top">
                          <HoverCard.Target>
                            <div>
                              <SmartViewer data={messages} compact />
                            </div>
                          </HoverCard.Target>
                          <HoverCard.Dropdown>
                            <SmartViewer data={messages} compact={false} />
                          </HoverCard.Dropdown>
                        </HoverCard>
                        <AggregateContent
                          results={data.filter((result) =>
                            compareObjects(result.messages, messages),
                          )}
                        />
                      </Stack>
                    </td>
                  )}
                  {!!highestNumberOfVariables && (
                    <td className={classes["nested-cell"]}>
                      <table>
                        <tr>
                          {variableKeys.map((variable, l) => (
                            <td key={l}>
                              <Stack align="center">
                                <Code>{`{{${variable}}}`}</Code>
                                <Text>{variableVariation[variable]}</Text>
                              </Stack>
                            </td>
                          ))}
                        </tr>
                      </table>
                    </td>
                  )}
                  {providers.map((provider, k) => {
                    const result = getResultForPromptVariationProvider(
                      messages,
                      variableVariation,
                      provider,
                    )
                    return (
                      <td className={classes["output-cell"]} key={k}>
                        <ResultCell result={result} />
                      </td>
                    )
                  })}
                </tr>
              ))
            })}
          </tbody>
        </table>
      </div>
    </Stack>
  )
}
