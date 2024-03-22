import { Box, Group, Text, Title } from "@mantine/core"

function Steps({ children, ...props }) {
  return (
    <Box
      my="xl"
      ml={32}
      style={{ borderLeft: "2px solid var(--mantine-color-default-border)" }}
      {...props}
    >
      {children}
    </Box>
  )
}

Steps.Step = ({ label, n, children }) => (
  <Box p="lg">
    <Group align="start" wrap="nowrap">
      <div
        style={{
          flex: "0 0 48px",
          width: 48,
          height: 48,
          borderRadius: 24,
          border: "2px solid var(--mantine-color-default-border)",
          backgroundColor: "var(--mantine-color-body)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: -44,
          marginRight: 16,
          fontSize: 16,
          fontWeight: 600,
          color: "#999",
        }}
      >
        <Text>{n}</Text>
      </div>
      <div style={{ width: "100%", overflow: "hidden", flex: 1 }}>
        <Title order={4} mb="sm">
          {label}
        </Title>
        <Box>{children}</Box>
      </div>
    </Group>
  </Box>
)

export default Steps
