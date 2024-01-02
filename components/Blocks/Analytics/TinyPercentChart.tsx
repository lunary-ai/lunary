/*
 * TODO everything, this is just a mockup
 */

import { useMemo } from "react"
import { AreaChart, Area, CartesianGrid, ResponsiveContainer } from "recharts"

export default function TinyPercentChart({ height, width }) {
  const data = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => ({
      month: `2024.0${index + 1}`,
      a: Math.round(Math.random() * 4000),
    }))
  }, [])

  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart width={500} height={400} data={data}>
        <CartesianGrid strokeDasharray="3 3" />

        <Area
          type="monotone"
          dataKey="a"
          stackId="1"
          fill="crimson"
          stroke="transparent"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
