import { Group, Progress, Table, Text } from "@mantine/core"

// A table of progress bars, with the progress value the proportion relative to the total
// and the second column the value of the bar
const BarList = ({ data, headers }) => {
  const total = data.reduce((acc, item) => acc + item.count, 0)

  if (!data) return <>No data.</>

  return (
    <>
      <Group align="end" my="lg" spacing={8}>
        <Text fw={700} fz={30} lh={1}>
          {total}
        </Text>
        <Text c="dimmed" size={"sm"} lh={1.3}>
          total
        </Text>
      </Group>

      <Table
        cellPadding={0}
        horizontalSpacing={0}
        withBorder={false}
        verticalSpacing={10}
        variant="unstyled"
      >
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th key={i}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data
            .sort((a, b) => b.count - a.count)
            .filter((item) => item.value)
            .map((item, index) => (
              <tr key={index}>
                <td className="progressTd">
                  <Progress
                    size="lg"
                    h={25}
                    sections={item.composedBy.map((item) => ({
                      value: (item.count / total) * 100,
                      color: item.color + ".4",
                    }))}
                    w={"90%"}
                    radius="md"
                    value={(item.count / total) * 100}
                  />
                  <Text>{item.value}</Text>
                </td>
                <td width={100}>
                  {new Intl.NumberFormat().format(item.count)}
                </td>
              </tr>
            ))}
        </tbody>
        <style jsx>{`
          td,
          th {
            border-top: none !important;
            border-bottom: none !important;
          }

          .progressTd {
            position: relative;
          }

          .progressTd :global(.mantine-Progress-root) {
            position: absolute;
            left: 0;
            top: 6px;
            bottom: 0;
          }

          .progressTd :global(.mantine-Text-root) {
            z-index: 1;
            position: relative;
            top: -2px;
            left: 50%;
            transform: translateX(-25%);
          }
        `}</style>
      </Table>
    </>
  )
}

export default BarList
