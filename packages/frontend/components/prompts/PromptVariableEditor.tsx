import { Badge, Box, Stack, Textarea } from "@mantine/core";
import { TemplateVariables } from "shared";

export default function PromptVariableEditor({
  value: templateVariables = {},
  onChange,
}: {
  value: TemplateVariables;
  onChange: (value: TemplateVariables) => void;
}) {
  return (
    <Box>
      <Stack gap="md">
        {Object.entries(templateVariables)
          .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
          .map(([name, value]) => (
            <Box key={name}>
              <Badge
                mb="xs"
                variant="outline"
                tt="none"
              >
                {name}
              </Badge>
              <Textarea
                size="sm"
                w="100%"
                radius="sm"
                placeholder="Enter content here"
                minRows={3}
                maxRows={8}
                autosize
                value={value}
                onChange={(e) =>
                  onChange({
                    ...templateVariables,
                    [name]: e.currentTarget.value,
                  })
                }
              />
            </Box>
          ))}
      </Stack>
    </Box>
  );
}
