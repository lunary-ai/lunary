/*
 * This component is used to show inputs and outputs of runs.
 * It should be able to show & format:
 * - Complicated objects with many properties
 * - Messages (one or more)
 * - Simple JSON
 * - Text
 */

import { Card, Code, Flex, Stack, Text, Tooltip } from "@mantine/core";
import { IconShieldBolt } from "@tabler/icons-react";
import { useMemo } from "react";
import ProtectedText from "../blocks/ProtectedText";
import { ChatMessage } from "./Message";
import MessageViewer from "./MessageViewer";
import { RenderJson } from "./RenderJson";
import classes from "./index.module.css";
import HighlightPii from "./HighlightPii";

const checkIsMessage = (obj) => {
  return (
    typeof obj?.text === "string" ||
    typeof obj?.content === "string" ||
    typeof obj?.refusal === "string" ||
    typeof obj?.audio === "object" ||
    Array.isArray(obj?.content) ||
    typeof obj?.functionCall === "object" ||
    typeof obj?.function_call === "object" ||
    typeof obj?.toolCalls === "object" ||
    typeof obj?.tool_calls === "object"
  );
};

const checkIsRetrieverObjects = (obj) => {
  return Array.isArray(obj)
    ? obj.every(checkIsRetrieverObjects)
    : (typeof obj.title === "string" || typeof obj.id !== "undefined") &&
        (typeof obj.source === "string" || typeof obj.summary === "string");
};

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
  );
}

export default function SmartViewer({
  data,
  error,
  compact = false,
}: {
  data: any;
  error?: any;
  compact?: boolean;
}) {
  const parsed = useMemo(() => {
    if (!data) return null;

    let parsedData = data;
    if (typeof data === "string" && data?.startsWith("{")) {
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        return data;
      }
    }

    if (
      typeof parsedData === "object" &&
      parsedData !== null &&
      parsedData.enrichments
    ) {
      const { enrichments, ...rest } = parsedData;
      return rest;
    }

    return parsedData;
  }, [data]);

  const isObject = typeof parsed === "object";

  const isMessages = useMemo(() => {
    if (!parsed) return false;
    return Array.isArray(parsed)
      ? parsed.every(checkIsMessage)
      : checkIsMessage(parsed);
  }, [parsed]);

  const isRetrieverObjects = useMemo(() => {
    if (!parsed) return false;
    return checkIsRetrieverObjects(parsed);
  }, [parsed]);

  // TODO: refacto, c'est degueulasse
  let Message;
  if (error) {
    Message = (
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
    );
  } else if (data && data === "__NOT_INGESTED__") {
    Message = (
      <Code color="var(--mantine-color-gray-light)">
        <Flex align="center">
          <Tooltip label="Matched Smart Data Filter rules">
            <IconShieldBolt size="16px" />
          </Tooltip>
          <Text ml="md" size="xs">
            Not ingested
          </Text>
        </Flex>
      </Code>
    );
  } else {
    Message = (
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
            <Code color="var(--mantine-color-blue-light)">
              <RenderJson data={parsed} compact={compact} />
            </Code>
          )
        ) : (
          <Code color="var(--mantine-color-blue-light)">{parsed}</Code>
        )}
      </ProtectedText>
    );
  }

  return (
    <pre
      className={`${classes.pre} ${compact ? classes.compact : ""}`}
      id="HERE"
    >
      {error && Message}
      {data && Message}
    </pre>
  );
}
