import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { ArrowRightLeft, Eye, Pencil, ReceiptText, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/Table";
import { fetchApi } from "../../api/client";
import { formatCurrency, formatDate } from "../../lib/formatters";
import { MovementDetailModal } from "../../components/dashboard/MovementDetailModal";
import { PaginationControls } from "../../components/dashboard/PaginationControls";
import { TransactionModal } from "../../components/ui/TransactionModal";
import { useAuth } from "../../context/AuthContext";

type MovementFilter = "all" | "expense" | "income" | "transfer" | "manual_adjustment";

interface TransactionItem {
  id: string;
  type: "income" | "expense" | "manual_adjustment";
  categoryId: string;
  description: string;
  totalAmount: number;
  occurredAt: string;
  category?: {
    id: string;
    name: string;
  } | null;
  allocations: Array<{
    accountId?: string;
    amount: number;
    account?: {
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
}

interface TransferItem {
  id: string;
  reason: string;
  amount: number;
  occurredAt: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
  sourceAccount?: {
    id: string;
    name: string;
  };
  destinationAccount?: {
    id: string;
    name: string;
  };
}

interface PaginatedResponse<T> {
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  items: T[];
}

type HistoryItem = {
  id: string;
  kind: MovementFilter;
  title: string;
  subtitle: string;
  amount: number;
  occurredAt: string;
  source: TransactionItem | TransferItem;
};

const PAGE_SIZE = 20;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

function getMovementLabel(kind: MovementFilter) {
  if (kind === "expense") return "Gasto";
  if (kind === "income") return "Ingreso";
  if (kind === "transfer") return "Transferencia";
  if (kind === "manual_adjustment") return "Ajuste";
  return "Todos";
}

function getMovementIcon(kind: MovementFilter) {
  if (kind === "expense") return TrendingDown;
  if (kind === "income") return TrendingUp;
  if (kind === "transfer") return ArrowRightLeft;
  return ReceiptText;
}

function isTransferItem(item: HistoryItem) {
  return item.kind === "transfer";
}

function serializeTransactionForModal(transaction: TransactionItem) {
  return {
    ...transaction,
    allocations: transaction.allocations.map((allocation) => ({
      accountId: allocation.accountId ?? allocation.account?.id ?? "",
      amount: allocation.amount,
    })),
  };
}

export function MovementHistoryPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<PaginatedResponse<TransactionItem> | null>(null);
  const [transfers, setTransfers] = useState<PaginatedResponse<TransferItem> | null>(null);
  const [filter, setFilter] = useState<MovementFilter>("all");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<ComponentProps<typeof MovementDetailModal>["detail"]>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionItem | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<TransferItem | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMovements = useCallback(async (targetPage = page, targetFilter = filter) => {
    setIsLoading(true);
    setError("");

    try {
      const shouldLoadTransactions = targetFilter !== "transfer";
      const shouldLoadTransfers = targetFilter === "all" || targetFilter === "transfer";
      const [transactionData, transferData] = await Promise.all([
        shouldLoadTransactions
          ? fetchApi<PaginatedResponse<TransactionItem>>(`/transactions?page=${targetPage}&pageSize=${PAGE_SIZE}`)
          : Promise.resolve(null),
        shouldLoadTransfers
          ? fetchApi<PaginatedResponse<TransferItem>>(`/transfers?page=${targetPage}&pageSize=${PAGE_SIZE}`)
          : Promise.resolve(null),
      ]);
      setTransactions(transactionData);
      setTransfers(transferData);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMovements(page, filter);
  }, [filter, loadMovements, page]);

  const items = useMemo<HistoryItem[]>(() => {
    const transactionItems = (transactions?.items ?? [])
      .filter((transaction) => filter === "all" || transaction.type === filter)
      .map((transaction) => ({
        id: transaction.id,
        kind: transaction.type,
        title: transaction.description,
        subtitle: transaction.category?.name ?? transaction.allocations[0]?.account?.name ?? "Movimiento",
        amount: Number(transaction.totalAmount),
        occurredAt: transaction.occurredAt,
        source: transaction,
      }));

    const transferItems = (transfers?.items ?? []).map((transfer) => ({
      id: transfer.id,
      kind: "transfer" as const,
      title: transfer.reason,
      subtitle: `${transfer.sourceAccount?.name ?? "Origen"} -> ${transfer.destinationAccount?.name ?? "Destino"}`,
      amount: Number(transfer.amount),
      occurredAt: transfer.occurredAt,
      source: transfer,
    }));

    return [...transactionItems, ...transferItems]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, PAGE_SIZE);
  }, [filter, transactions?.items, transfers?.items]);

  const pagination = useMemo(() => {
    if (filter === "transfer") return transfers?.pagination ?? { page, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 };
    if (filter !== "all") return transactions?.pagination ?? { page, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 };

    const totalItems = (transactions?.pagination.totalItems ?? 0) + (transfers?.pagination.totalItems ?? 0);
    return {
      page,
      pageSize: PAGE_SIZE,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / PAGE_SIZE)),
    };
  }, [filter, page, transactions?.pagination, transfers?.pagination]);

  async function openTransactionDetail(item: HistoryItem) {
    if (isTransferItem(item)) {
      return;
    }

    setLoadingDetailId(item.id);
    try {
      const data = await fetchApi(`/transactions/${item.id}`);
      setDetail(data);
      setDetailOpen(true);
    } catch (detailError) {
      setError(getErrorMessage(detailError));
    } finally {
      setLoadingDetailId("");
    }
  }

  async function handleDelete(item: HistoryItem) {
    const label = isTransferItem(item) ? "transferencia" : "movimiento";
    if (!confirm(`¿Eliminar esta ${label}?`)) return;

    try {
      await fetchApi(isTransferItem(item) ? `/transfers/${item.id}` : `/transactions/${item.id}`, {
        method: "DELETE",
      });
      await loadMovements(page, filter);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  }

  const filters: MovementFilter[] = ["all", "expense", "income", "transfer", "manual_adjustment"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimientos"
        description="Consulta, edita y elimina ingresos, gastos, ajustes y transferencias."
      />

      <div className="flex justify-center">
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setFilter(item);
                setPage(1);
              }}
              className={`cursor-pointer whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === item
                  ? "bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]"
                  : "bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]"
              }`}
            >
              {getMovementLabel(item)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingState title="Cargando movimientos..." description="Estamos organizando tus registros recientes." />
      ) : error ? (
        <ErrorState description={error} action={<Button onClick={() => void loadMovements(page, filter)}>Reintentar</Button>} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No hay movimientos para mostrar"
          description="Cuando registres ingresos, gastos o transferencias, aparecerán aquí."
        />
      ) : (
        <section className="rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Movimiento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="w-32 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const Icon = getMovementIcon(item.kind);
                const isOutflow = item.kind === "expense" || item.kind === "transfer";

                return (
                  <TableRow key={`${item.kind}-${item.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="rounded-md bg-[var(--color-surface-container)] p-2 text-[var(--color-on-surface-variant)]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--color-on-surface)]">{item.title}</p>
                          <p className="truncate text-xs text-[var(--color-on-surface-variant)]">{item.subtitle}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[var(--color-on-surface-variant)]">{getMovementLabel(item.kind)}</TableCell>
                    <TableCell className="text-[var(--color-on-surface-variant)]">{formatDate(item.occurredAt)}</TableCell>
                    <TableCell className={`text-right font-semibold ${isOutflow ? "text-[var(--color-error)]" : "text-emerald-500"}`}>
                      {isOutflow ? "-" : "+"}{formatCurrency(item.amount, user?.currencyCode ?? "COP")}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isTransferItem(item) || loadingDetailId === item.id}
                          onClick={() => void openTransactionDetail(item)}
                          aria-label="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (isTransferItem(item)) {
                              setEditingTransfer(item.source as TransferItem);
                            } else {
                              setEditingTransaction(item.source as TransactionItem);
                            }
                          }}
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-[var(--color-error)]"
                          onClick={() => void handleDelete(item)}
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <PaginationControls
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            onPageChange={setPage}
          />
        </section>
      )}

      <MovementDetailModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        detail={detail}
        currencyCode={user?.currencyCode ?? "COP"}
      />

      <TransactionModal
        isOpen={Boolean(editingTransaction)}
        onClose={() => setEditingTransaction(null)}
        onSuccess={() => {
          setEditingTransaction(null);
          void loadMovements(page, filter);
        }}
        initialType={editingTransaction?.type ?? "expense"}
        initialTransaction={editingTransaction ? serializeTransactionForModal(editingTransaction) : null}
      />

      <TransactionModal
        isOpen={Boolean(editingTransfer)}
        onClose={() => setEditingTransfer(null)}
        onSuccess={() => {
          setEditingTransfer(null);
          void loadMovements(page, filter);
        }}
        initialType="transfer"
        initialTransfer={editingTransfer}
      />
    </div>
  );
}
