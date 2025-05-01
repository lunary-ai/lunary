import CheckPicker, { RenderCheckNode } from "@/components/checks/Picker";
import { useLogCount, useOrg, useUser } from "@/utils/dataHooks";
import { useEvaluators, useEvaluator } from "@/utils/dataHooks/evaluators";
import EVALUATOR_TYPES from "@/utils/evaluators";
import { slugify } from "@/utils/format";
import { theme } from "@/utils/theme";
import {
  Box,
  Button,
  Card,
  Container,
  Fieldset,
  Flex,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
  SegmentedControl,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCircleCheck, IconCirclePlus, IconX } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { CheckLogic, serializeLogic } from "shared";

function EvaluatorCard({
  evaluator,
  isSelected,
  onItemClick,
}: {
  onItemClick: (type: string) => void;
  isSelected: boolean;
  evaluator: any;
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
  const isEditing = Boolean(evaluatorId);

  const [name, setName] = useState<string>("");
  const [type, setType] = useState<string>();
  const [mode, setMode] = useState<string>("normal");
  const [params, setParams] = useState<any>();
  const [filters, setFilters] = useState<CheckLogic>([
    "OR",
    { id: "type", params: { type: "llm" } },
    { id: "type", params: { type: "chat" } },
  ]);

  const serializedFilters = serializeLogic(filters);
  const { count: logCount } = useLogCount(serializedFilters);

  const { org } = useOrg();

  // populate form when editing existing enricher
  useEffect(() => {
    if (isEditing && evaluator) {
      setName(evaluator.name);
      setType(evaluator.type);
      setMode(evaluator.mode);
      setFilters(evaluator.filters as CheckLogic);
    }
  }, [isEditing, evaluator]);

  const evaluatorTypes = Object.values(EVALUATOR_TYPES).filter((evaluator) => {
    if (evaluator.beta && !org.beta) {
      return false;
    }
    return true;
  });

  const selectedEvaluator = evaluatorTypes.find(
    (evaluator) => evaluator.id === type,
  );

  const hasParams = Boolean(selectedEvaluator?.params?.length);

  const IconComponent = selectedEvaluator?.icon;

  useEffect(() => {
    if (selectedEvaluator) {
      setParams({
        id: selectedEvaluator.id,
        params: selectedEvaluator.params.reduce((acc, param) => {
          if (param.id) {
            acc[param.id] = param.defaultValue;
          }
          return acc;
        }, {}),
      });
    }
  }, [selectedEvaluator]);

  async function createEvaluator() {
    // TODO: validation
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
      await updateEvaluator({
        name,
        slug: slugify(name),
        mode,
        params: params.params,
        type,
        filters,
        ownerId: user.id,
      });
    } else {
      await insertEvaluator({
        name,
        slug: slugify(name),
        mode,
        params: params.params,
        type,
        filters,
        ownerId: user.id,
      });
    }
    router.push("/evaluators");
  }

  return (
    <Container>
      <Stack gap="xl">
        <Group align="center">
          <Title>
            {isEditing ? `Edit ${evaluator?.name}` : "New Evaluator"}
          </Title>
        </Group>

        <TextInput
          label="Name"
          placeholder="Your evaluator name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <SegmentedControl
          label="Mode"
          data={[
            { label: "Realtime", value: "realtime" },
            { label: "Batch", value: "normal" },
          ]}
          value={mode}
          onChange={setMode}
        />

        <Stack>
          <Text>Select the type of evaluator you want to add:</Text>

          <SimpleGrid cols={5} spacing="md">
            {evaluatorTypes
              .sort((a, b) => (a.soon ? 1 : -1))
              .map((evaluator) => (
                <EvaluatorCard
                  key={evaluator.id}
                  evaluator={evaluator}
                  isSelected={type === evaluator.id}
                  onItemClick={(type) => {
                    setType(type);
                    setName(evaluator.name);
                  }}
                />
              ))}
          </SimpleGrid>
        </Stack>

        {hasParams && selectedEvaluator && (
          <Fieldset legend="Configure" style={{ overflow: "visible" }}>
            <RenderCheckNode
              node={params}
              minimal={false}
              setNode={(newNode) => {
                setParams(newNode as CheckLogic);
              }}
              checks={[selectedEvaluator]}
            />
          </Fieldset>
        )}

        <Card style={{ overflow: "visible" }} shadow="md" p="lg">
          <Stack>
            <Box>
              <Text mb="5" mt="sm">
                Select the logs to apply to:
              </Text>

              <CheckPicker
                minimal
                value={filters}
                showAndOr
                onChange={setFilters}
                restrictTo={(filter) =>
                  ["tags", "type", "users", "metadata", "date"].includes(
                    filter.id,
                  )
                }
              />
            </Box>
          </Stack>
        </Card>

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
