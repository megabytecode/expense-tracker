import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, HardDrive, Shield, SlidersHorizontal, Trash2, UserRoundX, Users } from "lucide-react";
import { fetchApi } from "../../api/client";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/Table";
import { PaginationControls } from "../../components/dashboard/PaginationControls";

type AdminSegment = "all" | "admins" | "risk";

type AdminSummary = {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  nearStorageLimitUsers: number;
  totalStorageUsedBytes: number;
  totalStorageLimitBytes: number;
};

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  currencyCode: string;
  isActive: boolean;
  storageLimitBytes: number;
  storageUsedBytes: number;
  maxAttachmentsPerMovement: number;
  storageUsageRatio: number;
  isNearStorageLimit: boolean;
  createdAt: string;
  updatedAt: string;
};

type AdminResponse = {
  summary: AdminSummary;
  users: AdminUser[];
};

type LimitFormState = {
  userId: string;
  email: string;
  storageLimitGb: string;
  maxAttachmentsPerMovement: string;
};

const BYTES_PER_GB = 1024 * 1024 * 1024;
const PAGE_SIZE = 20;

function formatBytesCompact(bytes: number) {
  if (bytes >= BYTES_PER_GB) {
    return `${(bytes / BYTES_PER_GB).toFixed(1)} GB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function getRoleBadgeClasses(role: AdminUser["role"]) {
  return role === "admin"
    ? "bg-[var(--color-primary-container)] text-[var(--color-on-primary)]"
    : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]";
}

function getStatusBadgeClasses(isActive: boolean) {
  return isActive
    ? "bg-emerald-100 text-emerald-700"
    : "bg-[var(--color-error-container)] text-[var(--color-on-error-container)]";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

export function AdminPage() {
  const [segment, setSegment] = useState<AdminSegment>("all");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<AdminResponse | null>(null);
  const [userPage, setUserPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [limitForm, setLimitForm] = useState<LimitFormState>({
    userId: "",
    email: "",
    storageLimitGb: "1",
    maxAttachmentsPerMovement: "5",
  });

  const loadUsers = useCallback(async (nextSearch = search) => {
    try {
      setIsLoading(true);
      setError("");

      const params = new URLSearchParams({
        segment,
      });

      const trimmedSearch = nextSearch.trim();
      if (trimmedSearch) {
        params.set("search", trimmedSearch);
      }

      const response = await fetchApi(`/admin/users?${params.toString()}`);
      setData(response);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [search, segment]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUsers();
  }, [loadUsers]);

  const summaryCards = useMemo(() => {
    if (!data) {
      return [];
    }

    const usageRatio = data.summary.totalStorageLimitBytes <= 0
      ? 0
      : data.summary.totalStorageUsedBytes / data.summary.totalStorageLimitBytes;

    return [
      {
        label: "Usuarios totales",
        value: String(data.summary.totalUsers),
        hint: `${data.summary.activeUsers} activos`,
        icon: Users,
      },
      {
        label: "Almacenamiento global",
        value: formatBytesCompact(data.summary.totalStorageUsedBytes),
        hint: `${formatPercent(usageRatio)} del total asignado`,
        icon: HardDrive,
      },
      {
        label: "Alertas de límite",
        value: String(data.summary.nearStorageLimitUsers),
        hint: "Usuarios por encima del 90%",
        icon: AlertTriangle,
      },
    ];
  }, [data]);

  const userTotalPages = data ? Math.max(1, Math.ceil(data.users.length / PAGE_SIZE)) : 1;
  const visibleUserPage = Math.min(userPage, userTotalPages);
  const visibleUsers = (data?.users ?? []).slice(
    (visibleUserPage - 1) * PAGE_SIZE,
    visibleUserPage * PAGE_SIZE,
  );

  function openLimitModal(user: AdminUser) {
    setLimitForm({
      userId: user.id,
      email: user.email,
      storageLimitGb: (user.storageLimitBytes / BYTES_PER_GB).toFixed(2).replace(/\.00$/, ""),
      maxAttachmentsPerMovement: String(user.maxAttachmentsPerMovement),
    });
    setMessage({ type: "", text: "" });
    setIsLimitModalOpen(true);
  }

  async function handleDeactivate(user: AdminUser) {
    if (!confirm(`¿Desactivar a ${user.email}? Esto cerrará sus sesiones activas.`)) {
      return;
    }

    try {
      setMessage({ type: "", text: "" });
      await fetchApi(`/admin/users/${user.id}/deactivate`, {
        method: "PATCH",
      });
      setMessage({ type: "success", text: `Usuario ${user.email} desactivado correctamente.` });
      await loadUsers();
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    }
  }

  async function handleDelete(user: AdminUser) {
    if (!confirm(`¿Eliminar a ${user.email}? La política segura conservará el histórico y anonimizará la cuenta.`)) {
      return;
    }

    try {
      setMessage({ type: "", text: "" });
      await fetchApi(`/admin/users/${user.id}`, {
        method: "DELETE",
      });
      setMessage({ type: "success", text: `Usuario ${user.email} eliminado con política segura.` });
      await loadUsers();
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    }
  }

  async function handleSaveLimits(event: React.FormEvent) {
    event.preventDefault();

    const storageLimitGb = Number(limitForm.storageLimitGb);
    const maxAttachmentsPerMovement = Number(limitForm.maxAttachmentsPerMovement);

    if (!Number.isFinite(storageLimitGb) || storageLimitGb <= 0) {
      setMessage({ type: "error", text: "El límite de almacenamiento debe ser mayor que cero." });
      return;
    }

    if (!Number.isInteger(maxAttachmentsPerMovement) || maxAttachmentsPerMovement <= 0) {
      setMessage({ type: "error", text: "El máximo de adjuntos debe ser un entero positivo." });
      return;
    }

    try {
      setIsSaving(true);
      setMessage({ type: "", text: "" });

      await fetchApi(`/admin/users/${limitForm.userId}/limits`, {
        method: "PATCH",
        body: JSON.stringify({
          storageLimitBytes: Math.round(storageLimitGb * BYTES_PER_GB),
          maxAttachmentsPerMovement,
        }),
      });

      setMessage({ type: "success", text: `Límites actualizados para ${limitForm.email}.` });
      setIsLimitModalOpen(false);
      await loadUsers();
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel administrativo"
        description="Gestiona usuarios, cuotas y límites operativos sin exponer datos financieros privados."
      />

      {message.text ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          message.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-[var(--color-error-container)] bg-[var(--color-error-container)] text-[var(--color-on-error-container)]"
        }`}>
          {message.text}
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        {summaryCards.map((card) => (
          <article
            key={card.label}
            className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">
                  {card.label}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-on-surface)]">
                  {card.value}
                </p>
                <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">{card.hint}</p>
              </div>
              <div className="rounded-full bg-[var(--color-surface-container)] p-2 text-[var(--color-secondary)]">
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[var(--color-on-surface)]">Directorio de usuarios</h2>
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              Solo muestra rol, estado y límites administrativos por usuario.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setUserPage(1);
                loadUsers();
              }}
            >
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por email o nombre"
              />
              <Button type="submit" variant="outline" size="sm">Buscar</Button>
            </form>

            <div className="flex gap-2 overflow-x-auto pb-1">
              <Button
                variant={segment === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setUserPage(1);
                  setSegment("all");
                }}
              >
                <Users className="mr-2 h-4 w-4" />
                Todos
              </Button>
              <Button
                variant={segment === "admins" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setUserPage(1);
                  setSegment("admins");
                }}
              >
                <Shield className="mr-2 h-4 w-4" />
                Admins
              </Button>
              <Button
                variant={segment === "risk" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setUserPage(1);
                  setSegment("risk");
                }}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                En riesgo
              </Button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl bg-[var(--color-error-container)] px-4 py-3 text-sm text-[var(--color-on-error-container)]">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="py-10 text-sm text-[var(--color-on-surface-variant)]">Cargando usuarios...</div>
        ) : !data || data.users.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--color-on-surface-variant)]">
            No hay usuarios para este filtro.
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-4 md:hidden">
              {visibleUsers.map((user) => (
                <article
                  key={user.id}
                  className="rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[var(--color-on-surface)]">{user.email}</p>
                      <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{user.name || "Sin nombre"}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${getRoleBadgeClasses(user.role)}`}>
                        {user.role}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${getStatusBadgeClasses(user.isActive)}`}>
                        {user.isActive ? "activo" : "inactivo"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-[var(--color-on-surface-variant)]">
                        <span>Almacenamiento usado</span>
                        <span>{formatBytesCompact(user.storageUsedBytes)} / {formatBytesCompact(user.storageLimitBytes)}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-surface-container)]">
                        <div
                          className={`h-full rounded-full ${user.isNearStorageLimit ? "bg-[var(--color-error)]" : "bg-[var(--color-secondary)]"}`}
                          style={{ width: `${Math.min(user.storageUsageRatio * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--color-on-surface-variant)]">Máx. adjuntos</span>
                      <span className="font-medium text-[var(--color-on-surface)]">{user.maxAttachmentsPerMovement}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openLimitModal(user)}>
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      Límites
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeactivate(user)} disabled={!user.isActive}>
                      <UserRoundX className="mr-2 h-4 w-4" />
                      Desactivar
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(user)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-4 hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Almacenamiento</TableHead>
                    <TableHead>Adjuntos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-[var(--color-on-surface)]">{user.email}</p>
                          <p className="text-xs text-[var(--color-on-surface-variant)]">{user.name || "Sin nombre"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${getRoleBadgeClasses(user.role)}`}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${getStatusBadgeClasses(user.isActive)}`}>
                          {user.isActive ? "activo" : "inactivo"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-48">
                          <div className="flex items-center justify-between text-xs text-[var(--color-on-surface-variant)]">
                            <span>{formatBytesCompact(user.storageUsedBytes)}</span>
                            <span>{formatBytesCompact(user.storageLimitBytes)}</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-surface-container)]">
                            <div
                              className={`h-full rounded-full ${user.isNearStorageLimit ? "bg-[var(--color-error)]" : "bg-[var(--color-secondary)]"}`}
                              style={{ width: `${Math.min(user.storageUsageRatio * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.maxAttachmentsPerMovement}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openLimitModal(user)}>
                            Límites
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeactivate(user)} disabled={!user.isActive}>
                            Desactivar
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(user)}>
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationControls
              page={visibleUserPage}
              totalPages={userTotalPages}
              totalItems={data.users.length}
              onPageChange={setUserPage}
            />
          </>
        )}
      </section>

      <Modal isOpen={isLimitModalOpen} onClose={() => setIsLimitModalOpen(false)} title="Editar límites del usuario">
        <form onSubmit={handleSaveLimits} className="space-y-4">
          <div className="rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm text-[var(--color-on-surface-variant)]">
            Ajustando límites para <span className="font-medium text-[var(--color-on-surface)]">{limitForm.email}</span>.
          </div>

          <Input
            label="Límite de almacenamiento (GB)"
            type="number"
            step="0.1"
            min="0.1"
            value={limitForm.storageLimitGb}
            onChange={(event) => setLimitForm((current) => ({ ...current, storageLimitGb: event.target.value }))}
            required
          />

          <Input
            label="Máximo de adjuntos por movimiento"
            type="number"
            min="1"
            max="50"
            value={limitForm.maxAttachmentsPerMovement}
            onChange={(event) => setLimitForm((current) => ({ ...current, maxAttachmentsPerMovement: event.target.value }))}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsLimitModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar límites"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
