import { useEffect, useState } from "react";
import Sentiment from "@/components/analytics/Charts/Sentiment";
import TopTopics from "@/components/analytics/Charts/TopTopics";
import { SimpleGrid, Button, Group } from "@mantine/core";
import DynamicChart from "@/components/analytics/Charts/DynamicChart";
import ReactWordcloud from "react-wordcloud";
import AnalyticsCard from "@/components/analytics/AnalyticsCard";
import { useLocalStorage } from "@mantine/hooks";

const words = [
  {
    text: "told",
    value: 64,
  },
  {
    text: "mistake",
    value: 11,
  },
  {
    text: "thought",
    value: 16,
  },
  {
    text: "bad",
    value: 17,
  },
  {
    text: "correct",
    value: 10,
  },
  {
    text: "day",
    value: 54,
  },
  {
    text: "prescription",
    value: 12,
  },
  {
    text: "time",
    value: 77,
  },
  {
    text: "thing",
    value: 45,
  },
  {
    text: "left",
    value: 19,
  },
  {
    text: "pay",
    value: 13,
  },
  {
    text: "people",
    value: 32,
  },
  {
    text: "month",
    value: 22,
  },
  {
    text: "again",
    value: 35,
  },
  {
    text: "review",
    value: 24,
  },
  {
    text: "call",
    value: 38,
  },
  {
    text: "doctor",
    value: 70,
  },
  {
    text: "asked",
    value: 26,
  },
  {
    text: "finally",
    value: 14,
  },
  {
    text: "insurance",
    value: 29,
  },
  {
    text: "week",
    value: 41,
  },
  {
    text: "called",
    value: 49,
  },
  {
    text: "problem",
    value: 20,
  },
  {
    text: "going",
    value: 59,
  },
  {
    text: "help",
    value: 49,
  },
  {
    text: "felt",
    value: 45,
  },
  {
    text: "discomfort",
    value: 11,
  },
  {
    text: "lower",
    value: 22,
  },
  {
    text: "severe",
    value: 12,
  },
  {
    text: "free",
    value: 38,
  },
  {
    text: "better",
    value: 54,
  },
  {
    text: "muscle",
    value: 14,
  },
  {
    text: "neck",
    value: 41,
  },
  {
    text: "root",
    value: 24,
  },
  {
    text: "adjustment",
    value: 16,
  },
  {
    text: "therapy",
    value: 29,
  },
  {
    text: "injury",
    value: 20,
  },
  {
    text: "excruciating",
    value: 10,
  },
  {
    text: "chronic",
    value: 13,
  },
  {
    text: "chiropractor",
    value: 35,
  },
  {
    text: "treatment",
    value: 59,
  },
  {
    text: "tooth",
    value: 32,
  },
  {
    text: "chiropractic",
    value: 17,
  },
  {
    text: "dr",
    value: 77,
  },
  {
    text: "relief",
    value: 19,
  },
  {
    text: "shoulder",
    value: 26,
  },
  {
    text: "nurse",
    value: 17,
  },
  {
    text: "room",
    value: 22,
  },
  {
    text: "hour",
    value: 35,
  },
  {
    text: "wait",
    value: 38,
  },
  {
    text: "hospital",
    value: 11,
  },
  {
    text: "eye",
    value: 13,
  },
  {
    text: "test",
    value: 10,
  },
  {
    text: "appointment",
    value: 49,
  },
  {
    text: "medical",
    value: 19,
  },
  {
    text: "question",
    value: 20,
  },
  {
    text: "office",
    value: 64,
  },
  {
    text: "care",
    value: 54,
  },
  {
    text: "minute",
    value: 29,
  },
  {
    text: "waiting",
    value: 16,
  },
  {
    text: "patient",
    value: 59,
  },
  {
    text: "health",
    value: 49,
  },
  {
    text: "alternative",
    value: 24,
  },
  {
    text: "holistic",
    value: 19,
  },
  {
    text: "traditional",
    value: 20,
  },
  {
    text: "symptom",
    value: 29,
  },
  {
    text: "internal",
    value: 17,
  },
  {
    text: "prescribed",
    value: 26,
  },
  {
    text: "acupuncturist",
    value: 16,
  },
  {
    text: "pain",
    value: 64,
  },
  {
    text: "integrative",
    value: 10,
  },
  {
    text: "herb",
    value: 13,
  },
  {
    text: "sport",
    value: 22,
  },
  {
    text: "physician",
    value: 41,
  },
  {
    text: "herbal",
    value: 11,
  },
  {
    text: "eastern",
    value: 12,
  },
  {
    text: "chinese",
    value: 32,
  },
  {
    text: "acupuncture",
    value: 45,
  },
  {
    text: "prescribe",
    value: 14,
  },
  {
    text: "medication",
    value: 38,
  },
  {
    text: "western",
    value: 35,
  },
  {
    text: "sure",
    value: 38,
  },
  {
    text: "work",
    value: 64,
  },
  {
    text: "smile",
    value: 17,
  },
  {
    text: "teeth",
    value: 26,
  },
  {
    text: "pair",
    value: 11,
  },
  {
    text: "wanted",
    value: 20,
  },
  {
    text: "frame",
    value: 13,
  },
  {
    text: "lasik",
    value: 10,
  },
  {
    text: "amazing",
    value: 41,
  },
  {
    text: "fit",
    value: 14,
  },
  {
    text: "happy",
    value: 22,
  },
  {
    text: "feel",
    value: 49,
  },
  {
    text: "glasse",
    value: 19,
  },
  {
    text: "vision",
    value: 12,
  },
  {
    text: "pressure",
    value: 16,
  },
  {
    text: "find",
    value: 29,
  },
  {
    text: "experience",
    value: 59,
  },
  {
    text: "year",
    value: 70,
  },
  {
    text: "massage",
    value: 35,
  },
  {
    text: "best",
    value: 54,
  },
  {
    text: "mouth",
    value: 20,
  },
  {
    text: "staff",
    value: 64,
  },
  {
    text: "gum",
    value: 10,
  },
  {
    text: "chair",
    value: 12,
  },
  {
    text: "ray",
    value: 22,
  },
  {
    text: "dentistry",
    value: 11,
  },
  {
    text: "canal",
    value: 13,
  },
  {
    text: "procedure",
    value: 32,
  },
  {
    text: "filling",
    value: 26,
  },
  {
    text: "gentle",
    value: 19,
  },
  {
    text: "cavity",
    value: 17,
  },
  {
    text: "crown",
    value: 14,
  },
  {
    text: "cleaning",
    value: 38,
  },
  {
    text: "hygienist",
    value: 24,
  },
  {
    text: "dental",
    value: 59,
  },
  {
    text: "charge",
    value: 24,
  },
  {
    text: "cost",
    value: 29,
  },
  {
    text: "charged",
    value: 13,
  },
  {
    text: "spent",
    value: 17,
  },
  {
    text: "paying",
    value: 14,
  },
  {
    text: "pocket",
    value: 12,
  },
  {
    text: "dollar",
    value: 11,
  },
  {
    text: "business",
    value: 32,
  },
  {
    text: "refund",
    value: 10,
  },
];

export default function Analytics2() {
  const [charts, setCharts] = useLocalStorage({
    key: "charts",
    defaultValue: [],
    getInitialValueInEffect: false, // Adjust based on your needs
  });

  // Function to add a new chart
  const addChart = () => {
    setCharts((prevCharts) => [
      ...prevCharts,
      {
        id: Date.now(),
        splitBy: "Department",
        groupBy: "Month",
      },
    ]);
  };

  // Function to update chart configuration
  const updateChartConfig = (id, newConfig) => {
    setCharts((prevCharts) =>
      prevCharts.map((chart) =>
        chart.id === id ? { ...chart, ...newConfig } : chart,
      ),
    );
  };

  // Function to remove a chart
  const removeChart = (id) => {
    setCharts((prevCharts) => prevCharts.filter((chart) => chart.id !== id));
  };

  return (
    <div>
      {/* Add Chart Button */}
      <Group position="right" mb="md">
        <Button onClick={addChart}>Add New Chart</Button>
      </Group>

      {/* Render Charts */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {/* Existing Static Charts */}
        <TopTopics />
        <Sentiment />
        <AnalyticsCard>
          <ReactWordcloud
            words={words}
            options={{ rotationAngles: [10, 10] }}
          />
        </AnalyticsCard>

        {/* Dynamic Charts */}
        {charts.map((chart) => (
          <DynamicChart
            key={chart.id}
            chartConfig={chart}
            onUpdateConfig={(newConfig) =>
              updateChartConfig(chart.id, newConfig)
            }
            onRemove={() => removeChart(chart.id)}
          />
        ))}
      </SimpleGrid>
    </div>
  );
}
{
}




import React, { useState } from 'react';
import { Box, Grid, TextInput, NumberInput, Checkbox, Select } from '@mantine/core';

// Example chart components (replace these with your actual chart components)
const BarChart = ({ barSize, layout, margin, axis, grid }) => <div>BarChart preview</div>;
const LineChart = ({ stroke, strokeWidth, interpolation, dot, grid }) => <div>LineChart preview</div>;
const PieChart = ({ radius, innerRadius, paddingAngle, startAngle, endAngle }) => <div>PieChart preview</div>;
const AreaChart = ({ baseLine, curveType, fillOpacity, margin, stack }) => <div>AreaChart preview</div>;
const RadarChart = ({ startAngle, endAngle, angleField, radiusField, grid }) => <div>RadarChart preview</div>;

const charts = [
  {
    name: "BarChart",
    props: [
      { barSize: "number" },
      { layout: "string" },
      { margin: { top: "number", right: "number", bottom: "number", left: "number" } },
      { axis: { tickSize: "number", tickPadding: "number" } },
      { grid: "boolean" },
    ],
    component: BarChart,
  },
  {
    name: "LineChart",
    props: [
      { stroke: "string" },
      { strokeWidth: "number" },
      { interpolation: "string" },
      { dot: "boolean" },
      { grid: "boolean" },
    ],
    component: LineChart,
  },
  {
    name: "PieChart",
    props: [
      { radius: "number" },
      { innerRadius: "number" },
      { paddingAngle: "number" },
      { startAngle: "number" },
      { endAngle: "number" },
    ],
    component: PieChart,
  },
  {
    name: "AreaChart",
    props: [
      { baseLine: "number" },
      { curveType: "string" },
      { fillOpacity: "number" },
      { margin: { top: "number", right: "number", bottom: "number", left: "number" } },
      { stack: "boolean" },
    ],
    component: AreaChart,
  },
  {
    name: "RadarChart",
    props: [
      { startAngle: "number" },
      { endAngle: "number" },
      { angleField: "string" },
      { radiusField: "string" },
      { grid: "boolean" },
    ],
    component: RadarChart,
  }
];

const DynamicChartPreview = () => {
  const [selectedChart, setSelectedChart] = useState(charts[0]);
  const [chartProps, setChartProps] = useState({});

  const handlePropChange = (propName, value) => {
    setChartProps((prevProps) => ({
      ...prevProps,
      [propName]: value,
    }));
  };

  const renderPropInput = (prop, propName) => {
    switch (prop) {
      case "number":
        return (
          <NumberInput
            label={propName}
            value={chartProps[propName] || 0}
            onChange={(value) => handlePropChange(propName, value)}
          />
        );
      case "string":
        return (
          <TextInput
            label={propName}
            value={chartProps[propName] || ""}
            onChange={(event) => handlePropChange(propName, event.target.value)}
          />
        );
      case "boolean":
        return (
          <Checkbox
            label={propName}
            checked={chartProps[propName] || false}
            onChange={(event) => handlePropChange(propName, event.target.checked)}
          />
        );
      case "array":
        // For now, handle arrays as simple text input (could extend this further)
        return (
          <TextInput
            label={propName}
            value={chartProps[propName] || ""}
            onChange={(event) => handlePropChange(propName, event.target.value.split(','))}
          />
        );
      case "object":
        // Recursively render inputs for object properties
        return (
          <Box>
            <h4>{propName}</h4>
            {Object.keys(prop).map((subPropName) =>
              renderPropInput(prop[subPropName], subPropName)
            )}
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Grid>
      <Grid.Col span={6}>
        <Box>
          <h3>{selectedChart.name} Preview</h3>
          <selectedChart.component {...chartProps} />
        </Box>
      </Grid.Col>

      <Grid.Col span={6}>
        <Box>
          <h3>Chart Controls</h3>
          {selectedChart.props.map((prop) => {
            const propName = Object.keys(prop)[0];
            return (
              <Box key={propName} mb="sm">
                {renderPropInput(prop[propName], propName)}
              </Box>
            );
          })}
          <Select
            label="Select Chart"
            value={selectedChart.name}
            onChange={(name) => {
              const chart = charts.find((c) => c.name === name);
              setSelectedChart(chart);
              setChartProps({});
            }}
            data={charts.map((chart) => chart.name)}
          />
        </Box>
      </Grid.Col>
    </Grid>
  );
};

export default DynamicChartPreview;
