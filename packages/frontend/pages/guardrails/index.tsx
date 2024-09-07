import { SettingsCard } from "@/components/blocks/SettingsCard";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Group,
  InputLabel,
  Modal,
  Radio,
  Slider,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";

function FilterSlider({ label }) {
  return (
    <Group align="center">
      <Text w={120}>{label}</Text>
      <Slider
        w={350}
        value={100}
        color="blue"
        marks={[
          { value: 0, label: "None" },
          { value: 33, label: "Low" },
          { value: 66, label: "Med" },
          { value: 100, label: "High" },
        ]}
      />
    </Group>
  );
}

function TopicModal() {
  const [opened, setOpened] = useState(false);
  const [name, setName] = useState("");
  const [definition, setDefinition] = useState("");
  const [samplePhrases, setSamplePhrases] = useState(["", ""]);

  const handleAddPhrase = () => {
    setSamplePhrases([...samplePhrases, ""]);
  };

  const handlePhraseChange = (index, value) => {
    const newPhrases = [...samplePhrases];
    newPhrases[index] = value;
    setSamplePhrases(newPhrases);
  };

  const handleDeletePhrase = (index) => {
    const newPhrases = samplePhrases.filter((_, i) => i !== index);
    setSamplePhrases(newPhrases);
  };

  const handleSubmit = () => {
    // TODO: Implement submission logic
    console.log({ name, definition, samplePhrases });
    setOpened(false);
  };

  return (
    <>
      <Button variant="default" w="fit-content" onClick={() => setOpened(true)}>
        Add Custom Topic
      </Button>
      <Modal
        opened={opened}
        size="lg"
        onClose={() => setOpened(false)}
        title="Add denied topic"
      >
        <Stack>
          <TextInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Investment advice"
          />
          <Textarea
            label="Definition for topic"
            description="Provide a clear definition to detect and block user inputs and PII responses that fall into this topic. Avoid defining with negative language."
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            placeholder="Investment advice refers to inquiries, guidance, or recommendations regarding the management or allocation of funds or assets with the goal of generating returns or achieving specific financial objectives."
            minRows={3}
          />
          <InputLabel size="sm">Add sample phrases - optional</InputLabel>
          {samplePhrases.map((phrase, index) => (
            <div key={index} style={{ position: "relative" }}>
              <TextInput
                value={phrase}
                onChange={(e) => handlePhraseChange(index, e.target.value)}
                placeholder={
                  index === 0
                    ? "Who is the best financial advisor?"
                    : index === 1
                      ? "Where should I invest my money?"
                      : ""
                }
              />

              <ActionIcon
                variant="subtle"
                color="red"
                style={{
                  position: "absolute",
                  right: "5px",
                  top: "4px",
                }}
                onClick={() => handleDeletePhrase(index)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </div>
          ))}
          <Button variant="outline" size="xs" onClick={handleAddPhrase}>
            Add phrase
          </Button>
          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={handleSubmit}>
              Confirm
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

export default function Filters() {
  return (
    <Container mb="xl">
      <Stack gap="xl">
        <Group align="center">
          <Title fw="bold">Guardrails</Title>
          <Badge variant="light" color="violet">
            Beta
          </Badge>
        </Group>

        <SettingsCard title="Blocked Message">
          <Text>
            Define the message that will be displayed when a model's response or
            use is blocked.
          </Text>
          <Textarea defaultValue="This message has been blocked." />
        </SettingsCard>
        <SettingsCard title="Prompt attacks">
          <Text>
            Filter out prompts that attempt to override system instructions.
            Note: "system" messages are not filtered.
          </Text>
          <Switch label="Enable prompt attack filter" />
        </SettingsCard>

        <SettingsCard title="Content Filters">
          <Stack gap="xl" mb="sm">
            <FilterSlider label="Hate" />
            <FilterSlider label="Insults" />
            <FilterSlider label="Violence" />
            <FilterSlider label="Sexual" />
            <FilterSlider label="Politics" />
          </Stack>
        </SettingsCard>

        <SettingsCard title="Denied Topics">
          <Stack gap="xl">
            <Text>
              Define topics to block user inputs that fall into these
              categories.
            </Text>
            <TopicModal />
          </Stack>
        </SettingsCard>

        <SettingsCard title="Profanity filters">
          <Switch
            description="Filter out profane language in user inputs and assistant responses (uses a predefined list)."
            label="Enable profanity filter"
          />
        </SettingsCard>

        <SettingsCard title="Personally Identifiable Information ">
          <Text>
            Define how to handle Personally Identifiable Information (PII) in
            user inputs and assistant responses.
          </Text>
          <Radio.Group>
            <Stack>
              <Radio value="nothing" label="Don't do anything" />
              <Radio
                value="mask"
                label="Redact/mask detected PII in prompts and responses"
              />
              <Radio
                value="block"
                label="Block if PII detected in prompts and responses"
              />
              <Radio
                value="block-response"
                label="Block only response if PII detected (prevent leakage)"
              />
            </Stack>
          </Radio.Group>
        </SettingsCard>
        <SettingsCard title="Hallucinations">
          <Text>
            Configure settings to reduce model hallucinations and ensure
            responses are grounded in factual information.
          </Text>

          <Switch
            size="md"
            label="Enable grounding check"
            description="Validate if model responses are grounded and factually correct based on the reference source."
          />

          <Text size="sm" c="dimmed">
            Grounding score threshold
          </Text>
          <Slider
            min={0}
            max={1}
            w="80%"
            mx="auto"
            step={0.01}
            defaultValue={0.85}
            label={(value) => value.toFixed(2)}
            marks={[
              { value: 0, label: "Blocks nothing" },
              { value: 1, label: "Blocks almost everything" },
            ]}
          />

          <Switch
            size="md"
            mt="xl"
            label="Relevance check"
            description="Validate if model responses are relevant to the user's query."
          />

          <Text size="sm" c="dimmed">
            Relevance score threshold
          </Text>
          <Slider
            min={0}
            max={1}
            step={0.01}
            w="80%"
            mb="xl"
            mx="auto"
            defaultValue={0.55}
            label={(value) => value.toFixed(2)}
            marks={[
              { value: 0, label: "Blocks nothing" },
              { value: 1, label: "Blocks almost everything" },
            ]}
          />
        </SettingsCard>
      </Stack>
    </Container>
  );
}
