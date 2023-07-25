import { Button, Group } from "@mantine/core"
import { useMemo, useState } from "react"

const checkIsMessage = (obj) => {
  return !!obj.text
}

export default function ObjectViewer({ data }) {
  const [selected, setSelected] = useState(null)

  const parsed = useMemo(() => {
    if (!data) return null
    try {
      return JSON.parse(data)
    } catch (e) {
      return null
    }
  }, [data])

  const highlevel = useMemo(() => {
    if (!data) return null
    return Object.keys(data).map((key) => {
      const value = data[key]
      const type = typeof value
      const isObject = type === "object" && value != null
      const isArray = Array.isArray(value)
      const isPrimitive = !isObject && !isArray

      return {
        key,
        type,
        value,
        isObject,
        isArray,
        isPrimitive,
      }
    })
  }, [parsed])

  if (!data?.startsWith("{")) return data

  return (
    <Group>
      {highlevel.map((item) => (
        <Button
          size="xs"
          compact
          onClick={() => setSelected(item.key)}
          color={item.isPrimitive ? "blue" : "green"}
        >
          {item.key}
        </Button>
      ))}
    </Group>
  )
}
