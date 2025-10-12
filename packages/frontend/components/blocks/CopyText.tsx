import {
  ActionIcon,
  Box,
  Code,
  CopyButton,
  Group,
  Input,
  Overlay,
  Tooltip,
  useComputedColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { IconCheck, IconCopy, IconEye } from "@tabler/icons-react";
import { useState } from "react";

export const SuperCopyButton = ({ value }) => (
  <CopyButton value={value} timeout={2000}>
    {({ copied, copy }) => (
      <Tooltip label={copied ? "Copied" : "Copy"} position="right">
        <ActionIcon
          color={copied ? "teal" : "gray"}
          variant="transparent"
          onClick={copy}
        >
          {copied ? <IconCheck size="16px" /> : <IconCopy size="16px" />}
        </ActionIcon>
      </Tooltip>
    )}
  </CopyButton>
);

export default function CopyText({
  c = "violet",
  value,
  isSecret = false,
  ...props
}) {
  const [isVisible, setIsVisible] = useState(false);
  const theme = useMantineTheme();
  const scheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  const iconColor =
    scheme === "dark"
      ? theme.colors.gray?.[3] || theme.white
      : theme.colors.gray?.[7] || theme.black;

  return (
    <Group gap={0} display="inline-flex">
      <Box pos="relative">
        {isSecret && !isVisible && (
          <Overlay backgroundOpacity={0.35} blur={4} />
        )}
        <Code ml={5} c={c} {...props}>
          {value}
        </Code>
      </Box>
      {isSecret && (
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setIsVisible((v) => !v)}
        >
          <IconEye color={iconColor} stroke="2" width="20px" />
        </ActionIcon>
      )}
      <SuperCopyButton value={value} />
    </Group>
  );
}

export const CopyInput = ({ value, ...props }) => (
  <Input
    value={value}
    styles={{ input: { contentEditable: false } }}
    rightSectionPointerEvents="all"
    rightSection={<SuperCopyButton value={value} />}
    {...props}
  />
);
