import { prisma } from '../lib/prisma.js';
import { amountToCents, centsToAmount } from '../lib/money.js';
import { AuditService } from './audit.service.js';

type DebtPayload = {
  name: string;
  description?: string;
  totalAmount: number;
  paymentDays: number[];
  isActive?: boolean | undefined;
};

function normalizePaymentDays(paymentDays: number[]) {
  if (!Array.isArray(paymentDays) || paymentDays.length === 0) {
    throw new Error('Debes seleccionar al menos un día esperado de pago.');
  }

  const uniqueDays = Array.from(
    new Set(paymentDays.map((day) => Number(day))),
  ).sort((a, b) => a - b);

  if (uniqueDays.some((day) => !Number.isInteger(day) || day < 1 || day > 31)) {
    throw new Error('Los días esperados de pago deben estar entre 1 y 31.');
  }

  return uniqueDays;
}

export class DebtService {
  private static serializeDebt(debt: {
    id: string;
    name: string;
    description: string | null;
    totalAmount: unknown;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    paymentDays: { dayOfMonth: number }[];
    debtPayments: { amount: unknown }[];
  }) {
    const totalAmount = Number(debt.totalAmount);
    const paidAmount = debt.debtPayments.reduce((sum, payment) => {
      return sum + Number(payment.amount);
    }, 0);
    const remainingAmount = Math.max(0, totalAmount - paidAmount);
    const status = !debt.isActive
      ? 'inactive'
      : remainingAmount <= 0
        ? 'paid'
        : 'active';

    return {
      id: debt.id,
      name: debt.name,
      description: debt.description,
      totalAmount,
      paidAmount: Number(paidAmount.toFixed(2)),
      remainingAmount: Number(remainingAmount.toFixed(2)),
      paymentDays: debt.paymentDays.map((day) => day.dayOfMonth).sort((a, b) => a - b),
      isActive: debt.isActive,
      status,
      createdAt: debt.createdAt,
      updatedAt: debt.updatedAt,
    };
  }

  static async listDebts(userId: string) {
    const debts = await prisma.debt.findMany({
      where: { userId, deletedAt: null },
      include: {
        paymentDays: {
          orderBy: { dayOfMonth: 'asc' },
        },
        debtPayments: {
          select: { amount: true },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return debts.map((debt) => this.serializeDebt(debt));
  }

  static async listActiveDebtsWithBalance(userId: string) {
    const debts = await this.listDebts(userId);
    return debts.filter((debt) => debt.isActive && debt.remainingAmount > 0);
  }

  static async createDebt(userId: string, payload: DebtPayload) {
    const name = payload.name.trim();

    if (!name) {
      throw new Error('El nombre de la deuda es obligatorio.');
    }

    const totalAmountCents = amountToCents(payload.totalAmount);
    if (totalAmountCents <= 0) {
      throw new Error('El monto total de la deuda debe ser mayor que cero.');
    }

    const paymentDays = normalizePaymentDays(payload.paymentDays);

    const duplicate = await prisma.debt.findFirst({
      where: {
        userId,
        deletedAt: null,
        name,
      },
    });

    if (duplicate) {
      throw new Error(`Ya existe una deuda llamada '${name}'.`);
    }

    return prisma.$transaction(async (tx) => {
      const debt = await tx.debt.create({
        data: {
          userId,
          name,
          description: payload.description?.trim() || null,
          totalAmount: centsToAmount(totalAmountCents),
          isActive: payload.isActive ?? true,
          paymentDays: {
            create: paymentDays.map((dayOfMonth) => ({ dayOfMonth })),
          },
        },
        include: {
          paymentDays: {
            orderBy: { dayOfMonth: 'asc' },
          },
          debtPayments: {
            select: { amount: true },
          },
        },
      });

      const serializedDebt = this.serializeDebt(debt);
      await AuditService.log(tx, userId, userId, 'debt', debt.id, 'create', null, serializedDebt);

      return serializedDebt;
    });
  }

  static async updateDebt(userId: string, debtId: string, payload: DebtPayload) {
    const existing = await prisma.debt.findFirst({
      where: { id: debtId, userId, deletedAt: null },
      include: {
        paymentDays: {
          orderBy: { dayOfMonth: 'asc' },
        },
        debtPayments: {
          select: { amount: true },
        },
      },
    });

    if (!existing) {
      throw new Error('Deuda no encontrada.');
    }

    const name = payload.name.trim();
    if (!name) {
      throw new Error('El nombre de la deuda es obligatorio.');
    }

    const totalAmountCents = amountToCents(payload.totalAmount);
    if (totalAmountCents <= 0) {
      throw new Error('El monto total de la deuda debe ser mayor que cero.');
    }

    const paidAmountCents = existing.debtPayments.reduce((sum, payment) => {
      return sum + amountToCents(Number(payment.amount));
    }, 0);

    if (totalAmountCents < paidAmountCents) {
      throw new Error('El monto total no puede ser menor que lo ya pagado.');
    }

    const paymentDays = normalizePaymentDays(payload.paymentDays);

    const duplicate = await prisma.debt.findFirst({
      where: {
        userId,
        deletedAt: null,
        name,
        id: { not: debtId },
      },
    });

    if (duplicate) {
      throw new Error(`Ya existe una deuda llamada '${name}'.`);
    }

    return prisma.$transaction(async (tx) => {
      await tx.debtPaymentDay.deleteMany({
        where: { debtId },
      });

      const updated = await tx.debt.update({
        where: { id: debtId },
        data: {
          name,
          description: payload.description?.trim() || null,
          totalAmount: centsToAmount(totalAmountCents),
          isActive: payload.isActive ?? existing.isActive,
          paymentDays: {
            create: paymentDays.map((dayOfMonth) => ({ dayOfMonth })),
          },
        },
        include: {
          paymentDays: {
            orderBy: { dayOfMonth: 'asc' },
          },
          debtPayments: {
            select: { amount: true },
          },
        },
      });

      const previousValues = this.serializeDebt(existing);
      const newValues = this.serializeDebt(updated);

      await AuditService.log(tx, userId, userId, 'debt', debtId, 'update', previousValues, newValues);

      return newValues;
    });
  }

  static async deactivateDebt(userId: string, debtId: string) {
    const existing = await prisma.debt.findFirst({
      where: { id: debtId, userId, deletedAt: null },
      include: {
        paymentDays: {
          orderBy: { dayOfMonth: 'asc' },
        },
        debtPayments: {
          select: { amount: true },
        },
      },
    });

    if (!existing) {
      throw new Error('Deuda no encontrada.');
    }

    if (!existing.isActive) {
      return this.serializeDebt(existing);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.debt.update({
        where: { id: debtId },
        data: {
          isActive: false,
        },
        include: {
          paymentDays: {
            orderBy: { dayOfMonth: 'asc' },
          },
          debtPayments: {
            select: { amount: true },
          },
        },
      });

      await AuditService.log(
        tx,
        userId,
        userId,
        'debt',
        debtId,
        'deactivate',
        this.serializeDebt(existing),
        this.serializeDebt(updated),
      );

      return this.serializeDebt(updated);
    });
  }
}
