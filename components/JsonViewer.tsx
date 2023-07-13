import { Box, Button, Group } from "@mantine/core"
import { useMemo, useState } from "react"

export default function JsonViewer({ data }) {
  const parsed = useMemo(() => {
    if (!data) return null
    try {
      return JSON.parse(data)
    } catch (e) {
      return null
    }
  }, [data])

  return (
    <Box>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </Box>
  )
}
