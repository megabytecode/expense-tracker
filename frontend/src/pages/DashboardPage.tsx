import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  CalendarRange,
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
import { CategoryBreakdownChart } from "../components/dashboard/CategoryBreakdownChart";

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
  percentage: number;
  forecastAmount: number;
  actualAmount: number;
  varianceAmount: number;
  executionPercentage: number;
};

type OverviewResponse = {
  range: { startDate: string; endDate: string };
  currencyCode: string;
  monthlyExpenseBase: number;
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
    totalGoals: number;
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
    currencyCode: string;
    monthlyExpenseBase: number;
    forecastFactor: number;
    totalAssignedPercentage: number;
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

type LocalFilterState = {
  active: boolean;
  range: DashboardRange;
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

function copyRange(range: DashboardRange): DashboardRange {
  return {
    startDate: range.startDate,
    endDate: range.endDate,
  };
}

function getTypePillClasses(type: "cash" | "savings") {
  return type === "savings"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-slate-200 text-slate-700";
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);

  const [globalRange, setGlobalRange] = useState<DashboardRange>(defaultRange);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState("");

  const [expenseFilter, setExpenseFilter] = useState<LocalFilterState>({
    active: false,
    range: copyRange(defaultRange),
  });
  const [incomeFilter, setIncomeFilter] = useState<LocalFilterState>({
    active: false,
    range: copyRange(defaultRange),
  });
  const [transferFilter, setTransferFilter] = useState<LocalFilterState>({
    active: false,
    range: copyRange(defaultRange),
  });

  const [expenseOverride, setExpenseOverride] = useState<BreakdownItem[] | null>(null);
  const [incomeOverride, setIncomeOverride] = useState<BreakdownItem[] | null>(null);
  const [transfersOverride, setTransfersOverride] = useState<OverviewResponse["transferSummary"] | null>(null);
  const [expenseState, setExpenseState] = useState({ isLoading: false, error: "" });
  const [incomeState, setIncomeState] = useState({ isLoading: false, error: "" });
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

  const [planBaseDraft, setPlanBaseDraft] = useState("");
  const [planPercentages, setPlanPercentages] = useState<Record<string, string>>({});
  const [planMessage, setPlanMessage] = useState({ type: "", text: "" });
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  const expenseRange = expenseFilter.active ? expenseFilter.range : globalRange;
  const incomeRange = incomeFilter.active ? incomeFilter.range : globalRange;
  const expenseItems = expenseOverride ?? overview?.expenseBreakdown ?? [];
  const incomeItems = incomeOverride ?? overview?.incomeBreakdown ?? [];
  const transferSummary = transfersOverride ?? overview?.transferSummary ?? null;

  const planSummary = useMemo(() => {
    const base = Number(planBaseDraft || 0);
    const totalAssigned = Object.values(planPercentages).reduce((sum, value) => {
      const numeric = Number(value);
      return sum + (Number.isFinite(numeric) ? numeric : 0);
    }, 0);

    return {
      base,
      totalAssigned: Number(totalAssigned.toFixed(2)),
      exceeds: totalAssigned > 100.0001,
    };
  }, [planBaseDraft, planPercentages]);

  const loadOverview = useCallback(async (range: DashboardRange) => {
    setIsLoadingOverview(true);
    setOverviewError("");

    try {
      const data = await fetchApi(`/reports/overview?${buildQuery(range)}`);
      setOverview(data);
      setPlanBaseDraft(String(data.monthlyPlan.monthlyExpenseBase));
      setPlanPercentages(
        data.monthlyPlan.items.reduce((draft: Record<string, string>, item: MonthlyPlanItem) => {
          draft[item.categoryId] = String(item.percentage);
          return draft;
        }, {}),
      );
      if (!expenseFilter.active) {
        setExpenseOverride(null);
      }
      if (!incomeFilter.active) {
        setIncomeOverride(null);
      }
      if (!transferFilter.active) {
        setTransfersOverride(null);
      }
      setExpenseFilter((current) => (current.active ? current : { ...current, range: copyRange(range) }));
      setIncomeFilter((current) => (current.active ? current : { ...current, range: copyRange(range) }));
      setTransferFilter((current) => (current.active ? current : { ...current, range: copyRange(range) }));
    } catch (error) {
      setOverviewError(getErrorMessage(error));
    } finally {
      setIsLoadingOverview(false);
    }
  }, [expenseFilter.active, incomeFilter.active, transferFilter.active]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOverview(globalRange);
  }, [globalRange, loadOverview]);

  async function loadBreakdown(type: BreakdownType, range: DashboardRange) {
    const setter = type === "expense" ? setExpenseOverride : setIncomeOverride;
    const stateSetter = type === "expense" ? setExpenseState : setIncomeState;

    stateSetter({ isLoading: true, error: "" });
    try {
      const data = await fetchApi(
        `/reports/category-breakdown?${buildQuery(range, { type })}`,
      );
      setter(data.items);
      stateSetter({ isLoading: false, error: "" });
    } catch (error) {
      stateSetter({ isLoading: false, error: getErrorMessage(error) });
    }
  }

  async function loadTransfers(range: DashboardRange, page = 1) {
    setTransferState({ isLoading: true, error: "" });
    try {
      const data = await fetchApi(
        `/reports/transfers?${buildQuery(range, { page, pageSize: 10 })}`,
      );
      setTransfersOverride(data);
      setTransferState({ isLoading: false, error: "" });
    } catch (error) {
      setTransferState({ isLoading: false, error: getErrorMessage(error) });
    }
  }

  async function loadCategoryMovements(
    category: SelectedCategory,
    range: DashboardRange,
    page: number,
  ) {
    setMovementState({ isLoading: true, error: "" });
    try {
      const data = await fetchApi(
        `/reports/category-movements?${buildQuery(range, {
          type: category.type,
          categoryId: category.categoryId,
          page,
          pageSize: 10,
        })}`,
      );
      setMovements(data);
      setMovementState({ isLoading: false, error: "" });
    } catch (error) {
      setMovements(null);
      setMovementState({ isLoading: false, error: getErrorMessage(error) });
    }
  }

  useEffect(() => {
    if (!selectedCategory) {
      return;
    }

    const activeRange = selectedCategory.type === "expense" ? expenseRange : incomeRange;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCategoryMovements(selectedCategory, activeRange, movementPage);
  }, [
    selectedCategory,
    movementPage,
    expenseRange,
    incomeRange,
  ]);

  function handleCategorySelected(type: BreakdownType, item: BreakdownItem) {
    setSelectedCategory({
      type,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
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

  async function handleSaveMonthlyPlan() {
    setIsSavingPlan(true);
    setPlanMessage({ type: "", text: "" });

    try {
      const allocations = (overview?.monthlyPlan.items ?? []).map((item) => ({
        categoryId: item.categoryId,
        percentage: Number(planPercentages[item.categoryId] ?? item.percentage ?? 0),
      }));

      await fetchApi("/settings/monthly-plan", {
        method: "PUT",
        body: JSON.stringify({
          monthlyExpenseBase: Number(planBaseDraft),
          allocations,
        }),
      });

      setPlanMessage({
        type: "success",
        text: "Planeación mensual actualizada correctamente.",
      });

      await loadOverview(globalRange);
    } catch (error) {
      setPlanMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsSavingPlan(false);
    }
  }

  function openQuickAction(type: "expense" | "income" | "transfer") {
    setTransactionModalType(type);
    setIsTransactionModalOpen(true);
  }

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
      <div className="flex justify-end">
        <Button variant="outline" onClick={logout} className="text-sm">
          Cerrar sesión
        </Button>
      </div>

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
              El rango global alimenta la vista principal desde el primer día del mes actual y cada informe puede
              afinarse sin afectar el resto.
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
            action={
              <Button onClick={() => void loadOverview(globalRange)}>
                Reintentar
              </Button>
            }
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
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">Gastos por categoría</h3>
                    <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                      Las transferencias interbancarias quedan fuera de esta gráfica.
                    </p>
                  </div>
                  <CalendarRange className="h-5 w-5 text-[var(--color-on-surface-variant)]" />
                </div>
              </div>
              <div className="space-y-4 px-4 py-4">
                <LocalFilterControls
                  range={expenseFilter.range}
                  active={expenseFilter.active}
                  onRangeChange={(range) => setExpenseFilter((current) => ({ ...current, range }))}
                  onApply={() => {
                    setExpenseFilter((current) => ({ ...current, active: true }));
                    void loadBreakdown("expense", expenseFilter.range);
                  }}
                  onReset={() => {
                    setExpenseFilter({ active: false, range: copyRange(globalRange) });
                    setExpenseOverride(null);
                    setExpenseState({ isLoading: false, error: "" });
                  }}
                />
                {expenseState.error ? (
                  <InlineError message={expenseState.error} onRetry={() => void loadBreakdown("expense", expenseFilter.range)} />
                ) : expenseState.isLoading ? (
                  <LoadingBox label="Cargando gastos por categoría..." />
                ) : (
                  <CategoryBreakdownChart
                    items={expenseItems}
                    currencyCode={overview.currencyCode}
                    accent="#ba1a1a"
                    onSelect={(item) => handleCategorySelected("expense", item)}
                  />
                )}
              </div>
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
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">Ingresos por categoría</h3>
                    <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                      Selecciona una categoría para ver su detalle paginado.
                    </p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-[var(--color-secondary)]" />
                </div>
              </div>
              <div className="space-y-4 px-4 py-4">
                <LocalFilterControls
                  range={incomeFilter.range}
                  active={incomeFilter.active}
                  onRangeChange={(range) => setIncomeFilter((current) => ({ ...current, range }))}
                  onApply={() => {
                    setIncomeFilter((current) => ({ ...current, active: true }));
                    void loadBreakdown("income", incomeFilter.range);
                  }}
                  onReset={() => {
                    setIncomeFilter({ active: false, range: copyRange(globalRange) });
                    setIncomeOverride(null);
                    setIncomeState({ isLoading: false, error: "" });
                  }}
                />
                {incomeState.error ? (
                  <InlineError message={incomeState.error} onRetry={() => void loadBreakdown("income", incomeFilter.range)} />
                ) : incomeState.isLoading ? (
                  <LoadingBox label="Cargando ingresos por categoría..." />
                ) : (
                  <CategoryBreakdownChart
                    items={incomeItems}
                    currencyCode={overview.currencyCode}
                    accent="#0058be"
                    onSelect={(item) => handleCategorySelected("income", item)}
                  />
                )}
              </div>
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
                    Tabla paginada a 10 registros por defecto con acceso a detalle completo.
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
                title="Selecciona una categoría desde una gráfica"
                description="Al hacer clic en una barra, aquí aparecerán los movimientos relacionados dentro del rango aplicable."
                className="py-10"
              />
            ) : movementState.error ? (
              <InlineError message={movementState.error} onRetry={() => {
                const activeRange = selectedCategory.type === "expense" ? expenseRange : incomeRange;
                void loadCategoryMovements(selectedCategory, activeRange, movementPage);
              }} />
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

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
              <div className="border-b border-[var(--color-outline-variant)] px-4 py-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">Planeación mensual por categoría</h3>
                    <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                      Define la base mensual y distribuye porcentajes organizativos para calcular forecast y compararlo con el gasto real acumulado del período.
                    </p>
                  </div>
                  <div className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-sm text-[var(--color-on-surface-variant)]">
                    Asignado: {planSummary.totalAssigned.toFixed(2)}%
                  </div>
                </div>
              </div>
              <div className="space-y-4 px-4 py-4">
                {planMessage.text ? (
                  <div
                    className={`rounded-xl px-4 py-3 text-sm ${
                      planMessage.type === "success"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-[var(--color-error-container)] text-[var(--color-on-error-container)]"
                    }`}
                  >
                    {planMessage.text}
                  </div>
                ) : null}

                <div className="grid gap-3 lg:grid-cols-[0.8fr_0.2fr]">
                  <label className="text-sm">
                    <span className="mb-2 block font-medium text-[var(--color-on-surface)]">Base mensual de gasto</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={planBaseDraft}
                      onChange={(event) => setPlanBaseDraft(event.target.value)}
                      className="w-full rounded-xl border border-[var(--color-outline-variant)] bg-white px-3 py-2 text-[var(--color-on-surface)] outline-none"
                    />
                  </label>
                  <div className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
                      Forecast factor
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[var(--color-on-surface)]">
                      {overview.monthlyPlan.forecastFactor.toFixed(2)}
                    </p>
                  </div>
                </div>

                {planSummary.exceeds ? (
                  <div className="rounded-xl bg-[var(--color-error-container)] px-4 py-3 text-sm text-[var(--color-on-error-container)]">
                    La suma de porcentajes no puede superar el 100%.
                  </div>
                ) : null}

                {overview.monthlyPlan.items.length === 0 ? (
                  <EmptyState
                    title="No hay categorías de gasto activas"
                    description="Crea categorías de gasto para distribuir la planeación mensual."
                    className="py-10"
                  />
                ) : (
                  <div className="space-y-3">
                    {overview.monthlyPlan.items.map((item) => {
                      const percentageValue = planPercentages[item.categoryId] ?? String(item.percentage);
                      const draftPercentage = Number(percentageValue || 0);
                      const draftForecastAmount =
                        Number(planBaseDraft || 0) * (draftPercentage / 100) * overview.monthlyPlan.forecastFactor;
                      const draftVarianceAmount = item.actualAmount - draftForecastAmount;
                      return (
                        <div
                          key={item.categoryId}
                          className="grid gap-3 rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-4 lg:grid-cols-[1fr_120px_1fr_1fr]"
                        >
                          <div>
                            <p className="font-medium text-[var(--color-on-surface)]">{item.categoryName}</p>
                            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                              Ejecutado: {item.executionPercentage.toFixed(0)}%
                            </p>
                          </div>
                          <label className="text-sm">
                            <span className="mb-2 block text-[var(--color-on-surface-variant)]">Porcentaje</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={percentageValue}
                              onChange={(event) =>
                                setPlanPercentages((current) => ({
                                  ...current,
                                  [item.categoryId]: event.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-[var(--color-outline-variant)] bg-white px-3 py-2 text-[var(--color-on-surface)] outline-none"
                            />
                          </label>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
                              Forecast
                            </p>
                            <p className="mt-2 text-sm font-semibold text-[var(--color-on-surface)]">
                              {formatCurrency(draftForecastAmount, overview.currencyCode)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
                              Variación real
                            </p>
                            <p
                              className={`mt-2 text-sm font-semibold ${
                                draftVarianceAmount > 0 ? "text-[var(--color-error)]" : "text-emerald-700"
                              }`}
                            >
                              {formatCurrency(draftVarianceAmount, overview.currencyCode)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button disabled={isSavingPlan || planSummary.exceeds} onClick={() => void handleSaveMonthlyPlan()}>
                    {isSavingPlan ? "Guardando..." : "Guardar planeación"}
                  </Button>
                </div>
              </div>
            </section>

            <div className="space-y-6">
              <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
                <div className="border-b border-[var(--color-outline-variant)] px-4 py-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">Historial de transferencias</h3>
                      <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                        Rango independiente, total acumulado y paginación inferior.
                      </p>
                    </div>
                    <div className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-sm text-[var(--color-on-surface-variant)]">
                      Total: {formatCurrency(transferSummary?.totalTransferred ?? 0, overview.currencyCode)}
                    </div>
                  </div>
                </div>
                <div className="space-y-4 px-4 py-4">
                  <LocalFilterControls
                    range={transferFilter.range}
                    active={transferFilter.active}
                    onRangeChange={(range) => setTransferFilter((current) => ({ ...current, range }))}
                    onApply={() => {
                      setTransferFilter((current) => ({ ...current, active: true }));
                      void loadTransfers(transferFilter.range, 1);
                    }}
                    onReset={() => {
                      setTransferFilter({ active: false, range: copyRange(globalRange) });
                      setTransfersOverride(null);
                      setTransferState({ isLoading: false, error: "" });
                    }}
                  />
                  {transferState.error ? (
                    <InlineError message={transferState.error} onRetry={() => void loadTransfers(transferFilter.range, 1)} />
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
                        onPageChange={(page) => {
                          if (transferFilter.active) {
                            void loadTransfers(transferFilter.range, page);
                          } else if (overview) {
                            void loadTransfers(globalRange, page);
                            setTransferFilter((current) => ({ ...current, active: true, range: copyRange(globalRange) }));
                          }
                        }}
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
          </div>
        </>
      )}

      <div className="fixed bottom-5 right-4 z-40 flex flex-col gap-3">
        <QuickActionFab icon={TrendingDown} label="Agregar gasto" onClick={() => openQuickAction("expense")} />
        <QuickActionFab icon={TrendingUp} label="Agregar ingreso" onClick={() => openQuickAction("income")} tone="positive" />
        <QuickActionFab icon={ArrowRightLeft} label="Registrar transferencia" onClick={() => openQuickAction("transfer")} />
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

function LocalFilterControls({
  range,
  active,
  onRangeChange,
  onApply,
  onReset,
}: {
  range: DashboardRange;
  active: boolean;
  onRangeChange: (range: DashboardRange) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-2 block text-[var(--color-on-surface-variant)]">Desde</span>
          <input
            type="date"
            value={range.startDate}
            onChange={(event) => onRangeChange({ ...range, startDate: event.target.value })}
            className="w-full rounded-xl border border-[var(--color-outline-variant)] bg-white px-3 py-2 text-[var(--color-on-surface)] outline-none"
          />
        </label>
        <label className="text-sm">
          <span className="mb-2 block text-[var(--color-on-surface-variant)]">Hasta</span>
          <input
            type="date"
            value={range.endDate}
            onChange={(event) => onRangeChange({ ...range, endDate: event.target.value })}
            className="w-full rounded-xl border border-[var(--color-outline-variant)] bg-white px-3 py-2 text-[var(--color-on-surface)] outline-none"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onApply}>
          Aplicar solo a este informe
        </Button>
        {active ? (
          <Button variant="ghost" size="sm" onClick={onReset}>
            Volver al filtro global
          </Button>
        ) : null}
        <span className="text-xs text-[var(--color-on-surface-variant)]">
          {active ? "Filtro local activo" : "Usando rango global"}
        </span>
      </div>
    </div>
  );
}
