import { useCallback, useEffect, useState } from "react";
import { Modal } from "./Modal";
import { Input } from "./Input";
import { Select } from "./Select";
import { Button } from "./Button";
import { fetchApi } from "../../api/client";
import { FileText, Paperclip, Plus, Trash2, X } from "lucide-react";

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

interface MonthlyPlanItem {
  categoryId: string;
  categoryName: string;
  forecastAmount: number;
  actualAmount: number;
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

interface TransferRecord {
  id: string;
  reason: string;
  amount: number;
  occurredAt: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
  sourceAccount?: { id: string; name: string };
  destinationAccount?: { id: string; name: string };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialType?: "income" | "expense" | "transfer" | "manual_adjustment";
  initialTransaction?: TransactionRecord | null;
  initialTransfer?: TransferRecord | null;
}

type TransactionModalType = "expense" | "income" | "transfer" | "manual_adjustment";
type AllocationDraft = { clientId: string; accountId: string; amount: string };

const ATTACHMENT_ACCEPT = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
].join(",");
const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

function formatAccountBalance(value: number) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
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

function getCurrentMonthRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    startDate: firstDay.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  };
}

function getBudgetTone(percentage: number) {
  if (percentage <= 70) return "bg-emerald-500";
  if (percentage <= 100) return "bg-amber-500";
  return "bg-[var(--color-error)]";
}

export function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  initialType = "expense",
  initialTransaction = null,
  initialTransfer = null,
}: Props) {
  const [type, setType] = useState<TransactionModalType>(initialType);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [monthlyPlanItems, setMonthlyPlanItems] = useState<MonthlyPlanItem[]>([]);
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Transfer specific state
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const isEditing = Boolean(initialTransaction || initialTransfer);

  const resetForm = useCallback(() => {
    setCategoryId("");
    setDebtId("");
    setDescription("");
    setAmount("");
    setAccountId("");
    setAllocationRows([createAllocationDraft()]);
    setDestinationAccountId("");
    setOccurredAt(new Date().toISOString().slice(0, 10));
    setSelectedFiles([]);
    setError("");
  }, []);

  const hydrateForm = useCallback(() => {
    setType(initialTransfer ? "transfer" : initialTransaction?.type || initialType);
    resetForm();

    if (initialTransfer) {
      setDescription(initialTransfer.reason || "");
      setAmount(String(initialTransfer.amount));
      setAccountId(initialTransfer.sourceAccountId || initialTransfer.sourceAccount?.id || "");
      setDestinationAccountId(initialTransfer.destinationAccountId || initialTransfer.destinationAccount?.id || "");
      setOccurredAt(initialTransfer.occurredAt.slice(0, 10));
      return;
    }

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
  }, [initialTransaction, initialTransfer, initialType, resetForm]);

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
      if (!initialTransaction && !initialTransfer && accData.length > 0) {
        setAccountId(accData[0].id);
        setAllocationRows((currentRows) => {
          if (currentRows.length !== 1 || currentRows[0].accountId) {
            return currentRows;
          }

          return [{ ...currentRows[0], accountId: accData[0].id }];
        });
      }

      const range = getCurrentMonthRange();
      const params = new URLSearchParams(range);
      fetchApi(`/reports/overview?${params.toString()}`)
        .then((data) => setMonthlyPlanItems(data.monthlyPlan?.items ?? []))
        .catch(() => setMonthlyPlanItems([]));
    } catch (e) {
      console.error(e);
    }
  }, [initialTransaction, initialTransfer]);

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
  const selectedMonthlyPlan = type === "expense"
    ? monthlyPlanItems.find((item) => item.categoryId === categoryId)
    : null;
  const projectedCategorySpend = selectedMonthlyPlan ? selectedMonthlyPlan.actualAmount + parseAmount(amount) : 0;
  const projectedExecutionPercentage = selectedMonthlyPlan && selectedMonthlyPlan.forecastAmount > 0
    ? (projectedCategorySpend / selectedMonthlyPlan.forecastAmount) * 100
    : 0;
  const overflowPercentage = Math.max(0, projectedExecutionPercentage - 100);
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

  const updateSelectedFiles = (files: FileList | null) => {
    const nextFiles = Array.from(files ?? []);
    const oversizedFile = nextFiles.find((file) => file.size > MAX_ATTACHMENT_SIZE_BYTES);

    if (oversizedFile) {
      setError(`${oversizedFile.name} supera el límite de 50 MB.`);
      return;
    }

    setError("");
    setSelectedFiles(nextFiles);
  };

  const removeSelectedFile = (fileIndex: number) => {
    setSelectedFiles((currentFiles) => currentFiles.filter((_, index) => index !== fileIndex));
  };

  const uploadSelectedFiles = async (ownerType: "transactions" | "transfers", ownerId: string) => {
    if (selectedFiles.length === 0) {
      return;
    }

    const formData = new FormData();
    for (const file of selectedFiles) {
      formData.append("files", file);
    }

    await fetchApi(`/${ownerType}/${ownerId}/attachments`, {
      method: "POST",
      body: formData,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (type === "transfer") {
        const endpoint = initialTransfer ? `/transfers/${initialTransfer.id}` : "/transfers";
        const transfer = await fetchApi(endpoint, {
          method: initialTransfer ? "PATCH" : "POST",
          body: JSON.stringify({
            sourceAccountId: accountId,
            destinationAccountId,
            reason: description,
            amount: Number(amount),
            occurredAt: new Date(occurredAt).toISOString()
          })
        });
        await uploadSelectedFiles("transfers", initialTransfer?.id ?? transfer.id);
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

        const transaction = await fetchApi(endpoint, {
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
        await uploadSelectedFiles("transactions", initialTransaction?.id ?? transaction.id);
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
      title={isEditing ? "Editar movimiento" : "Nuevo movimiento"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-error-container text-on-error-container rounded text-sm">{error}</div>}

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {(["expense", "income", "transfer", "manual_adjustment"] as const).map((modalType) => (
            <button
              key={modalType}
              type="button"
              disabled={isEditing}
              onClick={() => { setType(modalType); resetForm(); }}
              className={`cursor-pointer px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
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

            {selectedMonthlyPlan ? (
              <div className="space-y-2 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-3">
                <div className="flex items-start justify-between gap-3 text-xs text-[var(--color-on-surface-variant)]">
                  <span>
                    Forecast mensual: <strong className="text-[var(--color-on-surface)]">${formatAccountBalance(selectedMonthlyPlan.forecastAmount)}</strong>
                  </span>
                  <span>
                    Proyectado: <strong className="text-[var(--color-on-surface)]">${formatAccountBalance(projectedCategorySpend)}</strong>
                  </span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
                  <div
                    className={`h-full rounded-full transition-all ${projectedExecutionPercentage > 100 ? "bg-amber-500" : getBudgetTone(projectedExecutionPercentage)}`}
                    style={{ width: `${Math.min(projectedExecutionPercentage, 100)}%` }}
                  />
                  {projectedExecutionPercentage > 100 ? (
                    <div
                      className="absolute right-0 top-0 h-full bg-[var(--color-error)]"
                      style={{ width: `${Math.min(overflowPercentage, 100)}%` }}
                    />
                  ) : null}
                </div>
                <p className={`text-xs font-medium ${projectedExecutionPercentage > 100 ? "text-[var(--color-error)]" : "text-[var(--color-on-surface-variant)]"}`}>
                  {selectedMonthlyPlan.forecastAmount <= 0
                    ? "Esta categoría no tiene forecast mensual configurado."
                    : `${projectedExecutionPercentage.toFixed(0)}% del forecast mensual con este movimiento.`}
                </p>
              </div>
            ) : categoryId ? (
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                Esta categoría todavía no tiene forecast configurado en el planner mensual.
              </p>
            ) : null}

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

        <div className="space-y-3 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-on-surface)]">
                <Paperclip className="h-4 w-4" />
                Comprobantes
              </div>
              <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                PDF, Word, Excel o imágenes. Máximo 50 MB por archivo.
              </p>
            </div>
            <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-[var(--color-outline-variant)] px-3 text-sm font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]">
              Adjuntar
              <input
                type="file"
                multiple
                accept={ATTACHMENT_ACCEPT}
                className="sr-only"
                onChange={(event) => updateSelectedFiles(event.target.files)}
              />
            </label>
          </div>

          {selectedFiles.length > 0 ? (
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${file.lastModified}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-[var(--color-on-surface-variant)]" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--color-on-surface)]">{file.name}</p>
                      <p className="text-xs text-[var(--color-on-surface-variant)]">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSelectedFile(index)}
                    aria-label="Quitar comprobante"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

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
