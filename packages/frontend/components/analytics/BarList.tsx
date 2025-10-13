import {
  Box,
  Flex,
  Progress,
  Table,
  Text,
  Tooltip,
  useComputedColorScheme,
} from "@mantine/core";
import { useRouter } from "next/router";

type BarListProps = {
  data: any[];
  filterZero?: boolean;
  columns: {
    key: string;
    name?: string;
    main?: boolean; // Use this column for the bar chart calculations?
    bar?: boolean; // Bar chart column ?
    render?: (value, row?) => React.ReactNode;
  }[];
};

// A table of progress bars, with the progress value the proportion relative to the total
// and the second column the value of the bar
function BarList({ data, columns, filterZero = true }: BarListProps) {
  const router = useRouter();
  if (!data) return <>No data.</>;

  const dataColumns = columns.filter((col) => col.key);
  const main = dataColumns.find((col) => col.main) || dataColumns[0];
  const mainValues = data.map((item) => Number(item[main.key] || 0));
  const maxMainValue = Math.max(0, ...mainValues);
  const scheme = useComputedColorScheme();

  const columnCount = columns.length;
  const firstColumnWidth =
    columnCount > 1 ? 50 : 100; // reserve half the table for the bar column when other columns exist
  const remainingWidth = Math.max(100 - firstColumnWidth, 0);
  const otherColumnWidth =
    columnCount > 1 ? `${remainingWidth / (columnCount - 1)}%` : "0%";

  return (
    <Box>
      <Table
        layout="fixed"
        w="100%"
        cellPadding={0}
        horizontalSpacing={0}
        withRowBorders={false}
        verticalSpacing={10}
        variant="unstyled"
      >
        <Table.Thead style={{ textAlign: "left" }}>
          <Table.Tr>
            {columns.map(({ name }, i) => (
              <th
                style={{ width: i === 0 ? `${firstColumnWidth}%` : otherColumnWidth }}
                key={i}
              >
                {name || ""}
              </th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data
            .sort((a, b) => b[main.key] - a[main.key])
            .filter((item) => !filterZero || item[main.key] > 0)
            .slice(0, 5)
            .map((item, index) => (
              <Table.Tr key={index}>
                {columns.map(({ key, render, bar }, i) => {
                  if (!bar) {
                    return (
                      <Table.Td key={i}>
                        {render ? render(item[key], item) : item[key]}
                      </Table.Td>
                    );
                  }

                  const rowMainValue = Number(item[main.key] || 0);
                  const barScale =
                    maxMainValue > 0 ? Math.min(rowMainValue / maxMainValue, 1) : 0;
                  const sections = item.barSections ?? [];
                  const sectionTotal =
                    sections.reduce(
                      (acc: number, section: any) => acc + Number(section.count || 0),
                      0,
                    ) || rowMainValue;
                  const clickable = Boolean(item.url);

                  return (
                    <Table.Td
                      className="progressTd"
                      key={i}
                      pos="relative"
                      display="flex"
                      height="35px"
                      onClick={
                        clickable
                          ? (e) => {
                              if (e.metaKey || e.ctrlKey) {
                                window.open(item.url, "_blank");
                              } else {
                                router.push(item.url);
                              }
                            }
                          : undefined
                      }
                      style={clickable ? { cursor: "pointer" } : undefined}
                    >
                      <Progress.Root
                        size="lg"
                        h="25px"
                        radius="md"
                        w="90%"
                        pos="absolute"
                      >
                        {sections.map(({ count, color, tooltip }, n: number) => {
                          const numericCount = Number(count || 0);
                          const sectionValue =
                            sectionTotal > 0
                              ? (numericCount / sectionTotal) * barScale * 100
                              : 0;

                          return (
                            <Tooltip id={`${n}`} label={tooltip} key={n}>
                              <Progress.Section
                                value={sectionValue}
                                color={color}
                              />
                            </Tooltip>
                          );
                        })}
                      </Progress.Root>
                      <Flex
                        w="90%"
                        px="sm"
                        h="25px"
                        pos="absolute"
                        align="center"
                        justify="center"
                      >
                        <Text
                          c={scheme === "dark" ? "white" : "dark"}
                          mb={-3}
                          size="12px"
                          style={{
                            textAlign: "center",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            padding: ".3rem",
                          }}
                          title={item.value}
                        >
                          {item.value}
                        </Text>
                      </Flex>
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            ))}
        </Table.Tbody>
        <style jsx>{`
          td,
          th {
            border-top: none !important;
            border-bottom: none !important;
            padding: 10px 0;
          }

          .progressTd {
            position: relative;
          }

          .progressTd :global(.mantine-Progress-root) {
            position: absolute;
            left: 0;
            top: 9px;
            bottom: 0;
          }

          .progressTd :global(.mantine-Text-root) {
            z-index: 1;
            position: relative;
            top: 0;

            left: -10px;
            right: 0;

            text-align: center;
          }
        `}</style>
      </Table>
    </Box>
  );
}

export default BarList;
