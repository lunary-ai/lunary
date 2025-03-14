import { useState, useEffect } from "react";
import {
  Container,
  Text,
  Group,
  Stack,
  Box,
  Table,
  Pagination,
  Center,
  Loader,
  Card,
} from "@mantine/core";
import DateRangeGranularityPicker, {
  useDateRangeGranularity,
} from "../../components/analytics/DateRangeGranularityPicker";
import { format } from "date-fns";
import { useUser, usePaginatedAuditLogs } from "../../utils/dataHooks";
import { useRouter } from "next/router";
import SearchBar from "@/components/blocks/SearchBar";

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return format(date, "yyyy-MM-dd HH:mm:ss");
};

export default function AuditLogs() {
  const { user } = useUser();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string | null>(
    null,
  );
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);

  // Check if user has permission to view audit logs
  useEffect(() => {
    if (user && !["admin", "owner"].includes(user.role)) {
      router.push("/settings");
    }
  }, [user, router]);

  // Use our custom hook for paginated audit logs
  const {
    logs,
    total,
    loading,
    page,
    limit,
    setPage,
    setLimit,
    mutate: refetchLogs,
  } = usePaginatedAuditLogs({
    action: actionFilter || undefined,
    resourceType: resourceTypeFilter || undefined,
    userId: userFilter || undefined,
    projectId: projectFilter || undefined,
    search: search || undefined,
  });

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

      <Group justify="apart" mb="lg">
        {/* <SearchBar
          placeholder="Search logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSubmit={() => refetchLogs()}
        /> */}
      </Group>

      {loading ? (
        <Center my="xl">
          <Loader size="md" />
        </Center>
      ) : (
        <>
          <Card p="0">
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
                {logs.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text ta="center" c="dimmed" fz="sm" py="md">
                        No audit logs found
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  logs.map((log) => (
                    <Table.Tr key={log.id}>
                      <Table.Td>{formatDateTime(log.createdAt)}</Table.Td>
                      <Table.Td>
                        <Stack gap={0}>
                          <Text>{log.userName}</Text>
                          <Text size="xs" c="dimmed">
                            {log.userEmail}
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Text tt="capitalize">{log.action}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={0}>
                          <Text tt="capitalize">{log.resourceType}</Text>
                          <Text size="xs" c="dimmed" truncate maw={300}>
                            {log.resourceId}
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>{log.projectName || "N/A"}</Table.Td>
                      <Table.Td>{log.ipAddress}</Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Card>

          <Group justify="center" mt="md">
            <Pagination
              total={Math.ceil(total / limit)}
              value={page}
              onChange={setPage}
            />
          </Group>
        </>
      )}
    </Container>
  );
}
