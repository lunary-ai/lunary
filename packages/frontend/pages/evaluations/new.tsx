import Steps from "@/components/blocks/Steps";
import Paywall from "@/components/layout/Paywall";
import {
  useChecklists,
  useDatasets,
  useEvaluations,
  useProject,
  useUser,
} from "@/utils/dataHooks";
import { fetcher } from "@/utils/fetcher";

import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Container,
  Group,
  InputBase,
  Loader,
  Modal,
  Pill,
  Progress,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconFlask2Filled, IconRefresh, IconTable } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { ChecklistModal } from "./checklists";
import ProviderEditor from "@/components/prompts/Provider";
import { MODELS, Provider, hasAccess } from "shared";
import { useLocalStorage } from "@mantine/hooks";
import OrgUserBadge from "@/components/blocks/OrgUserBadge";
import Link from "next/link";

const FEATURE_LIST = [
  "Define assertions to test variations of prompts",
  "Powerful AI powered assertion engine",
  "Compare results with OpenAI, Anthropic, Mistral and more",
];

const BASE_PROVIDER: Provider = {
  model: "gpt-4o",
  config: {},
};

function ProviderModal({ open, onClose, initialProvider }) {
  const [provider, setProvider] = useState<Provider>(
    initialProvider || BASE_PROVIDER,
  );

  useEffect(() => {
    if (initialProvider) {
      setProvider(initialProvider);
    }
  }, [initialProvider]);

  return (
    <Modal
      title="Model settings"
      size="lg"
      opened={open}
      onClose={() => onClose(null)}
    >
      <Stack>
        <ProviderEditor value={provider} onChange={setProvider} />
        <Group mt="lg" align="right" justify="space-between">
          <Button onClick={() => onClose(null)} variant="subtle">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onClose(provider);
            }}
          >
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default function NewEvaluation() {
  const [checklistModal, setChecklistModal] = useState(false);
  const [providerModal, setProviderModal] = useState(false);

  const [datasetId, setDatasetId] = useState<string | null>();
  const [checklistId, setChecklistId] = useState<string | null>();
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  const [providers, setProviders] = useLocalStorage<any[]>({
    key: "providers",
    defaultValue: [BASE_PROVIDER],
  });

  const [loading, setLoading] = useState(false);

  const [progress, setProgress] = useState(0);

  const router = useRouter();

  const { project } = useProject();

  const { datasets, isLoading: datasetsLoading } = useDatasets();
  const { checklists, loading: checklistsLoading } =
    useChecklists("evaluation");

  const { evaluations, isLoading } = useEvaluations();
  const { user } = useUser();

  // make sure to only fetch once
  const ref = useRef({ done: false });

  useEffect(() => {
    if (!project || ref.current?.done || datasetsLoading || checklistsLoading)
      return;

    const { clone } = router.query;

    if (clone) {
      ref.current.done = true;
      const fetchEval = async () => {
        const cloneEval = await fetcher.get(
          `/evaluations/${clone}?projectId=${project?.id}`,
        );

        if (!cloneEval) return;

        setDatasetId(cloneEval.datasetId);
        setProviders(cloneEval.providers);
        setChecklistId(cloneEval.checklistId);
      };

      fetchEval();
    }
  }, [project, router.query, datasetsLoading, checklistsLoading]);

  async function startEval() {
    setLoading(true);

    try {
      setProgress(0);

      await fetcher.getStream(
        `/evaluations?projectId=${project.id}`,
        {
          datasetId,
          providers,
          checklistId,
        },
        (chunk) => {
          const parsedLine = JSON.parse(chunk);

          setProgress(parsedLine.percentDone);

          if (parsedLine.id) {
            router.push(`/evaluations/${parsedLine.id}`);
          }
        },
      );
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  }

  const canStartEvaluation =
    datasetId &&
    providers.length > 0 &&
    hasAccess(user.role, "evaluations", "create");

  return (
    <>
      <ChecklistModal
        open={checklistModal}
        onClose={(id) => {
          setChecklistModal(false);
          if (id) setChecklistId(id);
        }}
      />
      <ProviderModal
        open={providerModal}
        onClose={(provider) => {
          setProviderModal(false);
          if (provider) {
            const updatedProviders = editingProvider
              ? providers.map((p) => (p === editingProvider ? provider : p))
              : [...providers, provider];
            setProviders(updatedProviders);
          }
          setEditingProvider(null); // Reset after closing
        }}
        initialProvider={editingProvider}
      />
      <Container>
        <Stack align="right" gap="lg">
          <Group align="center">
            <Title>Evaluation Playground</Title>
            <Badge variant="light" color="violet">
              Beta
            </Badge>
            <Badge variant="light" color="blue">
              no-code
            </Badge>
          </Group>

          <Text size="xl" mb="md">
            Compare prompts with different models to craft the perfect prompt.
          </Text>

          <Steps>
            <Steps.Step n={1} label="Dataset">
              <Text size="lg" mb="md" mt={-6}>
                Prompts with variations of variables to test.
              </Text>

              <Select
                placeholder="Select a Dataset"
                onChange={(datasetId) => setDatasetId(datasetId)}
                value={datasetId}
                disabled={datasetsLoading}
                data={datasets.map((dataset) => ({
                  label: dataset.slug,
                  value: dataset.id,
                }))}
              />
              <Anchor href="/datasets" mt="sm">
                + new
              </Anchor>
            </Steps.Step>
            <Steps.Step n={2} label="Models">
              <Text size="lg" mb="md" mt={-6}>
                LLMs you want to compare.
              </Text>
              <InputBase
                component="div"
                multiline
                onClick={() => {
                  setProviderModal(true);
                }}
              >
                <Pill.Group>
                  {providers?.map((provider, i) => (
                    <Pill
                      key={i}
                      variant="filled"
                      withRemoveButton
                      onRemove={() =>
                        setProviders(
                          providers.filter((_, index) => index !== i),
                        )
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProvider(provider);
                        setProviderModal(true);
                      }}
                      style={{
                        cursor: "pointer",
                      }}
                    >
                      {MODELS.find((model) => model.id === provider.model)
                        ?.name || provider.model}
                    </Pill>
                  ))}
                </Pill.Group>
              </InputBase>

              <Button
                onClick={() => setProviderModal(true)}
                size="xs"
                variant="default"
                mt="sm"
              >
                Add Provider
              </Button>
            </Steps.Step>
            <Steps.Step n={3} label="Checklist (optional)">
              <Group justify="space-between">
                <Text size="lg" mb="md" mt={-6}>
                  Assertions against which to run the dataset that will result
                  in a{" "}
                  <Text c="green" span fw="bold">
                    PASS
                  </Text>
                  .
                </Text>
                <Anchor href="/evaluations/checklists" mb="md">
                  Edit checklists
                </Anchor>
              </Group>
              <Select
                placeholder="Select a preset checklist or create a new one."
                onChange={(datasetId) => setChecklistId(datasetId)}
                value={checklistId}
                disabled={checklistsLoading}
                data={checklists?.map((dataset) => ({
                  label: dataset.slug,
                  value: dataset.id,
                }))}
              />
              <Anchor href="#" mt="sm" onClick={() => setChecklistModal(true)}>
                + new
              </Anchor>
            </Steps.Step>
          </Steps>

          {loading && progress > 0 && (
            <Progress
              radius="md"
              size="lg"
              value={progress}
              animated
              transitionDuration={800}
            />
          )}

          <Tooltip
            label="You need to add at least one prompt and one model to start an Evaluation"
            w="300"
            multiline
            events={{ hover: !canStartEvaluation, focus: true, touch: false }}
          >
            <Button
              size="md"
              display="inline-block"
              loading={loading}
              ml="auto"
              variant="gradient"
              disabled={!canStartEvaluation}
              leftSection={<IconFlask2Filled size={14} />}
              onClick={() => startEval()}
            >
              Start Evaluation
            </Button>
          </Tooltip>

          <Title order={3} mt="lg">
            History
          </Title>

          {isLoading ? (
            <Loader />
          ) : (
            <>
              {!evaluations?.length ? (
                <Alert color="gray" title="No evaluations yet" />
              ) : (
                <Stack gap="xl">
                  {evaluations.map((evaluation) => (
                    <Card key={evaluation.id} p="lg" withBorder>
                      <Group justify="space-between">
                        <Stack>
                          <Group>
                            <Title
                              order={3}
                              size={16}
                              onClick={() =>
                                router.push(`/evaluations/${evaluation.id}`)
                              }
                              style={{ cursor: "pointer" }}
                            >
                              {evaluation.name}
                            </Title>
                            <Badge
                              variant="light"
                              radius="sm"
                              color="teal"
                              size="sm"
                            >
                              Complete
                            </Badge>
                          </Group>

                          <Group>
                            {evaluation.models?.map((model, index) => (
                              <Badge key={index} variant="light" color="blue">
                                {model}
                              </Badge>
                            ))}
                          </Group>
                          <Group>
                            {evaluation.providers?.map((provider, index) => (
                              <Badge key={index} variant="light" color="blue">
                                {provider.model}
                              </Badge>
                            ))}
                          </Group>
                          <OrgUserBadge userId={evaluation.ownerId} />
                        </Stack>

                        <Group>
                          <Button
                            component={Link}
                            size="xs"
                            href={`/evaluations/${evaluation.id}`}
                            leftSection={<IconTable size={12} />}
                            variant="light"
                          >
                            Results
                          </Button>
                          <Button
                            variant="light"
                            color="teal"
                            size="xs"
                            leftSection={<IconRefresh size={12} />}
                            component={Link}
                            href={`/evaluations/new?clone=${evaluation.id}`}
                          >
                            Again
                          </Button>
                        </Group>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              )}
            </>
          )}
        </Stack>
      </Container>
    </>
  );
}
