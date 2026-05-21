import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/Table";
import { EmptyState } from "../ui/EmptyState";
import { formatCurrency } from "../../lib/formatters";

export interface CategoryBudgetRow {
  id: string;
  name: string;
  monthlyBudgetAmount: number;
  actualAmount?: number;
}

export interface IncomeCategoryRow {
  id: string;
  name: string;
  totalAmount?: number;
}

function getProgressTone(percentage: number) {
  if (percentage <= 70) return "bg-emerald-500";
  return "bg-amber-500";
}

export function BudgetProgressBar({
  actualAmount,
  plannedAmount,
  currencyCode,
}: {
  actualAmount: number;
  plannedAmount: number;
  currencyCode: string;
}) {
  const executionPercentage = plannedAmount > 0 ? (actualAmount / plannedAmount) * 100 : actualAmount > 0 ? 100 : 0;
  const overflowPercentage = Math.max(0, executionPercentage - 100);

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-on-surface-variant)]">
        <span>{formatCurrency(actualAmount, currencyCode)}</span>
        <span>{plannedAmount > 0 ? `${executionPercentage.toFixed(0)}%` : "Sin límite"}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded bg-[var(--color-surface-container-high)]">
        <div
          className={`h-full rounded transition-all ${getProgressTone(executionPercentage)}`}
          style={{ width: `${Math.min(executionPercentage, 100)}%` }}
        />
        {overflowPercentage > 0 ? (
          <div
            className="absolute right-0 top-0 h-full bg-[var(--color-error)]"
            style={{ width: `${Math.min(overflowPercentage, 100)}%` }}
          />
        ) : null}
      </div>
      <p className="text-xs text-[var(--color-on-surface-variant)]">
        Límite mensual: {formatCurrency(plannedAmount, currencyCode)}
      </p>
    </div>
  );
}

export function ExpenseCategoryTable({
  categories,
  currencyCode,
  actions,
  emptyAction,
  onSelect,
}: {
  categories: CategoryBudgetRow[];
  currencyCode: string;
  actions?: (category: CategoryBudgetRow) => ReactNode;
  emptyAction?: ReactNode;
  onSelect?: (category: CategoryBudgetRow) => void;
}) {
  if (categories.length === 0) {
    return (
      <EmptyState
        className="m-4"
        title="No tienes categorías de gasto"
        description="Crea una categoría de gasto para empezar a medir su ejecución mensual."
        action={emptyAction}
      />
    );
  }

  return (
    <>
      <div className="space-y-3 p-4 md:hidden">
        {categories.map((category) => (
          <article
            key={category.id}
            onClick={() => onSelect?.(category)}
            className={`rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-4 ${
              onSelect ? "cursor-pointer hover:bg-[var(--color-surface-container-low)]" : ""
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-[var(--color-on-surface)]">{category.name}</p>
                <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                  Mensual: {formatCurrency(category.monthlyBudgetAmount, currencyCode)}
                </p>
              </div>
              {actions ? <div className="shrink-0">{actions(category)}</div> : null}
            </div>
            <BudgetProgressBar
              actualAmount={category.actualAmount ?? 0}
              plannedAmount={category.monthlyBudgetAmount}
              currencyCode={currencyCode}
            />
          </article>
        ))}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[38%]">Categoría</TableHead>
              <TableHead className="w-[50%]">Ejecución mensual</TableHead>
              {actions ? <TableHead className="w-20 text-right">Acciones</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow
                key={category.id}
                onClick={() => onSelect?.(category)}
                className={onSelect ? "cursor-pointer" : undefined}
              >
                <TableCell>
                  <p className="font-medium text-[var(--color-on-surface)]">{category.name}</p>
                  <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                    Mensual: {formatCurrency(category.monthlyBudgetAmount, currencyCode)}
                  </p>
                </TableCell>
                <TableCell className="pr-6">
                  <BudgetProgressBar
                    actualAmount={category.actualAmount ?? 0}
                    plannedAmount={category.monthlyBudgetAmount}
                    currencyCode={currencyCode}
                  />
                </TableCell>
                {actions ? <TableCell>{actions(category)}</TableCell> : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export function IncomeCategoryTable({
  categories,
  currencyCode,
  actions,
  emptyAction,
  onSelect,
}: {
  categories: IncomeCategoryRow[];
  currencyCode: string;
  actions?: (category: IncomeCategoryRow) => ReactNode;
  emptyAction?: ReactNode;
  onSelect?: (category: IncomeCategoryRow) => void;
}) {
  if (categories.length === 0) {
    return (
      <EmptyState
        className="m-4"
        title="No tienes categorías de ingreso"
        description="Crea una categoría de ingreso para clasificar tus entradas."
        action={emptyAction}
      />
    );
  }

  const showsTotalAmount = categories.some((category) => category.totalAmount !== undefined);

  return (
    <>
      <div className="space-y-3 p-4 md:hidden">
        {categories.map((category) => (
          <article
            key={category.id}
            onClick={() => onSelect?.(category)}
            className={`flex items-center justify-between gap-3 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-4 ${
              onSelect ? "cursor-pointer hover:bg-[var(--color-surface-container-low)]" : ""
            }`}
          >
            <div className="min-w-0">
              <p className="font-medium text-[var(--color-on-surface)]">{category.name}</p>
              <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                {category.totalAmount !== undefined
                  ? `Acumulado: ${formatCurrency(category.totalAmount, currencyCode)}`
                  : "Ingreso"}
              </p>
            </div>
            {actions ? <div className="shrink-0">{actions(category)}</div> : null}
          </article>
        ))}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoría</TableHead>
              {showsTotalAmount ? <TableHead className="text-right">Acumulado</TableHead> : null}
              {actions ? <TableHead className="w-20 text-right">Acciones</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow
                key={category.id}
                onClick={() => onSelect?.(category)}
                className={onSelect ? "cursor-pointer" : undefined}
              >
                <TableCell>
                  <p className="font-medium text-[var(--color-on-surface)]">{category.name}</p>
                  <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Ingreso</p>
                </TableCell>
                {showsTotalAmount ? (
                  <TableCell className="text-right font-semibold text-emerald-500">
                    {category.totalAmount !== undefined ? formatCurrency(category.totalAmount, currencyCode) : "-"}
                  </TableCell>
                ) : null}
                {actions ? <TableCell>{actions(category)}</TableCell> : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
