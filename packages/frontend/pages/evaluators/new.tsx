import CheckPicker, { RenderCheckNode } from "@/components/checks/Picker";
import { useLogCount, useOrg, useUser } from "@/utils/dataHooks";
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
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
  SegmentedControl,
  Switch,
  Textarea,
  Tabs,
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
import { CheckLogic, serializeLogic } from "shared";
import { useCustomModels } from "@/utils/dataHooks/provider-configs";
import ProviderEditor from "@/components/prompts/Provider";
import { useIntentReclusterJob } from "@/utils/dataHooks/jobs";

const DEFAULT_INTENT_MAX = 10;

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
  const serializedFilters = serializeLogic(filters);
  const { count: logCount } = useLogCount(serializedFilters);

  const { org } = useOrg();
  const { customModels } = useCustomModels();
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
    if (isEditing && evaluator) {
      const e = evaluator as any;
      setName(e.name);
      setType(e.type);
      setMode(e.mode);
      setFilters(e.filters as CheckLogic);
      if (e.type === "llm" && e.params) {
        setParams({
          id: "llm",
          params: { ...(e.params as Record<string, any>) },
        });
      } else if (e.type === "intent") {
        setParams({
          id: "intent",
          params: {
            maxIntents:
              typeof e.params?.maxIntents === "number"
                ? e.params.maxIntents
                : DEFAULT_INTENT_MAX,
          },
        });
      }
    }
  }, [isEditing, evaluator]);

  const evaluatorTypes = Object.values(EVALUATOR_TYPES).filter((e) => {
    if (e.beta && !org.beta) return false;
    return true;
  });

  const selectedEvaluator = evaluatorTypes.find((e) => e.id === type);

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
    if (selectedEvaluator) {
      if (selectedEvaluator.id === "llm") {
        setParams({
          id: "llm",
          params: {
            modelId: "",
            scoringType: "boolean",
            prompt: "",
            categories: [],
          },
        });
      } else if (selectedEvaluator.id === "intent") {
        const defaultValue =
          (evaluatorParams?.maxIntents as number | undefined) ??
          DEFAULT_INTENT_MAX;
        setParams({
          id: "intent",
          params: {
            maxIntents: defaultValue,
          },
        });
        return;
      } else {
        const initialParams = (selectedEvaluator.params as any[]).reduce(
          (acc, param) => {
            if ("id" in param)
              acc[(param as any).id] = (param as any).defaultValue;
            return acc;
          },
          {} as Record<string, any>,
        );
        setParams({ id: selectedEvaluator.id, params: initialParams });
      }
    }
  }, [selectedEvaluator]);

  useEffect(() => {
    if (!selectedEvaluator || selectedEvaluator.id !== "intent") return;

    setMode("realtime");
    setFilters((prev) => ensureThreadFilter(prev));
  }, [selectedEvaluator, ensureThreadFilter]);

  function updateCategories(newCats: any[]) {
    setParams({
      id: "llm",
      params: { ...params.params, categories: newCats },
    });
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

    return {
      name,
      slug: slugify(name),
      mode,
      params:
        params?.params ??
        (type === "intent"
          ? {
              maxIntents: DEFAULT_INTENT_MAX,
            }
          : {}),
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

  const categories = Array.from(new Set(evaluatorTypes.map((e) => e.category)))
    .sort((a, b) => {
      const order: Record<string, number> = {
        labeler: 0,
        "text-similarity": 1,
        custom: 2,
      };
      const rankA = order[a] ?? 100;
      const rankB = order[b] ?? 100;
      return rankA !== rankB ? rankA - rankB : a.localeCompare(b);
    })
    .map((cat) => {
      if (cat === "labeler") return { name: "Model Labeler", value: "labeler" };
      if (cat === "text-similarity")
        return { name: "Text Similarity", value: "text-similarity" };
      return { name: "Custom", value: "custom" };
    });

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

        <Stack>
          <Title order={6}>Evaluator type:</Title>

          <Tabs
            defaultValue={categories[0].value}
            onChange={() => setType(undefined)}
          >
            <Tabs.List>
              {categories.map((category) => (
                <Tabs.Tab key={category.value} value={category.value}>
                  {category.name}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            {categories.map((category) => (
              <Tabs.Panel key={category.value} value={category.value} pt="md">
                <SimpleGrid cols={5} spacing="md">
                  {evaluatorTypes
                    .filter((e) => e.category === category.value)
                    .map((e) => (
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
              </Tabs.Panel>
            ))}
          </Tabs>
        </Stack>

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

        {type === "llm" && params && (
          <Fieldset legend="LLM Configuration">
            <Stack gap="md">
              <ProviderEditor
                value={{ model: params.params.modelId || "", config: {} }}
                hideStream
                hideTopP
                hideToolCalls
                onChange={({ model }) =>
                  setParams({
                    id: "llm",
                    params: { ...params.params, modelId: model },
                  })
                }
              />
              <SegmentedControl
                fullWidth
                value={params.params.scoringType || "boolean"}
                data={[
                  { label: "Boolean", value: "boolean" },
                  { label: "Categorical", value: "categorical" },
                ]}
                onChange={(value) =>
                  setParams({
                    id: "llm",
                    params: {
                      ...params.params,
                      scoringType: value,
                      categories:
                        value === "categorical"
                          ? (params.params.categories ?? [])
                          : [],
                    },
                  })
                }
              />
              <Textarea
                label="Evaluation Prompt"
                placeholder="Enter the prompt to guide the evaluator"
                minRows={20}
                value={params.params.prompt}
                onChange={(e) =>
                  setParams({
                    id: "llm",
                    params: { ...params.params, prompt: e.currentTarget.value },
                  })
                }
              />
              {params.params.scoringType === "categorical" && (
                <Stack gap="sm">
                  <Title order={6}>Labels</Title>
                  {params.params.categories.map(
                    (cat: { label: string; pass: boolean }, idx: number) => (
                      <Group key={idx} align="flex-start" wrap="nowrap">
                        <TextInput
                          style={{ flex: 1 }}
                          placeholder="Label name"
                          value={cat.label}
                          onChange={(e) => {
                            const cats = [...params.params.categories];
                            cats[idx] = { ...cats[idx], label: e.target.value };
                            updateCategories(cats);
                          }}
                        />
                        <SegmentedControl
                          data={[
                            { label: "Pass", value: "pass" },
                            { label: "Fail", value: "fail" },
                          ]}
                          value={cat.pass ? "pass" : "fail"}
                          onChange={(val) => {
                            const cats = [...params.params.categories];
                            cats[idx] = { ...cats[idx], pass: val === "pass" };
                            updateCategories(cats);
                          }}
                        />
                        <Button
                          variant="subtle"
                          p={0}
                          onClick={() => {
                            const cats = params.params.categories.filter(
                              (_: any, i: number) => i !== idx,
                            );
                            updateCategories(cats);
                          }}
                        >
                          <IconX size={16} />
                        </Button>
                      </Group>
                    ),
                  )}
                  <Button
                    variant="default"
                    leftSection={<IconCirclePlus size={16} />}
                    onClick={() =>
                      updateCategories([
                        ...params.params.categories,
                        { label: "", pass: true },
                      ])
                    }
                  >
                    Add label
                  </Button>
                </Stack>
              )}
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
                  disabled={selectedEvaluator?.id === "intent"}
                />

                {mode === "realtime" && (
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
