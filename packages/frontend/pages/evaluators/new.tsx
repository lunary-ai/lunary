import CheckPicker, { RenderCheckNode } from "@/components/checks/Picker";
import { useOrg, useUser } from "@/utils/dataHooks";
import { useEvaluators, useEvaluator } from "@/utils/dataHooks/evaluators";
import EVALUATOR_TYPES from "@/utils/evaluators";
import { slugify } from "@/utils/format";
import { theme } from "@/utils/theme";
import {
  Alert,
  Box,
  Button,
  Card,
  Container,
  Fieldset,
  Flex,
  Group,
  NumberInput,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
  Switch,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconCircleCheck,
  IconCirclePlus,
  IconRefreshAlert,
  IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckLogic } from "shared";
import ProviderEditor from "@/components/prompts/Provider";
import { useIntentReclusterJob } from "@/utils/dataHooks/jobs";

const DEFAULT_INTENT_MAX = 10;
const LEGACY_TEXT_SIMILARITY_TYPES = new Set([
  "bleu",
  "gleu",
  "rouge",
  "cosine",
  "fuzzy",
]);
const DEFAULT_TEXT_SIMILARITY_METHOD = "cosine";
const TEXT_SIMILARITY_METHODS = [
  { label: "Cosine Similarity", value: "cosine" },
  { label: "BLEU", value: "bleu" },
  { label: "ROUGE", value: "rouge" },
  { label: "GLEU", value: "gleu" },
  { label: "Fuzzy Match", value: "fuzzy" },
];

export function EvaluatorCard({
  evaluator,
  isSelected,
  onItemClick,
  hideAddIcon = false,
}: {
  onItemClick: (type: string) => void;
  isSelected: boolean;
  evaluator: any;
  hideAddIcon?: boolean;
}) {
  return (
    <Card
      key={evaluator.id}
      onClick={() => !evaluator.soon && onItemClick(evaluator.id)}
      withBorder={isSelected}
      opacity={evaluator.soon ? 0.5 : 1}
      style={{ justifyContent: "center" }}
    >
      <Tooltip label={evaluator.description} hidden={!evaluator.description}>
        <UnstyledButton disabled={evaluator.soon}>
          {!hideAddIcon && (
            <Flex
              justify="right"
              pos="absolute"
              top="6px"
              right="6px"
              h="30"
              w="30"
            >
              {isSelected ? (
                <IconCircleCheck size="20" color="#4589df" />
              ) : (
                <IconCirclePlus size="20" color="#bfc4cd" />
              )}
            </Flex>
          )}

          <Stack align="center" gap="0" pt={5} maw="100%" justify="center">
            <evaluator.icon
              color={theme.colors[evaluator.color][7]}
              size="22px"
            />
            <Text size="sm" mt={9} fw="500" ta="center">
              {evaluator.name}
            </Text>
            {evaluator.soon && (
              <Text size="xs" mb={-4} mt={0} fw="500" c="dimmed">
                coming soon
              </Text>
            )}
          </Stack>
        </UnstyledButton>
      </Tooltip>
    </Card>
  );
}

export default function NewEvaluator() {
  const router = useRouter();
  const { query } = router;
  const evaluatorId = typeof query.id === "string" ? query.id : undefined;

  const { user } = useUser();
  const { insertEvaluator } = useEvaluators();
  const { evaluator, update: updateEvaluator } = useEvaluator(evaluatorId);
  const {
    job: reclusterJob,
    isStarting: reclusterStarting,
    start: startRecluster,
    mutate: mutateReclusterJob,
  } = useIntentReclusterJob(evaluatorId);
  const isEditing = Boolean(evaluatorId);

  const [name, setName] = useState<string>("");
  const [type, setType] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<string>("normal");
  const [params, setParams] = useState<any>();
  const [filters, setFilters] = useState<CheckLogic>([
    "OR",
    { id: "type", params: { type: "llm" } },
  ]);

  const { org } = useOrg();
  const evaluatorData = evaluator as any | undefined;
  const evaluatorName = (evaluatorData?.name as string) || undefined;
  const evaluatorParams =
    (evaluatorData?.params as Record<string, any>) || undefined;
  const prevReclusterStatus = useRef<string | undefined>();

  const isReclusterActive = Boolean(
    reclusterJob && ["pending", "running"].includes(reclusterJob.status),
  );

  useEffect(() => {
    if (!reclusterJob) {
      if (prevReclusterStatus.current) {
        notifications.hide("intent-recluster");
        prevReclusterStatus.current = undefined;
      }
      return;
    }

    if (
      prevReclusterStatus.current === reclusterJob.status &&
      !["pending", "running"].includes(reclusterJob.status)
    ) {
      return;
    }

    if (["pending", "running"].includes(reclusterJob.status)) {
      const message =
        reclusterJob.status === "pending"
          ? "Queued – we'll start reclustering shortly."
          : `Cleaning up intents (${(reclusterJob.progress ?? 0).toFixed(1)}%)`;

      const baseNotification = {
        id: "intent-recluster",
        title: "Reclustering intents",
        message,
        loading: true,
        autoClose: false,
      } as const;

      if (prevReclusterStatus.current) {
        notifications.update(baseNotification);
      } else {
        notifications.show(baseNotification);
      }

      prevReclusterStatus.current = reclusterJob.status;
      return;
    }

    if (reclusterJob.status === "done") {
      notifications.update({
        id: "intent-recluster",
        title: "Intent reclustering completed",
        message:
          reclusterJob.payload?.clusters != null
            ? `Generated ${reclusterJob.payload?.clusters} canonical intents.`
            : "Intent labels have been consolidated.",
        icon: <IconCheck size={18} />,
        color: "green",
        autoClose: 4000,
        loading: false,
      });
      prevReclusterStatus.current = reclusterJob.status;
      return;
    }

    if (reclusterJob.status === "failed") {
      notifications.update({
        id: "intent-recluster",
        title: "Reclustering failed",
        message: reclusterJob.error || "See logs for details.",
        icon: <IconRefreshAlert size={18} />,
        color: "red",
        autoClose: 6000,
        loading: false,
      });
      prevReclusterStatus.current = reclusterJob.status;
    }
  }, [reclusterJob]);

  useEffect(() => {
    if (!isEditing || !evaluator) {
      return;
    }

    const e = evaluator as any;
    setName(e.name);
    setMode(e.mode);
    setFilters(e.filters as CheckLogic);

    if (e.type === "intent") {
      setType("intent");
      setParams({
        id: "intent",
        params: {
          maxIntents:
            typeof e.params?.maxIntents === "number"
              ? e.params.maxIntents
              : DEFAULT_INTENT_MAX,
        },
      });
      return;
    }

    if (e.type === "llm") {
      const scoringType = e.params?.scoringType ?? "categorical";
      if (scoringType === "categorical") {
        setType("model-labeler");
        const legacyCategories = Array.isArray(e.params?.categories)
          ? (e.params.categories as Array<{ label: string }>)
          : [];
        setParams({
          id: "model-labeler",
          params: {
            modelId: e.params?.modelId ?? "",
            prompt: e.params?.prompt ?? "",
            labels: legacyCategories
              .map((cat) => cat?.label)
              .filter(Boolean) as string[],
          },
        });
      } else {
        setType("model-scorer");
        setParams({
          id: "model-scorer",
          params: {
            modelId: e.params?.modelId ?? "",
            prompt: e.params?.prompt ?? "",
            minScore:
              typeof e.params?.minScore === "number" ? e.params?.minScore : 0,
            maxScore:
              typeof e.params?.maxScore === "number" ? e.params?.maxScore : 1,
          },
        });
      }
      return;
    }

    if (e.type === "text-similarity" || LEGACY_TEXT_SIMILARITY_TYPES.has(e.type)) {
      setType("text-similarity");
      const method =
        e.type === "text-similarity"
          ? e.params?.method ?? DEFAULT_TEXT_SIMILARITY_METHOD
          : e.type;
      setParams({
        id: "text-similarity",
        params: {
          method,
          reference: e.params?.reference ?? "",
        },
      });
      return;
    }

    setType(e.type);
    if (e.params) {
      if (e.type === "model-labeler") {
        const incomingLabels = Array.isArray(e.params.labels)
          ? e.params.labels
          : [];
        setParams({
          id: "model-labeler",
          params: {
            modelId: e.params?.modelId ?? "",
            prompt: e.params?.prompt ?? "",
            labels: incomingLabels.length ? incomingLabels : [""],
          },
        });
        return;
      }
      if (e.type === "model-scorer") {
        setParams({
          id: "model-scorer",
          params: {
            modelId: e.params?.modelId ?? "",
            prompt: e.params?.prompt ?? "",
            minScore:
              typeof e.params?.minScore === "number" ? e.params.minScore : 0,
            maxScore:
              typeof e.params?.maxScore === "number" ? e.params.maxScore : 10,
          },
        });
        return;
      }
      setParams({
        id: e.type,
        params: { ...(e.params as Record<string, any>) },
      });
    } else {
      setParams(undefined);
    }
  }, [isEditing, evaluator]);

  const allEvaluatorDefinitions = Object.values(EVALUATOR_TYPES).filter((e) => {
    if (e.beta && !org.beta) return false;
    return true;
  });

  const selectableEvaluators = allEvaluatorDefinitions.filter(
    (e) => !e.builtin,
  );

  const selectedEvaluator = allEvaluatorDefinitions.find((e) => e.id === type);
  const isBuiltinSelected = selectedEvaluator?.builtin ?? false;

  const ensureThreadFilter = useCallback(
    (logic: CheckLogic): CheckLogic => {
      if (selectedEvaluator?.id !== "intent") {
        return logic;
      }

      if (!Array.isArray(logic)) {
        return ["AND", { id: "type", params: { type: "thread" } }];
      }

      const rest = logic.slice(1) as CheckLogic[];

      let hasTypeFilter = false;
      const normalized = rest.map((node) => {
        if (
          typeof node === "object" &&
          node !== null &&
          !Array.isArray(node) &&
          node.id === "type"
        ) {
          hasTypeFilter = true;
          return { id: "type", params: { type: "thread" } };
        }
        return node;
      });

      if (!hasTypeFilter) {
        normalized.push({ id: "type", params: { type: "thread" } });
      }

      return ["AND", ...normalized] as CheckLogic;
    },
    [selectedEvaluator?.id],
  );

  const hasParams = Boolean(selectedEvaluator?.params?.length);
  const IconComponent = selectedEvaluator?.icon;
  const currentMaxIntents = params?.params?.maxIntents ?? DEFAULT_INTENT_MAX;

  useEffect(() => {
    if (!selectedEvaluator) return;

    setParams((prev: any) => {
      if (prev?.id === selectedEvaluator.id) {
        return prev;
      }

      if (selectedEvaluator.id === "model-labeler") {
        return {
          id: "model-labeler",
          params: {
            modelId: "",
            prompt: "",
            labels: [""],
          },
        };
      }

      if (selectedEvaluator.id === "model-scorer") {
        return {
          id: "model-scorer",
          params: {
            modelId: "",
            prompt: "",
            minScore: 0,
            maxScore: 10,
          },
        };
      }

      if (selectedEvaluator.id === "text-similarity") {
        return {
          id: "text-similarity",
          params: {
            method: DEFAULT_TEXT_SIMILARITY_METHOD,
            reference: "",
          },
        };
      }

      if (selectedEvaluator.id === "intent") {
        const defaultValue =
          (evaluatorParams?.maxIntents as number | undefined) ??
          DEFAULT_INTENT_MAX;
        return {
          id: "intent",
          params: {
            maxIntents: defaultValue,
          },
        };
      }

      const initialParams = (selectedEvaluator.params as any[]).reduce(
        (acc, param) => {
          if ("id" in param)
            acc[(param as any).id] = (param as any).defaultValue;
          return acc;
        },
        {} as Record<string, any>,
      );
      return { id: selectedEvaluator.id, params: initialParams };
    });
  }, [selectedEvaluator, evaluatorParams]);

  useEffect(() => {
    if (!selectedEvaluator || selectedEvaluator.id !== "intent") return;

    setMode("realtime");
    setFilters((prev) => ensureThreadFilter(prev));
  }, [selectedEvaluator, ensureThreadFilter]);

  function updateLabelerLabels(nextLabels: string[]) {
    setParams((prev: any) => ({
      id: "model-labeler",
      params: { ...(prev?.params ?? {}), labels: nextLabels },
    }));
  }

  async function handleReclusterIntents() {
    if (!evaluatorId) return;

    const maxIntents = params?.params?.maxIntents ?? DEFAULT_INTENT_MAX;

    try {
      await updateEvaluator(createEvaluatorBody());
      await startRecluster(maxIntents);
      await mutateReclusterJob();
    } catch (error: any) {
      notifications.show({
        title: "Failed to start reclustering",
        message: error?.message ?? "Unexpected error occurred",
        color: "red",
      });
    }
  }

  function createEvaluatorBody() {
    const normalizedFilters =
      type === "intent" ? ensureThreadFilter(filters) : filters;

    let payloadParams: Record<string, any>;

    if (type === "model-labeler") {
      const labels = Array.isArray(params?.params?.labels)
        ? params.params.labels
            .map((label: string) => label?.trim())
            .filter((label: string) => label?.length)
        : [];
      payloadParams = {
        ...(params?.params ?? {}),
        labels,
      };
    } else if (type === "model-scorer") {
      const minScore = Number(params?.params?.minScore ?? 0);
      const maxScore = Number(params?.params?.maxScore ?? 10);
      payloadParams = {
        ...(params?.params ?? {}),
        minScore,
        maxScore,
      };
    } else if (type === "text-similarity") {
      payloadParams = {
        method: params?.params?.method ?? DEFAULT_TEXT_SIMILARITY_METHOD,
        reference: params?.params?.reference ?? "",
        threshold: params?.params?.threshold ?? 0.5,
      };
    } else if (type === "intent") {
      payloadParams =
        params?.params ?? {
          maxIntents: DEFAULT_INTENT_MAX,
        };
    } else {
      payloadParams = params?.params ?? {};
    }

    return {
      name,
      slug: slugify(name),
      mode,
      params: payloadParams,
      type,
      filters: normalizedFilters,
      ownerId: user.id,
    };
  }

  async function createEvaluator() {
    if (!name) {
      notifications.show({
        icon: <IconX size={18} />,
        id: "error-alert",
        title: "Missing value",
        message: "Evaluator name required",
        color: "red",
        autoClose: 4000,
      });
      return;
    }
    if (isEditing) {
      await updateEvaluator(createEvaluatorBody());
    } else {
      await insertEvaluator(createEvaluatorBody());
    }
    router.push("/evaluators");
  }

  const sortedEvaluators = [...selectableEvaluators].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <Container>
      <Stack gap="xl">
        <Group align="center">
          <Title order={3}>
            {isEditing
              ? `Edit ${evaluatorName ?? name ?? "Evaluator"}`
              : "New Evaluator"}
          </Title>
        </Group>

        <TextInput
          label="Name"
          placeholder="Your evaluator name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {!isBuiltinSelected && (
          <Stack gap="sm">
            <Title order={6}>Evaluator type:</Title>
            <SimpleGrid cols={5} spacing="md">
              {sortedEvaluators.map((e) => (
                <EvaluatorCard
                  key={e.id}
                  evaluator={e}
                  isSelected={type === e.id}
                  onItemClick={(t) => {
                    setType(t);
                    setName(e.name);
                  }}
                />
              ))}
            </SimpleGrid>
          </Stack>
        )}

        {hasParams && selectedEvaluator && (
          <Fieldset legend="Configure" style={{ overflow: "visible" }}>
            <RenderCheckNode
              node={params}
              minimal={false}
              setNode={(newNode) => setParams(newNode as CheckLogic)}
              checks={[selectedEvaluator as any]}
            />
          </Fieldset>
        )}

        {type === "text-similarity" && params && (
          <Fieldset legend="Text Similarity Configuration">
            <Stack gap="md">
              <Select
                label="Method"
                data={TEXT_SIMILARITY_METHODS}
                value={params.params.method}
                onChange={(value) => {
                  if (!value) return;
                  setParams({
                    params: {
                      ...params.params,
                      method: value,
                    },
                    id: "text-similarity",
                  });
                }}
              />
              <Textarea
                label="Reference Text"
                placeholder="Enter the reference text to compare against"
                minRows={6}
                value={params.params.reference}
                onChange={(e) =>
                  setParams({
                    id: "text-similarity",
                    params: {
                      ...params.params,
                      reference: e.currentTarget.value,
                    },
                  })
                }
              />
            </Stack>
          </Fieldset>
        )}

        {type === "model-labeler" && params && (
          <Fieldset legend="Model Labeler Configuration">
            <Stack gap="md">
              <ProviderEditor
                value={{ model: params.params.modelId || "", config: {} }}
                hideStream
                hideTopP
                hideToolCalls
                onChange={({ model }) =>
                  setParams({
                    id: "model-labeler",
                    params: { ...params.params, modelId: model },
                  })
                }
              />
              <Textarea
                label="Evaluation Prompt"
                placeholder="Provide instructions for assigning labels"
                minRows={12}
                value={params.params.prompt}
                onChange={(e) =>
                  setParams({
                    id: "model-labeler",
                    params: { ...params.params, prompt: e.currentTarget.value },
                  })
                }
              />
              <Stack gap="xs">
                <Title order={6}>Labels</Title>
                {params.params.labels?.map((label: string, idx: number) => (
                  <Group key={idx} align="flex-start" wrap="nowrap">
                    <TextInput
                      style={{ flex: 1 }}
                      placeholder="Label name"
                      value={label}
                      onChange={(e) => {
                        const next = [...params.params.labels];
                        next[idx] = e.currentTarget.value;
                        updateLabelerLabels(next);
                      }}
                    />
                    <Button
                      variant="subtle"
                      p={0}
                      onClick={() => {
                        updateLabelerLabels(
                          params.params.labels.filter(
                            (_: any, i: number) => i !== idx,
                          ),
                        );
                      }}
                    >
                      <IconX size={16} />
                    </Button>
                  </Group>
                ))}
                <Button
                  variant="default"
                  leftSection={<IconCirclePlus size={16} />}
                  onClick={() =>
                    updateLabelerLabels([...(params.params.labels ?? []), ""])
                  }
                >
                  Add label
                </Button>
              </Stack>
            </Stack>
          </Fieldset>
        )}

        {type === "model-scorer" && params && (
          <Fieldset legend="Model Scorer Configuration">
            <Stack gap="md">
              <ProviderEditor
                value={{ model: params.params.modelId || "", config: {} }}
                hideStream
                hideTopP
                hideToolCalls
                onChange={({ model }) =>
                  setParams({
                    id: "model-scorer",
                    params: { ...params.params, modelId: model },
                  })
                }
              />
              <Textarea
                label="Evaluation Prompt"
                placeholder="Provide instructions for scoring the response"
                minRows={12}
                value={params.params.prompt}
                onChange={(e) =>
                  setParams({
                    id: "model-scorer",
                    params: { ...params.params, prompt: e.currentTarget.value },
                  })
                }
              />
              <Group align="flex-end" gap="md">
                <NumberInput
                  label="Minimum score"
                  value={params.params.minScore}
                  onChange={(value) => {
                    const min = Number.isFinite(Number(value))
                      ? Number(value)
                      : 0;
                    setParams({
                      id: "model-scorer",
                      params: {
                        ...params.params,
                        minScore: min,
                        maxScore:
                          params.params.maxScore < min
                            ? min
                            : params.params.maxScore,
                      },
                    });
                  }}
                />
                <NumberInput
                  label="Maximum score"
                  value={params.params.maxScore}
                  onChange={(value) => {
                    const max = Number.isFinite(Number(value))
                      ? Number(value)
                      : params.params.minScore;
                    setParams({
                      id: "model-scorer",
                      params: {
                        ...params.params,
                        maxScore: Math.max(max, params.params.minScore),
                      },
                    });
                  }}
                />
              </Group>
            </Stack>
          </Fieldset>
        )}

        {selectedEvaluator?.id === "intent" && params && (
          <Fieldset legend="Intent Configuration">
            <Stack gap="md">
              <NumberInput
                label="Max visible intents"
                min={1}
                max={100}
                value={currentMaxIntents}
                onChange={(value) => {
                  const next = Number(value);
                  setParams({
                    id: "intent",
                    params: {
                      maxIntents:
                        Number.isFinite(next) && next > 0
                          ? Math.min(Math.floor(next), 100)
                          : DEFAULT_INTENT_MAX,
                    },
                  });
                }}
              />
              {isEditing && (
                <Button
                  variant="default"
                  onClick={handleReclusterIntents}
                  loading={reclusterStarting}
                  disabled={reclusterStarting || isReclusterActive}
                >
                  Recluster intents
                </Button>
              )}
              {reclusterJob && (
                <Stack gap="xs" w="100%">
                  {isReclusterActive && (
                    <>
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          Reclustering intents
                        </Text>
                        <Text size="sm" c="dimmed">
                          {(reclusterJob.progress ?? 0).toFixed(1)}%
                        </Text>
                      </Group>
                      <Progress
                        value={reclusterJob.progress ?? 0}
                        size="md"
                        radius="sm"
                      />
                    </>
                  )}

                  {reclusterJob.status === "done" && (
                    <Alert
                      icon={<IconCheck size={16} />}
                      color="green"
                      variant="light"
                      title="Reclustering completed"
                    >
                      {reclusterJob.payload?.clusters != null
                        ? `Generated ${reclusterJob.payload?.clusters} canonical intents.`
                        : "Intent labels have been consolidated."}
                    </Alert>
                  )}

                  {reclusterJob.status === "failed" && (
                    <Alert
                      icon={<IconRefreshAlert size={16} />}
                      color="red"
                      variant="light"
                      title="Reclustering failed"
                    >
                      {reclusterJob.error ||
                        "An error occurred while reclustering intents. Please try again."}
                    </Alert>
                  )}
                </Stack>
              )}
            </Stack>
          </Fieldset>
        )}

        {selectedEvaluator && (
          <Fieldset legend="Live Mode Configuration">
            <Stack>
              <Box>
                <Switch
                  defaultChecked
                  onLabel="On"
                  offLabel="Off"
                  size="md"
                  styles={{ trackLabel: { fontSize: "10px" } }}
                  checked={mode === "realtime"}
                  onChange={(e) =>
                    setMode(e.currentTarget.checked ? "realtime" : "normal")
                  }
                />

                {mode === "realtime" && !isBuiltinSelected && (
                  <>
                    <Text mb="5" mt="sm" size="sm">
                      Filters
                    </Text>

                    <CheckPicker
                      minimal
                      value={filters}
                      showAndOr
                      onChange={(nextFilters) =>
                        setFilters(
                          selectedEvaluator?.id === "intent"
                            ? ensureThreadFilter(nextFilters)
                            : nextFilters,
                        )
                      }
                      restrictTo={(filter) =>
                        ["tags", "type", "users", "metadata", "date"].includes(
                          filter.id,
                        )
                      }
                    />
                  </>
                )}
              </Box>
            </Stack>
          </Fieldset>
        )}

        <Group justify="end">
          <Button
            disabled={!selectedEvaluator}
            onClick={createEvaluator}
            leftSection={IconComponent && <IconComponent size={16} />}
            size="md"
            variant="default"
          >
            {selectedEvaluator
              ? isEditing
                ? `Save ${selectedEvaluator.name} Evaluator`
                : `Create ${selectedEvaluator.name} Evaluator`
              : isEditing
                ? "Save"
                : "Create"}
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
