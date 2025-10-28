import {
  Badge,
  Box,
  Group,
  Popover,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBiohazard,
  IconCheck,
  IconMoodNeutral,
  IconMoodSad,
  IconMoodSmile,
  IconX,
} from "@tabler/icons-react";
import {
  AssertionResult,
  EnrichmentData,
  EvaluatorType,
  LanguageDetectionResult,
  SentimentAnalysisResult,
  IntentDetectionPayload,
  IntentLabel,
} from "shared";
import { getFlagEmoji } from "./format";
import ErrorBoundary from "@/components/blocks/ErrorBoundary";
import { useMemo } from "react";
import { getPIIColor } from "./colors";
import { useProjectRules } from "./dataHooks";

type EnrichmentRenderOptions = {
  hideIntentSummary?: boolean;
};

export function renderEnrichment(
  data: EnrichmentData,
  type: EvaluatorType,
  maskPII = false,
  options?: EnrichmentRenderOptions,
) {
  const renderers: Record<
    EvaluatorType,
    (payload: any, options?: EnrichmentRenderOptions) => any
  > = {
    language: renderLanguageEnrichment,
    pii: renderPIIEnrichment,
    topics: renderTopicsEnrichment,
    sentiment: renderSentimentEnrichment,
    assertion: renderAssertionEnrichment,
    tone: renderToneEnrichment,
    guidelines: renderGuidelinesEnrichment,
    replies: renderRepliesEnrichment,
    toxicity: renderToxicityEnrichment,
    llm: renderLLMEnrichment,
    intent: (payload, renderOptions) =>
      renderIntentEnrichment(payload, {
        hideSummary: renderOptions?.hideIntentSummary,
      }),
    "text-similarity": renderTextSimilarityEnrichment,
    "model-labeler": renderModelLabelerEnrichment,
    "model-scorer": renderModelScorerEnrichment,
  };

  const renderer = renderers[type];
  if (!renderer) {
    return <ErrorBoundary>{JSON.stringify(data)}</ErrorBoundary>;
  }
  return <ErrorBoundary>{renderer(data, options)}</ErrorBoundary>;
}

function renderIntentEnrichment(
  data: EnrichmentData,
  options?: { hideSummary?: boolean },
) {
  if (!data?.input?.length) return null;

  const payload = data.input[0] as IntentDetectionPayload | undefined;
  const intents = payload?.intents ?? [];

  if (!Array.isArray(intents) || intents.length === 0) return null;

  const isOtherIntent = (intent: IntentLabel) => {
    const label =
      intent.label ?? intent.canonicalLabel ?? intent.aliasLabel ?? "";
    return intent.isOther || label.trim().toLowerCase() === "other";
  };

  const otherIntents = intents.filter(isOtherIntent);
  const primaryIntents = intents.filter((intent) => !isOtherIntent(intent));
  const summary = options?.hideSummary ? undefined : payload?.summary;
  const showSummary = !!summary && !options?.hideSummary;

  return (
    <Stack gap={showSummary ? 6 : 0}>
      <Group gap="xs" wrap="wrap">
        {primaryIntents.map((intent: IntentLabel, index) => {
          const displayLabel =
            intent.label ?? intent.canonicalLabel ?? intent.aliasLabel;
          const confidencePct = Math.round((intent.confidence ?? 0) * 100);
          const tooltipParts = [] as string[];

          if (intent.canonicalLabel && intent.canonicalLabel !== displayLabel) {
            tooltipParts.push(`Canonical: ${intent.canonicalLabel}`);
          }

          if (
            intent.aliasLabel &&
            intent.aliasLabel !== intent.canonicalLabel
          ) {
            tooltipParts.push(`Alias: ${intent.aliasLabel}`);
          }

          if (
            typeof intent.confidence === "number" &&
            !Number.isNaN(confidencePct)
          ) {
            tooltipParts.push(`Confidence: ${confidencePct}%`);
          }

          if (intent.rationale?.length) {
            tooltipParts.push(intent.rationale);
          }

          const tooltip = tooltipParts.join("\n");

          return (
            <Tooltip
              key={`${intent.canonicalLabel ?? intent.aliasLabel ?? displayLabel}-${index}`}
              label={tooltip}
              disabled={!tooltip.length}
              multiline
              w={260}
            >
              <Badge color="indigo" variant="light">
                {displayLabel}
              </Badge>
            </Tooltip>
          );
        })}

        {otherIntents.length > 0 && (
          <Tooltip
            key="intent-other"
            label={otherIntents
              .map(
                (intent) =>
                  intent.aliasLabel ||
                  intent.canonicalLabel ||
                  intent.originalLabel ||
                  intent.label,
              )
              .filter(Boolean)
              .join("\n")}
            disabled={otherIntents.length === 0}
            multiline
            w={260}
          >
            <Badge color="gray" variant="light">
              {otherIntents.length > 1
                ? `Other (${otherIntents.length})`
                : (otherIntents[0].label ?? "Other")}
            </Badge>
          </Tooltip>
        )}
      </Group>

      {showSummary && (
        <Text size="xs" c="dimmed" ta="center">
          {summary}
        </Text>
      )}
    </Stack>
  );
}

function renderLLMEnrichment(data: { passed: boolean; reason: string }) {
  if (typeof data !== "object" || typeof data.passed !== "boolean") return null;

  return (
    <Tooltip
      label={data.reason}
      disabled={!data.reason?.length}
      w="200"
      multiline
    >
      {data.passed ? <IconCheck color="green" /> : <IconX color="red" />}
    </Tooltip>
  );
}

function renderTextSimilarityEnrichment(data: any) {
  if (!data || typeof data !== "object") return null;
  if (typeof data.score !== "number") return null;

  const method = typeof data.method === "string" ? data.method : "similarity";
  const score = Number(data.score).toFixed(2);
  const threshold =
    typeof data.threshold === "number"
      ? Number(data.threshold).toFixed(2)
      : undefined;

  return (
    <Stack gap={2} align="center">
      <Text size="sm">{`${method.toUpperCase()} score: ${score}`}</Text>
      {threshold && (
        <Text size="xs" c="dimmed">
          Threshold {threshold}
        </Text>
      )}
    </Stack>
  );
}

function renderModelLabelerEnrichment(data: any) {
  if (!data || typeof data !== "object") return null;
  const primary =
    typeof data.primaryLabel === "string" && data.primaryLabel.trim().length
      ? data.primaryLabel
      : undefined;
  const matches = Array.isArray(data.matches)
    ? data.matches.filter(
        (label: any) => typeof label === "string" && label.trim().length,
      )
    : [];
  const labels = Array.isArray(data.labels)
    ? data.labels.filter(
        (label: any) => typeof label === "string" && label.trim().length,
      )
    : [];

  if (!primary && !matches.length && !labels.length) return null;

  return (
    <Stack gap={4} align="center">
      {primary ? (
        <Badge color="blue" variant="light">
          {primary}
        </Badge>
      ) : (
        <Text size="xs" c="dimmed">
          No label matched
        </Text>
      )}
      {matches.length > 1 && (
        <Text size="xs" c="dimmed">
          Also matched:{" "}
          {matches.filter((label) => label !== primary).join(", ")}
        </Text>
      )}
      {!primary && labels.length > 0 && (
        <Text size="xs" c="dimmed">
          Available labels: {labels.join(", ")}
        </Text>
      )}
    </Stack>
  );
}

function renderModelScorerEnrichment(data: any) {
  if (!data || typeof data !== "object" || typeof data.score !== "number")
    return null;

  const score = Number(data.score).toFixed(2);
  const minScore =
    typeof data.minScore === "number"
      ? Number(data.minScore).toFixed(2)
      : undefined;
  const maxScore =
    typeof data.maxScore === "number"
      ? Number(data.maxScore).toFixed(2)
      : undefined;

  return (
    <Stack gap={2} align="center">
      <Text size="sm">Score: {score}</Text>
      {minScore != null && maxScore != null && (
        <Text size="xs" c="dimmed">
          Range {minScore} – {maxScore}
        </Text>
      )}
    </Stack>
  );
}

function renderToxicityEnrichment(data: EnrichmentData) {
  const hasToxic = [...(data.input ?? []), ...(data.output ?? [])].some(
    (msg) => msg?.reason,
  );

  // Don’t render anything if nothing is toxic
  if (!hasToxic) return null;

  return (
    <Tooltip label="Toxic content detected">
      <Badge color="red" leftSection={<IconBiohazard width={12} />}>
        Toxicity
      </Badge>
    </Tooltip>
  );
}

function renderLanguageEnrichment(languageDetections: LanguageDetectionResult) {
  if (
    !languageDetections?.input ||
    !languageDetections?.output ||
    !languageDetections?.error
  ) {
    return "";
  }

  languageDetections = [
    ...new Set([
      ...languageDetections.input.map((lang) => lang?.isoCode),
      ...languageDetections.output.map((lang) => lang?.isoCode),
      ...languageDetections.error.map((lang) => lang?.isoCode),
    ]),
  ];

  const languages = languageDetections.map((isoCode) => {
    if (!isoCode) {
      return "";
    }

    const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

    return {
      emoji: getFlagEmoji(isoCode),
      name: languageNames.of(isoCode),
    };
  }) as { emoji: string; name: string }[];

  return (
    <Group gap="0" justify="center">
      {languages.map(({ emoji, name }, index) => (
        <Tooltip key={index} label={name}>
          <Text size="lg">{emoji}</Text>
        </Tooltip>
      ))}
    </Group>
  );
}

function renderPIIEnrichment(data: EnrichmentData) {
  const [opened, { close, open }] = useDisclosure(false);
  const { maskingRule } = useProjectRules();

  const uniqueEntities: { entity: string; type: string }[] = useMemo(() => {
    const entities = new Set();
    const entityTypeArray = [];

    for (const items of Object.values(data)) {
      for (const item of items.filter(Boolean)) {
        for (const subItem of item) {
          if (!entities.has(subItem.entity)) {
            entities.add(subItem.entity);
            entityTypeArray.push({
              entity: subItem.entity,
              type: subItem.type,
            });
          }
        }
      }
    }
    return entityTypeArray;
  }, [data]);

  const piiCount = uniqueEntities.length;

  if (piiCount === 0) return null;

  const size = piiCount > 20 ? 500 : 350;

  const maskPII = maskingRule?.type === "masking";
  return (
    <Popover
      width={200}
      position="bottom"
      withArrow
      shadow="md"
      opened={opened}
    >
      <Popover.Target>
        <Badge
          color="orange"
          variant="light"
          onMouseEnter={open}
          onMouseLeave={close}
        >
          {piiCount} PII
        </Badge>
      </Popover.Target>
      <Popover.Dropdown w={size}>
        <Group p="sm" px={4}>
          {uniqueEntities.slice(0, 40).map(({ entity, type }) => (
            <Badge
              key={entity as string}
              variant="light"
              color={getPIIColor(type)}
            >
              {maskPII ? type : (entity as string)}
            </Badge>
          ))}
          {uniqueEntities.length > 40 && (
            <Badge variant="light" color="gray" ml="auto">
              and {uniqueEntities.length - 40} more
            </Badge>
          )}
        </Group>
      </Popover.Dropdown>
    </Popover>
  );
}

function renderTopicsEnrichment(data: EnrichmentData) {
  const [opened, { close, open }] = useDisclosure(false);

  const uniqueTopics = Array.from(
    new Set(
      Object.values(data)
        .flat()
        .flat()
        .filter(Boolean)
        .map((t) => t.topic),
    ),
  );

  if (uniqueTopics.length === 0) {
    return null;
  }

  if (uniqueTopics.length < 4) {
    return (
      <Group gap={3}>
        {uniqueTopics.map((topic, index) => (
          <Badge
            key={index}
            onMouseEnter={open}
            onMouseLeave={close}
            variant="default"
          >
            {topic}
          </Badge>
        ))}
      </Group>
    );
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
        <Badge onMouseEnter={open} onMouseLeave={close} variant="default">
          {uniqueTopics.length + " topics"}
        </Badge>
      </Popover.Target>
      <Popover.Dropdown style={{ pointerEvents: "none" }} w="300">
        <Text size="sm">
          <strong>Topics:</strong>
          <div>{uniqueTopics.join(", ")}</div>
        </Text>
      </Popover.Dropdown>
    </Popover>
  );
}
function renderToneEnrichment(data: EnrichmentData) {
  const [opened, { close, open }] = useDisclosure(false);

  if (data.length === 0) {
    return "";
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
        <Badge
          onMouseEnter={open}
          onMouseLeave={close}
          color="blue"
          styles={{ label: { textTransform: "initial" } }}
        >
          {data[0].charAt(0).toUpperCase() + data[0].slice(1)}{" "}
          {data.length > 1 && ` and ${data.length - 2} others`}
        </Badge>
      </Popover.Target>
      <Popover.Dropdown style={{ pointerEvents: "none" }} w="300">
        <Text size="sm" style={{ textTransform: "capitalize" }}>
          <div>{data.join(", ")}</div>
        </Text>
      </Popover.Dropdown>
    </Popover>
  );
}

export function renderSentimentEnrichment(data?: EnrichmentData) {
  const [opened, { close, open }] = useDisclosure(false);

  if (!data || !data.input || data.input.length === 0) {
    return null;
  }

  const sentiments = [...data.input, ...data.output].map((sentiment) => {
    if (sentiment?.label === "positive") {
      return {
        emoji: <IconMoodSmile color="teal" />,
        type: "positive",
      };
    } else if (sentiment?.label === "negative") {
      return {
        emoji: <IconMoodSad color="crimson" />,
        type: "negative",
      };
    } else if (sentiment?.label === "neutral") {
      return {
        emoji: <IconMoodNeutral color="gray" />,
        type: "neutral",
      };
    }
    return {
      emoji: null,
      type: null,
    };
  });

  let uniqueSentiments = Array.from(
    new Map(sentiments.map((item) => [item.type, item])).values(),
  );
  const hasNonNeutral = uniqueSentiments.some(
    (sentiment) => sentiment.type !== "neutral",
  );
  if (hasNonNeutral) {
    uniqueSentiments = uniqueSentiments.filter(
      (sentiment) => sentiment.type !== "neutral",
    );
  }

  return (
    <ErrorBoundary>
      <Group gap="0">
        {uniqueSentiments.map((sentiment) => (
          <Box onMouseEnter={open} onMouseLeave={close} key={sentiment.type}>
            {sentiment.emoji}
          </Box>
        ))}
      </Group>
    </ErrorBoundary>
  );
}

// TODO: refactor with above
export function SentimentEnrichment2({
  sentiment,
}: {
  sentiment: SentimentAnalysisResult;
}) {
  const [opened, { close, open }] = useDisclosure(false);

  if (!sentiment) {
    return null;
  }

  const { label, score } = sentiment;

  let type, emoji;
  if (label === "positive") {
    emoji = <IconMoodSmile color="teal" />;
  } else if (label === "negative") {
    emoji = <IconMoodSad color="crimson" />;
    type = "negative";
  } else if (label === "neutral") {
    emoji = <IconMoodNeutral color="gray" />;
    type = "neutral";
  }

  return (
    <Tooltip label={`Score: ${score}`} opened={opened}>
      <Box onMouseEnter={open} onMouseLeave={close}>
        {emoji}
      </Box>
    </Tooltip>
  );
}

function renderAssertionEnrichment(data: AssertionResult) {
  if (typeof data !== "object" || typeof data.result !== "boolean") return null;

  return (
    <Tooltip label={data.reason} disabled={!data.reason?.length}>
      {data.result ? <IconCheck color="green" /> : <IconX color="red" />}
    </Tooltip>
  );
}

function renderGuidelinesEnrichment(data: any) {
  return (
    <Tooltip label={data.reason} disabled={!data.reason?.length}>
      {data.result ? <IconCheck color="green" /> : <IconX color={"red"} />}
    </Tooltip>
  );
}

function renderRepliesEnrichment(data: any) {
  return <IconX color={data === "true" ? "green" : "red"} />;
}
