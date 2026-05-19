import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { formatCompactCurrency, formatCurrency } from "../../lib/formatters";

interface ChartItem {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
}

interface CategoryBreakdownChartProps {
  items: ChartItem[];
  currencyCode: string;
  onSelect: (item: ChartItem) => void;
  accent: string;
}

export function CategoryBreakdownChart({
  items,
  currencyCode,
  onSelect,
  accent,
}: CategoryBreakdownChartProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-8 w-8 text-[var(--color-on-surface-variant)]" />}
        title="No hay datos en este rango"
        description="Cuando registres movimientos dentro del período seleccionado, aquí aparecerá el consolidado por categoría."
        className="py-10"
      />
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={items}
          layout="vertical"
          margin={{ top: 8, right: 12, bottom: 8, left: 12 }}
          barSize={22}
        >
          <CartesianGrid horizontal={false} stroke="rgba(118, 119, 125, 0.2)" />
          <XAxis
            type="number"
            tick={{ fill: "var(--color-on-surface-variant)", fontSize: 12 }}
            tickFormatter={(value) => formatCompactCurrency(Number(value), currencyCode)}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="categoryName"
            type="category"
            width={112}
            tick={{ fill: "var(--color-on-surface)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
            formatter={(value) => formatCurrency(Number(value ?? 0), currencyCode)}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--color-outline-variant)",
              boxShadow: "0 14px 30px rgba(15,23,42,0.08)",
            }}
          />
          <Bar
            dataKey="totalAmount"
            radius={[0, 8, 8, 0]}
            onClick={(_, index) => {
              const item = items[index];
              if (item) {
                onSelect(item);
              }
            }}
          >
            {items.map((item) => (
              <Cell
                key={item.categoryId}
                fill={accent}
                style={{ cursor: "pointer" }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
