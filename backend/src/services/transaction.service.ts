import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { amountToCents, centsToAmount } from '../lib/money.js';
import { AuditService } from './audit.service.js';
import { CategoryService } from './category.service.js';
import { SavingsGoalService } from './savings-goal.service.js';

export class TransactionService {
  private static async validateAccounts(
    tx: any,
    userId: string,
    allocations: { accountId: string; amount: number; direction?: 'in' | 'out' }[],
  ) {
    if (allocations.length === 0) {
      throw new Error('Debes registrar al menos una cuenta afectada.');
    }

    const duplicatedIds = allocations
      .map((allocation) => allocation.accountId)
      .filter((accountId, index, array) => array.indexOf(accountId) !== index);

    if (duplicatedIds.length > 0) {
      throw new Error('No puedes repetir la misma cuenta dentro del mismo movimiento.');
    }

    const accounts = await tx.account.findMany({
      where: {
        userId,
        isActive: true,
        deletedAt: null,
        id: { in: allocations.map((allocation) => allocation.accountId) },
      },
      select: { id: true },
    });

    if (accounts.length !== allocations.length) {
      throw new Error('Una o más cuentas no existen o no pertenecen al usuario.');
    }
  }

  private static async getTransactionCategory(
    tx: any,
    userId: string,
    type: 'income' | 'expense' | 'manual_adjustment',
    categoryId?: string,
  ) {
    if (type === 'manual_adjustment') {
      return CategoryService.getOrCreateSystemCategory(userId, 'MANUAL_ADJUSTMENT');
    }

    if (!categoryId) {
      throw new Error('La categoría es obligatoria para ingresos y gastos.');
    }

    const category = await tx.category.findFirst({
      where: {
        id: categoryId,
        userId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!category) {
      throw new Error('La categoría seleccionada no existe o no está activa.');
    }

    if (category.type !== type) {
      throw new Error('La categoría no corresponde al tipo de movimiento.');
    }

    return category;
  }

  private static async getDebtForPayment(
    tx: any,
    userId: string,
    debtId: string,
    options?: { allowInactive?: boolean },
  ) {
    const debt = await tx.debt.findFirst({
      where: {
        id: debtId,
        userId,
        deletedAt: null,
      },
    });

    if (!debt) {
      throw new Error('La deuda seleccionada no existe.');
    }

    if (!options?.allowInactive && !debt.isActive) {
      throw new Error('La deuda seleccionada está desactivada y no admite pagos nuevos.');
    }

    return debt;
  }

  private static async calculateDebtRemainingCents(
    tx: any,
    debtId: string,
    excludeTransactionId?: string,
  ) {
    const debtPaymentArgs: any = {
      select: { amount: true },
    };

    if (excludeTransactionId) {
      debtPaymentArgs.where = { transactionId: { not: excludeTransactionId } };
    }

    const debt = await tx.debt.findUnique({
      where: { id: debtId },
      select: {
        totalAmount: true,
        debtPayments: debtPaymentArgs,
      },
    });

    if (!debt) {
      throw new Error('La deuda seleccionada no existe.');
    }

    const paidCents = debt.debtPayments.reduce((sum: number, payment: { amount: unknown }) => {
      return sum + amountToCents(Number(payment.amount));
    }, 0);

    return amountToCents(Number(debt.totalAmount)) - paidCents;
  }

  private static transactionInclude = {
    category: true,
    allocations: {
      include: { account: true }
    },
    debtPayments: {
      include: {
        debt: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
    attachments: {
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    },
  } satisfies Prisma.TransactionInclude;

  static async listTransactions(
    userId: string,
    pagination?: { page: number; pageSize: number },
  ) {
    if (!pagination) {
      return prisma.transaction.findMany({
        where: { userId, isDeleted: false },
        include: this.transactionInclude,
        orderBy: { occurredAt: 'desc' }
      });
    }

    const [totalItems, items] = await Promise.all([
      prisma.transaction.count({
        where: { userId, isDeleted: false },
      }),
      prisma.transaction.findMany({
        where: { userId, isDeleted: false },
        include: this.transactionInclude,
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

  static async getTransaction(userId: string, id: string) {
    const tx = await prisma.transaction.findFirst({
      where: { id, userId, isDeleted: false },
      include: {
        category: true,
        allocations: {
          include: { account: true }
        },
        debtPayments: {
          include: {
            debt: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        attachments: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
        },
      }
    });
    if (!tx) throw new Error('Transaction not found');
    return tx;
  }

  static async createTransaction(
    userId: string, 
    data: {
      type: 'income' | 'expense' | 'manual_adjustment';
      categoryId?: string; // Optional for manual adjustment, will auto-fetch system category
      description: string;
      notes?: string;
      totalAmount: number;
      debtId?: string;
      occurredAt: Date;
      allocations: { accountId: string; amount: number; direction?: 'in' | 'out' }[];
    }
  ) {
    const totalAmountCents = amountToCents(data.totalAmount);
    if (totalAmountCents <= 0) {
      throw new Error('El monto total debe ser mayor que cero.');
    }

    const allocationsSumCents = data.allocations.reduce((sum, alloc) => {
      const allocationAmountCents = amountToCents(alloc.amount);
      if (allocationAmountCents <= 0) {
        throw new Error('Cada asignación debe tener un monto mayor que cero.');
      }

      if (alloc.direction && alloc.direction !== 'in' && alloc.direction !== 'out') {
        throw new Error('La dirección de una asignación no es válida.');
      }

      if (data.type === 'income' && alloc.direction && alloc.direction !== 'in') {
        throw new Error('Las asignaciones de ingreso deben entrar a la cuenta.');
      }

      if (data.type === 'expense' && alloc.direction && alloc.direction !== 'out') {
        throw new Error('Las asignaciones de gasto deben salir de la cuenta.');
      }

      return sum + allocationAmountCents;
    }, 0);
    if (allocationsSumCents !== totalAmountCents) {
      throw new Error('La suma de las asignaciones no coincide con el total.');
    }

    return await prisma.$transaction(async (tx) => {
      const category = await this.getTransactionCategory(tx, userId, data.type, data.categoryId);
      await this.validateAccounts(tx, userId, data.allocations);

      const isDebtExpense = data.type === 'expense' && category.systemKey === 'DEBT';
      let debtId: string | null = null;

      if (isDebtExpense) {
        if (!data.debtId) {
          throw new Error('Debes seleccionar una deuda cuando la categoría es Deudas.');
        }

        const debt = await this.getDebtForPayment(tx, userId, data.debtId);
        const remainingCents = await this.calculateDebtRemainingCents(tx, debt.id);
        if (totalAmountCents > remainingCents) {
          throw new Error('El monto del pago no puede superar el saldo pendiente de la deuda.');
        }

        debtId = debt.id;
      } else if (data.debtId) {
        throw new Error('Solo puedes asociar una deuda a gastos en la categoría Deudas.');
      }

      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: data.type,
          categoryId: category.id,
          description: data.description,
          notes: data.notes || null,
          totalAmount: centsToAmount(totalAmountCents),
          debtId,
          occurredAt: data.occurredAt,
        }
      });

      for (const alloc of data.allocations) {
        let direction = alloc.direction;
        if (!direction) {
          direction = data.type === 'income' ? 'in' : 'out';
        }
        await tx.transactionAllocation.create({
          data: {
            transactionId: transaction.id,
            accountId: alloc.accountId,
            amount: alloc.amount,
            direction: direction
          }
        });
      }

      if (debtId) {
        const debtPayment = await tx.debtPayment.create({
          data: {
            debtId,
            transactionId: transaction.id,
            amount: centsToAmount(totalAmountCents),
          },
        });

        await AuditService.log(tx, userId, userId, 'debt_payment', debtPayment.id, 'create', null, {
          id: debtPayment.id,
          debtId,
          transactionId: transaction.id,
          amount: centsToAmount(totalAmountCents),
        });
      }

      await AuditService.log(tx, userId, userId, 'transaction', transaction.id, 'create', null, {
        ...data,
        id: transaction.id,
        categoryId: category.id,
        debtId,
        totalAmount: centsToAmount(totalAmountCents),
      });

      await SavingsGoalService.rebalanceAllocationsToAvailable(userId, tx);

      return transaction;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  static async updateTransaction(
    userId: string, 
    id: string, 
    data: {
      categoryId: string;
      description: string;
      notes?: string;
      totalAmount: number;
      debtId?: string;
      occurredAt: Date;
      allocations: { accountId: string; amount: number; direction?: 'in' | 'out' }[];
    }
  ) {
    const existing = await prisma.transaction.findFirst({
      where: { id, userId, isDeleted: false },
      include: {
        allocations: true,
        category: true,
        debtPayments: true,
      }
    });
    
    if (!existing) throw new Error('Movimiento no encontrado');
    
    const totalAmountCents = amountToCents(data.totalAmount);
    if (totalAmountCents <= 0) {
      throw new Error('El monto total debe ser mayor que cero.');
    }

    const allocationsSumCents = data.allocations.reduce((sum, alloc) => {
      const allocationAmountCents = amountToCents(alloc.amount);
      if (allocationAmountCents <= 0) {
        throw new Error('Cada asignación debe tener un monto mayor que cero.');
      }

      if (alloc.direction && alloc.direction !== 'in' && alloc.direction !== 'out') {
        throw new Error('La dirección de una asignación no es válida.');
      }

      if (existing.type === 'income' && alloc.direction && alloc.direction !== 'in') {
        throw new Error('Las asignaciones de ingreso deben entrar a la cuenta.');
      }

      if (existing.type === 'expense' && alloc.direction && alloc.direction !== 'out') {
        throw new Error('Las asignaciones de gasto deben salir de la cuenta.');
      }

      return sum + allocationAmountCents;
    }, 0);
    if (allocationsSumCents !== totalAmountCents) {
      throw new Error('La suma de las asignaciones no coincide con el total.');
    }

    return await prisma.$transaction(async (tx) => {
      const category = await this.getTransactionCategory(tx, userId, existing.type as 'income' | 'expense' | 'manual_adjustment', data.categoryId);
      await this.validateAccounts(tx, userId, data.allocations);

      const existingDebtPayment = existing.debtPayments[0] || null;
      const isDebtExpense = existing.type === 'expense' && category.systemKey === 'DEBT';
      let nextDebtId: string | null = null;

      if (isDebtExpense) {
        if (!data.debtId) {
          throw new Error('Debes seleccionar una deuda cuando la categoría es Deudas.');
        }

        const allowInactive = existing.debtId === data.debtId;
        const debt = await this.getDebtForPayment(tx, userId, data.debtId, { allowInactive });
        const remainingCents = await this.calculateDebtRemainingCents(tx, debt.id, id);

        if (totalAmountCents > remainingCents) {
          throw new Error('El monto del pago no puede superar el saldo pendiente de la deuda.');
        }

        nextDebtId = debt.id;
      } else if (data.debtId) {
        throw new Error('Solo puedes asociar una deuda a gastos en la categoría Deudas.');
      }

      // 1. Delete old allocations
      await tx.transactionAllocation.deleteMany({
        where: { transactionId: id }
      });

      // 2. Update transaction
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          categoryId: category.id,
          description: data.description,
          notes: data.notes || null,
          totalAmount: centsToAmount(totalAmountCents),
          debtId: nextDebtId,
          occurredAt: data.occurredAt,
        }
      });

      // 3. Create new allocations
      for (const alloc of data.allocations) {
        let direction = alloc.direction;
        if (!direction) {
          direction = existing.type === 'income' ? 'in' : 'out';
        }
        await tx.transactionAllocation.create({
          data: {
            transactionId: id,
            accountId: alloc.accountId,
            amount: alloc.amount,
            direction: direction
          }
        });
      }

      if (nextDebtId) {
        if (existingDebtPayment) {
          const updatedDebtPayment = await tx.debtPayment.update({
            where: { id: existingDebtPayment.id },
            data: {
              debtId: nextDebtId,
              amount: centsToAmount(totalAmountCents),
            },
          });

          await AuditService.log(tx, userId, userId, 'debt_payment', updatedDebtPayment.id, 'update', existingDebtPayment, {
            id: updatedDebtPayment.id,
            debtId: nextDebtId,
            transactionId: id,
            amount: centsToAmount(totalAmountCents),
          });
        } else {
          const createdDebtPayment = await tx.debtPayment.create({
            data: {
              debtId: nextDebtId,
              transactionId: id,
              amount: centsToAmount(totalAmountCents),
            },
          });

          await AuditService.log(tx, userId, userId, 'debt_payment', createdDebtPayment.id, 'create', null, {
            id: createdDebtPayment.id,
            debtId: nextDebtId,
            transactionId: id,
            amount: centsToAmount(totalAmountCents),
          });
        }
      } else if (existingDebtPayment) {
        await tx.debtPayment.delete({
          where: { id: existingDebtPayment.id },
        });

        await AuditService.log(tx, userId, userId, 'debt_payment', existingDebtPayment.id, 'delete', existingDebtPayment, null);
      }

      await AuditService.log(tx, userId, userId, 'transaction', id, 'update', existing, {
        ...data,
        type: existing.type,
        categoryId: category.id,
        debtId: nextDebtId,
        totalAmount: centsToAmount(totalAmountCents),
      });

      await SavingsGoalService.rebalanceAllocationsToAvailable(userId, tx);

      return updated;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  static async deleteTransaction(userId: string, id: string) {
    const existing = await prisma.transaction.findFirst({
      where: { id, userId, isDeleted: false },
      include: {
        allocations: true,
        debtPayments: true,
      }
    });
    
    if (!existing) throw new Error('Movimiento no encontrado');

    return await prisma.$transaction(async (tx) => {
      const existingDebtPayment = existing.debtPayments[0] || null;

      await tx.transaction.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date()
        }
      });

      if (existingDebtPayment) {
        await tx.debtPayment.delete({
          where: { id: existingDebtPayment.id },
        });

        await AuditService.log(tx, userId, userId, 'debt_payment', existingDebtPayment.id, 'delete', existingDebtPayment, null);
      }

      await AuditService.log(tx, userId, userId, 'transaction', id, 'delete', existing, null);
      await SavingsGoalService.rebalanceAllocationsToAvailable(userId, tx);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }
}
