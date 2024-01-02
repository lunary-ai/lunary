/*
 * TODO everything, this is just a mockup
 */

import React, { PureComponent } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const data = [
  {
    month: "2015.01",
    a: 4000,
    b: 2400,
  },
  {
    month: "2015.02",
    a: 3000,
    b: 1398,
  },
  {
    month: "2015.03",
    a: 2000,
    b: 9800,
  },
  {
    month: "2015.04",
    a: 2780,
    b: 3908,
  },
  {
    month: "2015.05",
    a: 1890,
    b: 4800,
  },
  {
    month: "2015.06",
    a: 2390,
    b: 3800,
  },
  {
    month: "2015.07",
    a: 3490,
    b: 4300,
  },
]

const toPercent = (decimal, fixed = 0) => `${(decimal * 100).toFixed(fixed)}%`

export default function TinyPercentChart({ height, width }) {
  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart width={500} height={400} data={data}>
        <CartesianGrid strokeDasharray="3 3" />

        {/* <Area
          type="monotone"
          dataKey="a"
          stackId="1"
          fill="lightgreen"
          stroke="transparent"
        /> */}

        <Area
          type="monotone"
          dataKey="b"
          stackId="1"
          fill="crimson"
          stroke="transparent"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
