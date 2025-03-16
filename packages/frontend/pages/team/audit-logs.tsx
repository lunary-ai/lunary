import { useAuditLogs } from "@/utils/dataHooks";
import {
  Center,
  Container,
  Stack,
  Text,
  Loader,
  Table,
  Card,
  Group,
  ActionIcon,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { AUDIT_LOG_RESOURCES } from "shared";

export default function AuditLogs() {
  const { auditLogs, isLoading, page, setPage, hasMore } = useAuditLogs();

  return (
    <Container>
      <Stack mb="md">
        <Text size="xl" fw="bold">
          Audit Logs
        </Text>
        <Text c="dimmed">
          View a log of all actions performed by users in your organization.
        </Text>
      </Stack>

      <Card withBorder p={0}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Time</Table.Th>
              <Table.Th>User</Table.Th>
              <Table.Th>Action</Table.Th>
              <Table.Th>Resource</Table.Th>
              <Table.Th>Project</Table.Th>
              <Table.Th>IP Address</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {isLoading && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Center>
                    <Loader size="md" />
                  </Center>
                </Table.Td>
              </Table.Tr>
            )}

            {!isLoading && auditLogs.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Center>
                    <Text c="dimmed">No audit logs available.</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            )}

            {auditLogs.map((log) => (
              <Table.Tr key={log.id}>
                <Table.Td>{new Date(log.createdAt).toLocaleString()}</Table.Td>
                <Table.Td>{log.userEmail || log.userId}</Table.Td>
                <Table.Td>
                  {
                    AUDIT_LOG_RESOURCES[log.resourceType].actions[log.action]
                      .displayValue
                  }
                </Table.Td>
                <Table.Td>
                  {AUDIT_LOG_RESOURCES[log.resourceType].displayValue}
                </Table.Td>
                <Table.Td>{log.projectName || log.projectId}</Table.Td>
                <Table.Td>{log.ipAddress}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
      <Group justify="end" mt="md">
        <ActionIcon
          variant="default"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          <IconChevronLeft width="17px" />
        </ActionIcon>
        <ActionIcon
          variant="default"
          disabled={!hasMore}
          onClick={() => setPage(page + 1)}
        >
          <IconChevronRight width="17px" />
        </ActionIcon>
      </Group>
    </Container>
  );
}
