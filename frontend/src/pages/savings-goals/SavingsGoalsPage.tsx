import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  PiggyBank,
  Plus,
  Power,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { fetchApi } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";

type GoalBaseStatus = "active" | "inactive";
type GoalStatus = GoalBaseStatus | "completed";

type SavingsGoal = {
  id: string;
  name: string;
  description: string | null;
  targetAmount: number;
  targetDate: string | null;
  status: GoalStatus;
  baseStatus: GoalBaseStatus;
  allocatedAmount: number;
  remainingAmount: number;
  progressPercentage: number;
};

type SavingsNotice = {
  type: "rebalance";
  adjustedAt: string;
  message: string;
} | null;

type SavingsOverview = {
  currencyCode: string;
  totalSavings: number;
  totalAllocated: number;
  unallocatedSavings: number;
  activeGoalsCount: number;
  completedGoalsCount: number;
  globalProgressPercentage: number;
  notice: SavingsNotice;
  goals: SavingsGoal[];
};

const EMPTY_GOAL_FORM = {
  id: "",
  name: "",
  description: "",
  targetAmount: "",
  targetDate: "",
  status: "active" as GoalBaseStatus,
};

function formatCurrency(value: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sin fecha objetivo";
  }

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

function getGoalTone(goal: SavingsGoal) {
  if (goal.status === "completed") {
    return {
      chip: "bg-emerald-100 text-emerald-700 border-emerald-200",
      progress: "from-emerald-500 to-emerald-400",
      accent: "bg-emerald-500/10 text-emerald-700",
      label: "Completada",
    };
  }

  if (goal.baseStatus === "inactive") {
    return {
      chip: "bg-slate-200 text-slate-600 border-slate-300",
      progress: "from-slate-500 to-slate-400",
      accent: "bg-slate-500/10 text-slate-700",
      label: "Inactiva",
    };
  }

  if (goal.progressPercentage >= 70) {
    return {
      chip: "bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] border-[var(--color-secondary)]/20",
      progress: "from-[var(--color-secondary)] to-sky-400",
      accent: "bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]",
      label: "En camino",
    };
  }

  return {
    chip: "bg-[var(--color-primary-container)]/10 text-[var(--color-primary-container)] border-[var(--color-primary-container)]/15",
    progress: "from-[var(--color-primary-container)] to-[var(--color-secondary)]",
    accent: "bg-[var(--color-primary-container)]/10 text-[var(--color-primary-container)]",
    label: "Activa",
  };
}

export function SavingsGoalsPage() {
  const [overview, setOverview] = useState<SavingsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [isSavingAllocations, setIsSavingAllocations] = useState(false);
  const [modalError, setModalError] = useState("");
  const [allocationError, setAllocationError] = useState("");
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL_FORM);
  const [allocationDraft, setAllocationDraft] = useState<Record<string, string>>({});

  const loadOverview = async () => {
    try {
      setIsLoading(true);
      setPageError("");
      const data = await fetchApi("/savings-goals/overview");
      setOverview(data);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const activeGoals = useMemo(() => {
    return overview?.goals.filter((goal) => goal.baseStatus === "active") ?? [];
  }, [overview]);

  const inactiveGoals = useMemo(() => {
    return overview?.goals.filter((goal) => goal.baseStatus === "inactive") ?? [];
  }, [overview]);

  const allocationSummary = useMemo(() => {
    const draftTotal = activeGoals.reduce((sum, goal) => {
      const rawValue = allocationDraft[goal.id];
      const numericValue = rawValue === undefined || rawValue === "" ? goal.allocatedAmount : Number(rawValue);
      return sum + (Number.isFinite(numericValue) ? numericValue : 0);
    }, 0);

    const totalSavings = overview?.totalSavings ?? 0;
    return {
      assigned: Number(draftTotal.toFixed(2)),
      remaining: Number((totalSavings - draftTotal).toFixed(2)),
      exceedsAvailable: draftTotal > totalSavings,
    };
  }, [activeGoals, allocationDraft, overview?.totalSavings]);

  const openCreateGoalModal = () => {
    setGoalForm(EMPTY_GOAL_FORM);
    setModalError("");
    setIsGoalModalOpen(true);
  };

  const openEditGoalModal = (goal: SavingsGoal) => {
    setGoalForm({
      id: goal.id,
      name: goal.name,
      description: goal.description ?? "",
      targetAmount: String(goal.targetAmount),
      targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : "",
      status: goal.baseStatus,
    });
    setModalError("");
    setIsGoalModalOpen(true);
  };

  const openAllocationModal = () => {
    const initialDraft = activeGoals.reduce<Record<string, string>>((draft, goal) => {
      draft[goal.id] = String(goal.allocatedAmount);
      return draft;
    }, {});
    setAllocationDraft(initialDraft);
    setAllocationError("");
    setIsAllocationModalOpen(true);
  };

  const handleGoalSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingGoal(true);
    setModalError("");

    try {
      const payload = {
        name: goalForm.name,
        description: goalForm.description,
        targetAmount: Number(goalForm.targetAmount),
        targetDate: goalForm.targetDate ? new Date(goalForm.targetDate).toISOString() : null,
        status: goalForm.status,
      };

      if (goalForm.id) {
        await fetchApi(`/savings-goals/${goalForm.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi("/savings-goals", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setIsGoalModalOpen(false);
      await loadOverview();
    } catch (error) {
      setModalError(getErrorMessage(error));
    } finally {
      setIsSavingGoal(false);
    }
  };

  const handleDeactivateGoal = async (goal: SavingsGoal) => {
    if (!confirm(`¿Desactivar la meta "${goal.name}"? La asignación organizativa se liberará.`)) {
      return;
    }

    try {
      await fetchApi(`/savings-goals/${goal.id}`, { method: "DELETE" });
      await loadOverview();
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  const handleSaveAllocations = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingAllocations(true);
    setAllocationError("");

    try {
      const payload = activeGoals.map((goal) => ({
        goalId: goal.id,
        amount: Number(allocationDraft[goal.id] ?? goal.allocatedAmount),
      }));

      const updatedOverview = await fetchApi("/savings-goals/allocations", {
        method: "PUT",
        body: JSON.stringify({ allocations: payload }),
      });

      setOverview(updatedOverview);
      setIsAllocationModalOpen(false);
    } catch (error) {
      setAllocationError(getErrorMessage(error));
    } finally {
      setIsSavingAllocations(false);
    }
  };

  const handleDismissNotice = async () => {
    try {
      await fetchApi("/savings-goals/rebalance-notice/acknowledge", {
        method: "POST",
      });
      await loadOverview();
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-[28px] bg-[var(--color-surface-container)]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-72 animate-pulse rounded-3xl bg-[var(--color-surface-container-low)]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="rounded-3xl border border-[var(--color-error)]/20 bg-[var(--color-error-container)] p-6 text-[var(--color-on-error-container)]">
        <p className="font-semibold">No pudimos cargar las metas de ahorro.</p>
        <p className="mt-2 text-sm">{pageError}</p>
        <Button className="mt-4" onClick={loadOverview}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!overview) {
    return null;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        <div className="relative overflow-hidden rounded-[28px] border border-[var(--color-outline-variant)] bg-[linear-gradient(135deg,rgba(19,27,46,0.98),rgba(0,88,190,0.94))] p-5 text-white shadow-[0_24px_60px_rgba(19,27,46,0.18)] md:p-7">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/80">
                <Wallet className="h-4 w-4" />
                Ahorro disponible real
              </div>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
                {formatCurrency(overview.totalSavings, overview.currencyCode)}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-sky-100/80 md:text-base">
                Solo contamos saldos actuales en cuentas de tipo ahorro. Las asignaciones a metas son
                organizativas y nunca crean movimientos reales.
              </p>
            </div>

            <Button
              onClick={openAllocationModal}
              className="h-12 rounded-full bg-white text-[var(--color-primary-container)] hover:bg-white/90"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Distribuir ahorro
            </Button>
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-on-surface-variant)]">
                Progreso global
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-on-surface)]">
                {overview.globalProgressPercentage.toFixed(0)}% alcanzado
              </h2>
            </div>
            <span className="rounded-full bg-[var(--color-secondary)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-secondary)]">
              {overview.activeGoalsCount} activas
            </span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary-container),var(--color-secondary))]"
              style={{ width: `${Math.min(100, overview.globalProgressPercentage)}%` }}
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[var(--color-surface-container-low)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
                Asignado
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--color-on-surface)]">
                {formatCurrency(overview.totalAllocated, overview.currencyCode)}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--color-surface-container-low)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
                Sin asignar
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--color-secondary)]">
                {formatCurrency(overview.unallocatedSavings, overview.currencyCode)}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--color-surface-container-low)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
                Cumplidas
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--color-on-surface)]">
                {overview.completedGoalsCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      {overview.notice && (
        <section className="flex flex-col gap-4 rounded-3xl border border-[var(--color-error)]/20 bg-[var(--color-error-container)]/55 p-5 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-3">
            <div className="mt-0.5 rounded-full bg-[var(--color-error)]/10 p-2 text-[var(--color-error)]">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-on-error-container)]">
                Distribución ajustada por reducción del ahorro
              </h3>
              <p className="mt-1 text-sm text-[var(--color-on-error-container)]/90">
                {overview.notice.message}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.1em] text-[var(--color-on-error-container)]/75">
                Detectado el {formatDate(overview.notice.adjustedAt)}
              </p>
            </div>
          </div>
          <Button variant="outline" className="border-[var(--color-error)]/20 bg-white/70" onClick={handleDismissNotice}>
            Entendido
          </Button>
        </section>
      )}

      <section className="flex flex-col gap-4 rounded-[28px] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-on-surface-variant)]">
              Metas activas
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-on-surface)]">
              Distribuye tu ahorro actual entre objetivos concretos
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-surface-variant)]">
              Ajusta montos sin tocar cuentas ni movimientos financieros. Si el ahorro baja, el sistema
              reequilibra estas metas proporcionalmente.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={openAllocationModal} disabled={activeGoals.length === 0}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Editar distribución
            </Button>
            <Button onClick={openCreateGoalModal}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva meta
            </Button>
          </div>
        </div>

        {activeGoals.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-6 py-12 text-center">
            <PiggyBank className="mx-auto h-12 w-12 text-[var(--color-on-surface-variant)]" />
            <h3 className="mt-4 text-lg font-semibold text-[var(--color-on-surface)]">
              Aún no tienes metas activas
            </h3>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
              Crea tu primera meta de ahorro y luego distribuye parte de tu fondo disponible.
            </p>
            <Button className="mt-5" onClick={openCreateGoalModal}>
              Crear meta
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeGoals.map((goal) => {
              const tone = getGoalTone(goal);
              return (
                <article
                  key={goal.id}
                  className="relative overflow-hidden rounded-[24px] border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(11,28,48,0.08)]"
                >
                  <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[var(--color-secondary)]/10 blur-3xl" />
                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${tone.chip}`}>
                          {tone.label}
                        </div>
                        <h3 className="mt-4 text-xl font-semibold tracking-tight text-[var(--color-on-surface)]">
                          {goal.name}
                        </h3>
                        <p className="mt-2 min-h-[44px] text-sm leading-6 text-[var(--color-on-surface-variant)]">
                          {goal.description || "Sin descripción adicional."}
                        </p>
                      </div>
                      <div className={`rounded-2xl p-3 ${tone.accent}`}>
                        <Target className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-5 space-y-3 rounded-[20px] bg-[var(--color-surface-container-low)] p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--color-on-surface-variant)]">Objetivo</span>
                        <strong className="text-[var(--color-on-surface)]">
                          {formatCurrency(goal.targetAmount, overview.currencyCode)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--color-on-surface-variant)]">Asignado</span>
                        <strong className="text-[var(--color-secondary)]">
                          {formatCurrency(goal.allocatedAmount, overview.currencyCode)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--color-on-surface-variant)]">Pendiente</span>
                        <strong className="text-[var(--color-on-surface)]">
                          {formatCurrency(goal.remainingAmount, overview.currencyCode)}
                        </strong>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.1em]">
                        <span className="text-[var(--color-on-surface-variant)]">Avance</span>
                        <span className="text-[var(--color-on-surface)]">{goal.progressPercentage.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${tone.progress}`}
                          style={{ width: `${Math.min(100, goal.progressPercentage)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[var(--color-on-surface-variant)]">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        {formatDate(goal.targetDate)}
                      </span>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Button variant="outline" onClick={() => openEditGoalModal(goal)}>
                        Editar
                      </Button>
                      <Button variant="ghost" onClick={() => handleDeactivateGoal(goal)}>
                        <Power className="mr-2 h-4 w-4" />
                        Desactivar
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {inactiveGoals.length > 0 && (
        <section className="rounded-[28px] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-5 shadow-sm md:p-6">
          <h2 className="text-lg font-semibold text-[var(--color-on-surface)]">Metas inactivas</h2>
          <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
            Conservan su historial, pero no reciben nuevas asignaciones hasta reactivarlas.
          </p>

          <div className="mt-5 grid gap-3">
            {inactiveGoals.map((goal) => (
              <div
                key={goal.id}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-[var(--color-on-surface)]">{goal.name}</p>
                  <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                    Objetivo: {formatCurrency(goal.targetAmount, overview.currencyCode)} • {formatDate(goal.targetDate)}
                  </p>
                </div>
                <Button variant="outline" onClick={() => openEditGoalModal(goal)}>
                  Editar meta
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <Modal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        title={goalForm.id ? "Editar meta de ahorro" : "Nueva meta de ahorro"}
        className="max-w-2xl"
      >
        <form className="space-y-4" onSubmit={handleGoalSubmit}>
          {modalError && (
            <div className="rounded-2xl bg-[var(--color-error-container)] p-3 text-sm text-[var(--color-on-error-container)]">
              {modalError}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nombre"
              value={goalForm.name}
              onChange={(event) => setGoalForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
            <Input
              label="Monto objetivo"
              type="number"
              step="0.01"
              min="0"
              value={goalForm.targetAmount}
              onChange={(event) => setGoalForm((current) => ({ ...current, targetAmount: event.target.value }))}
              required
            />
          </div>

          <label className="block space-y-1.5 text-sm font-medium text-[var(--color-on-surface)]">
            <span>Descripción</span>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-sm outline-none transition focus:border-[var(--color-secondary)] focus:ring-2 focus:ring-[var(--color-secondary)]/20"
              value={goalForm.description}
              onChange={(event) => setGoalForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Ej: Fondo para emergencias médicas, viaje o cuota inicial."
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Fecha objetivo"
              type="date"
              value={goalForm.targetDate}
              onChange={(event) => setGoalForm((current) => ({ ...current, targetDate: event.target.value }))}
            />
            <label className="block space-y-1.5 text-sm font-medium text-[var(--color-on-surface)]">
              <span>Estado</span>
              <select
                className="flex h-10 w-full rounded-md border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-secondary)]"
                value={goalForm.status}
                onChange={(event) =>
                  setGoalForm((current) => ({
                    ...current,
                    status: event.target.value as GoalBaseStatus,
                  }))
                }
              >
                <option value="active">Activa</option>
                <option value="inactive">Inactiva</option>
              </select>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsGoalModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSavingGoal}>
              {isSavingGoal ? "Guardando..." : "Guardar meta"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isAllocationModalOpen}
        onClose={() => setIsAllocationModalOpen(false)}
        title="Distribuir ahorro actual"
        className="max-w-3xl"
      >
        <form className="space-y-5" onSubmit={handleSaveAllocations}>
          {allocationError && (
            <div className="rounded-2xl bg-[var(--color-error-container)] p-3 text-sm text-[var(--color-on-error-container)]">
              {allocationError}
            </div>
          )}

          <div className="rounded-[24px] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-on-surface-variant)]">
                  Ahorro disponible
                </p>
                <p className="mt-2 text-xl font-semibold text-[var(--color-on-surface)]">
                  {formatCurrency(overview.totalSavings, overview.currencyCode)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-on-surface-variant)]">
                  Asignación propuesta
                </p>
                <p className="mt-2 text-xl font-semibold text-[var(--color-on-surface)]">
                  {formatCurrency(allocationSummary.assigned, overview.currencyCode)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-on-surface-variant)]">
                  Saldo sin asignar
                </p>
                <p
                  className={`mt-2 text-xl font-semibold ${
                    allocationSummary.exceedsAvailable
                      ? "text-[var(--color-error)]"
                      : "text-[var(--color-secondary)]"
                  }`}
                >
                  {formatCurrency(allocationSummary.remaining, overview.currencyCode)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {activeGoals.map((goal) => (
              <div
                key={goal.id}
                className="grid gap-3 rounded-[22px] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-4 md:grid-cols-[minmax(0,1fr)_220px]"
              >
                <div>
                  <p className="font-semibold text-[var(--color-on-surface)]">{goal.name}</p>
                  <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                    Objetivo: {formatCurrency(goal.targetAmount, overview.currencyCode)} • pendiente{" "}
                    {formatCurrency(goal.remainingAmount, overview.currencyCode)}
                  </p>
                </div>
                <Input
                  label="Monto asignado"
                  type="number"
                  step="0.01"
                  min="0"
                  max={goal.targetAmount}
                  value={allocationDraft[goal.id] ?? ""}
                  onChange={(event) =>
                    setAllocationDraft((current) => ({
                      ...current,
                      [goal.id]: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAllocationModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSavingAllocations || allocationSummary.exceedsAvailable}>
              {isSavingAllocations ? "Guardando..." : "Guardar distribución"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
