import { usePrompts, usePromptVersions } from "@/utils/dataHooks/prompts";
import { Group, Loader, Select, Table, Textarea } from "@mantine/core";
import { useEffect, useState, useMemo } from "react";
import { Prompt, PromptVersion } from "shared/schemas/prompt";

export function PromptVersionSelect({ promptVersion, setPromptVersion }) {
  const { prompts } = usePrompts();
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt>();

  const { promptVersions } = usePromptVersions(selectedPrompt?.id);

  const promptSelectData = prompts.map((prompt) => ({
    value: prompt.id.toString(),
    label: prompt.slug,
  }));

  const promptVersionSelectData = promptVersions.map((promptVersion) => ({
    value: promptVersion.id.toString(),
    label: `v${promptVersion.version}`,
  }));

  function onPromptChangeHandler(value: string | null) {
    if (value) {
      const promptId = Number.parseInt(value);
      const prompt = prompts.find((prompt) => prompt.id === promptId);
      setSelectedPrompt(prompt);
    }
  }

  function onPromptVersionChangeHandler(value: string | null) {
    if (value) {
      const promptVersionId = Number.parseInt(value);
      const promptVersion = promptVersions.find(
        (promptVersion) => promptVersion.id === promptVersionId,
      );
      setPromptVersion(promptVersion);
    }
  }

  return (
    <Group gap="0">
      <Select
        placeholder="Choose prompt"
        data={promptSelectData}
        onChange={onPromptChangeHandler}
        styles={{ input: { borderRadius: "8px 0 0 8px" } }}
      />
      <Select
        placeholder="Choose version"
        disabled={selectedPrompt === undefined}
        data={promptVersionSelectData}
        onChange={onPromptVersionChangeHandler}
        w={150}
        styles={{ input: { borderRadius: "0 8px 8px 0", borderLeft: "0" } }}
      />
    </Group>
  );
}

export function extractVariables(text: string): string[] {
  console.log(text);
  const placeholderRE = /{{\s*([A-Za-z_]\w*)\s*}}/g;
  const vars: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = placeholderRE.exec(text)) !== null) {
    vars.push(match[1]);
  }

  return vars;
}

export default function Experiments() {
  const { isLoading } = usePrompts();
  const [promptVersion, setPromptVersion] = useState<PromptVersion>();
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {},
  );

  const variables = useMemo(
    () => extractVariables(JSON.stringify(promptVersion?.content)),
    [promptVersion?.content],
  );
  useEffect(() => {
    if (!promptVersion) return;
    const initial: Record<string, string> = {};
    variables.forEach((v) => {
      initial[v] = "";
    });
    setVariableValues(initial);
  }, [promptVersion?.id]);

  if (isLoading) {
    return <Loader />;
  }

  console.log(variables);
  return (
    <Table withTableBorder withColumnBorders withRowBorders>
      <Table.Thead>
        <Table.Tr>
          {variables.map((variable) => (
            <Table.Th id={variable}></Table.Th>
          ))}
          <Table.Th>
            <PromptVersionSelect
              setPromptVersion={setPromptVersion}
              promptVersion={promptVersion}
            />
          </Table.Th>
        </Table.Tr>
        <Table.Tr>
          {variables.map((variable) => (
            <Table.Th id={variable}>{`{{${variable}}}`}</Table.Th>
          ))}
          <Table.Th>Model Output</Table.Th>
        </Table.Tr>
      </Table.Thead>

      <Table.Tbody>
        {promptVersion && (
          <Table.Tr>
            {variables.map((variable) => (
              <Table.Td key={variable} p={0}>
                <Textarea
                  styles={{ input: { border: 0, borderRadius: 0 } }}
                  value={variableValues[variable] || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setVariableValues((prev) => ({
                      ...prev,
                      [variable]: value,
                    }));
                  }}
                />
              </Table.Td>
            ))}
            <Table.Td>{/* Model Output placeholder */}</Table.Td>
          </Table.Tr>
        )}
      </Table.Tbody>
    </Table>
  );
}
