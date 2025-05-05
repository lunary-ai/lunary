import { Card, CardContent } from "@/components/blocks/ui/card";
import { Box, Text } from "@mantine/core";
import TimeRule from "./TimeRuler";

import { getColorForRunType } from "../../../utils/colors";

const BAR_HEIGHT = 30;
const ROW_GAP = 35;
const pixelPerSecond = 400;

const generateTasks = (runs) => {
  if (!runs?.length) return [];

  const firstTime = new Date(runs[0].createdAt).getTime();
  const maxCost = Math.max(...runs.map((run) => run.cost || 0.001));

  return runs.map((run) => {
    const startTime = new Date(run.createdAt).getTime();
    const progress = run.cost ? (run.cost / maxCost) * 0.3 : 0.1; // Scale cost to progress, max 0.3
    const start = (startTime - firstTime) / 1000 / 5; // Divide by 5 to compress timeline

    return {
      title: run.name,
      progress: progress,
      color: getColorForRunType(run.type) || "#cbd5e1",
      start: start,
    };
  });
};

const tasks = [
  {
    title: "User's travel plan",
    progress: 0.25,
    color: "#22d3ee",
    start: 0.125,
  },
  {
    title: "Weather API",
    progress: 0.25,
    color: "#cbd5e1",
    start: 0.375,
  },
  {
    title: "Travel advisory API",
    progress: 0.3,
    color: "#cbd5e1",
    start: 0.75,
  },
  {
    title: "Retrieve travel tips",
    progress: 0.15,
    color: "#22d3ee",
    start: 1.05,
  },
  {
    title: "Flight booking API",
    progress: 0.3,
    color: "#cbd5e1",
    start: 1.2,
  },
  {
    title: "Flight option summary",
    progress: 0.15,
    color: "#22d3ee",
    start: 1.5,
  },
  {
    title: "Hotel search API",
    progress: 0.25,
    color: "#cbd5e1",
    start: 1.65,
  },
  {
    title: "Hotel reviews",
    progress: 0.1,
    color: "#fb923c",
    start: 2.0,
  },
];

export default function TravelPlanTimeline({ runs, parentId }) {
  const shownRuns = runs
    .filter((r) => r.parentRunId === parentId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  const displayTasks = shownRuns?.length ? generateTasks(shownRuns) : tasks;

  return (
    <>
      <TimeRule />
      <Box p="xl" style={{ overflowX: "auto" }}>
        <Card>
          <CardContent>
            <Box
              style={{
                position: "relative",
                width: "1000px",
                height: `${displayTasks.length * ROW_GAP}px`,
              }}
            >
              {displayTasks.map((task, index) => (
                <Box
                  key={index}
                  style={{
                    position: "absolute",
                    top: `${index * ROW_GAP}px`,
                    left: `${task.start * pixelPerSecond}px`,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Box
                    style={{
                      position: "relative",
                      height: `${BAR_HEIGHT}px`,
                      backgroundColor: task.color,
                      borderRadius: "8px",
                      width: `${task.progress * pixelPerSecond}px`,
                      transition: "width 0.5s ease",
                    }}
                  />
                  <Text
                    size="sm"
                    fw={600}
                    style={{
                      marginLeft: "12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {task.title}
                  </Text>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </>
  );
}
