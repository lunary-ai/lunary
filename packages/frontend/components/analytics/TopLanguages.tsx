import { Box, Center, Overlay, Text } from "@mantine/core";
import BarList from "./BarList";
import { getFlagEmoji, getLanguageName } from "@/utils/format";

interface TopLanguagesData {
  iso_code: string;
  count: number;
}

export default function TopLanguages({ data }: { data: TopLanguagesData[] }) {
  data = data.filter((lang) => lang.count > 0);

  if (data.length === 0) {
    return (
      <Center ta="center" h="100%" w="100%">
        <Overlay blur={5} opacity={0.1} p="lg" zIndex={1} />
        <Text>No data available for this period</Text>
      </Center>
    );
  }

  return (
    <Box px="md">
      <Box h="20px"></Box>
      <BarList
        filterZero={false}
        data={data?.map((lang) => ({
          value: lang.count,
          barSections: [
            {
              value: "count",
              tooltip: "Count",
              count: lang.count,
              color: "var(--mantine-color-blue-4)",
            },
          ],
          ...lang,
        }))}
        columns={[
          {
            name: "Language",
            bar: true,
            main: true,
            key: "count",
          },
          {
            name: "Name",
            key: "isoCode",
            render: (_, lang) => (
              <Text
                size="sm"
                px="md"
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {getFlagEmoji(lang.isoCode) +
                  "  " +
                  getLanguageName(lang.isoCode)}
              </Text>
            ),
          },
        ]}
      />
    </Box>
  );
}
