import { Box, Text } from "@mantine/core";

function TimeRule() {
  const width = 900;
  const interval = 0.25; // seconds
  const totalDuration = 2.25; // seconds
  const pixelPerSecond = 400; // since 900px covers 2.25s, 900 / 2.25 = 400px per second
  const ticks = [];

  for (let time = 0; time <= totalDuration; time += interval) {
    const left = time * pixelPerSecond;
    ticks.push({ time, left });
  }

  return (
    <Box pos="relative" w={width} h={32} left={45}>
      {ticks.map(({ time, left }, index) => (
        <Box
          key={index}
          pos="absolute"
          top={0}
          left={left}
          h="100%"
          style={{
            borderLeft: "1px solid #ccc",
          }}
        >
          <Text
            size="xs"
            c="dimmed"
            pos="absolute"
            left={8}
            top={0}
            title={`${time.toFixed(2)}s`}
          >
            {time.toFixed(2)}s
          </Text>
        </Box>
      ))}

      {/* Final dashed border at 2.25s */}
      <Box
        pos="absolute"
        top={0}
        left={width}
        h="100%"
        style={{
          borderRight: "1px dashed #ccc",
        }}
      />
    </Box>
  );
}

export default TimeRule;
