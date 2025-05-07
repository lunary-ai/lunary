"use client";

import { Card, CardContent } from "@/components/blocks/ui/card";
import { Box, Text } from "@mantine/core";
import TimeRuler from "./TimeRuler";

const BAR_HEIGHT = 30;
const ROW_GAP = 35;
const pixelPerSecond = 400;

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

  export default function TravelPlanTimeline({runs}) {
      console.log("rrrrrrrrrrrrrrrrrrrrrrrrrrr",runs)
  return (
    <>
      <TimeRuler />
      <Box p="xl" style={{ overflowX: "auto" }}>
        <Card>
          <CardContent>
            <Box
              style={{
                position: "relative",
                width: "1000px",
                height: `${tasks.length * ROW_GAP}px`,
              }}
            >
              {tasks.map((task, index) => (
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
