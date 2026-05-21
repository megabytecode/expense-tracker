import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  ChevronRight,
  HandCoins,
  PiggyBank,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/Table";
import { TransactionModal } from "../components/ui/TransactionModal";
import { fetchApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatCurrency, formatDate } from "../lib/formatters";
import { PaginationControls } from "../components/dashboard/PaginationControls";
import { QuickActionFab } from "../components/dashboard/QuickActionFab";
import { MovementDetailModal } from "../components/dashboard/MovementDetailModal";
import {
  ExpenseCategoryTable,
  IncomeCategoryTable,
  type CategoryBudgetRow,
  type IncomeCategoryRow,
} from "../components/dashboard/CategoryBudgetTables";

type DashboardRange = {
  startDate: string;
  endDate: string;
};

type BreakdownType = "expense" | "income";

type BreakdownItem = {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
};

type ExpectedBalance = {
  id: string;
  name: string;
  type: "cash" | "savings";
  expectedBalance: number;
};

type TransferItem = {
  id: string;
  reason: string;
  notes?: string | null;
  amount: number;
  occurredAt: string;
  sourceAccount: { id: string; name: string };
  destinationAccount: { id: string; name: string };
};

type SavingsGoalSummaryItem = {
  id: string;
  name: string;
  targetAmount: number;
  allocatedAmount: number;
  remainingAmount: number;
  progressPercentage: number;
  targetDate: string | null;
  status: "active" | "completed" | "inactive";
};

type DebtSummaryItem = {
  id: string;
  name: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentDays: number[];
  isActive: boolean;
  status: "active" | "paid" | "inactive";
};

type MonthlyPlanItem = {
  categoryId: string;
  categoryName: string;
  amount: number;
  forecastAmount: number;
  actualAmount: number;
};

type OverviewResponse = {
  range: { startDate: string; endDate: string };
  currencyCode: string;
  expenseBreakdown: BreakdownItem[];
  incomeBreakdown: BreakdownItem[];
  expectedBalances: ExpectedBalance[];
  transferSummary: {
    totalTransferred: number;
    pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
    items: TransferItem[];
  };
  totalSavings: number;
  savingsGoalsSummary: {
    activeGoals: number;
    completedGoals: number;
    items: SavingsGoalSummaryItem[];
  };
  debtSummary: {
    totalPendingAmount: number;
    pendingCount: number;
    items: DebtSummaryItem[];
  };
  monthlyPlan: {
    items: MonthlyPlanItem[];
  };
};

type MovementsResponse = {
  category: { id: string; name: string };
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  items: Array<{
    id: string;
    type: BreakdownType;
    categoryName: string;
    description: string;
    totalAmount: number;
    occurredAt: string;
    accounts: Array<{
      id: string;
      name: string;
      amount: number;
      direction: "in" | "out";
    }>;
  }>;
};

type TransactionDetail = {
  id: string;
  type: "income" | "expense" | "manual_adjustment";
  description: string;
  notes?: string | null;
  totalAmount: number;
  occurredAt: string;
  category?: {
    id: string;
    name: string;
  } | null;
  allocations: Array<{
    id: string;
    amount: number;
    direction: "in" | "out";
    account: {
      id: string;
      name: string;
    };
  }>;
  debtPayments?: Array<{
    debt?: {
      id: string;
      name: string;
    } | null;
  }>;
};

type SelectedCategory = {
  type: BreakdownType;
  categoryId: string;
  categoryName: string;
};

function getCurrentMonthRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    startDate: firstDay.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

function buildQuery(range: DashboardRange, extra: Record<string, string | number> = {}) {
  const searchParams = new URLSearchParams({
    startDate: range.startDate,
    endDate: range.endDate,
  });

  Object.entries(extra).forEach(([key, value]) => {
    searchParams.set(key, String(value));
  });

  return searchParams.toString();
}

function getTypePillClasses(type: "cash" | "savings") {
  return type === "savings"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-slate-200 text-slate-700";
}

export function DashboardPage() {
  const { user } = useAuth();
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);

  const [globalRange, setGlobalRange] = useState<DashboardRange>(defaultRange);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState("");

  const [transferSummary, setTransferSummary] = useState<OverviewResponse["transferSummary"] | null>(null);
  const [transferState, setTransferState] = useState({ isLoading: false, error: "" });

  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory | null>(null);
  const [movementPage, setMovementPage] = useState(1);
  const [movements, setMovements] = useState<MovementsResponse | null>(null);
  const [movementState, setMovementState] = useState({ isLoading: false, error: "" });

  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetailId, setLoadingDetailId] = useState("");

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionModalType, setTransactionModalType] = useState<"expense" | "income" | "transfer">("expense");

  const loadOverview = useCallback(async (range: DashboardRange) => {
    setIsLoadingOverview(true);
    setOverviewError("");

    try {
      const data: OverviewResponse = await fetchApi(`/reports/overview?${buildQuery(range)}`);
      setOverview(data);
      setTransferSummary(data.transferSummary);
      setSelectedCategory(null);
      setMovements(null);
      setMovementPage(1);
    } catch (error) {
      setOverviewError(getErrorMessage(error));
    } finally {
      setIsLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOverview(globalRange);
  }, [globalRange, loadOverview]);

  async function loadTransfers(page = 1) {
    setTransferState({ isLoading: true, error: "" });
    try {
      const data = await fetchApi(
        `/reports/transfers?${buildQuery(globalRange, { page, pageSize: 20 })}`,
      );
      setTransferSummary(data);
      setTransferState({ isLoading: false, error: "" });
    } catch (error) {
      setTransferState({ isLoading: false, error: getErrorMessage(error) });
    }
  }

  const loadCategoryMovements = useCallback(async (
    category: SelectedCategory,
    page: number,
  ) => {
    setMovementState({ isLoading: true, error: "" });
    try {
      const data = await fetchApi(
        `/reports/category-movements?${buildQuery(globalRange, {
          type: category.type,
          categoryId: category.categoryId,
          page,
          pageSize: 20,
        })}`,
      );
      setMovements(data);
      setMovementState({ isLoading: false, error: "" });
    } catch (error) {
      setMovements(null);
      setMovementState({ isLoading: false, error: getErrorMessage(error) });
    }
  }, [globalRange]);

  useEffect(() => {
    if (!selectedCategory) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCategoryMovements(selectedCategory, movementPage);
  }, [selectedCategory, movementPage, loadCategoryMovements]);

  function handleCategorySelected(type: BreakdownType, item: CategoryBudgetRow | IncomeCategoryRow) {
    setSelectedCategory({
      type,
      categoryId: item.id,
      categoryName: item.name,
    });
    setMovementPage(1);
  }

  async function handleOpenMovementDetail(transactionId: string) {
    setLoadingDetailId(transactionId);
    try {
      const data = await fetchApi(`/transactions/${transactionId}`);
      setDetail(data);
      setDetailOpen(true);
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setLoadingDetailId("");
    }
  }

  function openQuickAction(type: "expense" | "income" | "transfer") {
    setTransactionModalType(type);
    setIsTransactionModalOpen(true);
  }

  const expenseRows = (overview?.monthlyPlan.items ?? []).map((item) => ({
    id: item.categoryId,
    name: item.categoryName,
    monthlyBudgetAmount: item.amount,
    actualAmount: item.actualAmount,
  }));

  const incomeRows = (overview?.incomeBreakdown ?? []).map((item) => ({
    id: item.categoryId,
    name: item.categoryName,
    totalAmount: item.totalAmount,
  }));

  const summaryCards = overview
    ? [
        {
          label: "Total ahorrado",
          value: formatCurrency(overview.totalSavings, overview.currencyCode),
          helper: "Solo cuentas tipo ahorro",
          icon: PiggyBank,
          tone: "text-emerald-600",
        },
        {
          label: "Transferido en rango",
          value: formatCurrency(transferSummary?.totalTransferred ?? 0, overview.currencyCode),
          helper: `${transferSummary?.pagination.totalItems ?? 0} transferencias`,
          icon: ArrowRightLeft,
          tone: "text-sky-600",
        },
        {
          label: "Metas activas",
          value: String(overview.savingsGoalsSummary.activeGoals),
          helper: `${overview.savingsGoalsSummary.completedGoals} completadas`,
          icon: TrendingUp,
          tone: "text-[var(--color-secondary)]",
        },
        {
          label: "Deudas pendientes",
          value: formatCurrency(overview.debtSummary.totalPendingAmount, overview.currencyCode),
          helper: `${overview.debtSummary.pendingCount} con saldo`,
          icon: HandCoins,
          tone: "text-[var(--color-error)]",
        },
      ]
    : [];

  return (
    <div className="space-y-6 pb-32">
      <PageHeader
        title="Dashboard"
        description={`Hola, ${user?.name || user?.email}. Este es tu panorama financiero del período.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setGlobalRange(getCurrentMonthRange())}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Mes actual
            </Button>
          </div>
        }
      />

      <section className="rounded-[20px] border border-[var(--color-outline-variant)] bg-[linear-gradient(135deg,#131b2e_0%,#1c2a45_52%,#0058be_100%)] p-5 text-white shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
              Panel principal autenticado
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Tu control financiero arranca con un filtro global claro.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/75">
              El rango global alimenta los reportes del dashboard. Las tablas respetan este rango sin filtros locales adicionales.
            </p>
          </div>

          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-2 block text-white/80">Desde</span>
              <input
                type="date"
                value={globalRange.startDate}
                onChange={(event) => setGlobalRange((current) => ({ ...current, startDate: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="mb-2 block text-white/80">Hasta</span>
              <input
                type="date"
                value={globalRange.endDate}
                onChange={(event) => setGlobalRange((current) => ({ ...current, endDate: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
              />
            </label>
          </div>
        </div>
      </section>

      {isLoadingOverview ? (
        <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-4 py-10 text-center text-sm text-[var(--color-on-surface-variant)]">
          Cargando reportes del dashboard...
        </section>
      ) : overviewError ? (
        <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-4 py-10">
          <EmptyState
            title="No pudimos cargar el dashboard"
            description={overviewError}
            action={<Button onClick={() => void loadOverview(globalRange)}>Reintentar</Button>}
          />
        </section>
      ) : !overview ? null : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <article
                key={card.label}
                className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
                      {card.label}
                    </p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-on-surface)]">
                      {card.value}
                    </p>
                    <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">{card.helper}</p>
                  </div>
                  <div className="rounded-2xl bg-[var(--color-surface)] p-3">
                    <card.icon className={`h-5 w-5 ${card.tone}`} />
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
              <div className="border-b border-[var(--color-outline-variant)] px-4 py-4">
                <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">Gastos por categoría</h3>
                <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                  El límite mensual es fijo; el gasto real usa el rango global.
                </p>
              </div>
              <ExpenseCategoryTable
                categories={expenseRows}
                currencyCode={overview.currencyCode}
                onSelect={(item) => handleCategorySelected("expense", item)}
              />
            </section>

            <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
              <div className="border-b border-[var(--color-outline-variant)] px-4 py-4">
                <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">Saldos esperados por cuenta</h3>
                <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                  Calculados hasta la fecha final del rango global.
                </p>
              </div>
              <div className="divide-y divide-[var(--color-outline-variant)]">
                {overview.expectedBalances.length === 0 ? (
                  <EmptyState
                    title="Todavía no tienes cuentas activas"
                    description="Cuando registres cuentas, aquí verás su saldo esperado consolidado."
                    className="py-10"
                  />
                ) : (
                  overview.expectedBalances.map((account) => (
                    <div key={account.id} className="flex items-center justify-between gap-3 px-4 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[var(--color-on-surface)]">{account.name}</p>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${getTypePillClasses(account.type)}`}>
                            {account.type === "savings" ? "Ahorro" : "Disponible"}
                          </span>
                        </div>
                      </div>
                      <p className="text-base font-semibold text-[var(--color-on-surface)]">
                        {formatCurrency(account.expectedBalance, overview.currencyCode)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
              <div className="border-b border-[var(--color-outline-variant)] px-4 py-4">
                <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">Ingresos por categoría</h3>
                <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                  Selecciona una categoría para ver su detalle paginado.
                </p>
              </div>
              <IncomeCategoryTable
                categories={incomeRows}
                currencyCode={overview.currencyCode}
                onSelect={(item) => handleCategorySelected("income", item)}
              />
            </section>

            <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
              <div className="border-b border-[var(--color-outline-variant)] px-4 py-4">
                <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">Resumen de metas de ahorro</h3>
                <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                  Organización visible sin mover dinero real entre cuentas.
                </p>
              </div>
              {overview.savingsGoalsSummary.items.length === 0 ? (
                <EmptyState
                  title="No hay metas activas todavía"
                  description="Puedes crearlas desde el módulo de metas y volver para monitorear su avance aquí."
                  className="py-10"
                />
              ) : (
                <div className="divide-y divide-[var(--color-outline-variant)]">
                  {overview.savingsGoalsSummary.items.slice(0, 4).map((goal) => (
                    <div key={goal.id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-[var(--color-on-surface)]">{goal.name}</p>
                          <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                            Meta: {formatCurrency(goal.targetAmount, overview.currencyCode)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-[var(--color-on-surface)]">
                          {goal.progressPercentage.toFixed(0)}%
                        </p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-container)]">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#2170e4_0%,#34d399_100%)]"
                          style={{ width: `${Math.min(goal.progressPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
            <div className="border-b border-[var(--color-outline-variant)] px-4 py-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">Movimientos por categoría seleccionada</h3>
                  <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                    Tabla paginada a 20 registros con acceso a detalle completo.
                  </p>
                </div>
                {selectedCategory ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-on-surface-variant)]">
                    <span className="rounded-full bg-[var(--color-surface)] px-3 py-1">
                      {selectedCategory.type === "expense" ? "Gasto" : "Ingreso"}: {selectedCategory.categoryName}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
                      Limpiar
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            {!selectedCategory ? (
              <EmptyState
                title="Selecciona una categoría desde una tabla"
                description="Al hacer clic en una categoría, aquí aparecerán los movimientos relacionados dentro del rango global."
                className="py-10"
              />
            ) : movementState.error ? (
              <InlineError message={movementState.error} onRetry={() => void loadCategoryMovements(selectedCategory, movementPage)} />
            ) : movementState.isLoading ? (
              <LoadingBox label="Cargando movimientos filtrados..." />
            ) : !movements || movements.items.length === 0 ? (
              <EmptyState
                title="No hay movimientos en esta categoría"
                description="Prueba otro rango o selecciona una categoría distinta."
                className="py-10"
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Movimiento</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cuentas</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.items.map((item) => (
                      <TableRow key={item.id} className="cursor-pointer" onClick={() => void handleOpenMovementDetail(item.id)}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-[var(--color-on-surface)]">{item.description}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
                              {item.categoryName}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-[var(--color-on-surface-variant)]">{formatDate(item.occurredAt)}</TableCell>
                        <TableCell className="text-[var(--color-on-surface-variant)]">
                          {item.accounts.map((account) => account.name).join(", ")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`font-semibold ${item.type === "income" ? "text-[var(--color-secondary)]" : "text-[var(--color-error)]"}`}>
                              {formatCurrency(item.totalAmount, overview.currencyCode)}
                            </span>
                            <ChevronRight className="h-4 w-4 text-[var(--color-on-surface-variant)]" />
                          </div>
                          {loadingDetailId === item.id ? (
                            <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Abriendo...</p>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <PaginationControls
                  page={movements.pagination.page}
                  totalPages={movements.pagination.totalPages}
                  totalItems={movements.pagination.totalItems}
                  onPageChange={setMovementPage}
                />
              </>
            )}
          </section>

          <div className="grid gap-6">
            <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
              <div className="border-b border-[var(--color-outline-variant)] px-4 py-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">Historial de transferencias</h3>
                    <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                      Usa el rango global, total acumulado y paginación inferior.
                    </p>
                  </div>
                  <div className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-sm text-[var(--color-on-surface-variant)]">
                    Total: {formatCurrency(transferSummary?.totalTransferred ?? 0, overview.currencyCode)}
                  </div>
                </div>
              </div>
              <div className="space-y-4 px-4 py-4">
                {transferState.error ? (
                  <InlineError message={transferState.error} onRetry={() => void loadTransfers(transferSummary?.pagination.page ?? 1)} />
                ) : transferState.isLoading ? (
                  <LoadingBox label="Cargando transferencias..." />
                ) : !transferSummary || transferSummary.items.length === 0 ? (
                  <EmptyState
                    title="No hay transferencias en este rango"
                    description="Cuando registres movimientos entre tus cuentas, aparecerán aquí."
                    className="py-10"
                  />
                ) : (
                  <>
                    <div className="divide-y divide-[var(--color-outline-variant)]">
                      {transferSummary.items.map((transfer) => (
                        <div key={transfer.id} className="flex items-start justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--color-on-surface)]">{transfer.reason}</p>
                            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                              {transfer.sourceAccount.name} → {transfer.destinationAccount.name}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
                              {formatDate(transfer.occurredAt)}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold text-[var(--color-on-surface)]">
                            {formatCurrency(transfer.amount, overview.currencyCode)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <PaginationControls
                      page={transferSummary.pagination.page}
                      totalPages={transferSummary.pagination.totalPages}
                      totalItems={transferSummary.pagination.totalItems}
                      onPageChange={(page) => void loadTransfers(page)}
                    />
                  </>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
              <div className="border-b border-[var(--color-outline-variant)] px-4 py-4">
                <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">Deudas pendientes</h3>
                <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                  Resumen de compromisos activos con saldo restante.
                </p>
              </div>
              {overview.debtSummary.items.length === 0 ? (
                <EmptyState
                  title="No tienes deudas pendientes"
                  description="Las obligaciones activas con saldo aparecerán aquí."
                  className="py-10"
                />
              ) : (
                <div className="divide-y divide-[var(--color-outline-variant)]">
                  {overview.debtSummary.items.map((debt) => (
                    <div key={debt.id} className="flex items-start justify-between gap-3 px-4 py-4">
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--color-on-surface)]">{debt.name}</p>
                        <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                          Días esperados: {debt.paymentDays.join(", ")}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-[var(--color-error)]">
                        {formatCurrency(debt.remainingAmount, overview.currencyCode)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      <div className="fixed bottom-5 right-4 z-40 flex flex-col gap-3">
        <QuickActionFab icon={TrendingDown} label="Agregar gasto" onClick={() => openQuickAction("expense")} tone="expense" />
        <QuickActionFab icon={TrendingUp} label="Agregar ingreso" onClick={() => openQuickAction("income")} tone="income" />
        <QuickActionFab icon={ArrowRightLeft} label="Registrar transferencia" onClick={() => openQuickAction("transfer")} tone="transfer" />
      </div>

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSuccess={() => void loadOverview(globalRange)}
        initialType={transactionModalType}
      />

      <MovementDetailModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        detail={detail}
        currencyCode={overview?.currencyCode ?? user?.currencyCode ?? "COP"}
      />
    </div>
  );
}

function LoadingBox({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-outline-variant)] px-4 py-10 text-center text-sm text-[var(--color-on-surface-variant)]">
      {label}
    </div>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-[var(--color-error-container)] bg-[var(--color-error-container)] px-4 py-4">
      <p className="text-sm text-[var(--color-on-error-container)]">{message}</p>
      <Button className="mt-3" variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
