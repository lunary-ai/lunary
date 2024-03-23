import { Box, Flex, Group, Progress, Table, Text, Tooltip } from "@mantine/core"
import { useColorScheme } from "@mantine/hooks"

type BarListProps = {
  data: any[]
  filterZero?: boolean
  customMetric?: {
    value: number
    label: string
  }
  columns: {
    name?: string
    key?: string
    main?: boolean // Use this column for the bar chart calculations?
    bar?: boolean // Bar chart column ?
    render?: (value, row?) => React.ReactNode
  }[]
}

// A table of progress bars, with the progress value the proportion relative to the total
// and the second column the value of the bar
const BarList = ({
  data,
  columns,
  customMetric,
  filterZero = true,
}: BarListProps) => {
  const dataColumns = columns.filter((col) => !col.bar && col.key)
  const main = dataColumns.find((col) => col.main) || dataColumns[0]
  const mainTotal = data.reduce((acc, item) => acc + (item[main.key] || 0), 0)
  const scheme = useColorScheme()

  if (!data) return <>No data.</>

  return (
    <>
      {customMetric ? (
        <Group align="end" my="lg" gap={8}>
          <Text fw={700} fz={30} lh={1}>
            {customMetric.value}
          </Text>
          <Text c="dimmed" size={"sm"} lh={1.3}>
            {customMetric.label}
          </Text>
        </Group>
      ) : (
        <Group gap="lg">
          {dataColumns.map(({ key, name, render }, i) => {
            const total = data.reduce((acc, item) => acc + (item[key] || 0), 0)

            return (
              <Group align="end" my="lg" gap={8} key={i}>
                <Text fw={700} fz={30} lh={1}>
                  {render ? render(total) : total}
                </Text>
                <Text c="dimmed" size={"sm"} lh={1.3}>
                  {name.toLowerCase()}
                </Text>
              </Group>
            )
          })}
        </Group>
      )}

      <Table
        cellPadding={0}
        horizontalSpacing={0}
        withRowBorders={false}
        verticalSpacing={10}
        variant="unstyled"
      >
        <Table.Thead style={{ textAlign: "left" }}>
          <Table.Tr>
            {columns.map(({ name }, i) => (
              <th style={{ width: i === 0 ? "50%" : "25%" }} key={i}>
                {name || ""}
              </th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data
            .sort((a, b) => b[main.key] - a[main.key])
            .filter((item) => !filterZero || item[main.key] > 0)
            .splice(0, 5)
            .map((item, index) => (
              <Table.Tr key={index}>
                {columns.map(({ key, render, bar }, i) =>
                  bar ? (
                    <Table.Td
                      className="progressTd"
                      key={i}
                      pos="relative"
                      display="flex"
                      height="35px"
                    >
                      <Progress.Root
                        size="lg"
                        h="25px"
                        radius="md"
                        w="90%"
                        pos="absolute"
                      >
                        {item.barSections?.map(({ count, color, tooltip }) => (
                          <Tooltip key={color} label={tooltip}>
                            <Progress.Section
                              value={(count / mainTotal) * 100}
                              color={color}
                            ></Progress.Section>
                          </Tooltip>
                        ))}
                      </Progress.Root>
                      <Flex
                        w="90%"
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
                          }}
                        >
                          {item.value}
                        </Text>
                      </Flex>
                    </Table.Td>
                  ) : (
                    <Table.Td key={i}>
                      <Text>
                        {render ? render(item[key], item) : item[key]}
                      </Text>
                    </Table.Td>
                  ),
                )}
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
    </>
  )
}

export default BarList
