import { Download, FileText, ReceiptText, Tag, Wallet } from "lucide-react";
import { Modal } from "../ui/Modal";
import { formatCurrency, formatDate } from "../../lib/formatters";
import { API_URL } from "../../api/client";

interface MovementDetail {
  id: string;
  type: "income" | "expense" | "manual_adjustment";
  description: string;
  notes?: string | null;
  totalAmount: number;
  occurredAt: string;
  category?: {
    id: string;
    name: string;
  } | null;
  allocations: Array<{
    id: string;
    amount: number;
    direction: "in" | "out";
    account: {
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
  attachments?: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  }>;
}

interface MovementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  detail: MovementDetail | null;
  currencyCode: string;
}

const TYPE_LABELS: Record<MovementDetail["type"], string> = {
  income: "Ingreso",
  expense: "Gasto",
  manual_adjustment: "Ajuste manual",
};

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function MovementDetailModal({
  isOpen,
  onClose,
  detail,
  currencyCode,
}: MovementDetailModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle del movimiento" className="max-w-xl">
      {!detail ? null : (
        <div className="space-y-5">
          <div className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
              {TYPE_LABELS[detail.type]}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--color-on-surface)]">
              {detail.description}
            </h3>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-on-surface)]">
              {formatCurrency(detail.totalAmount, currencyCode)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-on-surface)]">
                <Tag className="h-4 w-4" />
                Categoría
              </div>
              <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                {detail.category?.name ?? "Sin categoría visible"}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-on-surface)]">
                <ReceiptText className="h-4 w-4" />
                Fecha
              </div>
              <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                {formatDate(detail.occurredAt)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]">
            <div className="border-b border-[var(--color-outline-variant)] px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-on-surface)]">
                <Wallet className="h-4 w-4" />
                Cuentas afectadas
              </div>
            </div>
            <div className="divide-y divide-[var(--color-outline-variant)]">
              {detail.allocations.map((allocation) => (
                <div key={allocation.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-medium text-[var(--color-on-surface)]">{allocation.account.name}</p>
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
                      {allocation.direction === "in" ? "Entrada" : "Salida"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-on-surface)]">
                    {formatCurrency(allocation.amount, currencyCode)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {detail.debtPayments?.[0]?.debt?.name ? (
            <div className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-error-container)]/40 p-4">
              <p className="text-sm font-medium text-[var(--color-on-surface)]">Pago asociado a deuda</p>
              <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                {detail.debtPayments[0].debt?.name}
              </p>
            </div>
          ) : null}

          {detail.notes ? (
            <div className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-4">
              <p className="text-sm font-medium text-[var(--color-on-surface)]">Notas</p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-on-surface-variant)]">{detail.notes}</p>
            </div>
          ) : null}

          {detail.attachments?.length ? (
            <div className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)]">
              <div className="border-b border-[var(--color-outline-variant)] px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-on-surface)]">
                  <FileText className="h-4 w-4" />
                  Comprobantes
                </div>
              </div>
              <div className="divide-y divide-[var(--color-outline-variant)]">
                {detail.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={`${API_URL}/attachments/${attachment.id}/download`}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-[var(--color-surface-container-high)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--color-on-surface)]">{attachment.originalName}</p>
                      <p className="text-xs text-[var(--color-on-surface-variant)]">{formatFileSize(attachment.sizeBytes)}</p>
                    </div>
                    <Download className="h-4 w-4 shrink-0 text-[var(--color-on-surface-variant)]" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
