import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { amountToCents, centsToAmount } from '../lib/money.js';
import { AuditService } from './audit.service.js';
import { SavingsGoalService } from './savings-goal.service.js';

export class TransferService {
  private static validateTransferPayload(data: {
    sourceAccountId: string;
    destinationAccountId: string;
    reason: string;
    amount: number;
    occurredAt: Date;
  }) {
    if (!data.sourceAccountId || !data.destinationAccountId) {
      throw new Error('Debes seleccionar cuenta origen y cuenta destino.');
    }

    if (data.sourceAccountId === data.destinationAccountId) {
      throw new Error('La cuenta de origen y destino deben ser distintas.');
    }

    if (!data.reason.trim()) {
      throw new Error('El motivo de la transferencia es obligatorio.');
    }

    const amountCents = amountToCents(data.amount);
    if (amountCents <= 0) {
      throw new Error('El monto de la transferencia debe ser mayor que cero.');
    }

    if (Number.isNaN(data.occurredAt.getTime())) {
      throw new Error('La fecha de la transferencia no es válida.');
    }

    return amountCents;
  }

  private static async validateAccountsBelongToUser(
    tx: any,
    userId: string,
    sourceAccountId: string,
    destinationAccountId: string,
  ) {
    const accounts = await tx.account.findMany({
      where: {
        userId,
        isActive: true,
        deletedAt: null,
        id: {
          in: [sourceAccountId, destinationAccountId],
        },
      },
      select: {
        id: true,
      },
    });

    if (accounts.length !== 2) {
      throw new Error('Una o más cuentas no existen, no están activas o no pertenecen al usuario.');
    }
  }

  private static transferInclude = {
    sourceAccount: true,
    destinationAccount: true,
    attachments: {
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    },
  } satisfies Prisma.TransferInclude;

  static async listTransfers(
    userId: string,
    pagination?: { page: number; pageSize: number },
  ) {
    if (!pagination) {
      return prisma.transfer.findMany({
        where: { userId, isDeleted: false },
        include: this.transferInclude,
        orderBy: { occurredAt: 'desc' }
      });
    }

    const [totalItems, items] = await Promise.all([
      prisma.transfer.count({
        where: { userId, isDeleted: false },
      }),
      prisma.transfer.findMany({
        where: { userId, isDeleted: false },
        include: this.transferInclude,
        orderBy: { occurredAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
    ]);

    return {
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pagination.pageSize)),
      },
      items,
    };
  }

  static async createTransfer(
    userId: string,
    data: {
      sourceAccountId: string;
      destinationAccountId: string;
      reason: string;
      amount: number;
      notes?: string;
      occurredAt: Date;
    }
  ) {
    const amountCents = this.validateTransferPayload(data);

    return await prisma.$transaction(async (tx) => {
      await this.validateAccountsBelongToUser(tx, userId, data.sourceAccountId, data.destinationAccountId);

      const transfer = await tx.transfer.create({
        data: {
          userId,
          sourceAccountId: data.sourceAccountId,
          destinationAccountId: data.destinationAccountId,
          reason: data.reason.trim(),
          amount: centsToAmount(amountCents),
          notes: data.notes?.trim() || null,
          occurredAt: data.occurredAt
        }
      });

      await AuditService.log(tx, userId, userId, 'transfer', transfer.id, 'create', null, data);
      await SavingsGoalService.rebalanceAllocationsToAvailable(userId, tx);
      
      return transfer;
    });
  }

  static async updateTransfer(
    userId: string,
    id: string,
    data: {
      sourceAccountId: string;
      destinationAccountId: string;
      reason: string;
      amount: number;
      notes?: string;
      occurredAt: Date;
    }
  ) {
    const amountCents = this.validateTransferPayload(data);

    const existing = await prisma.transfer.findFirst({
      where: { id, userId, isDeleted: false }
    });

    if (!existing) throw new Error('Transferencia no encontrada');

    return await prisma.$transaction(async (tx) => {
      await this.validateAccountsBelongToUser(tx, userId, data.sourceAccountId, data.destinationAccountId);

      const updated = await tx.transfer.update({
        where: { id },
        data: {
          sourceAccountId: data.sourceAccountId,
          destinationAccountId: data.destinationAccountId,
          reason: data.reason.trim(),
          amount: centsToAmount(amountCents),
          notes: data.notes?.trim() || null,
          occurredAt: data.occurredAt
        }
      });

      await AuditService.log(tx, userId, userId, 'transfer', id, 'update', existing, data);
      await SavingsGoalService.rebalanceAllocationsToAvailable(userId, tx);
      
      return updated;
    });
  }

  static async deleteTransfer(userId: string, id: string) {
    const existing = await prisma.transfer.findFirst({
      where: { id, userId, isDeleted: false }
    });

    if (!existing) throw new Error('Transferencia no encontrada');

    return await prisma.$transaction(async (tx) => {
      await tx.transfer.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date()
        }
      });

      await AuditService.log(tx, userId, userId, 'transfer', id, 'delete', existing, null);
      await SavingsGoalService.rebalanceAllocationsToAvailable(userId, tx);
    });
  }
}
