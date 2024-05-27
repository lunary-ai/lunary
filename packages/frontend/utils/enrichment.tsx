import { EvaluatorType } from "shared"
import { getFlagEmoji } from "./format"
import { Badge, Box, Button, Popover, Text } from "@mantine/core"
import { useState } from "react"
import { useDisclosure } from "@mantine/hooks"

export function renderEnrichment(data: any, type: EvaluatorType) {
  const renderers: Record<EvaluatorType, (data: any) => any> = {
    language: getFlagEmoji,
    pii: renderPIIEnrichment,
    toxicity: renderToxicityEnrichment,
  }

  const renderer = renderers[type] || JSON.stringify
  return renderer(data)
}

function renderPIIEnrichment(data: any) {
  const [opened, { close, open }] = useDisclosure(false)

  let piiCount = 0
  for (const key in data) {
    if (Array.isArray(data[key])) {
      piiCount += data[key].length
    }
  }

  if (piiCount === 0) {
    return ""
  }

  return (
    <Popover
      width={200}
      position="bottom"
      withArrow
      shadow="md"
      opened={opened}
    >
      <Popover.Target>
        <Badge onMouseEnter={open} onMouseLeave={close} color="blue">
          {piiCount} PII
        </Badge>
      </Popover.Target>
      <Popover.Dropdown style={{ pointerEvents: "none" }} w="300">
        <Text size="sm">
          {Object.entries(data).map(
            ([key, items]) =>
              items.length > 0 && (
                <div key={key}>
                  <strong style={{ textTransform: "capitalize" }}>
                    {key}:
                  </strong>
                  <div>{items.join(", ")}</div>
                </div>
              ),
          )}
        </Text>
      </Popover.Dropdown>
    </Popover>
  )
}

function renderToxicityEnrichment(data: string[]) {
  const [opened, { close, open }] = useDisclosure(false)

  console.log(data)
  if (data.length === 0) {
    return ""
  }

  return (
    <Popover
      width={200}
      position="bottom"
      withArrow
      shadow="md"
      opened={opened}
    >
      <Popover.Target>
        <Badge onMouseEnter={open} onMouseLeave={close} color="red">
          {data.length} Toxicity
        </Badge>
      </Popover.Target>
      <Popover.Dropdown style={{ pointerEvents: "none" }} w="300">
        <Text size="sm">
          <strong>Toxic Comments:</strong>
          <div>{data.join(", ")}</div>
        </Text>
      </Popover.Dropdown>
    </Popover>
  )
}
