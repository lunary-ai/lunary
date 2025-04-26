import {
  Container,
  Stack,
  Group,
  Title,
  Badge,
  Button,
  Text,
} from "@mantine/core";

export default function Evaluations() {
  return (
    <Container mb="xl">
      <Stack gap="xl">
        <Group align="center">
          <Title fw="bold">Evaluations</Title>
          <Badge variant="light" color="violet">
            Beta
          </Badge>
        </Group>

        <Text>
          Evaluations are a way to test and compare the performance of different
          models. You can create evaluations based on your own data or use
          pre-defined evaluations.
        </Text>

        <Button variant="default">Create Evaluation</Button>
      </Stack>
    </Container>
  );
}
