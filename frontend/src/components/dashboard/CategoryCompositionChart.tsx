import { Pie, PieChart, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { ChartPie } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { formatCompactCurrency, formatCurrency } from "../../lib/formatters";

export interface CategoryCompositionItem {
  id: string;
  name: string;
  value: number;
  tone: "expense" | "income";
}

const EXPENSE_PALETTE = ["#ff8a65", "#ffb74d", "#ffd54f", "#f06292", "#e57373", "#ff7043", "#d4a373"];
const INCOME_PALETTE = ["#34d399", "#2dd4bf", "#38bdf8", "#60a5fa", "#4ade80", "#22c55e", "#14b8a6"];

function extractEmojiLabel(value: string) {
  const match = value.match(/\p{Extended_Pictographic}/u);
  if (match?.[0]) {
    return match[0];
  }

  const compact = value
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (compact.length === 0) return "•";
  if (compact.length === 1) {
    return compact[0].slice(0, 3).toUpperCase();
  }

  return compact
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getSliceColor(item: CategoryCompositionItem, index: number) {
  const palette = item.tone === "expense" ? EXPENSE_PALETTE : INCOME_PALETTE;
  return palette[index % palette.length];
}

export function CategoryCompositionChart({
  items,
  currencyCode,
  summaryLabel = "Total consolidado",
  emptyTitle = "Todavía no hay distribución para graficar",
  emptyDescription = "Cuando tus categorías tengan montos acumulados, aquí verás su peso relativo.",
}: {
  items: CategoryCompositionItem[];
  currencyCode: string;
  summaryLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const visibleItems = items.filter((item) => item.value > 0);
  const totalValue = visibleItems.reduce((sum, item) => sum + item.value, 0);

  if (visibleItems.length === 0) {
    return (
      <EmptyState
        icon={<ChartPie className="h-8 w-8 text-[var(--color-on-surface-variant)]" />}
        title={emptyTitle}
        description={emptyDescription}
        className="py-10"
      />
    );
  }

  const chartData = visibleItems.map((item, index) => ({
    ...item,
    label: extractEmojiLabel(item.name),
    color: getSliceColor(item, index),
  }));

  return (
    <div className="space-y-4">
      <div className="h-[22rem] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <defs>
              <filter id="category-pie-shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="16" stdDeviation="12" floodColor="rgba(15,23,42,0.26)" />
              </filter>
            </defs>
            <Tooltip
              formatter={(value, _name, payload) => {
                const numericValue = Number(value ?? 0);
                const percent = totalValue > 0 ? (numericValue / totalValue) * 100 : 0;
                return [`${formatCurrency(numericValue, currencyCode)} · ${percent.toFixed(1)}%`, String(payload?.payload?.name ?? "")];
              }}
              contentStyle={{
                borderRadius: 16,
                border: "1px solid var(--color-outline-variant)",
                background: "color-mix(in srgb, var(--color-surface-container-lowest) 92%, transparent)",
                boxShadow: "0 18px 40px rgba(15,23,42,0.14)",
              }}
            />

            <Pie
              data={chartData}
              dataKey="value"
              cx="50%"
              cy="54%"
              innerRadius={70}
              outerRadius={126}
              startAngle={210}
              endAngle={-150}
              stroke="none"
              isAnimationActive={false}
            >
              {chartData.map((item) => (
                <Cell key={`${item.id}-shadow`} fill="rgba(15,23,42,0.22)" />
              ))}
            </Pie>

            <Pie
              data={chartData}
              dataKey="value"
              cx="50%"
              cy="49%"
              innerRadius={70}
              outerRadius={126}
              paddingAngle={2}
              startAngle={210}
              endAngle={-150}
              stroke="rgba(255,255,255,0.16)"
              strokeWidth={1}
              labelLine={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, payload }) => {
                const safeMidAngle = midAngle ?? 0;
                const angle = (-safeMidAngle * Math.PI) / 180;
                const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.54;
                const x = Number(cx) + radius * Math.cos(angle);
                const y = Number(cy) + radius * Math.sin(angle);

                return (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#f8fafc"
                    style={{ fontSize: 12, fontWeight: 800, pointerEvents: "none", userSelect: "none" }}
                  >
                    {payload.label}
                  </text>
                );
              }}
            >
              {chartData.map((item) => (
                <Cell key={item.id} fill={item.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-[22px] border border-[var(--color-outline-variant)] bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-on-surface-variant)]">
              {summaryLabel}
            </p>
            <p className="mt-1 text-2xl font-semibold text-[var(--color-on-surface)]">
              {formatCurrency(totalValue, currencyCode)}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--color-surface-container-low)] px-3 py-2 text-right">
            <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
              Categorías activas
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--color-on-surface)]">{chartData.length}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {chartData.map((item) => (
            <div
              key={`${item.id}-legend`}
              className="flex min-w-0 items-center gap-3 rounded-2xl bg-[var(--color-surface-container-low)] px-3 py-2.5"
            >
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color, boxShadow: "0 0 0 4px rgba(255,255,255,0.04)" }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--color-on-surface)]">{item.name}</p>
                <p className="text-xs text-[var(--color-on-surface-variant)]">
                  {formatCompactCurrency(item.value, currencyCode)}
                </p>
              </div>
              <span className="rounded-full bg-[var(--color-surface-container-high)] px-2 py-1 text-[11px] font-semibold text-[var(--color-on-surface)]">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
