import {
  useEvalDetails,
  useEvalResults,
  useRunEval,
} from "@/utils/dataHooks/evals";
import {
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Progress,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";

interface ResultRow {
  id: string;
  dataset_prompt_id: string;
  criteria_id: string;
  score: number | null;
  passed: boolean | null;
  details: any;
}

export default function EvalDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id: string };

  const { eval: evaluation, isLoading: loadingEval } = useEvalDetails(id);
  const { results, isLoading: loadingResults } = useEvalResults(id);

  const [filterCriteria, setFilterCriteria] = useState<string | null>(null);

  const criteriaOptions = useMemo(() => {
    if (!evaluation?.criteria) return [];
    return evaluation.criteria.map((c: any) => ({
      value: c.id,
      label: c.name,
    }));
  }, [evaluation]);

  const visibleCriteriaIds = filterCriteria
    ? [filterCriteria]
    : criteriaOptions.map((c) => c.value);

  const { runEval, isRunning } = useRunEval();

  /**
   * Transform results → map keyed by dataset prompt so we can render one row per prompt
   */
  const rowsData = useMemo(() => {
    if (!results || !evaluation) return [] as any[];
    const byPrompt: Record<string, any> = {};
    (results as ResultRow[]).forEach((r) => {
      if (!visibleCriteriaIds.includes(r.criteria_id)) return;
      if (!byPrompt[r.dataset_prompt_id]) {
        byPrompt[r.dataset_prompt_id] = {
          promptSnippet:
            r.details?.input?.slice?.(0, 120) ||
            r.details?.prompt_snippet ||
            "—",
          outputSnippet:
            r.details?.output?.slice?.(0, 80) ||
            r.details?.model_output?.slice?.(0, 80) ||
            "—",
          criteria: {},
        };
      }
      byPrompt[r.dataset_prompt_id].criteria[r.criteria_id] = r;
    });
    return Object.values(byPrompt);
  }, [results, visibleCriteriaIds, evaluation]);

  if (loadingEval) {
    return (
      <Center mt="xl">
        <Loader />
      </Center>
    );
  }

  if (!evaluation) {
    return (
      <Center mt="xl">
        <Text>evaluation not found</Text>
      </Center>
    );
  }

  return (
    <Stack px="lg" py="md" sx={{ height: "100%" }}>
      <Group>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => router.push("/evals")}
        >
          back
        </Button>
      </Group>

      <Group mt="xs">
        <Button
          loading={isRunning}
          onClick={async () => {
            await runEval(id);
          }}
        >
          {results?.length ? "re-run evaluation" : "run evaluation"}
        </Button>
      </Group>

      <Title order={2}>{evaluation.name}</Title>
      <Text size="sm" color="dimmed">
        dataset: {evaluation.dataset_slug ?? evaluation.dataset_id} •{" "}
        {new Date(evaluation.created_at).toLocaleDateString()}
      </Text>
      {evaluation.description && (
        <Text size="sm">{evaluation.description}</Text>
      )}

      <Group mt="md" align="center" wrap="nowrap">
        <Select
          placeholder="filter criterion"
          data={criteriaOptions}
          value={filterCriteria}
          onChange={setFilterCriteria}
          clearable
          style={{ width: 240 }}
        />
      </Group>

      {/* results table */}
      {loadingResults ? (
        <Center mt="xl">
          <Loader />
        </Center>
      ) : rowsData.length ? (
        <ScrollArea>
          <Table striped highlightOnHover withBorder>
            <thead>
              <tr>
                <th style={{ minWidth: 240 }}>item</th>
                <th style={{ minWidth: 400 }}>sample</th>
                <th style={{ minWidth: 200 }}>output</th>
                {visibleCriteriaIds.map((cid) => {
                  const c = evaluation.criteria.find((x: any) => x.id === cid);
                  return (
                    <th
                      key={cid}
                      style={{ textAlign: "center", minWidth: 160 }}
                    >
                      {c?.name ?? cid}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rowsData.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.promptSnippet}</td>
                  <td>{row.detailsSnippet || row.promptSnippet}</td>
                  <td>{row.outputSnippet}</td>
                  {visibleCriteriaIds.map((cid) => {
                    const r: ResultRow | undefined = row.criteria[cid];
                    if (!r) return <td key={cid}>—</td>;
                    return (
                      <td key={cid} style={{ textAlign: "center" }}>
                        {typeof r.passed === "boolean" ? (
                          r.passed ? (
                            <Badge color="green">pass</Badge>
                          ) : (
                            <Badge color="red">fail</Badge>
                          )
                        ) : r.score !== null ? (
                          <Progress
                            value={Math.min(100, Number(r.score) * 100)}
                            color="green"
                            size="lg"
                            radius="sm"
                            w={120}
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </Table>
        </ScrollArea>
      ) : (
        <Text mt="md" color="dimmed">
          no results yet
        </Text>
      )}
    </Stack>
  );
}
