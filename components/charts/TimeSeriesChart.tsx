"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Point } from "@/lib/signals";

interface TimeSeriesChartProps {
  data: Point[];
  color: string;
  unit?: string;
  referenceLines?: { value: number; label: string }[];
}

function formatDate(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", { year: "2-digit", month: "short" });
}

export function TimeSeriesChart({ data, color, unit, referenceLines }: TimeSeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--color-stone)" strokeOpacity={0.2} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          minTickGap={40}
          tick={{ fontSize: 11, fill: "var(--color-stone)" }}
          axisLine={{ stroke: "var(--color-stone)" }}
          tickLine={false}
        />
        <YAxis
          width={42}
          tick={{ fontSize: 11, fill: "var(--color-stone)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => [`${Number(value).toFixed(2)}${unit ?? ""}`, ""]}
          labelFormatter={(label) => formatDate(String(label))}
          contentStyle={{
            background: "var(--color-oat)",
            border: "1px solid var(--color-stone)",
            fontSize: 12,
            borderRadius: 2,
          }}
        />
        {referenceLines?.map((ref) => (
          <ReferenceLine
            key={ref.label}
            y={ref.value}
            stroke="var(--color-stone)"
            strokeDasharray="4 4"
            label={{ value: ref.label, fontSize: 10, fill: "var(--color-stone)", position: "insideTopRight" }}
          />
        ))}
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
