import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { fetchApi } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/Table";
import { formatCurrency } from "../../lib/formatters";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  isProtected: boolean;
  monthlyBudgetAmount: number;
}

interface MonthlyPlanItem {
  categoryId: string;
  actualAmount: number;
  forecastAmount: number;
  executionPercentage: number;
}

interface OverviewResponse {
  currencyCode: string;
  monthlyPlan: {
    items: MonthlyPlanItem[];
  };
}

type CategoryFormData = {
  id: string;
  name: string;
  type: "expense" | "income";
  monthlyBudgetAmount: string;
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

function getProgressTone(percentage: number) {
  if (percentage <= 70) return "bg-emerald-500";
  if (percentage <= 100) return "bg-amber-500";
  return "bg-amber-500";
}

function BudgetProgressBar({
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
    <div className="min-w-[220px] space-y-2">
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

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlyPlanItems, setMonthlyPlanItems] = useState<MonthlyPlanItem[]>([]);
  const [currencyCode, setCurrencyCode] = useState("COP");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState<CategoryFormData>({
    id: "",
    name: "",
    type: "expense",
    monthlyBudgetAmount: "0",
  });

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setPageError("");
      const range = getCurrentMonthRange();
      const params = new URLSearchParams(range);
      const [categoryData, overviewData]: [Category[], OverviewResponse] = await Promise.all([
        fetchApi("/categories"),
        fetchApi(`/reports/overview?${params.toString()}`),
      ]);
      setCategories(categoryData);
      setMonthlyPlanItems(overviewData.monthlyPlan.items);
      setCurrencyCode(overviewData.currencyCode);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial data fetch for this route.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCategories();
  }, [loadCategories]);

  const openModal = (cat?: Category) => {
    if (cat) {
      if (cat.isProtected) return;
      setFormData({
        id: cat.id,
        name: cat.name,
        type: cat.type,
        monthlyBudgetAmount: String(cat.monthlyBudgetAmount ?? 0),
      });
    } else {
      setFormData({ id: "", name: "", type: "expense", monthlyBudgetAmount: "0" });
    }
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const payload = {
      name: formData.name,
      type: formData.type,
      ...(formData.type === "expense" ? { monthlyBudgetAmount: Number(formData.monthlyBudgetAmount || 0) } : {}),
    };

    try {
      if (formData.id) {
        await fetchApi(`/categories/${formData.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi("/categories", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      void loadCategories();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleDeactivate = async (cat: Category) => {
    if (cat.isProtected) {
      alert("No se pueden eliminar categorías protegidas.");
      return;
    }
    if (!confirm("¿Desactivar esta categoría?")) return;
    try {
      await fetchApi(`/categories/${cat.id}`, { method: "DELETE" });
      void loadCategories();
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  const visibleCategories = categories.filter((cat) => !cat.isProtected);
  const expenseCategories = visibleCategories.filter((cat) => cat.type === "expense");
  const incomeCategories = visibleCategories.filter((cat) => cat.type === "income");
  const monthlyPlanByCategory = useMemo(() => {
    return new Map(monthlyPlanItems.map((item) => [item.categoryId, item]));
  }, [monthlyPlanItems]);

  const renderActions = (cat: Category) => (
    <div className="flex justify-end gap-1">
      <button
        onClick={() => openModal(cat)}
        className="rounded-md p-2 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)]"
        aria-label={`Editar ${cat.name}`}
      >
        <Edit2 className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleDeactivate(cat)}
        className="rounded-md p-2 text-[var(--color-error)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)]"
        aria-label={`Desactivar ${cat.name}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías"
        description="Organiza tus ingresos y define el límite mensual de cada categoría de gasto."
        action={
          <Button onClick={() => openModal()}>
            <Plus className="mr-2 h-4 w-4" /> Nueva categoría
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState title="Cargando categorías..." description="Estamos preparando tus categorías visibles." />
      ) : pageError ? (
        <ErrorState
          description={pageError}
          action={<Button onClick={() => void loadCategories()}>Reintentar</Button>}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.9fr]">
          <section className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
            <div className="border-b border-[var(--color-outline-variant)] px-4 py-4">
              <h2 className="text-lg font-semibold text-[var(--color-on-surface)]">Categorías de gasto</h2>
              <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                El avance corresponde al mes actual y usa el límite mensual configurado.
              </p>
            </div>
            {expenseCategories.length === 0 ? (
              <EmptyState
                className="m-4"
                title="No tienes categorías de gasto"
                description="Crea una categoría de gasto para empezar a medir su ejecución mensual."
                action={<Button onClick={() => openModal()}>Crear gasto</Button>}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Ejecución mensual</TableHead>
                    <TableHead className="w-20 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseCategories.map((cat) => {
                    const plan = monthlyPlanByCategory.get(cat.id);
                    const plannedAmount = plan?.forecastAmount ?? cat.monthlyBudgetAmount ?? 0;

                    return (
                      <TableRow key={cat.id}>
                        <TableCell>
                          <p className="font-medium text-[var(--color-on-surface)]">{cat.name}</p>
                          <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                            Mensual: {formatCurrency(cat.monthlyBudgetAmount ?? 0, currencyCode)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <BudgetProgressBar
                            actualAmount={plan?.actualAmount ?? 0}
                            plannedAmount={plannedAmount}
                            currencyCode={currencyCode}
                          />
                        </TableCell>
                        <TableCell>{renderActions(cat)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </section>

          <section className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
            <div className="border-b border-[var(--color-outline-variant)] px-4 py-4">
              <h2 className="text-lg font-semibold text-[var(--color-on-surface)]">Categorías de ingreso</h2>
              <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                Se usan para clasificar entradas de dinero.
              </p>
            </div>
            {incomeCategories.length === 0 ? (
              <EmptyState
                className="m-4"
                title="No tienes categorías de ingreso"
                description="Crea una categoría de ingreso para clasificar tus entradas."
                action={<Button onClick={() => openModal()}>Crear ingreso</Button>}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="w-20 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeCategories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <p className="font-medium text-[var(--color-on-surface)]">{cat.name}</p>
                        <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Ingreso</p>
                      </TableCell>
                      <TableCell>{renderActions(cat)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={formData.id ? "Editar categoría" : "Nueva categoría"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <div role="alert" className="rounded bg-error-container p-3 text-sm text-on-error-container">{formError}</div>}

          <Input
            label="Nombre de la categoría"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Select
            label="Tipo de categoría"
            value={formData.type}
            onChange={e => setFormData({ ...formData, type: e.target.value as "expense" | "income" })}
          >
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </Select>

          {formData.type === "expense" ? (
            <Input
              label="Monto mensual destinado"
              type="number"
              min="0"
              step="0.01"
              value={formData.monthlyBudgetAmount}
              onChange={e => setFormData({ ...formData, monthlyBudgetAmount: e.target.value })}
              required
            />
          ) : null}

          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="mr-2">Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
