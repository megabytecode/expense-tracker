import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { fetchApi } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { ErrorState, LoadingState } from "../../components/ui/EmptyState";
import {
  ExpenseCategoryTable,
  IncomeCategoryTable,
  type CategoryBudgetRow,
  type IncomeCategoryRow,
} from "../../components/dashboard/CategoryBudgetTables";

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
  const monthlyPlanByCategory = useMemo(() => {
    return new Map(monthlyPlanItems.map((item) => [item.categoryId, item]));
  }, [monthlyPlanItems]);
  const expenseCategories: CategoryBudgetRow[] = visibleCategories
    .filter((cat) => cat.type === "expense")
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      monthlyBudgetAmount: cat.monthlyBudgetAmount ?? 0,
      actualAmount: monthlyPlanByCategory.get(cat.id)?.actualAmount ?? 0,
    }));
  const incomeCategories: IncomeCategoryRow[] = visibleCategories
    .filter((cat) => cat.type === "income")
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
    }));

  const renderActions = (cat: CategoryBudgetRow | IncomeCategoryRow) => (
    <div className="flex justify-end gap-1">
      <button
        onClick={() => {
          const sourceCategory = visibleCategories.find((category) => category.id === cat.id);
          if (sourceCategory) openModal(sourceCategory);
        }}
        className="cursor-pointer rounded-md p-2 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)]"
        aria-label={`Editar ${cat.name}`}
      >
        <Edit2 className="h-4 w-4" />
      </button>
      <button
        onClick={() => {
          const sourceCategory = visibleCategories.find((category) => category.id === cat.id);
          if (sourceCategory) void handleDeactivate(sourceCategory);
        }}
        className="cursor-pointer rounded-md p-2 text-[var(--color-error)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)]"
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
            <ExpenseCategoryTable
              categories={expenseCategories}
              currencyCode={currencyCode}
              actions={renderActions}
              emptyAction={<Button onClick={() => openModal()}>Crear gasto</Button>}
            />
          </section>

          <section className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
            <div className="border-b border-[var(--color-outline-variant)] px-4 py-4">
              <h2 className="text-lg font-semibold text-[var(--color-on-surface)]">Categorías de ingreso</h2>
              <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                Se usan para clasificar entradas de dinero.
              </p>
            </div>
            <IncomeCategoryTable
              categories={incomeCategories}
              currencyCode={currencyCode}
              actions={renderActions}
              emptyAction={<Button onClick={() => openModal()}>Crear ingreso</Button>}
            />
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
