import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Power, Wallet } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/EmptyState";
import { fetchApi } from "../../api/client";

type DebtStatus = "active" | "paid" | "inactive";

interface Debt {
  id: string;
  name: string;
  description: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentDays: number[];
  isActive: boolean;
  status: DebtStatus;
}

const PAYMENT_DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

function formatCurrency(value: number) {
  return new Intl.NumberFormat().format(value);
}

function statusLabel(status: DebtStatus) {
  if (status === "paid") return "Pagada";
  if (status === "inactive") return "Inactiva";
  return "Activa";
}

function statusClasses(status: DebtStatus) {
  if (status === "paid") {
    return "bg-[var(--color-secondary-container)]/15 text-[var(--color-secondary)]";
  }

  if (status === "inactive") {
    return "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]";
  }

  return "bg-[var(--color-error-container)] text-[var(--color-on-error-container)]";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

export function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [activePendingDebts, setActivePendingDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pageError, setPageError] = useState("");
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    totalAmount: "",
    isActive: true,
    paymentDays: [] as number[],
  });

  const loadDebts = async () => {
    try {
      setIsLoading(true);
      setPageError("");
      const [debtsData, activePendingData] = await Promise.all([
        fetchApi("/debts"),
        fetchApi("/debts/active-with-balance"),
      ]);
      setDebts(debtsData);
      setActivePendingDebts(activePendingData);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial data fetch for this route.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDebts();
  }, []);

  const summary = useMemo(() => {
    const pendingTotal = activePendingDebts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
    const inactiveCount = debts.filter((debt) => !debt.isActive).length;

    return {
      activeCount: activePendingDebts.length,
      pendingTotal,
      inactiveCount,
    };
  }, [activePendingDebts, debts]);

  const openModal = (debt?: Debt) => {
    if (debt) {
      setFormData({
        id: debt.id,
        name: debt.name,
        description: debt.description || "",
        totalAmount: String(debt.totalAmount),
        isActive: debt.isActive,
        paymentDays: debt.paymentDays,
      });
    } else {
      setFormData({
        id: "",
        name: "",
        description: "",
        totalAmount: "",
        isActive: true,
        paymentDays: [],
      });
    }

    setError("");
    setIsModalOpen(true);
  };

  const togglePaymentDay = (day: number) => {
    setFormData((current) => ({
      ...current,
      paymentDays: current.paymentDays.includes(day)
        ? current.paymentDays.filter((value) => value !== day)
        : [...current.paymentDays, day].sort((a, b) => a - b),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        totalAmount: Number(formData.totalAmount),
        paymentDays: formData.paymentDays,
        isActive: formData.isActive,
      };

      if (formData.id) {
        await fetchApi(`/debts/${formData.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi("/debts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      await loadDebts();
    } catch (error) {
      setError(getErrorMessage(error));
    }
  };

  const handleDeactivate = async (debt: Debt) => {
    if (!confirm(`¿Desactivar la deuda "${debt.name}"?`)) return;

    try {
      await fetchApi(`/debts/${debt.id}`, { method: "DELETE" });
      await loadDebts();
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deudas"
        description="Controla tus compromisos, días esperados de pago y saldo pendiente."
        action={
          <Button onClick={() => openModal()}>
            <Plus className="mr-2 h-4 w-4" /> Nueva deuda
          </Button>
        }
      />

      {pageError ? (
        <ErrorState
          description={pageError}
          action={<Button onClick={loadDebts}>Reintentar</Button>}
        />
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
            Activas con saldo
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-on-surface)]">
            {summary.activeCount}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
            Pendiente total
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-error)]">
            ${formatCurrency(summary.pendingTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
            Inactivas
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-on-surface)]">
            {summary.inactiveCount}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
        <div className="border-b border-[var(--color-outline-variant)] px-4 py-4">
          <h2 className="text-lg font-semibold text-[var(--color-on-surface)]">Consulta básica de deudas activas</h2>
          <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
            Resume las deudas que todavía tienen saldo por cubrir.
          </p>
        </div>

        {isLoading ? (
          <div className="px-4 py-6">
            <LoadingState title="Cargando deudas..." description="Estamos calculando saldos pendientes." />
          </div>
        ) : activePendingDebts.length === 0 ? (
          <div className="px-4 py-6 text-sm text-[var(--color-on-surface-variant)]">
            No tienes deudas activas con saldo pendiente.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-outline-variant)]">
            {activePendingDebts.map((debt) => (
              <div key={debt.id} className="flex items-center justify-between gap-4 px-4 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--color-on-surface)]">{debt.name}</p>
                  <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                    Días esperados: {debt.paymentDays.join(", ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">Pendiente</p>
                  <p className="text-base font-semibold text-[var(--color-error)]">
                    ${formatCurrency(debt.remainingAmount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
        <div className="border-b border-[var(--color-outline-variant)] px-4 py-4">
          <h2 className="text-lg font-semibold text-[var(--color-on-surface)]">Tus deudas</h2>
          <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
            Mantén visibles las activas y conserva el histórico de las desactivadas.
          </p>
        </div>

        {isLoading ? (
          <div className="px-4 py-8">
            <LoadingState title="Cargando deudas..." description="Estamos preparando el histórico de deudas." />
          </div>
        ) : debts.length === 0 ? (
          <EmptyState
            className="m-4"
            icon={<Wallet className="h-8 w-8 text-[var(--color-on-surface-variant)]" />}
            title="Todavía no has registrado deudas"
            description="Crea una deuda para poder asociar pagos desde el flujo normal de gastos."
            action={<Button onClick={() => openModal()}>Crear primera deuda</Button>}
          />
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-2">
            {debts.map((debt) => (
              <article
                key={debt.id}
                className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-[var(--color-on-surface)]">{debt.name}</h3>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClasses(debt.status)}`}>
                        {statusLabel(debt.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                      {debt.description || "Sin descripción adicional."}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openModal(debt)}
                      className="rounded-md p-2 text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
                      aria-label={`Editar ${debt.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {debt.isActive && (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(debt)}
                        className="rounded-md p-2 text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)]"
                        aria-label={`Desactivar ${debt.name}`}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[var(--color-surface-container-low)] p-3">
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
                      Total
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[var(--color-on-surface)]">
                      ${formatCurrency(debt.totalAmount)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[var(--color-surface-container-low)] p-3">
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
                      Pendiente
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[var(--color-error)]">
                      ${formatCurrency(debt.remainingAmount)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {debt.paymentDays.map((day) => (
                    <span
                      key={`${debt.id}-${day}`}
                      className="rounded-full bg-[var(--color-secondary-container)]/15 px-2.5 py-1 text-xs font-medium text-[var(--color-secondary)]"
                    >
                      Día {day}
                    </span>
                  ))}
                </div>

                <p className="mt-4 text-sm text-[var(--color-on-surface-variant)]">
                  Pagado: ${formatCurrency(debt.paidAmount)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={formData.id ? "Editar deuda" : "Nueva deuda"}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-[var(--color-error-container)] p-3 text-sm text-[var(--color-on-error-container)]">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-on-surface)]">
                Nombre
              </label>
              <Input
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-on-surface)]">
                Monto total
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.totalAmount}
                onChange={(event) => setFormData({ ...formData, totalAmount: event.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-on-surface)]">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              rows={3}
              className="w-full rounded-md border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
              placeholder="Ej. tarjeta principal o préstamo familiar"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-on-surface)]">
              Estado
            </label>
            <Select
              value={formData.isActive ? "active" : "inactive"}
              onChange={(event) => setFormData({ ...formData, isActive: event.target.value === "active" })}
            >
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
            </Select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label className="text-sm font-medium text-[var(--color-on-surface)]">
                Días esperados de pago
              </label>
              <span className="text-xs text-[var(--color-on-surface-variant)]">
                {formData.paymentDays.length} seleccionados
              </span>
            </div>
            <div className="grid grid-cols-7 gap-2 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-3">
              {PAYMENT_DAYS.map((day) => {
                const selected = formData.paymentDays.includes(day);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => togglePaymentDay(day)}
                    className={`h-9 rounded-md text-sm font-medium transition-colors ${
                      selected
                        ? "bg-[var(--color-primary-container)] text-[var(--color-on-primary)]"
                        : "bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)]"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">{formData.id ? "Guardar cambios" : "Crear deuda"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
