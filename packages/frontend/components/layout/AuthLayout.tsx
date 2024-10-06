import { Box, Center, Container, useComputedColorScheme } from "@mantine/core";
import { IconAnalyze } from "@tabler/icons-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const scheme = useComputedColorScheme();

  return (
    <Box
      style={{
        backgroundColor:
          scheme === "dark"
            ? "var(--mantine-color-dark-6)"
            : "var(--mantine-color-gray-0)",
      }}
      h="100vh"
    >
      <Box style={{ position: "absolute", top: 10, left: 10 }}>
        <IconAnalyze
          color={scheme === "dark" ? "white" : "#5468ff"}
          size={40}
        />
      </Box>
      <Center h="100vh">
        <Container mb="10%">{children}</Container>
      </Center>
    </Box>
  );
}
