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

import "@mantine/code-highlight/styles.css";
import RingLoader from "../blocks/RingLoader";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { fetcher } from "@/utils/fetcher";

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
      "name": "gpt-4o",
      "timestamp": "2022-01-01T00:00:00Z",
      "input": [{"role": "user", "text": "Hello world!"}]
    },
    {
      "type": "llm",
      "event": "end", 
      "runId": "some-unique-id",
      "name": "gpt-4o",
      "timestamp": "2022-01-01T00:00:10Z",
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
                    $crisp.push(["do", "chat:open"]);
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
        placeholder="e.g. Mistral, Together AI, etc."
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
          <Text size="lg">
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
        <Card withBorder p={50} w={800}>
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
                      $crisp.push(["do", "chat:open"]);
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
      {children && <Box p="xl">{children}</Box>}
    </Box>
  );
}
