/*
 * This component is used to show inputs and outputs of runs.
 * It should be able to show & format:
 * - Complicated objects with many properties
 * - Messages (one or more)
 * - Simple JSON
 * - Text
 */

import { Card, Code, Flex, Group, SimpleGrid, Stack, Text } from "@mantine/core"
import { useMemo } from "react"
import ProtectedText from "../blocks/ProtectedText"
import { ChatMessage } from "./Message"
import MessageViewer from "./MessageViewer"
import { RenderJson } from "./RenderJson"

const checkIsMessage = (obj) => {
  return (
    typeof obj?.text === "string" ||
    typeof obj?.content === "string" ||
    Array.isArray(obj?.content) ||
    typeof obj?.functionCall === "object" ||
    typeof obj?.function_call === "object" ||
    typeof obj?.toolCalls === "object" ||
    typeof obj?.tool_calls === "object"
  )
}

const checkIsRetrieverObjects = (obj) => {
  return Array.isArray(obj)
    ? obj.every(checkIsRetrieverObjects)
    : (typeof obj.title === "string" || typeof obj.id !== "undefined") &&
        (typeof obj.source === "string" || typeof obj.summary === "string")
}

function RetrieverObject({ data, compact }) {
  return (
    <Card withBorder p="sm">
      <Flex direction="column" gap="sm">
        {data?.title && (
          <Text size="sm" w={700} mb="md">
            {data.title}
          </Text>
        )}
        {data.summary && <Text size="xs">{data.summary}</Text>}

        {data.source && <Text size="sm">{data.source}</Text>}
      </Flex>
    </Card>
  )
}

export default function SmartViewer({
  data,
  error,
  compact = false,
}: {
  data: any
  error?: any
  compact?: boolean
}) {
  const parsed = useMemo(() => {
    if (!data) return null
    if (typeof data === "string" && data?.startsWith("{")) {
      try {
        return JSON.parse(data)
      } catch (e) {
        return data
      }
    }

    return data
  }, [data])

  const isObject = typeof parsed === "object"

  const isMessages = useMemo(() => {
    if (!parsed) return false
    return Array.isArray(parsed)
      ? parsed.every(checkIsMessage)
      : checkIsMessage(parsed)
  }, [parsed])

  const isRetrieverObjects = useMemo(() => {
    if (!parsed) return false
    return checkIsRetrieverObjects(parsed)
  }, [parsed])

  return (
    <pre className={compact ? "compact" : ""} id="HERE">
      {error && (
        <ChatMessage
          data={{
            role: "error",
            text:
              typeof error.stack === "string"
                ? compact
                  ? error.message || error.stack
                  : error.stack
                : typeof error === "object"
                  ? JSON.stringify(error, null, 2)
                  : error,
          }}
          compact={compact}
        />
      )}

      {data && (
        <ProtectedText>
          {isObject ? (
            isMessages ? (
              <MessageViewer data={parsed} compact={compact} />
            ) : isRetrieverObjects ? (
              <Stack>
                {parsed.map((obj, i) => (
                  <RetrieverObject key={i} data={obj} compact={compact} />
                ))}
              </Stack>
            ) : (
              <Code
                color="var(--mantine-color-blue-light)"
                style={{ overflow: "hidden" }}
              >
                <RenderJson data={parsed} compact={compact} />
              </Code>
            )
          ) : (
            <Code
              color="var(--mantine-color-blue-light)"
              style={{ overflow: "hidden" }}
            >
              {parsed}
            </Code>
          )}
        </ProtectedText>
      )}
      <style jsx>{`
        pre {
          white-space: pre-wrap;
          margin: 0;
        }

        pre.compact {
          max-height: 96px;
          overflow: hidden;
          width: 100%;
        }

        pre :global(code) {
          padding: 10px;
          display: block;
        }

        /* Fixes for json-view-lite */
        pre :global(code div[role="list"] > div) {
          padding-left: 8px;
        }

        /* Hide first expander btn */
        pre :global(code > div > div > span[role="button"]) {
          display: none;
        }

        pre :global(code span[role="button"]) {
          cursor: pointer;
        }
      `}</style>
    </pre>
  )
}
