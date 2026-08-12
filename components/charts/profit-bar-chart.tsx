"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatSignedCurrency } from "@/lib/format";

const POSITIVE = "#059669";
const NEGATIVE = "#dc2626";

type ProfitBarChartProps = {
  data: { name: string; value: number }[];
  height?: number;
  emptyMessage?: string;
};

export function ProfitBarChart({
  data,
  height = 260,
  emptyMessage = "No data yet.",
}: ProfitBarChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(value) => formatSignedCurrency(value)}
        />
        <Tooltip
          formatter={(value) => formatSignedCurrency(Number(value))}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.value >= 0 ? POSITIVE : NEGATIVE} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
