import { useCallback, useEffect, useRef, useState } from "react";

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Group,
  Modal,
  PasswordInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";

import HotkeysInfo from "@/components/blocks/HotkeysInfo";
import { openUpgrade } from "@/components/layout/UpgradeModal";
import TemplateInputArea from "@/components/prompts/TemplateInputArea";
import TemplateList, {
  defaultTemplateVersion,
} from "@/components/prompts/TemplateMenu";
import {
  useCreatePlaygroundEndpoint,
  useDeletePlaygroundEndpoint,
  useOrg,
  usePlaygroundEndpoints,
  useProject,
  useRunEndpoint,
  useTemplate,
  useTemplates,
  useTemplateVersion,
  useTestEndpointConnection,
  useUpdatePlaygroundEndpoint,
  useUser,
  type PlaygroundEndpoint,
} from "@/utils/dataHooks";
import { notifications } from "@mantine/notifications";
import {
  IconBolt,
  IconBook,
  IconBracketsAngle,
  IconCheck,
  IconDeviceFloppy,
  IconGitCommit,
  IconPlus,
  IconSettings,
  IconTrash,
  IconVariable,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { generateSlug } from "random-word-slugs";

import analytics from "@/utils/analytics";
import { fetcher } from "@/utils/fetcher";
import { useGlobalShortcut } from "@/utils/hooks";

import Empty from "@/components/layout/Empty";

import { useCheckedPromptVariables } from "@/utils/promptsHooks";
import { openConfirmModal } from "@mantine/modals";

import PromptVariableEditor from "@/components/prompts/PromptVariableEditor";
import ProviderEditor, { ParamItem } from "@/components/prompts/Provider";
import { hasAccess } from "shared";

function NotepadButton({ value, onChange }) {
  const [modalOpened, setModalOpened] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  return (
    <>
      <Modal
        size="lg"
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Notepad"
      >
        <Textarea
          autosize
          minRows={5}
          maxRows={30}
          placeholder="Write down thoughts, ideas, or anything else you want to remember about this template. Notes are versioned."
          defaultValue={value}
          onChange={(e) => setTempValue(e.currentTarget.value)}
        />
        <Group mt="sm" align="right">
          <Button
            ml="auto"
            size="xs"
            variant="filled"
            onClick={() => {
              onChange(tempValue);
              setModalOpened(false);
            }}
          >
            Save
          </Button>
        </Group>
      </Modal>
      <Button
        size="xs"
        variant="subtle"
        leftSection={<IconBook size={18} />}
        onClick={() => {
          setModalOpened(true);
        }}
      >
        Notepad
      </Button>
    </>
  );
}

function Playground() {
  const router = useRouter();

  const { project } = useProject();
  const { user } = useUser();

  const [template, setTemplate] = useState<any>();
  const [templateVersion, setTemplateVersion] = useState<any>(
    defaultTemplateVersion,
  );

  const [hasChanges, setHasChanges] = useState(false);

  const { templates, insert, mutate } = useTemplates();
  const { insertVersion } = useTemplate(template?.id);
  const { update: updateVersion } = useTemplateVersion(templateVersion?.id);

  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInsertingTemplate, setInsertingTemplate] = useState(false);

  const [output, setOutput] = useState<any>(null);
  const [outputTokens, setOutputTokens] = useState<any>(null);
  const [error, setError] = useState(null);

  const [rename, setRename] = useState(null);

  // Custom endpoint state
  const [runMode, setRunMode] = useState<"playground" | "endpoint">(
    "playground",
  );
  const [customEndpoint, setCustomEndpoint] = useState<
    Partial<PlaygroundEndpoint> & {
      authValue?: string;
      apiKeyHeader?: string;
      username?: string;
      password?: string;
    }
  >({
    name: "",
    url: "",
    auth: null,
    headers: { "Content-Type": "application/json" },
    defaultPayload: {},
  });
  const [defaultPayloadText, setDefaultPayloadText] = useState("");
  const [endpointModalOpen, setEndpointModalOpen] = useState(false);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(
    null,
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [variablesModalOpen, setVariablesModalOpen] = useState(false);
  const [hoveredEndpointId, setHoveredEndpointId] = useState<string | null>(
    null,
  );

  // Hooks for API operations
  const { endpoints, isLoading: isLoadingEndpoints } = usePlaygroundEndpoints();
  const { createEndpoint, isCreating } = useCreatePlaygroundEndpoint();
  const [editingEndpointId, setEditingEndpointId] = useState<string | null>(
    null,
  );
  const { updateEndpoint, isUpdating } =
    useUpdatePlaygroundEndpoint(editingEndpointId);
  const { deleteEndpoint } = useDeletePlaygroundEndpoint();
  const { testConnection } = useTestEndpointConnection();
  const { runEndpoint } = useRunEndpoint();

  // Select first endpoint by default
  useEffect(() => {
    if (endpoints.length > 0 && !selectedEndpointId) {
      const firstEndpoint = endpoints[0];
      setSelectedEndpointId(firstEndpoint.id);
    }
  }, [endpoints, selectedEndpointId]);

  const selectedEndpoint = endpoints.find((ep) => ep.id === selectedEndpointId);

  // Helper function to generate the protected payload with messages and model_params
  const generateProtectedPayload = () => {
    // Process the prompt content
    const replaceVariables = (content: any, variables: any) => {
      if (typeof content === "string") {
        let result = content;
        Object.entries(variables).forEach(([key, value]) => {
          result = result.replace(
            new RegExp(`{{\\s*${key}\\s*}}`, "g"),
            String(value),
          );
        });
        return result;
      } else if (Array.isArray(content)) {
        return content.map((message) => ({
          ...message,
          content: replaceVariables(message.content, variables),
        }));
      }
      return content;
    };

    const processedContent = replaceVariables(
      templateVersion.content,
      templateVersion.testValues,
    );

    const protectedPayload: any = {
      messages:
        typeof processedContent === "string"
          ? [{ role: "user", content: processedContent }]
          : processedContent,
    };

    if (templateVersion.extra) {
      protectedPayload.model_params = {
        temperature: templateVersion.extra.temperature,
        max_tokens: templateVersion.extra.max_tokens,
        model: templateVersion.extra.model,
      };
    }

    return protectedPayload;
  };

  // Helper functions to convert between form and API auth formats
  const convertFormAuthToAPI = (
    formData: typeof customEndpoint,
  ): PlaygroundEndpoint["auth"] => {
    if (!formData.auth?.type || formData.auth.type === "none") return null;

    switch (formData.auth.type) {
      case "bearer":
        return { type: "bearer", token: formData.authValue || "" };
      case "api_key":
        return {
          type: "api_key",
          header: formData.apiKeyHeader || "X-API-Key",
          key: formData.authValue || "",
        };
      case "basic":
        return {
          type: "basic",
          username: formData.username || "",
          password: formData.password || "",
        };
      default:
        return null;
    }
  };

  const convertAPIAuthToForm = (auth: PlaygroundEndpoint["auth"]) => {
    if (!auth)
      return {
        auth: null,
        authValue: "",
        apiKeyHeader: "X-API-Key",
        username: "",
        password: "",
      };

    switch (auth.type) {
      case "bearer":
        return {
          auth,
          authValue: auth.token,
          apiKeyHeader: "X-API-Key",
          username: "",
          password: "",
        };
      case "api_key":
        return {
          auth,
          authValue: auth.key,
          apiKeyHeader: auth.header,
          username: "",
          password: "",
        };
      case "basic":
        return {
          auth,
          authValue: "",
          apiKeyHeader: "X-API-Key",
          username: auth.username,
          password: auth.password,
        };
    }
  };

  useGlobalShortcut([
    [
      "mod+S",
      () => {
        // Check if save button would be enabled
        if (template && templateVersion && !loading) {
          // For existing templates, only save if there are changes
          if (templateVersion?.id && hasChanges) {
            saveTemplate();
          }
          // For new templates, always allow save
          else if (!templateVersion?.id) {
            saveTemplate();
          }
        }
      },
    ],
    [
      "mod+Enter",
      () => {
        if (!streaming) runPlayground();
      },
    ],
  ]);

  const { mutate: revalidateUser } = useUser();
  const { org } = useOrg();

  // make sure to only fetch once
  const ref = useRef({ done: false });

  useEffect(() => {
    if (!project || ref.current?.done) return;

    const { clone, id } = router.query;

    // check if we want to clone an existing run
    if (id) {
      ref.current.done = true;

      const fetchTemplate = async () => {
        setLoading(true);

        const data = await fetcher.get(
          `/template_versions/${id}?projectId=${project?.id}`,
        );

        if (data) {
          setTemplateVersion(data);
          setTemplate(data.template);
        }

        setLoading(false);
      };

      fetchTemplate();
    } else if (clone) {
      ref.current.done = true;
      const fetchRun = async () => {
        setLoading(true);
        const run = await fetcher.get(
          `/runs/${clone}?projectId=${project?.id}`,
        );

        if (run?.input) {
          if (Array.isArray(run.input)) {
            for (const input of run.input) {
              delete input.enrichments;
            }
          }

          setTemplateVersion({
            // ...templateVersion,
            content: run.input,
            extra: { ...run.params, model: run.name },
          });

          setTemplate({ mode: "openai" });

          setOutput(run.output);
          setOutputTokens(run.tokens?.completion);
        }

        setLoading(false);

        // remove the query params
        router.push("/prompts");
      };

      fetchRun();
    } else {
      setTemplate({ mode: "openai" });
      setTemplateVersion(defaultTemplateVersion);
    }
  }, [project, router.query]);

  useEffect(() => {
    setHasChanges(false);
  }, [template?.id]);

  // Save as draft without deploying
  const saveTemplate = async () => {
    if (templateVersion.isDraft && templateVersion.id) {
      await updateVersion(templateVersion);
    } else {
      const data = {
        testValues: templateVersion.testValues,
        content: templateVersion.content,
        extra: templateVersion.extra,
        notes: templateVersion.notes,
        isDraft: true,
      };

      if (template?.id) {
        const newVersion = await insertVersion(data);

        switchTemplateVersion(newVersion);
      } else {
        const newTemplate = await insert({
          slug: generateSlug(),
          mode: "openai",
          ...data,
        });

        setTemplate(newTemplate);
        switchTemplateVersion(newTemplate?.versions[0]);
      }
    }

    setHasChanges(false);

    mutate();
  };

  const confirmDiscard = useCallback(
    (onProceed) => {
      if (hasChanges) {
        return openConfirmModal({
          title: "Discard changes?",
          confirmProps: { color: "red" },

          children: (
            <Text size="sm">
              You have unsaved changes. Are you sure you want to discard them?
            </Text>
          ),
          labels: { confirm: "Confirm", cancel: "Cancel" },
          onConfirm() {
            onProceed();
            setHasChanges(false);
          },
        });
      }

      onProceed();
    },
    [hasChanges],
  );

  const createTemplate = async () => {
    confirmDiscard(async () => {
      setInsertingTemplate(true);
      const slug = generateSlug(2);
      const newTemplate = await insert({
        mode: "openai",
        slug,
        ...defaultTemplateVersion,
      });
      setTemplate(newTemplate);
      setRename(newTemplate.id);
      switchTemplateVersion(newTemplate.versions[0]);
      await mutate();
      setInsertingTemplate(false);
    });
  };

  // Deploy the template
  const commitTemplate = async () => {
    if (templateVersion.isDraft && templateVersion.id) {
      await updateVersion({
        ...templateVersion,
        isDraft: false,
      });

      setTemplateVersion({ ...templateVersion, isDraft: false });
    } else {
      const data = {
        testValues: templateVersion.testValues,
        content: templateVersion.content,
        extra: templateVersion.extra,
        notes: templateVersion.notes,
        isDraft: false,
      };

      if (!template?.id) {
        const newTemplate = await insert({
          slug: generateSlug(2),
          mode: "openai",
          ...data,
        });

        setTemplate(newTemplate);
        switchTemplateVersion(newTemplate?.versions[0]);
      } else {
        const newVersion = await insertVersion(data);

        switchTemplateVersion(newVersion);
      }
    }

    notifications.show({
      title: "Template deployed",
      icon: <IconCheck size={24} />,
      message: "A new version of your template is now being served.",
      color: "teal",
    });

    setHasChanges(false);

    mutate();
  };

  const runPlayground = async () => {
    if (runMode === "playground") {
      // Original LLM playground logic
      const model = templateVersion?.extra?.model;

      if (org?.plan === "free" || !org?.playAllowance) {
        return openUpgrade("playground");
      }

      analytics.track("RunPlayground", {
        model,
      });

      // Validate content
      if (!templateVersion.content) {
        notifications.show({
          title: "No content",
          message: "Please enter some content in your prompt",
          color: "red",
        });
        return;
      }

      // If content is an array (chat mode), ensure no messages have null content
      if (Array.isArray(templateVersion.content)) {
        const hasEmptyContent = templateVersion.content.some(
          (msg) =>
            msg.content === null ||
            msg.content === undefined ||
            msg.content === "",
        );
        if (hasEmptyContent) {
          notifications.show({
            title: "Empty message",
            message: "All messages must have content",
            color: "red",
          });
          return;
        }
      }

      setError(null);
      setOutput(null);
      setOutputTokens(0);
      setStreaming(true);

      let citations = null;

      try {
        await fetcher.getStream(
          `/orgs/${org?.id}/playground`,
          {
            content: templateVersion.content,
            extra: templateVersion.extra,
            variables: templateVersion.testValues,
          },
          (chunk) => {
            try {
              const parsedLine = JSON.parse(chunk);
              if (parsedLine.citations && !citations) {
                citations = parsedLine.citations;
              }

              let output = parsedLine.choices[0]?.message;
              if (citations) {
                output.citations = citations;
              }
              setOutput(output);
              setOutputTokens(parsedLine.usage?.completion_tokens || 0);
              setError(null);
            } catch (error) {
              console.error(error);
            }
          },
        );

        // scroll template-input-area to the end
        const element = document.getElementById("template-input-area");
        element.scrollTop = element.scrollHeight;
      } catch (e) {
        console.error(e);
        setError(e);
      }

      revalidateUser();
    } else {
      // Custom endpoint logic
      if (!selectedEndpoint) {
        notifications.show({
          title: "No endpoint selected",
          message: "Please configure and select an endpoint first",
          color: "red",
        });
        return;
      }

      analytics.track("RunEndpoint", {
        endpoint: selectedEndpoint.name,
      });

      setError(null);
      setOutput(null);
      setOutputTokens(0);
      setStreaming(true);

      try {
        // Get the custom payload from the endpoint
        const customPayload = selectedEndpoint.defaultPayload || {};

        // Generate the protected payload and merge with custom payload
        const protectedPayload = generateProtectedPayload();
        const payload = {
          ...customPayload,
          ...protectedPayload, // Protected fields override custom fields
        };

        const data = await runEndpoint({
          endpoint: selectedEndpoint,
          payload,
        });

        // Check if response is an array of OpenAI messages
        if (Array.isArray(data) && data.length > 0) {
          // Check if all items look like OpenAI messages (have role and content)
          const isMessageArray = data.every(
            (item) =>
              typeof item === "object" &&
              item !== null &&
              "role" in item &&
              ("content" in item ||
                "tool_calls" in item ||
                "function_call" in item),
          );

          if (isMessageArray) {
            // Display messages properly
            // Find the last assistant message or display all messages
            const lastAssistantMessage = [...data]
              .reverse()
              .find((msg) => msg.role === "assistant");

            if (lastAssistantMessage) {
              setOutput(lastAssistantMessage);
            } else {
              // If no assistant message, show all messages as they would appear in chat
              setOutput({
                role: "assistant",
                content: data
                  .map((msg) => `${msg.role}: ${msg.content || "[tool call]"}`)
                  .join("\n\n"),
              });
            }
          } else {
            // Not a message array, display as raw JSON
            setOutput({
              role: "api",
              content: JSON.stringify(data, null, 2),
            });
          }
        } else {
          // Not an array, display as raw JSON
          setOutput({
            role: "api",
            content: JSON.stringify(data, null, 2),
          });
        }

        // scroll template-input-area to the end
        const element = document.getElementById("template-input-area");
        if (element) element.scrollTop = element.scrollHeight;
      } catch (e) {
        console.error(e);
        setError(e);
      }
    }

    setStreaming(false);
  };

  // reset output when the template or template version changes, but not if cloned
  useEffect(() => {
    if (!router.query.clone) {
      setOutput(null);
      setError(null);
      setOutputTokens(0);
    }
  }, [
    template?.id,
    templateVersion?.id,
    templateVersion?.extra?.model,
    typeof templateVersion?.content, // when switching from chat to text mode
    router.query.clone,
  ]);

  const switchTemplateVersion = (v) => {
    setTemplateVersion(v);
    router.push(`/prompts/${v.id}`);
  };

  const variables = useCheckedPromptVariables(
    templateVersion?.content,
    templateVersion?.testValues,
  );

  return (
    <Empty
      enable={templates && !templates.length && !router.query.clone}
      title="Create prompt templates"
      features={[
        "Collaborate with non-technical people",
        "Clean up your source-code",
        "Easily roll-back to previous versions",
        "Test models such as Mistral, Claude v2, Bison & more.",
      ]}
      Icon={IconBracketsAngle}
      buttonLabel="Create first template"
      onClick={createTemplate}
    >
      <Flex w="100%" h="100vh" style={{ position: "relative" }}>
        <Box
          flex={`0 0 230px`}
          py="sm"
          style={{
            borderRight: "1px solid rgba(120, 120, 120, 0.1)",
            height: "100vh",
            overflowY: "auto",
          }}
        >
          <TemplateList
            rename={rename}
            createTemplate={createTemplate}
            isInserting={isInsertingTemplate}
            setRename={setRename}
            activeTemplate={template}
            activeVersion={templateVersion}
            switchTemplateVersion={(t, v) => {
              const proceed = () => {
                setTemplate(t);
                switchTemplateVersion(v);
              };

              // means we are deleting the template and already went through confirm
              if (!t) return proceed();

              confirmDiscard(() => {
                proceed();
              });
            }}
          />
        </Box>
        <Box
          flex="1"
          style={{
            borderRight: "1px solid rgba(120, 120, 120, 0.1)",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header with Save and Deploy buttons */}
          {template && templateVersion && (
            <Box
              px="xl"
              style={{
                height: "63px",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                borderBottom: "1px solid rgba(120, 120, 120, 0.1)",
              }}
            >
              <Group>
                {template?.id && templateVersion?.id && (
                  <NotepadButton
                    value={templateVersion?.notes}
                    onChange={async (notes) => {
                      const data = {
                        ...templateVersion,
                        notes,
                      };

                      setTemplateVersion(data);

                      // save directly without bumping version so no changes are lost
                      await updateVersion(data);

                      mutate();
                    }}
                  />
                )}

                {template && (
                  <Button
                    size="xs"
                    variant="subtle"
                    leftSection={<IconVariable size={18} />}
                    rightSection={
                      Object.keys(variables).length > 0 ? (
                        <Badge size="xs" variant="filled" circle>
                          {Object.keys(variables).length}
                        </Badge>
                      ) : null
                    }
                    onClick={() => setVariablesModalOpen(true)}
                  >
                    Variables
                  </Button>
                )}

                {!templateVersion?.id &&
                  hasAccess(user.role, "prompts", "create") && (
                    <Button
                      leftSection={<IconDeviceFloppy size={18} />}
                      size="xs"
                      loading={loading}
                      data-testid="save-template"
                      disabled={loading || (template?.id && !hasChanges)}
                      variant="outline"
                      onClick={saveTemplate}
                      rightSection={
                        <HotkeysInfo
                          hot="S"
                          size="xs"
                          style={{ marginTop: -2 }}
                        />
                      }
                    >
                      Save as new template
                    </Button>
                  )}

                {templateVersion?.id &&
                  hasAccess(user.role, "prompts", "create_draft") && (
                    <Button
                      leftSection={<IconDeviceFloppy size={18} />}
                      size="xs"
                      loading={loading}
                      data-testid="save-template"
                      disabled={loading || (template?.id && !hasChanges)}
                      variant="outline"
                      onClick={saveTemplate}
                      rightSection={
                        <HotkeysInfo
                          hot="S"
                          size="xs"
                          style={{ marginTop: -2 }}
                        />
                      }
                    >
                      Save changes
                    </Button>
                  )}

                {hasAccess(user.role, "prompts", "update") &&
                  templateVersion?.id && (
                    <Button
                      leftSection={<IconGitCommit size={18} />}
                      size="xs"
                      loading={loading}
                      data-testid="deploy-template"
                      disabled={
                        loading || !(templateVersion?.isDraft || hasChanges)
                      }
                      variant="filled"
                      onClick={commitTemplate}
                    >
                      Deploy
                    </Button>
                  )}
              </Group>
            </Box>
          )}

          {/* Main content area */}
          <Box
            p="xl"
            flex="1"
            style={{
              overflowY: "auto",
            }}
          >
            <Box id="template-input-area">
              <TemplateInputArea
                template={templateVersion}
                setTemplate={setTemplateVersion}
                saveTemplate={saveTemplate}
                setHasChanges={setHasChanges}
                output={output}
                outputTokens={outputTokens}
                error={error}
              />
            </Box>
          </Box>
        </Box>
        <Box
          style={{
            width: "400px",
            flexShrink: 0,
            height: "100vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            px="xl"
            style={{
              height: "63px",
              display: "flex",
              alignItems: "center",
              borderBottom: "1px solid rgba(120, 120, 120, 0.1)",
            }}
          >
            <Text size="lg" fw={600}>
              Configuration
            </Text>
          </Box>

          <Box
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "var(--mantine-spacing-xl)",
            }}
          >
            <Stack gap="xl">
              {template && (
                <>
                  <Box>
                    <ParamItem
                      name="Run Mode"
                      description="Choose between using a model provider or your own custom endpoint"
                      value={
                        <SegmentedControl
                          size="sm"
                          data={[
                            { value: "playground", label: "Model Provider" },
                            { value: "endpoint", label: "Custom Endpoint" },
                          ]}
                          value={runMode}
                          onChange={(value) =>
                            setRunMode(value as "playground" | "endpoint")
                          }
                        />
                      }
                    />
                  </Box>

                  <Box>
                    <ProviderEditor
                      value={{
                        model: templateVersion?.extra?.model,
                        config: templateVersion?.extra,
                      }}
                      onChange={(val) => {
                        setHasChanges(true);
                        setTemplateVersion({
                          ...templateVersion,
                          extra: { ...val.config, model: val.model },
                        });
                      }}
                    />
                  </Box>

                  {runMode === "endpoint" && (
                    <Stack mt="sm">
                      <Text size="sm" fw="bold">
                        Choose Endpoint
                      </Text>

                      {isLoadingEndpoints ? (
                        <Text size="sm" c="dimmed" ta="center">
                          Loading endpoints...
                        </Text>
                      ) : (
                        <>
                          {endpoints.map((endpoint) => (
                            <Card
                              key={endpoint.id}
                              withBorder
                              p="sm"
                              style={{
                                cursor: "pointer",
                                borderColor:
                                  selectedEndpointId === endpoint.id
                                    ? "var(--mantine-color-black-6)"
                                    : undefined,
                                borderWidth:
                                  selectedEndpointId === endpoint.id ? 2 : 1,
                                backgroundColor:
                                  hoveredEndpointId === endpoint.id
                                    ? "var(--mantine-color-gray-0)"
                                    : undefined,
                                transition: "all 0.2s ease",
                              }}
                              onClick={() => {
                                setSelectedEndpointId(endpoint.id);
                              }}
                              onMouseEnter={() =>
                                setHoveredEndpointId(endpoint.id)
                              }
                              onMouseLeave={() => setHoveredEndpointId(null)}
                            >
                              <Group justify="space-between">
                                <Group>
                                  <input
                                    type="radio"
                                    checked={selectedEndpointId === endpoint.id}
                                    onChange={() =>
                                      setSelectedEndpointId(endpoint.id)
                                    }
                                    style={{
                                      cursor: "pointer",
                                      width: "12px",
                                      height: "12px",
                                      accentColor: "black",
                                    }}
                                  />
                                  <Box>
                                    <Text size="sm" fw={500}>
                                      {endpoint.name}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {endpoint.url}
                                    </Text>
                                  </Box>
                                </Group>
                                {hoveredEndpointId === endpoint.id && (
                                  <Group gap={4}>
                                    <ActionIcon
                                      size="sm"
                                      color="gray"
                                      variant="subtle"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditMode(true);
                                        setEditingEndpointId(endpoint.id);
                                        // Convert API auth format to form format for editing
                                        const formData = convertAPIAuthToForm(
                                          endpoint.auth,
                                        );
                                        setCustomEndpoint({
                                          ...endpoint,
                                          ...formData,
                                        });
                                        setDefaultPayloadText(
                                          JSON.stringify(
                                            endpoint.defaultPayload || {},
                                            null,
                                            2,
                                          ),
                                        );
                                        setEndpointModalOpen(true);
                                      }}
                                    >
                                      <IconSettings size={16} />
                                    </ActionIcon>
                                    <ActionIcon
                                      size="sm"
                                      variant="subtle"
                                      color="red"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          await deleteEndpoint(endpoint.id);
                                          if (
                                            selectedEndpointId === endpoint.id
                                          ) {
                                            setSelectedEndpointId(null);
                                          }
                                          notifications.show({
                                            title: "Endpoint deleted",
                                            message:
                                              "The endpoint has been removed successfully",
                                            color: "green",
                                          });
                                        } catch (error) {
                                          notifications.show({
                                            title: "Error deleting endpoint",
                                            message: error.message,
                                            color: "red",
                                          });
                                        }
                                      }}
                                    >
                                      <IconTrash size={16} />
                                    </ActionIcon>
                                  </Group>
                                )}
                              </Group>
                            </Card>
                          ))}

                          <Card
                            withBorder
                            p="sm"
                            style={{
                              border: "2px dashed var(--mantine-color-gray-4)",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                            onClick={() => {
                              // Reset to default values for new endpoint
                              setIsEditMode(false);
                              setEditingEndpointId(null);
                              setCustomEndpoint({
                                name: "",
                                url: "",
                                auth: null,
                                authValue: "",
                                apiKeyHeader: "X-API-Key",
                                username: "",
                                password: "",
                                headers: { "Content-Type": "application/json" },
                                defaultPayload: {},
                              });
                              setSelectedEndpointId(null);
                              setDefaultPayloadText("");
                              setEndpointModalOpen(true);
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor =
                                "var(--mantine-color-gray-5)";
                              e.currentTarget.style.backgroundColor =
                                "var(--mantine-color-gray-0)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor =
                                "var(--mantine-color-gray-4)";
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                            }}
                          >
                            <Group justify="center" gap="xs">
                              <IconPlus
                                size={16}
                                color="var(--mantine-color-gray-7)"
                              />
                              <Text size="sm" fw={500} c="gray.7">
                                Configure New Endpoint
                              </Text>
                            </Group>
                          </Card>
                        </>
                      )}
                    </Stack>
                  )}
                </>
              )}
            </Stack>
          </Box>
          {hasAccess(user.role, "prompts", "run") && (
            <Box
              p="xl"
              style={{
                borderTop: "1px solid rgba(120, 120, 120, 0.1)",
                backgroundColor: "var(--mantine-color-body)",
              }}
            >
              <Button
                fullWidth
                leftSection={<IconBolt size="16" />}
                size="sm"
                disabled={loading}
                onClick={runPlayground}
                data-testid="run-playground"
                loading={streaming}
                rightSection={
                  <HotkeysInfo
                    hot="Enter"
                    size="sm"
                    style={{ marginTop: -4 }}
                  />
                }
              >
                Run
              </Button>
            </Box>
          )}
        </Box>
      </Flex>

      {/* Custom Endpoint Configuration Modal */}
      <Modal
        opened={endpointModalOpen}
        onClose={() => {
          setEndpointModalOpen(false);
          setIsEditMode(false);
          setEditingEndpointId(null);
        }}
        title={isEditMode ? "Edit Endpoint" : "Configure New Endpoint"}
        size="lg"
      >
        <Stack>
          <TextInput
            label="Name"
            placeholder="e.g., Production API"
            required
            value={customEndpoint.name || ""}
            onChange={(e) =>
              setCustomEndpoint({ ...customEndpoint, name: e.target.value })
            }
          />

          <TextInput
            label="URL"
            placeholder="https://api.myapp.com/chat"
            required
            value={customEndpoint.url || ""}
            onChange={(e) =>
              setCustomEndpoint({ ...customEndpoint, url: e.target.value })
            }
          />

          <Box>
            <Text size="sm" fw={500} mb={4}>
              Method
            </Text>
            <Text size="sm" c="dimmed">
              POST
            </Text>
          </Box>

          <Select
            label="Authentication Type"
            value={customEndpoint.auth?.type || "none"}
            onChange={(value) => {
              if (value === "none") {
                setCustomEndpoint({ ...customEndpoint, auth: null });
              } else {
                setCustomEndpoint({
                  ...customEndpoint,
                  auth: { type: value as "bearer" | "api_key" | "basic" },
                });
              }
            }}
            data={[
              { value: "none", label: "None" },
              { value: "bearer", label: "Bearer Token" },
              { value: "api_key", label: "API Key" },
              { value: "basic", label: "Basic Auth" },
            ]}
          />

          {customEndpoint.auth?.type === "bearer" && (
            <PasswordInput
              label="Bearer Token"
              placeholder="Enter your token"
              required
              value={customEndpoint.authValue || ""}
              onChange={(e) =>
                setCustomEndpoint({
                  ...customEndpoint,
                  authValue: e.target.value,
                })
              }
            />
          )}

          {customEndpoint.auth?.type === "api_key" && (
            <>
              <TextInput
                label="Header Name"
                placeholder="e.g., X-API-Key"
                required
                value={customEndpoint.apiKeyHeader || "X-API-Key"}
                onChange={(e) =>
                  setCustomEndpoint({
                    ...customEndpoint,
                    apiKeyHeader: e.target.value,
                  })
                }
              />
              <PasswordInput
                label="API Key"
                placeholder="Enter your API key"
                required
                value={customEndpoint.authValue || ""}
                onChange={(e) =>
                  setCustomEndpoint({
                    ...customEndpoint,
                    authValue: e.target.value,
                  })
                }
              />
            </>
          )}

          {customEndpoint.auth?.type === "basic" && (
            <>
              <TextInput
                label="Username"
                placeholder="Username"
                required
                value={customEndpoint.username || ""}
                onChange={(e) =>
                  setCustomEndpoint({
                    ...customEndpoint,
                    username: e.target.value,
                  })
                }
              />
              <PasswordInput
                label="Password"
                placeholder="Password"
                required
                value={customEndpoint.password || ""}
                onChange={(e) =>
                  setCustomEndpoint({
                    ...customEndpoint,
                    password: e.target.value,
                  })
                }
              />
            </>
          )}

          <Box>
            <Text size="sm" fw={500} mb="xs">
              Headers
            </Text>
            <Stack gap="xs">
              {Object.entries(customEndpoint.headers || {}).map(
                ([key, value], index) => (
                  <Group key={index} gap="xs">
                    <TextInput
                      placeholder="Header name"
                      value={key}
                      onChange={(e) => {
                        const newHeaders = { ...customEndpoint.headers };
                        delete newHeaders[key];
                        newHeaders[e.target.value] = value;
                        setCustomEndpoint({
                          ...customEndpoint,
                          headers: newHeaders,
                        });
                      }}
                      style={{ flex: 1 }}
                    />
                    <TextInput
                      placeholder="Header value"
                      value={value}
                      onChange={(e) => {
                        const newHeaders = { ...customEndpoint.headers };
                        newHeaders[key] = e.target.value;
                        setCustomEndpoint({
                          ...customEndpoint,
                          headers: newHeaders,
                        });
                      }}
                      style={{ flex: 1 }}
                    />
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => {
                        const newHeaders = { ...customEndpoint.headers };
                        delete newHeaders[key];
                        setCustomEndpoint({
                          ...customEndpoint,
                          headers: newHeaders,
                        });
                      }}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ),
              )}
              <Button
                variant="light"
                size="sm"
                leftSection={<IconPlus size={14} />}
                onClick={() => {
                  const newHeaders = { ...customEndpoint.headers };
                  // Generate a unique key for the new header
                  let newKey = "New-Header";
                  let counter = 1;
                  while (newKey in newHeaders) {
                    newKey = `New-Header-${counter}`;
                    counter++;
                  }
                  newHeaders[newKey] = "";
                  setCustomEndpoint({ ...customEndpoint, headers: newHeaders });
                }}
              >
                Add header
              </Button>
            </Stack>
          </Box>

          <Box>
            <Text size="sm" fw={500} mb="xs">
              Custom Payload (Optional)
            </Text>
            <Text size="xs" c="dimmed" mb="xs">
              Additional fields to merge with the messages and model parameters
              from your prompt
            </Text>
            <Textarea
              placeholder='{"key": "value"}'
              autosize
              minRows={3}
              maxRows={8}
              value={defaultPayloadText}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setDefaultPayloadText(value);
                try {
                  const parsed = JSON.parse(value);
                  setCustomEndpoint({
                    ...customEndpoint,
                    defaultPayload: parsed,
                  });
                } catch (e) {
                  // Invalid JSON, keep the text but don't update the object
                }
              }}
              onBlur={() => {
                // Format JSON on blur if valid
                try {
                  const parsed = JSON.parse(defaultPayloadText);
                  setDefaultPayloadText(JSON.stringify(parsed, null, 2));
                } catch (e) {
                  // Invalid JSON, leave as is
                }
              }}
              styles={{
                input: {
                  fontFamily: "monospace",
                  fontSize: "13px",
                },
              }}
            />
          </Box>

          <Group justify="space-between" mt="md">
            <Button
              variant="subtle"
              onClick={async () => {
                // Test connection logic
                try {
                  const response = await testConnection({
                    url: customEndpoint.url,
                    auth: convertFormAuthToAPI(customEndpoint),
                    headers: customEndpoint.headers || {},
                  });
                  if (response.ok) {
                    notifications.show({
                      title: "Connection successful",
                      message: "Endpoint is reachable",
                      color: "green",
                    });
                  } else {
                    throw new Error(`HTTP ${response.status}`);
                  }
                } catch (e) {
                  notifications.show({
                    title: "Connection failed",
                    message: e.message,
                    color: "red",
                  });
                }
              }}
            >
              Test Connection
            </Button>
            <Group>
              <Button
                variant="default"
                onClick={() => setEndpointModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                loading={isCreating || isUpdating}
                disabled={
                  !customEndpoint.name?.trim() || !customEndpoint.url?.trim()
                }
                onClick={async () => {
                  try {
                    // Validate required fields
                    if (
                      !customEndpoint.name?.trim() ||
                      !customEndpoint.url?.trim()
                    ) {
                      notifications.show({
                        title: "Missing required fields",
                        message:
                          "Please provide a name and URL for the endpoint",
                        color: "red",
                      });
                      return;
                    }

                    const endpointData = {
                      name: customEndpoint.name.trim(),
                      url: customEndpoint.url.trim(),
                      auth: convertFormAuthToAPI(customEndpoint),
                      headers: customEndpoint.headers || {},
                      defaultPayload: customEndpoint.defaultPayload || {},
                    };

                    if (isEditMode && selectedEndpointId) {
                      // Update existing endpoint
                      await updateEndpoint(endpointData);
                    } else {
                      // Create new endpoint
                      const newEndpoint = await createEndpoint(endpointData);
                      if (newEndpoint?.id) {
                        setSelectedEndpointId(newEndpoint.id);
                        setDefaultPayloadText(
                          JSON.stringify(
                            newEndpoint.defaultPayload || {},
                            null,
                            2,
                          ),
                        );
                      }
                    }

                    setEndpointModalOpen(false);
                    setIsEditMode(false);
                    setEditingEndpointId(null);
                    notifications.show({
                      title: isEditMode
                        ? "Endpoint updated"
                        : "Endpoint created",
                      message: "Your endpoint has been saved successfully",
                      color: "green",
                    });
                  } catch (error) {
                    notifications.show({
                      title: "Error saving endpoint",
                      message:
                        error.message ||
                        "An error occurred while saving the endpoint",
                      color: "red",
                    });
                  }
                }}
              >
                Save
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={variablesModalOpen}
        onClose={() => setVariablesModalOpen(false)}
        title="Variables"
        size="lg"
      >
        <Stack>
          {Object.keys(variables).length === 0 ? (
            <Box ta="center" py="xl">
              <Text size="lg" fw={500} mb="xs">
                No variables
              </Text>
              <Text size="sm" c="dimmed">
                Create variables to dynamically insert values into your prompt
                using the{" "}
                <Text
                  component="span"
                  c="blue"
                  ff="monospace"
                >{`{{variable_name}}`}</Text>{" "}
                syntax
              </Text>
            </Box>
          ) : (
            <PromptVariableEditor
              value={variables}
              onChange={(update) => {
                setTemplateVersion({
                  ...templateVersion,
                  testValues: update,
                });
              }}
            />
          )}
          <Group justify="flex-end" mt="md">
            <Button
              size="xs"
              variant="filled"
              onClick={() => setVariablesModalOpen(false)}
            >
              Done
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Empty>
  );
}

export default function ProjectScopedPlayground() {
  const { project } = useProject();

  if (!project) return null;
  return <Playground key={project.id} />;
}
