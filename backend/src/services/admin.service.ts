import { prisma } from '../lib/prisma.js';
import { AuditService } from './audit.service.js';

const STORAGE_ALERT_THRESHOLD = 0.9;
const MAX_ATTACHMENTS_LIMIT = 50;

type UserListFilters = {
  search?: string;
  role?: 'admin' | 'user';
  segment?: 'all' | 'admins' | 'risk';
};

type ManagedUserRecord = {
  id: string;
  email: string;
  name: string;
  role: string;
  currencyCode: string;
  isActive: boolean;
  deletedAt: Date | null;
  storageLimitBytes: bigint;
  storageUsedBytes: bigint;
  maxAttachmentsPerMovement: number;
  createdAt: Date;
  updatedAt: Date;
};

function bigintToNumber(value: bigint) {
  return Number(value);
}

function sanitizeSearch(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export class AdminService {
  private static serializeManagedUser(user: ManagedUserRecord) {
    const storageLimitBytes = bigintToNumber(user.storageLimitBytes);
    const storageUsedBytes = bigintToNumber(user.storageUsedBytes);
    const storageUsageRatio = storageLimitBytes <= 0
      ? 0
      : Number((storageUsedBytes / storageLimitBytes).toFixed(4));

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      currencyCode: user.currencyCode,
      isActive: user.isActive,
      deletedAt: user.deletedAt,
      storageLimitBytes,
      storageUsedBytes,
      maxAttachmentsPerMovement: user.maxAttachmentsPerMovement,
      storageUsageRatio,
      isNearStorageLimit: storageUsageRatio >= STORAGE_ALERT_THRESHOLD,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private static async getManagedUserOrThrow(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        currencyCode: true,
        isActive: true,
        deletedAt: true,
        storageLimitBytes: true,
        storageUsedBytes: true,
        maxAttachmentsPerMovement: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new Error('Usuario no encontrado.');
    }

    return user satisfies ManagedUserRecord;
  }

  private static async ensureTargetIsMutable(actorUserId: string, targetUser: ManagedUserRecord) {
    if (actorUserId === targetUser.id) {
      throw new Error('No puedes aplicarte esta acción administrativa a ti mismo.');
    }

    if (targetUser.role === 'admin') {
      const activeAdmins = await prisma.user.count({
        where: {
          role: 'admin',
          isActive: true,
          deletedAt: null,
        },
      });

      if (targetUser.isActive && activeAdmins <= 1) {
        throw new Error('No puedes desactivar o eliminar al último administrador activo.');
      }
    }
  }

  private static buildDeletedIdentity(targetUserId: string) {
    return {
      email: `deleted-${targetUserId}@deleted.local`,
      name: `Deleted user ${targetUserId.slice(0, 8)}`,
    };
  }

  static async listUsers(filters: UserListFilters = {}) {
    const search = sanitizeSearch(filters.search);
    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (filters.role === 'admin' || filters.role === 'user') {
      where.role = filters.role;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        currencyCode: true,
        isActive: true,
        deletedAt: true,
        storageLimitBytes: true,
        storageUsedBytes: true,
        maxAttachmentsPerMovement: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { role: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const serializedUsers = users.map((user) => this.serializeManagedUser(user as ManagedUserRecord));
    const segment = filters.segment ?? 'all';
    const filteredUsers = serializedUsers.filter((user) => {
      if (segment === 'admins') {
        return user.role === 'admin';
      }

      if (segment === 'risk') {
        return user.isNearStorageLimit;
      }

      return true;
    });

    const totalStorageUsedBytes = serializedUsers.reduce((sum, user) => sum + user.storageUsedBytes, 0);
    const totalStorageLimitBytes = serializedUsers.reduce((sum, user) => sum + user.storageLimitBytes, 0);

    return {
      summary: {
        totalUsers: serializedUsers.length,
        activeUsers: serializedUsers.filter((user) => user.isActive).length,
        adminUsers: serializedUsers.filter((user) => user.role === 'admin').length,
        nearStorageLimitUsers: serializedUsers.filter((user) => user.isNearStorageLimit).length,
        totalStorageUsedBytes,
        totalStorageLimitBytes,
      },
      users: filteredUsers,
    };
  }

  static async deactivateUser(actorUserId: string, targetUserId: string) {
    const targetUser = await this.getManagedUserOrThrow(targetUserId);
    await this.ensureTargetIsMutable(actorUserId, targetUser);

    if (!targetUser.isActive) {
      return this.serializeManagedUser(targetUser);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: targetUserId },
        data: {
          isActive: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          currencyCode: true,
          isActive: true,
          deletedAt: true,
          storageLimitBytes: true,
          storageUsedBytes: true,
          maxAttachmentsPerMovement: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.session.updateMany({
        where: {
          userId: targetUserId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      await AuditService.log(
        tx,
        targetUserId,
        actorUserId,
        'user',
        targetUserId,
        'deactivate',
        this.serializeManagedUser(targetUser),
        this.serializeManagedUser(updated as ManagedUserRecord),
      );

      return this.serializeManagedUser(updated as ManagedUserRecord);
    });
  }

  static async deleteUser(actorUserId: string, targetUserId: string) {
    const targetUser = await this.getManagedUserOrThrow(targetUserId);
    await this.ensureTargetIsMutable(actorUserId, targetUser);

    return prisma.$transaction(async (tx) => {
      const deletedIdentity = this.buildDeletedIdentity(targetUserId);
      const deletedAt = new Date();

      const updated = await tx.user.update({
        where: { id: targetUserId },
        data: {
          email: deletedIdentity.email,
          name: deletedIdentity.name,
          role: 'user',
          isActive: false,
          deletedAt,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          currencyCode: true,
          isActive: true,
          deletedAt: true,
          storageLimitBytes: true,
          storageUsedBytes: true,
          maxAttachmentsPerMovement: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.session.updateMany({
        where: {
          userId: targetUserId,
          revokedAt: null,
        },
        data: {
          revokedAt: deletedAt,
        },
      });

      await AuditService.log(
        tx,
        targetUserId,
        actorUserId,
        'user',
        targetUserId,
        'delete',
        this.serializeManagedUser(targetUser),
        {
          ...this.serializeManagedUser(updated as ManagedUserRecord),
          deletionPolicy: 'soft_delete_with_anonymization',
        },
      );

      return {
        id: targetUserId,
        deletedAt,
      };
    });
  }

  static async updateUserLimits(
    actorUserId: string,
    targetUserId: string,
    payload: {
      storageLimitBytes?: number;
      maxAttachmentsPerMovement?: number;
    },
  ) {
    const targetUser = await this.getManagedUserOrThrow(targetUserId);

    const data: {
      storageLimitBytes?: bigint;
      maxAttachmentsPerMovement?: number;
    } = {};

    if (payload.storageLimitBytes !== undefined) {
      if (!Number.isInteger(payload.storageLimitBytes) || payload.storageLimitBytes <= 0) {
        throw new Error('El límite de almacenamiento debe ser un entero positivo en bytes.');
      }

      data.storageLimitBytes = BigInt(payload.storageLimitBytes);
    }

    if (payload.maxAttachmentsPerMovement !== undefined) {
      if (
        !Number.isInteger(payload.maxAttachmentsPerMovement)
        || payload.maxAttachmentsPerMovement < 1
        || payload.maxAttachmentsPerMovement > MAX_ATTACHMENTS_LIMIT
      ) {
        throw new Error(`El máximo de adjuntos por movimiento debe estar entre 1 y ${MAX_ATTACHMENTS_LIMIT}.`);
      }

      data.maxAttachmentsPerMovement = payload.maxAttachmentsPerMovement;
    }

    if (Object.keys(data).length === 0) {
      throw new Error('Debes enviar al menos un ajuste administrativo.');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: targetUserId },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          currencyCode: true,
          isActive: true,
          deletedAt: true,
          storageLimitBytes: true,
          storageUsedBytes: true,
          maxAttachmentsPerMovement: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await AuditService.log(
        tx,
        targetUserId,
        actorUserId,
        'user_limits',
        targetUserId,
        'update',
        this.serializeManagedUser(targetUser),
        this.serializeManagedUser(updated as ManagedUserRecord),
      );

      return this.serializeManagedUser(updated as ManagedUserRecord);
    });
  }
}
