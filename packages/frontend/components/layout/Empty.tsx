import {
  Box,
  Button,
  Card,
  Center,
  Group,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Loader,
  Alert,
  SimpleGrid,
  Overlay,
} from "@mantine/core";
import {
  IconMessage,
  IconInfoCircle,
  IconArrowLeft,
  IconAnalyze,
  IconPackage,
  IconCode,
  IconCheck,
  IconHelpCircle,
} from "@tabler/icons-react";
import CopyText from "../blocks/CopyText";
import { useProject, useUser } from "@/utils/dataHooks";
import { ListFeatures } from "./Paywall";
import config from "@/utils/config";
import { useSessionStorage } from "@mantine/hooks";
import { CodeHighlightTabs } from "@mantine/code-highlight";
import RingLoader from "../blocks/RingLoader";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { fetcher } from "@/utils/fetcher";
import { show } from "@intercom/messenger-js-sdk";

const IntegrationButton = ({
  value,
  label,
  onClick,
  selected,
}: {
  value: string;
  label: string;
  onClick: (value: string) => void;
  selected?: boolean;
}) => (
  <Button h={70} px="lg" onClick={() => onClick(value)} variant="light">
    <Text size="lg" fw={500}>
      {label}
    </Text>
  </Button>
);

const CODE_SAMPLES = {
  openai: {
    js: `import OpenAI from "openai"
import { monitorOpenAI } from "lunary/openai"

const openai = monitorOpenAI(new OpenAI())

const result = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello friend" }]
})`,
    py: `import lunary
from openai import OpenAI

client = OpenAI()
lunary.monitor(client)

chat_completion = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)`,
  },
  anthropic: {
    js: `
import Anthropic from "anthropic"
import { monitorAnthropic } from "lunary/anthropic"

const anthropic = monitorAnthropic(new Anthropic())

const result = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20240620",
  messages: [{ role: "user", content: "Hello!" }]
})`,
    py: `coming soon`,
  },
  langchain: {
    js: `import { ChatOpenAI } from "langchain/chat_models/openai"
import { LunaryHandler } from "lunary/langchain"

const chat = new ChatOpenAI({
  modelName: "gpt-4",
  callbacks: [new LunaryHandler()]
})`,
    py: `from langchain_openai import ChatOpenAI
from lunary import LunaryCallbackHandler

handler = LunaryCallbackHandler()

chat = ChatOpenAI(
    callbacks=[handler]
)`,
  },
  litellm: {
    py: `from litellm import completion

litellm.success_callback = ["lunary"]
litellm.failure_callback = ["lunary"]

response = completion(
    model="gpt-4", 
    messages=[{"role": "user", "content": "Hello!"}]
)`,
  },
  custom: {
    curl: `curl -X POST "https://api.lunary.ai/v1/runs/ingest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PUBLIC KEY" \
  -d '{
  "events": [
    {
      "type": "llm", 
      "event": "start",
      "runId": "replace-with-unique-id",
      "name": "gpt-5",
      "timestamp": "2025-10-01T00:00:00Z",
      "input": [{"role": "user", "text": "Hello world!"}]
    },
    {
      "type": "llm",
      "event": "end", 
      "runId": "some-unique-id",
      "name": "gpt-5",
      "timestamp": "2025-10-01T00:00:10Z",
      "output": [{"role": "assistant", "text": "Hello. How are you?"}],
      "tags": ["tag1"]
    }
  ]
}'`,
  },
};

const InstallStep = ({
  language,
  onLanguageChange,
}: {
  language: "js" | "py";
  onLanguageChange: (lang: "js" | "py") => void;
}) => {
  const { project } = useProject();

  const tabs = [
    {
      fileName: "Python",
      code: `# Install the package
pip install lunary

# Add to your environment variables
export LUNARY_PUBLIC_KEY="${project?.id}"`,
      language: "bash",
    },
    {
      fileName: "JavaScript",
      code: `# Install the package
npm install lunary

# Add to your .env file
LUNARY_PUBLIC_KEY="${project?.id}"`,
      language: "bash",
    },
  ];

  return (
    <Card my="md" p={0} withBorder>
      <CodeHighlightTabs
        code={tabs}
        w="100%"
        activeTab={language === "py" ? 1 : 0}
        onTabChange={(tab) => onLanguageChange(tab === 1 ? "py" : "js")}
      />
    </Card>
  );
};
const CodeStep = ({
  integration,
  language,
  onLanguageChange,
}: {
  integration: string;
  language: "js" | "py";
  onLanguageChange: (lang: "js" | "py") => void;
}) => {
  const samples = CODE_SAMPLES[integration];
  if (!samples) return null;

  const tabs: { fileName: string; code: string; language: string }[] = [];
  let description = "Add the following code to your application:";

  if (integration === "custom") {
    tabs.push({
      fileName: "curl",
      code: samples.curl,

      language: "bash",
    });
    description = "Use this curl command to send a request to Lunary.";
  } else if (integration === "litellm") {
    tabs.push({
      fileName: "Python",

      code: samples.py,
      language: "python",
    });
  } else {
    if (samples.py) {
      tabs.push({
        fileName: "Python",

        code: samples.py,
        language: "python",
      });
    }
    if (samples.js) {
      tabs.push({
        fileName: "JavaScript",

        code: samples.js,
        language: "typescript",
      });
    }
  }

  return (
    <Stack>
      <Card my="md" p={0} withBorder>
        <CodeHighlightTabs
          code={tabs}
          activeTab={language === "py" && tabs.length > 1 ? 1 : 0}
          onTabChange={(tab) => onLanguageChange(tab === 1 ? "py" : "js")}
        />
      </Card>
    </Stack>
  );
};

const Steps = ({ children }) => (
  <Box
    ml={32}
    style={{ borderLeft: "1px solid var(--mantine-color-default-border)" }}
  >
    {children}
  </Box>
);

const Step = ({ label, children, icon }) => (
  <Box p="lg">
    <Group align="start" wrap="nowrap">
      <div
        style={{
          flex: "0 0 42px",
          width: 42,
          height: 42,
          borderRadius: 24,
          border: "1px solid var(--mantine-color-default-border)",
          backgroundColor: "var(--mantine-color-body)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: -42,
          marginRight: 16,
          fontSize: 16,
          color: "var(--mantine-colors-gray-5)",
        }}
      >
        {icon}
      </div>
      <div style={{ width: "100%", overflow: "hidden", flex: 1 }}>
        <Text size="md" fw={500}>
          {label}
        </Text>
        {children}
      </div>
    </Group>
  </Box>
);

const IntegrationStepper = ({ integration }: { integration: string }) => {
  const [language, setLanguage] = useSessionStorage({
    key: "preferred-language",
    defaultValue: "js" as "js" | "py",
  });

  if (integration === "vercel") {
    const installInstrumentation = `npm install @vercel/otel @opentelemetry/api`;
    const registerInstrumentation = `import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel({ serviceName: "vercel-ai-with-lunary" });
}
`;
    const instrumentationHookConfig = `export default {
  experimental: {
    instrumentationHook: true,
  },
};
`;
    const envExporterConfig = `OTEL_EXPORTER_OTLP_ENDPOINT=https://api.lunary.ai
OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer \${LUNARY_PUBLIC_KEY}"
OTEL_RESOURCE_ATTRIBUTES="service.name=vercel-ai-app,deployment.environment=production"`;
    const explicitExporter = `import { registerOTel, OTLPHttpJsonTraceExporter } from "@vercel/otel";

export function register() {
  registerOTel({
    serviceName: "vercel-ai-with-lunary",
    traceExporter: new OTLPHttpJsonTraceExporter({
      url: "https://api.lunary.ai/v1/traces",
      headers: {
        Authorization: \`Bearer \${process.env.LUNARY_PUBLIC_KEY}\`,
      },
    }),
  });
}
`;
    const telemetryExample = `import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function summarize(content: string, userId: string) {
  const result = await generateText({
    model: openai("gpt-5"),
    prompt: \`Summarize:\\n\${content}\`,
    experimental_telemetry: {
      isEnabled: true,
      functionId: "summarizer",
      metadata: {
        lunary_user_id: userId,
        thread_id: \`thread-\${userId}\`,
      },
    },
  });

  return result.text;
}
`;

    return (
      <Steps>
        <Step
          icon={<IconPackage size={24} />}
          label="Enable Vercel's OpenTelemetry instrumentation"
        >
          <Stack gap="sm">
            <Text>Install Vercel's OpenTelemetry helper if it's not already in your project:</Text>
            <Card my="xs" p={0} withBorder>
              <CodeHighlightTabs
                code={[
                  {
                    fileName: "Install instrumentation",
                    code: installInstrumentation,
                    language: "bash",
                  },
                ]}
              />
            </Card>
            <Text>Register OpenTelemetry in your `instrumentation.ts` (or `src/instrumentation.ts`) file:</Text>
            <Card my="xs" p={0} withBorder>
              <CodeHighlightTabs
                code={[
                  {
                    fileName: "instrumentation.ts",
                    code: registerInstrumentation,
                    language: "typescript",
                  },
                ]}
              />
            </Card>
            <Text>
              If you are on Next.js 14 or earlier, enable the instrumentation hook in `next.config.mjs`:
            </Text>
            <Card my="xs" p={0} withBorder>
              <CodeHighlightTabs
                code={[
                  {
                    fileName: "next.config.mjs",
                    code: instrumentationHookConfig,
                    language: "javascript",
                  },
                ]}
              />
            </Card>
          </Stack>
        </Step>

        <Step icon={<IconCode size={24} />} label="Point OpenTelemetry to Lunary">
          <Stack gap="sm">
            <Text>Set environment variables so the OTLP exporter forwards spans to Lunary:</Text>
            <Card my="xs" p={0} withBorder>
              <CodeHighlightTabs
                code={[
                  {
                    fileName: ".env",
                    code: envExporterConfig,
                    language: "bash",
                  },
                ]}
              />
            </Card>
            <Text>Or configure the exporter explicitly when registering OpenTelemetry:</Text>
            <Card my="xs" p={0} withBorder>
              <CodeHighlightTabs
                code={[
                  {
                    fileName: "instrumentation.ts",
                    code: explicitExporter,
                    language: "typescript",
                  },
                ]}
              />
            </Card>
            <Text size="sm" c="dimmed">
              Use your Lunary project public key for the authorization header so traces are accepted by the managed collector.
            </Text>
          </Stack>
        </Step>

        <Step
          icon={<IconAnalyze size={24} />}
          label="Emit AI spans with Lunary metadata"
        >
          <Stack gap="sm">
            <Text>
              Wrap the AI SDK calls you want to observe with `experimental_telemetry` to attach user and trace metadata:
            </Text>
            <Card my="xs" p={0} withBorder>
              <CodeHighlightTabs
                code={[
                  {
                    fileName: "ai-handler.ts",
                    code: telemetryExample,
                    language: "typescript",
                  },
                ]}
              />
            </Card>
            <Text size="sm" c="dimmed">
              Each invocation emits spans annotated with function, user, and thread identifiers so Lunary can group traces.
            </Text>
          </Stack>
        </Step>

        <Step icon={<IconCheck size={24} />} label="Validate traces inside Lunary">
          <Text>
            Deploy or run your app locally, trigger an instrumented request, then open <Text span fw={500}>Observability → Traces</Text> in the Lunary dashboard to confirm spans tagged with your `service.name` are arriving.
          </Text>
        </Step>
      </Steps>
    );
  }

  return (
    <Steps>
      {integration === "flowise" ? (
        <Step
          icon={<IconPackage size={24} />}
          label="Follow the integration guide"
        >
          <Stack>
            <Text>
              Follow our step-by-step guide to set up Flowise with Lunary.
            </Text>
            <Button
              component="a"
              href="https://lunary.ai/docs/integrations/flowise"
              target="_blank"
            >
              Integration Guide
            </Button>
          </Stack>
        </Step>
      ) : (
        <>
          {integration !== "custom" && (
            <Step
              icon={<IconPackage size={24} />}
              label="Install Lunary and add your public key"
            >
              {integration === "litellm" ? (
                <InstallStep language="py" onLanguageChange={() => {}} />
              ) : (
                <InstallStep
                  language={language}
                  onLanguageChange={setLanguage}
                />
              )}
            </Step>
          )}

          <Step
            icon={<IconCode size={24} />}
            label={
              <Group justify="space-between" w="100%">
                <Text size="md" fw={500}>
                  Add the code
                </Text>
                <Button
                  onClick={() => {
                    config.IS_CLOUD && show();
                  }}
                  size="compact-xs"
                  variant="outline"
                  leftSection={<IconMessage size={12} />}
                >
                  I'm stuck
                </Button>
              </Group>
            }
          >
            <CodeStep
              integration={integration}
              language={language}
              onLanguageChange={setLanguage}
            />
          </Step>
        </>
      )}

      <Step
        icon={
          <Loader
            loaders={{ ...Loader.defaultLoaders, ring: RingLoader }}
            color="gray"
            type="ring"
            size={48}
          />
        }
        label="Waiting for data..."
      >
        <Text>
          The page will refresh automatically when you receive your first
          request.
        </Text>
      </Step>
    </Steps>
  );
};

const RequestIntegrationForm = ({
  integrationName,
}: {
  integrationName?: string;
}) => {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { user } = useUser();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      alert(
        `New integration request: ${feedback}\n\nRequested by: ${user?.name} (${user?.email})`,
      );
      await fetcher.post("/users/feedback", {
        arg: {
          text: `New integration request: ${feedback}\n\nRequested by: ${user?.name} (${user?.email})`,
        },
      });

      setSubmitted(true);
      notifications.show({
        title: "Request submitted",
        message:
          "Thanks for your feedback! We'll notify you when this integration becomes available.",
        icon: <IconCheck />,
        color: "green",
        position: "bottom-right",
      });
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <Alert color="green" icon={<IconCheck size={16} />}>
        Thanks for your feedback! We'll notify you when this integration becomes
        available.
      </Alert>
    );
  }

  return (
    <Stack>
      <Text>Let us know which integration you'd like to see next!</Text>
      <TextInput
        label="Describe your integration"
        defaultValue={
          integrationName ? `I want to integrate with ${integrationName}` : ""
        }
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      <Button loading={loading} onClick={handleSubmit}>
        Submit Request
      </Button>
    </Stack>
  );
};

export function EmptyOnboarding() {
  const { project } = useProject();
  const [integration, setIntegration] = useSessionStorage({
    key: "integration",
    defaultValue: "",
  });

  const renderContent = () => {
    if (!integration) {
      return (
        <>
          <Group>
            <ThemeIcon size={42} variant="light" radius={12}>
              <IconAnalyze size={32} />
            </ThemeIcon>
            <Title order={3}>Welcome</Title>
          </Group>
          <Text size="md">
            Select an integration and follow the steps below to send some data.
          </Text>
          <SimpleGrid cols={3} w="100%">
            <IntegrationButton
              value="openai"
              label="OpenAI"
              onClick={setIntegration}
            />
            <IntegrationButton
              value="anthropic"
              label="Anthropic"
              onClick={setIntegration}
            />
            <IntegrationButton
              value="langchain"
              label="LangChain"
              onClick={setIntegration}
            />
            <IntegrationButton
              value="llamaindex"
              label="LlamaIndex"
              onClick={setIntegration}
            />
            <IntegrationButton
              value="litellm"
              label="LiteLLM"
              onClick={setIntegration}
            />
            <IntegrationButton
              value="flowise"
              label="Flowise"
              onClick={setIntegration}
            />
            <IntegrationButton
              value="vercel"
              label="Vercel AI SDK"
              onClick={setIntegration}
            />
            <IntegrationButton
              value="custom"
              label="Custom"
              onClick={setIntegration}
            />
            <IntegrationButton
              value="request"
              label="Request Integration"
              onClick={setIntegration}
            />
          </SimpleGrid>
        </>
      );
    }

    const content = {
      openai: <IntegrationStepper integration="openai" />,
      anthropic: <IntegrationStepper integration="anthropic" />,
      langchain: <IntegrationStepper integration="langchain" />,
      vercel: <IntegrationStepper integration="vercel" />,
      llamaindex: (
        <Stack>
          <Alert icon={<IconInfoCircle size={32} />} color="blue">
            <Text size="md">
              We're working hard on the LlamaIndex integration. It will be
              available soon! Feel free to request it below to get notified when
              it's ready.
            </Text>
          </Alert>
          <RequestIntegrationForm integrationName="LlamaIndex" />
        </Stack>
      ),
      litellm: <IntegrationStepper integration="litellm" />,
      flowise: <IntegrationStepper integration="flowise" />,
      custom: <IntegrationStepper integration="custom" />,
      request: <RequestIntegrationForm />,
    }[integration];

    return (
      <Stack w="100%">
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => setIntegration("")}
          >
            Back to all integrations
          </Button>
        </Group>

        {content}
      </Stack>
    );
  };

  return (
    <Box
      pos="absolute"
      className="unblockable"
      top={0}
      left={0}
      right={0}
      bottom={0}
      h={`100%`}
      style={{
        overflow: "hidden",
      }}
    >
      <Center h="100%">
        <Card
          withBorder
          p={50}
          w={800}
          style={{ maxHeight: "90vh", overflow: "auto" }}
        >
          <Stack align="start" gap="xl" w="100%">
            {renderContent()}

            <Group justify="space-between" w="100%">
              <Group gap={2}>
                <Text>Public Key: </Text>
                <CopyText value={project?.id} />
              </Group>
              <Group gap="sm">
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconMessage size={16} />}
                >
                  Instant Chat
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  component="a"
                  target="_blank"
                  href={`https://lunary.ai/docs?app=${project?.id}`}
                  data-testid="empty-action"
                >
                  Documentation
                </Button>
              </Group>
            </Group>
          </Stack>
        </Card>
      </Center>
    </Box>
  );
}

export default function Empty({
  Icon,
  title,
  description,
  enable,
  children,
  buttonLabel = "Documentation →",
  features,
  onClick,
  showProjectId,
}: {
  title: string;
  description?: string;
  enable?: boolean;
  features?: string[];
  showProjectId?: boolean;
  Icon?: React.ComponentType<any>;
  buttonLabel?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  const { project } = useProject();

  if (!enable && children) {
    return children;
  }

  const btnProps =
    typeof onClick !== "undefined"
      ? {
          onClick,
        }
      : {
          component: "a",
          target: "_blank",
          href: `https://lunary.ai/docs?app=${project?.id}`,
        };

  return (
    <Box
      pos="absolute"
      className="unblockable"
      top={0}
      left={0}
      right={0}
      bottom={0}
      h={`100%`}
      style={{
        overflow: "hidden",
      }}
    >
      <Overlay
        zIndex={3}
        blur={3}
        top={0}
        left={0}
        right={0}
        display="flex"
        bottom={0}
        style={{
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Card withBorder p={50} w="fit-content" miw={600}>
          <Stack align="start" gap="xl">
            <Group>
              <ThemeIcon size={42} radius={12}>
                {Icon && <Icon size={26} />}
              </ThemeIcon>
              <Title order={3}>{title}</Title>
            </Group>
            {description && <Text size="lg">{description}</Text>}
            {features && <ListFeatures features={features} />}
            <Button size="md" {...btnProps} data-testid="empty-action">
              {buttonLabel}
            </Button>
            {showProjectId && (
              <Group>
                <Text>Public Key: </Text>
                <CopyText value={project?.id} />
              </Group>
            )}
            {!config.IS_SELF_HOSTED && (
              <Stack>
                <Text size="sm">Any issue? Get help from a founder.</Text>
                <Group>
                  <Button
                    size="sm"
                    leftSection={<IconMessage size={16} />}
                    color="blue"
                    variant="light"
                    onClick={() => {
                      config.IS_CLOUD && show();
                    }}
                  >
                    Chat with us
                  </Button>
                </Group>
              </Stack>
            )}
          </Stack>
        </Card>
      </Overlay>
      {children && <Box p="sm">{children}</Box>}
    </Box>
  );
}
