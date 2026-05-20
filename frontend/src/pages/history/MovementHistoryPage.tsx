import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { ArrowRightLeft, Eye, ReceiptText, TrendingDown, TrendingUp } from "lucide-react";
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
import { useAuth } from "../../context/AuthContext";

type MovementFilter = "all" | "expense" | "income" | "transfer" | "manual_adjustment";

interface TransactionItem {
  id: string;
  type: "income" | "expense" | "manual_adjustment";
  description: string;
  totalAmount: number;
  occurredAt: string;
  category?: {
    name: string;
  } | null;
  allocations: Array<{
    account?: {
      name: string;
    };
  }>;
}

interface TransferItem {
  id: string;
  reason: string;
  amount: number;
  occurredAt: string;
  sourceAccount?: {
    name: string;
  };
  destinationAccount?: {
    name: string;
  };
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

export function MovementHistoryPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [filter, setFilter] = useState<MovementFilter>("all");
  const [detail, setDetail] = useState<ComponentProps<typeof MovementDetailModal>["detail"]>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetailId, setLoadingDetailId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMovements = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [transactionData, transferData] = await Promise.all([
        fetchApi("/transactions"),
        fetchApi("/transfers"),
      ]);
      setTransactions(transactionData);
      setTransfers(transferData);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMovements();
  }, [loadMovements]);

  const items = useMemo<HistoryItem[]>(() => {
    const transactionItems = transactions.map((transaction) => ({
      id: transaction.id,
      kind: transaction.type,
      title: transaction.description,
      subtitle: transaction.category?.name ?? transaction.allocations[0]?.account?.name ?? "Movimiento",
      amount: Number(transaction.totalAmount),
      occurredAt: transaction.occurredAt,
      source: transaction,
    }));

    const transferItems = transfers.map((transfer) => ({
      id: transfer.id,
      kind: "transfer" as const,
      title: transfer.reason,
      subtitle: `${transfer.sourceAccount?.name ?? "Origen"} → ${transfer.destinationAccount?.name ?? "Destino"}`,
      amount: Number(transfer.amount),
      occurredAt: transfer.occurredAt,
      source: transfer,
    }));

    return [...transactionItems, ...transferItems]
      .filter((item) => filter === "all" || item.kind === filter)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [filter, transactions, transfers]);

  async function openTransactionDetail(item: HistoryItem) {
    if (item.kind === "transfer") {
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

  const filters: MovementFilter[] = ["all", "expense", "income", "transfer", "manual_adjustment"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de movimientos"
        description="Consulta ingresos, gastos, ajustes y transferencias en orden cronológico."
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === item
                ? "bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]"
                : "bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]"
            }`}
          >
            {getMovementLabel(item)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState title="Cargando historial..." description="Estamos organizando tus movimientos recientes." />
      ) : error ? (
        <ErrorState description={error} action={<Button onClick={() => void loadMovements()}>Reintentar</Button>} />
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
                <TableHead className="w-20 text-right">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const Icon = getMovementIcon(item.kind);
                const isOutflow = item.kind === "expense" || item.kind === "transfer";
                const canOpenDetail = item.kind !== "transfer";

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
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={!canOpenDetail || loadingDetailId === item.id}
                        onClick={() => void openTransactionDetail(item)}
                        aria-label="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>
      )}

      <MovementDetailModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        detail={detail}
        currencyCode={user?.currencyCode ?? "COP"}
      />
    </div>
  );
}
