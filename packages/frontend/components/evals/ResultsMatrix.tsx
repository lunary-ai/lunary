import { Badge, Group, HoverCard, Progress, Stack, Text } from "@mantine/core"
import classes from "./index.module.css"
import { formatCost } from "@/utils/format"
import { ChatMessage } from "../SmartViewer/Message"
import MessageViewer from "../SmartViewer/MessageViewer"
import SmartViewer from "../SmartViewer"
import { MODELS, Provider } from "shared"

// We create a matrix of results for each prompt, variable and model.
// The matrix is a 3D array, where each dimension represents a different variable, prompt and model.

const compareObjects = (a, b) => {
  return JSON.stringify(a) === JSON.stringify(b)
}

const getAggegateForVariation = (
  promptId: string,
  provider: Provider,
  evalResults,
): {
  passed: number // percentage passed
  failed: number // percentage failed
  duration: number // average duration
  cost: number // average cost
} => {
  const results = evalResults.filter(
    (result) =>
      (promptId ? result.promptId === promptId : true) &&
      (provider ? compareObjects(result.provider, provider) : true),
  )

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

export default function ResultsMatrix({ data }) {
  console.log(data[0])

  const prompts = Array.from(new Set(data.map((result) => result.promptId)))

  const providers: Provider[] = Array.from(
    new Set(data.map((result) => JSON.stringify(result.provider))),
  ).map((provider) => JSON.parse(provider))

  function getPromptById(id) {
    return data.find((result) => result.promptId === id).messages
  }

  function getVariableKeysForPrompt(promptId) {
    return Object.keys(
      data.find((result) => result.promptId === promptId).variables || {},
    )
  }

  function getVariableVariationsForPrompt(promptId) {
    const variations = [
      ...new Set(
        data
          .filter((result) => result.promptId === promptId)
          .map((result) => result.variationId),
      ),
    ]

    return variations.map((variationId) => {
      return data.find(
        (result) =>
          result.promptId === promptId && result.variationId === variationId,
      ).variables
    })
  }

  function getResultForPromptVariationProvider(promptId, variables, provider) {
    return data.find(
      (result) =>
        result.promptId === promptId &&
        compareObjects(result.variables, variables) &&
        compareObjects(result.provider, provider),
    )
  }

  const highestNumberOfVariables = Math.max(
    ...prompts.map((promptId) => getVariableKeysForPrompt(promptId).length),
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
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prompts.map((promptId, i) => {
              const promptContent = getPromptById(promptId)
              const variableKeys = getVariableKeysForPrompt(promptId)
              const variableVariations =
                getVariableVariationsForPrompt(promptId)

              return (
                <tr key={i}>
                  <td>
                    <HoverCard width={500} position="top">
                      <HoverCard.Target>
                        <div>
                          <SmartViewer data={promptContent} compact />
                        </div>
                      </HoverCard.Target>
                      <HoverCard.Dropdown>
                        <SmartViewer data={promptContent} compact={false} />
                      </HoverCard.Dropdown>
                    </HoverCard>
                  </td>
                  {!!highestNumberOfVariables && (
                    <td className={classes["nested-cell"]}>
                      <div className={classes["variable-grid"]}>
                        <div className={classes["variable-row"]}>
                          {variableKeys.map((variable, j) => (
                            <div key={j}>{variable}</div>
                          ))}
                        </div>
                        {variableVariations.map((variableVariation, k) => (
                          <div className={classes["variable-row"]} key={k}>
                            {variableKeys.map((variable, l) => (
                              <div key={l}>{variableVariation[variable]}</div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </td>
                  )}
                  {providers.map((provider, k) => (
                    <td key={k} className={classes["nested-cell"]}>
                      {!!variableKeys.length && (
                        <tr>
                          <td></td>
                        </tr>
                      )}
                      {variableVariations.map((variableVariation, l) => {
                        const result = getResultForPromptVariationProvider(
                          promptId,
                          variableVariation,
                          provider,
                        )
                        return (
                          <tr key={l}>
                            <td className={classes["output-cell"]}>
                              <HoverCard width={500} position="top">
                                <HoverCard.Target>
                                  <div>
                                    <SmartViewer data={result.output} compact />
                                  </div>
                                </HoverCard.Target>
                                <HoverCard.Dropdown>
                                  <SmartViewer
                                    data={result.output}
                                    compact={false}
                                  />
                                </HoverCard.Dropdown>
                              </HoverCard>
                            </td>
                          </tr>
                        )
                      })}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Stack>
  )
}
