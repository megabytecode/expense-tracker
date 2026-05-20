import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { fetchApi } from "../../api/client";
import { formatCurrency } from "../../lib/formatters";

type MonthlyPlanMode = "amount" | "percentage";

type MonthlyPlanItem = {
  categoryId: string;
  categoryName: string;
  percentage: number;
  amount: number;
  forecastAmount: number;
  actualAmount: number;
  varianceAmount: number;
  executionPercentage: number;
};

type MonthlyPlanResponse = {
  currencyCode: string;
  monthlyExpenseBase: number;
  monthlyPlanMode: MonthlyPlanMode;
  forecastFactor: number;
  totalAssignedPercentage: number;
  totalAssignedAmount: number;
  items: MonthlyPlanItem[];
};

type OverviewResponse = {
  monthlyPlan: MonthlyPlanResponse;
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

export function MonthlyPlannerPage() {
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const [range, setRange] = useState(defaultRange);
  const [plan, setPlan] = useState<MonthlyPlanResponse | null>(null);
  const [baseDraft, setBaseDraft] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadPlan = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams(range);
      const data: OverviewResponse = await fetchApi(`/reports/overview?${params.toString()}`);
      setPlan(data.monthlyPlan);
      setBaseDraft(String(data.monthlyPlan.monthlyExpenseBase));
      setDrafts(
        data.monthlyPlan.items.reduce((nextDrafts: Record<string, string>, item) => {
          nextDrafts[item.categoryId] = String(
            data.monthlyPlan.monthlyPlanMode === "percentage" ? item.percentage : item.amount,
          );
          return nextDrafts;
        }, {}),
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPlan();
  }, [loadPlan]);

  const summary = useMemo(() => {
    const values = Object.values(drafts).map((value) => Number(value || 0));
    const total = values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);

    return {
      total,
      percentageExceeds: plan?.monthlyPlanMode === "percentage" && total > 100.0001,
    };
  }, [drafts, plan?.monthlyPlanMode]);

  async function handleSave() {
    if (!plan) return;

    setIsSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const allocations = plan.items.map((item) => {
        const value = Number(drafts[item.categoryId] ?? 0);
        return plan.monthlyPlanMode === "percentage"
          ? { categoryId: item.categoryId, percentage: value }
          : { categoryId: item.categoryId, amount: value };
      });

      await fetchApi("/settings/monthly-plan", {
        method: "PUT",
        body: JSON.stringify({
          monthlyExpenseBase: Number(baseDraft),
          monthlyPlanMode: plan.monthlyPlanMode,
          allocations,
        }),
      });

      setMessage({ type: "success", text: "Planeación mensual actualizada correctamente." });
      await loadPlan();
    } catch (saveError) {
      setMessage({ type: "error", text: getErrorMessage(saveError) });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planner mensual"
        description="Configura el forecast mensual por categoría y compáralo contra el gasto real del período."
      />

      {isLoading ? (
        <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-4 py-10 text-center text-sm text-[var(--color-on-surface-variant)]">
          Cargando planeación mensual...
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-4 py-10">
          <EmptyState title="No pudimos cargar el planner" description={error} action={<Button onClick={() => void loadPlan()}>Reintentar</Button>} />
        </section>
      ) : !plan ? null : (
        <>
          <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-sm">
                <span className="mb-2 block font-medium text-[var(--color-on-surface)]">Desde</span>
                <input
                  type="date"
                  value={range.startDate}
                  onChange={(event) => setRange((current) => ({ ...current, startDate: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-[var(--color-on-surface)] outline-none"
                />
              </label>
              <label className="text-sm">
                <span className="mb-2 block font-medium text-[var(--color-on-surface)]">Hasta</span>
                <input
                  type="date"
                  value={range.endDate}
                  onChange={(event) => setRange((current) => ({ ...current, endDate: event.target.value }))}
                  className="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-[var(--color-on-surface)] outline-none"
                />
              </label>
              <label className="text-sm">
                <span className="mb-2 block font-medium text-[var(--color-on-surface)]">Base mensual</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={baseDraft}
                  onChange={(event) => setBaseDraft(event.target.value)}
                  className="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-[var(--color-on-surface)] outline-none"
                />
              </label>
              <div className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
                  Modo actual
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-on-surface)]">
                  {plan.monthlyPlanMode === "percentage" ? "Porcentaje" : "Cantidad"}
                </p>
              </div>
            </div>
          </section>

          {message.text ? (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                message.type === "success"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-[var(--color-error-container)] text-[var(--color-on-error-container)]"
              }`}
            >
              {message.text}
            </div>
          ) : null}

          {summary.percentageExceeds ? (
            <div className="rounded-xl bg-[var(--color-error-container)] px-4 py-3 text-sm text-[var(--color-on-error-container)]">
              La suma de porcentajes no puede superar el 100%.
            </div>
          ) : null}

          <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
            <div className="border-b border-[var(--color-outline-variant)] px-4 py-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">Categorías de gasto</h3>
                  <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                    El forecast se prorratea por el rango seleccionado y se compara con el gasto real acumulado.
                  </p>
                </div>
                <div className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-sm text-[var(--color-on-surface-variant)]">
                  {plan.monthlyPlanMode === "percentage"
                    ? `Asignado: ${summary.total.toFixed(2)}%`
                    : `Asignado: ${formatCurrency(summary.total, plan.currencyCode)}`}
                </div>
              </div>
            </div>

            {plan.items.length === 0 ? (
              <EmptyState
                title="No hay categorías de gasto activas"
                description="Crea categorías de gasto para distribuir la planeación mensual."
                className="py-10"
              />
            ) : (
              <div className="space-y-3 p-4">
                {plan.items.map((item) => {
                  const draftValue = drafts[item.categoryId] ?? "0";
                  const numericDraftValue = Number(draftValue || 0);
                  const draftForecastAmount = plan.monthlyPlanMode === "percentage"
                    ? Number(baseDraft || 0) * (numericDraftValue / 100) * plan.forecastFactor
                    : numericDraftValue * plan.forecastFactor;
                  const draftVarianceAmount = item.actualAmount - draftForecastAmount;

                  return (
                    <div
                      key={item.categoryId}
                      className="grid gap-3 rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-4 lg:grid-cols-[1fr_150px_1fr_1fr]"
                    >
                      <div>
                        <p className="font-medium text-[var(--color-on-surface)]">{item.categoryName}</p>
                        <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                          Ejecutado: {item.executionPercentage.toFixed(0)}%
                        </p>
                      </div>
                      <label className="text-sm">
                        <span className="mb-2 block text-[var(--color-on-surface-variant)]">
                          {plan.monthlyPlanMode === "percentage" ? "Porcentaje" : "Cantidad"}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={plan.monthlyPlanMode === "percentage" ? "100" : undefined}
                          step="0.01"
                          value={draftValue}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [item.categoryId]: event.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-[var(--color-on-surface)] outline-none"
                        />
                      </label>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
                          Forecast
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[var(--color-on-surface)]">
                          {formatCurrency(draftForecastAmount, plan.currencyCode)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
                          Variación real
                        </p>
                        <p className={`mt-2 text-sm font-semibold ${draftVarianceAmount > 0 ? "text-[var(--color-error)]" : "text-emerald-400"}`}>
                          {formatCurrency(draftVarianceAmount, plan.currencyCode)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end border-t border-[var(--color-outline-variant)] px-4 py-4">
              <Button disabled={isSaving || summary.percentageExceeds} onClick={() => void handleSave()}>
                {isSaving ? "Guardando..." : "Guardar planeación"}
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
