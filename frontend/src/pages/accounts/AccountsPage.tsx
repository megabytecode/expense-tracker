import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { fetchApi } from "../../api/client";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/EmptyState";
import { formatCurrency } from "../../lib/formatters";
import { useAuth } from "../../context/AuthContext";

interface Account {
  id: string;
  name: string;
  type: "savings" | "cash";
  initialBalance: number;
  expectedBalance: number;
}

export function AccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  
  const [formData, setFormData] = useState<{ id: string; name: string; type: "cash" | "savings"; initialBalance: number }>({
    id: "",
    name: "",
    type: "cash",
    initialBalance: 0,
  });

  const getErrorMessage = (error: unknown) => {
    return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
  };

  const loadAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setPageError("");
      const data = await fetchApi("/accounts");
      setAccounts(data);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial data fetch for this route.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAccounts();
  }, [loadAccounts]);

  const openModal = (acc?: Account) => {
    if (acc) {
      setFormData({ id: acc.id, name: acc.name, type: acc.type, initialBalance: acc.initialBalance });
    } else {
      setFormData({ id: "", name: "", type: "cash", initialBalance: 0 });
    }
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      if (formData.id) {
        await fetchApi(`/accounts/${formData.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: formData.name, type: formData.type }),
        });
      } else {
        await fetchApi("/accounts", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      setIsModalOpen(false);
      loadAccounts();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("¿Desactivar esta cuenta?")) return;
    try {
      await fetchApi(`/accounts/${id}`, { method: "DELETE" });
      loadAccounts();
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  const totalExpectedBalance = accounts.reduce((sum, account) => sum + account.expectedBalance, 0);
  const totalSavingsBalance = accounts
    .filter((account) => account.type === "savings")
    .reduce((sum, account) => sum + account.expectedBalance, 0);
  const currencyCode = user?.currencyCode ?? "COP";

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Cuentas" 
        description="Administra tus cuentas bancarias y efectivo."
        action={
          <Button onClick={() => openModal()}>
            <Plus className="mr-2 h-4 w-4" /> Nueva Cuenta
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState title="Cargando cuentas..." description="Estamos calculando tus saldos esperados." />
      ) : pageError ? (
        <ErrorState
          description={pageError}
          action={<Button onClick={loadAccounts}>Reintentar</Button>}
        />
      ) : accounts.length === 0 ? (
        <EmptyState
          title="No tienes cuentas configuradas"
          description="Crea una cuenta de dinero disponible o ahorro para empezar a registrar movimientos."
          action={<Button onClick={() => openModal()}>Crear tu primera cuenta</Button>}
        />
      ) : (
        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-4 shadow-sm">
              <p className="text-sm text-on-surface-variant">Dinero esperado en todas las cuentas</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-on-surface">
                {formatCurrency(totalExpectedBalance, currencyCode)}
              </p>
            </article>
            <article className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-4 shadow-sm">
              <p className="text-sm text-on-surface-variant">Dinero en cuentas de ahorro</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-emerald-400">
                {formatCurrency(totalSavingsBalance, currencyCode)}
              </p>
            </article>
          </section>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map(acc => (
              <div key={acc.id} className="p-4 bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)] rounded-lg shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg text-on-surface">{acc.name}</h3>
                    <p className="text-sm text-on-surface-variant">
                      {acc.type === "savings" ? "Ahorro" : "Dinero disponible"}
                    </p>
                  </div>
                  <div className="flex space-x-1">
                    <button onClick={() => openModal(acc)} className="cursor-pointer p-1 text-on-surface-variant hover:text-primary">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeactivate(acc.id)} className="cursor-pointer p-1 text-error hover:text-on-error-container">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-on-surface-variant">Saldo esperado</p>
                  <p className="text-2xl font-bold font-['Inter'] tracking-tight">
                    {formatCurrency(acc.expectedBalance, currencyCode)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={formData.id ? "Editar Cuenta" : "Nueva Cuenta"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <div role="alert" className="p-3 bg-error-container text-on-error-container rounded text-sm">{formError}</div>}
          
          <Input 
            label="Nombre de la cuenta" 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })} 
            required 
          />
          
          <Select 
            label="Tipo de cuenta" 
            value={formData.type} 
            onChange={e => setFormData({ ...formData, type: e.target.value as "cash" | "savings" })}
          >
            <option value="cash">Dinero disponible (Efectivo, Corriente)</option>
            <option value="savings">Cuenta de ahorro</option>
          </Select>

          {!formData.id && (
            <Input 
              label="Saldo inicial" 
              type="number" 
              step="0.01"
              value={formData.initialBalance} 
              onChange={e => setFormData({ ...formData, initialBalance: Number(e.target.value) })} 
              required 
            />
          )}

          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="mr-2">Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
