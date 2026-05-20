import { useCallback, useEffect, useState } from "react";
import { Modal } from "./Modal";
import { Input } from "./Input";
import { Select } from "./Select";
import { Button } from "./Button";
import { fetchApi } from "../../api/client";
import { Plus, Trash2 } from "lucide-react";

interface Account {
  id: string;
  name: string;
  expectedBalance: number;
}

interface Category {
  id: string;
  name: string;
  type: string;
  systemKey?: string | null;
}

interface Debt {
  id: string;
  name: string;
  remainingAmount: number;
  isActive: boolean;
  status: "active" | "paid" | "inactive";
}

interface TransactionRecord {
  id: string;
  type: "income" | "expense" | "manual_adjustment";
  categoryId: string;
  description: string;
  totalAmount: number;
  occurredAt: string;
  allocations: { accountId: string; amount: number }[];
  debtPayments?: { debt?: { id: string } | null }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialType?: "income" | "expense" | "transfer" | "manual_adjustment";
  initialTransaction?: TransactionRecord | null;
}

type TransactionModalType = "expense" | "income" | "transfer" | "manual_adjustment";
type AllocationDraft = { clientId: string; accountId: string; amount: string };

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

function formatAccountBalance(value: number) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
  }).format(value);
}

function getAccountOptionLabel(account: Account) {
  return `${account.name} ($${formatAccountBalance(account.expectedBalance)})`;
}

function createAllocationDraft(accountId = "", amount = ""): AllocationDraft {
  return {
    clientId: `${Date.now()}-${Math.random()}`,
    accountId,
    amount,
  };
}

function parseAmount(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  initialType = "expense",
  initialTransaction = null,
}: Props) {
  const [type, setType] = useState<TransactionModalType>(initialType);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Transaction form state
  const [categoryId, setCategoryId] = useState("");
  const [debtId, setDebtId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [allocationRows, setAllocationRows] = useState<AllocationDraft[]>([createAllocationDraft()]);
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 10));

  // Transfer specific state
  const [destinationAccountId, setDestinationAccountId] = useState("");

  const resetForm = useCallback(() => {
    setCategoryId("");
    setDebtId("");
    setDescription("");
    setAmount("");
    setAccountId("");
    setAllocationRows([createAllocationDraft()]);
    setDestinationAccountId("");
    setOccurredAt(new Date().toISOString().slice(0, 10));
    setError("");
  }, []);

  const hydrateForm = useCallback(() => {
    setType(initialTransaction?.type || initialType);
    resetForm();

    if (initialTransaction) {
      setCategoryId(initialTransaction.categoryId || "");
      setDebtId(initialTransaction.debtPayments?.[0]?.debt?.id || "");
      setDescription(initialTransaction.description || "");
      setAmount(String(initialTransaction.totalAmount));
      setAccountId(initialTransaction.allocations?.[0]?.accountId || "");
      setAllocationRows(
        initialTransaction.allocations?.length
          ? initialTransaction.allocations.map((allocation) =>
              createAllocationDraft(allocation.accountId, String(allocation.amount)),
            )
          : [createAllocationDraft()],
      );
      setOccurredAt(initialTransaction.occurredAt.slice(0, 10));
    }
  }, [initialTransaction, initialType, resetForm]);

  const loadData = useCallback(async () => {
    try {
      const [accData, catData, debtData] = await Promise.all([
        fetchApi("/accounts"),
        fetchApi("/categories"),
        fetchApi("/debts"),
      ]);
      setAccounts(accData);
      setCategories(catData);
      setDebts(debtData);
      if (!initialTransaction && accData.length > 0) {
        setAccountId(accData[0].id);
        setAllocationRows((currentRows) => {
          if (currentRows.length !== 1 || currentRows[0].accountId) {
            return currentRows;
          }

          return [{ ...currentRows[0], accountId: accData[0].id }];
        });
      }
    } catch (e) {
      console.error(e);
    }
  }, [initialTransaction]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    hydrateForm();
    void loadData();
  }, [hydrateForm, isOpen, loadData]);

  const debtCategory = categories.find((category) => category.systemKey === "DEBT");
  const isDebtExpense = type === "expense" && categoryId === debtCategory?.id;
  const selectedDebt = debts.find((debt) => debt.id === debtId);
  const supportsMultipleAllocations = type === "income" || type === "expense";
  const assignedAmount = allocationRows.reduce((sum, row) => sum + parseAmount(row.amount), 0);
  const remainingAmount = parseAmount(amount) - assignedAmount;

  const availableDebts = debts.filter((debt) => {
    if (debt.id === debtId) return true;
    return debt.isActive && debt.remainingAmount > 0;
  });

  const updateAmount = (nextAmount: string) => {
    setAmount(nextAmount);
    if (supportsMultipleAllocations && allocationRows.length === 1) {
      setAllocationRows((currentRows) => [{ ...currentRows[0], amount: nextAmount }]);
    }
  };

  const updateAllocation = (clientId: string, changes: Partial<AllocationDraft>) => {
    setAllocationRows((currentRows) =>
      currentRows.map((row) => (row.clientId === clientId ? { ...row, ...changes } : row)),
    );
  };

  const addAllocation = () => {
    setAllocationRows((currentRows) => [...currentRows, createAllocationDraft()]);
  };

  const removeAllocation = (clientId: string) => {
    setAllocationRows((currentRows) => {
      if (currentRows.length === 1) {
        return currentRows;
      }

      return currentRows.filter((row) => row.clientId !== clientId);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (type === "transfer") {
        await fetchApi("/transfers", {
          method: "POST",
          body: JSON.stringify({
            sourceAccountId: accountId,
            destinationAccountId,
            reason: description,
            amount: Number(amount),
            occurredAt: new Date(occurredAt).toISOString()
          })
        });
      } else {
        const endpoint = initialTransaction ? `/transactions/${initialTransaction.id}` : "/transactions";
        const allocations = supportsMultipleAllocations
          ? allocationRows.map((row) => ({
              accountId: row.accountId,
              amount: Number(row.amount),
            }))
          : [{
              accountId,
              amount: Number(amount),
              direction: type === 'manual_adjustment' ? (Number(amount) >= 0 ? 'in' : 'out') : undefined,
            }];

        await fetchApi(endpoint, {
          method: initialTransaction ? "PATCH" : "POST",
          body: JSON.stringify({
            type,
            categoryId: type === "manual_adjustment" ? undefined : categoryId,
            description,
            totalAmount: Number(amount),
            debtId: isDebtExpense ? debtId : undefined,
            occurredAt: new Date(occurredAt).toISOString(),
            allocations,
          })
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => type === 'expense' ? c.type === 'expense' : c.type === 'income');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTransaction ? "Editar movimiento" : "Nuevo movimiento"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-error-container text-on-error-container rounded text-sm">{error}</div>}

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {(["expense", "income", "transfer", "manual_adjustment"] as const).map((modalType) => (
            <button
              key={modalType}
              type="button"
              onClick={() => { setType(modalType); resetForm(); }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                type === modalType 
                  ? "bg-primary text-on-primary" 
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {modalType === "expense" ? "Gasto" : modalType === "income" ? "Ingreso" : modalType === "transfer" ? "Transferencia" : "Ajuste Manual"}
            </button>
          ))}
        </div>

        <Input 
          label={type === "transfer" ? "Motivo" : "Descripción"} 
          value={description} 
          onChange={e => setDescription(e.target.value)} 
          required 
        />

        <Input 
          label="Monto" 
          type="number" 
          step="0.01"
          value={amount} 
          onChange={e => updateAmount(e.target.value)} 
          required 
        />

        <Input 
          label="Fecha" 
          type="date"
          value={occurredAt} 
          onChange={e => setOccurredAt(e.target.value)} 
          required 
        />

        {supportsMultipleAllocations && (
          <div className="space-y-3 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-on-surface)]">Distribución por cuentas</h3>
                <p className="text-xs text-[var(--color-on-surface-variant)]">
                  El total asignado debe coincidir con el monto del movimiento.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addAllocation}>
                <Plus className="mr-2 h-4 w-4" /> Cuenta
              </Button>
            </div>

            <div className="space-y-3">
              {allocationRows.map((row, index) => (
                <div key={row.clientId} className="grid gap-2 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-3 sm:grid-cols-[1fr_140px_auto]">
                  <Select
                    label={`Cuenta ${index + 1}`}
                    value={row.accountId}
                    onChange={(event) => updateAllocation(row.clientId, { accountId: event.target.value })}
                    required
                  >
                    <option value="">Seleccione una cuenta</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{getAccountOptionLabel(acc)}</option>
                    ))}
                  </Select>

                  <Input
                    label="Monto"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={row.amount}
                    onChange={(event) => updateAllocation(row.clientId, { amount: event.target.value })}
                    required
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAllocation(row.clientId)}
                    disabled={allocationRows.length === 1}
                    aria-label="Quitar cuenta"
                    className="self-end text-[var(--color-error)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-between gap-2 text-xs text-[var(--color-on-surface-variant)]">
              <span>Asignado: ${formatAccountBalance(assignedAmount)}</span>
              <span className={Math.abs(remainingAmount) < 0.01 ? "text-emerald-400" : "text-[var(--color-error)]"}>
                Diferencia: ${formatAccountBalance(remainingAmount)}
              </span>
            </div>
          </div>
        )}

        {type !== "transfer" && !supportsMultipleAllocations && (
          <Select 
            label="Cuenta" 
            value={accountId} 
            onChange={e => setAccountId(e.target.value)}
            required
          >
            <option value="">Seleccione una cuenta</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{getAccountOptionLabel(acc)}</option>
            ))}
          </Select>
        )}

        {type === "transfer" && (
          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Cuenta Origen" 
              value={accountId} 
              onChange={e => setAccountId(e.target.value)}
              required
            >
              <option value="">Seleccione origen</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{getAccountOptionLabel(acc)}</option>
              ))}
            </Select>
            <Select 
              label="Cuenta Destino" 
              value={destinationAccountId} 
              onChange={e => setDestinationAccountId(e.target.value)}
              required
            >
              <option value="">Seleccione destino</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{getAccountOptionLabel(acc)}</option>
              ))}
            </Select>
          </div>
        )}

        {type !== "transfer" && type !== "manual_adjustment" && (
          <>
            <Select 
              label="Categoría" 
              value={categoryId} 
              onChange={e => {
                setCategoryId(e.target.value);
                setDebtId("");
              }}
              required
            >
              <option value="">Seleccione una categoría</option>
              {filteredCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </Select>

            {isDebtExpense && (
              <div className="space-y-2 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-3">
                <Select
                  label="Deuda asociada"
                  value={debtId}
                  onChange={(event) => setDebtId(event.target.value)}
                  required
                >
                  <option value="">Seleccione una deuda</option>
                  {availableDebts.map((debt) => (
                    <option key={debt.id} value={debt.id}>
                      {debt.name} • Pendiente ${new Intl.NumberFormat().format(debt.remainingAmount)}
                    </option>
                  ))}
                </Select>

                {selectedDebt ? (
                  <p className="text-xs text-[var(--color-on-surface-variant)]">
                    Pendiente actual: <span className="font-medium text-[var(--color-error)]">
                      ${new Intl.NumberFormat().format(selectedDebt.remainingAmount)}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-[var(--color-on-surface-variant)]">
                    Solo se muestran deudas activas con saldo pendiente. Si editas un pago existente, también verás su deuda vinculada.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex justify-end pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="mr-2">Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
