import { prisma } from '../lib/prisma.js';
import { amountToCents, centsToAmount } from '../lib/money.js';

type DateRange = {
  startDate: Date;
  endDate: Date;
};

type MovementType = 'income' | 'expense';

function startOfDay(value: Date) {
  const normalized = new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function endOfDay(value: Date) {
  const normalized = new Date(value);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function endOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999);
}

function getOverlapDays(rangeStart: Date, rangeEnd: Date, monthStart: Date, monthEnd: Date) {
  const overlapStart = rangeStart > monthStart ? rangeStart : monthStart;
  const overlapEnd = rangeEnd < monthEnd ? rangeEnd : monthEnd;

  if (overlapStart > overlapEnd) {
    return 0;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((startOfDay(overlapEnd).getTime() - startOfDay(overlapStart).getTime()) / millisecondsPerDay) + 1;
}

function getDaysInMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0).getDate();
}

function buildCategoryMovementDescription(transaction: {
  description: string;
  debtPayments?: Array<{ debt?: { name: string } | null }>;
}) {
  const debtName = transaction.debtPayments?.[0]?.debt?.name;
  return debtName ? `${transaction.description} • Deuda: ${debtName}` : transaction.description;
}

export class ReportService {
  static normalizeRange(startDate?: Date, endDate?: Date): DateRange {
    const today = new Date();
    const normalizedStart = startDate ? startOfDay(startDate) : startOfMonth(today);
    const normalizedEnd = endDate ? endOfDay(endDate) : endOfDay(today);

    if (Number.isNaN(normalizedStart.getTime()) || Number.isNaN(normalizedEnd.getTime())) {
      throw new Error('El rango de fechas no es válido.');
    }

    if (normalizedStart > normalizedEnd) {
      throw new Error('La fecha inicial no puede ser mayor a la fecha final.');
    }

    return {
      startDate: normalizedStart,
      endDate: normalizedEnd,
    };
  }

  static async getOverview(userId: string, range: DateRange) {
    const [user, breakdowns, accounts, transferSummary, totalSavings, savingsGoalsOverview, debtSummary] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          currencyCode: true,
          monthlyExpenseBase: true,
          monthlyPlanMode: true,
        },
      }),
      Promise.all([
        this.getCategoryBreakdown(userId, 'expense', range),
        this.getCategoryBreakdown(userId, 'income', range),
        this.getMonthlyPlan(userId, range),
      ]),
      this.getExpectedBalancesByAccount(userId, range.endDate),
      this.getTransferSummary(userId, range, { page: 1, pageSize: 10 }),
      this.getTotalSavings(userId, range.endDate),
      this.getSavingsGoalsSummary(userId),
      this.getDebtSummary(userId, range.endDate),
    ]);

    if (!user) {
      throw new Error('Usuario no encontrado.');
    }

    const [expenseBreakdown, incomeBreakdown, monthlyPlan] = breakdowns;

    return {
      range,
      currencyCode: user.currencyCode,
      monthlyExpenseBase: Number(user.monthlyExpenseBase),
      expenseBreakdown,
      incomeBreakdown,
      expectedBalances: accounts,
      transferSummary,
      totalSavings,
      savingsGoalsSummary: savingsGoalsOverview,
      debtSummary,
      monthlyPlan,
    };
  }

  static async getCategoryBreakdown(userId: string, type: MovementType, range: DateRange) {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type,
        isDeleted: false,
        occurredAt: {
          gte: range.startDate,
          lte: range.endDate,
        },
        category: {
          userId,
          type,
          isActive: true,
          deletedAt: null,
        },
      },
      select: {
        totalAmount: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        occurredAt: 'desc',
      },
    });

    const grouped = new Map<string, { categoryId: string; categoryName: string; totalCents: number }>();

    for (const transaction of transactions) {
      const categoryId = transaction.category.id;
      const existing = grouped.get(categoryId);
      const totalCents = amountToCents(Number(transaction.totalAmount));

      if (existing) {
        existing.totalCents += totalCents;
      } else {
        grouped.set(categoryId, {
          categoryId,
          categoryName: transaction.category.name,
          totalCents,
        });
      }
    }

    return Array.from(grouped.values())
      .map((item) => ({
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        totalAmount: centsToAmount(item.totalCents),
      }))
      .sort((left, right) => right.totalAmount - left.totalAmount);
  }

  static async getCategoryMovements(
    userId: string,
    type: MovementType,
    categoryId: string,
    range: DateRange,
    pagination: { page: number; pageSize: number },
  ) {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
        type,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!category) {
      throw new Error('La categoría seleccionada no existe o no pertenece al usuario.');
    }

    const [totalItems, transactions] = await Promise.all([
      prisma.transaction.count({
        where: {
          userId,
          type,
          categoryId,
          isDeleted: false,
          occurredAt: {
            gte: range.startDate,
            lte: range.endDate,
          },
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          type,
          categoryId,
          isDeleted: false,
          occurredAt: {
            gte: range.startDate,
            lte: range.endDate,
          },
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          allocations: {
            include: {
              account: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
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
        },
        orderBy: {
          occurredAt: 'desc',
        },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
    ]);

    return {
      category,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pagination.pageSize)),
      },
      items: transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        categoryName: transaction.category.name,
        description: buildCategoryMovementDescription(transaction),
        totalAmount: Number(transaction.totalAmount),
        occurredAt: transaction.occurredAt,
        accounts: transaction.allocations.map((allocation) => ({
          id: allocation.account.id,
          name: allocation.account.name,
          amount: Number(allocation.amount),
          direction: allocation.direction,
        })),
      })),
    };
  }

  static async getExpectedBalancesByAccount(userId: string, endDate: Date) {
    const accounts = await prisma.account.findMany({
      where: {
        userId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        transactionAllocations: {
          where: {
            transaction: {
              isDeleted: false,
              occurredAt: {
                lte: endDate,
              },
            },
          },
          include: {
            transaction: {
              select: {
                isDeleted: true,
              },
            },
          },
        },
        transfersSent: {
          where: {
            isDeleted: false,
            occurredAt: {
              lte: endDate,
            },
          },
          select: {
            amount: true,
          },
        },
        transfersReceived: {
          where: {
            isDeleted: false,
            occurredAt: {
              lte: endDate,
            },
          },
          select: {
            amount: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return accounts.map((account) => {
      let expectedBalanceCents = 0;

      for (const allocation of account.transactionAllocations) {
        if (allocation.transaction.isDeleted) {
          continue;
        }

        const amountCents = amountToCents(Number(allocation.amount));
        expectedBalanceCents += allocation.direction === 'in' ? amountCents : -amountCents;
      }

      for (const transfer of account.transfersReceived) {
        expectedBalanceCents += amountToCents(Number(transfer.amount));
      }

      for (const transfer of account.transfersSent) {
        expectedBalanceCents -= amountToCents(Number(transfer.amount));
      }

      return {
        id: account.id,
        name: account.name,
        type: account.type,
        expectedBalance: centsToAmount(expectedBalanceCents),
      };
    });
  }

  static async getTransferSummary(
    userId: string,
    range: DateRange,
    pagination: { page: number; pageSize: number },
  ) {
    const [transfers, totalItems] = await Promise.all([
      prisma.transfer.findMany({
        where: {
          userId,
          isDeleted: false,
          occurredAt: {
            gte: range.startDate,
            lte: range.endDate,
          },
        },
        include: {
          sourceAccount: {
            select: {
              id: true,
              name: true,
            },
          },
          destinationAccount: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          occurredAt: 'desc',
        },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.transfer.count({
        where: {
          userId,
          isDeleted: false,
          occurredAt: {
            gte: range.startDate,
            lte: range.endDate,
          },
        },
      }),
    ]);

    const totalTransferredCents = transfers.reduce((sum, transfer) => {
      return sum + amountToCents(Number(transfer.amount));
    }, 0);

    const fullTotal = await prisma.transfer.aggregate({
      where: {
        userId,
        isDeleted: false,
        occurredAt: {
          gte: range.startDate,
          lte: range.endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return {
      totalTransferred: Number(fullTotal._sum.amount ?? 0),
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pagination.pageSize)),
      },
      items: transfers.map((transfer) => ({
        id: transfer.id,
        reason: transfer.reason,
        notes: transfer.notes,
        amount: Number(transfer.amount),
        occurredAt: transfer.occurredAt,
        sourceAccount: transfer.sourceAccount,
        destinationAccount: transfer.destinationAccount,
      })),
      pageTransferred: centsToAmount(totalTransferredCents),
    };
  }

  static async getTotalSavings(userId: string, endDate: Date) {
    const accounts = await prisma.account.findMany({
      where: {
        userId,
        type: 'savings',
        isActive: true,
        deletedAt: null,
      },
      include: {
        transactionAllocations: {
          where: {
            transaction: {
              isDeleted: false,
              occurredAt: {
                lte: endDate,
              },
            },
          },
          include: {
            transaction: {
              select: {
                isDeleted: true,
              },
            },
          },
        },
        transfersSent: {
          where: {
            isDeleted: false,
            occurredAt: {
              lte: endDate,
            },
          },
          select: {
            amount: true,
          },
        },
        transfersReceived: {
          where: {
            isDeleted: false,
            occurredAt: {
              lte: endDate,
            },
          },
          select: {
            amount: true,
          },
        },
      },
    });

    const totalSavingsCents = accounts.reduce((sum, account) => {
      let accountBalanceCents = 0;

      for (const allocation of account.transactionAllocations) {
        if (allocation.transaction.isDeleted) {
          continue;
        }

        const amountCents = amountToCents(Number(allocation.amount));
        accountBalanceCents += allocation.direction === 'in' ? amountCents : -amountCents;
      }

      for (const transfer of account.transfersReceived) {
        accountBalanceCents += amountToCents(Number(transfer.amount));
      }

      for (const transfer of account.transfersSent) {
        accountBalanceCents -= amountToCents(Number(transfer.amount));
      }

      return sum + accountBalanceCents;
    }, 0);

    return centsToAmount(Math.max(0, totalSavingsCents));
  }

  static async getSavingsGoalsSummary(userId: string) {
    const [user, goals] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          currencyCode: true,
        },
      }),
      prisma.savingsGoal.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        include: {
          allocations: true,
        },
        orderBy: [
          { isActive: 'desc' },
          { targetDate: 'asc' },
          { createdAt: 'asc' },
        ],
      }),
    ]);

    if (!user) {
      throw new Error('Usuario no encontrado.');
    }

    const items = goals.map((goal) => {
      const targetAmount = Number(goal.targetAmount);
      const allocatedAmount = Number(goal.allocations[0]?.amount ?? 0);
      const remainingAmount = Math.max(0, targetAmount - allocatedAmount);
      const progressPercentage = targetAmount <= 0
        ? 0
        : Number(Math.min(100, (allocatedAmount / targetAmount) * 100).toFixed(2));

      return {
        id: goal.id,
        name: goal.name,
        targetAmount,
        allocatedAmount: Number(allocatedAmount.toFixed(2)),
        remainingAmount: Number(remainingAmount.toFixed(2)),
        progressPercentage,
        targetDate: goal.targetDate,
        status: !goal.isActive ? 'inactive' : progressPercentage >= 100 ? 'completed' : 'active',
      };
    });

    return {
      currencyCode: user.currencyCode,
      totalGoals: items.length,
      activeGoals: items.filter((goal) => goal.status === 'active').length,
      completedGoals: items.filter((goal) => goal.status === 'completed').length,
      items,
    };
  }

  static async getDebtSummary(userId: string, endDate: Date) {
    const debts = await prisma.debt.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        paymentDays: {
          orderBy: {
            dayOfMonth: 'asc',
          },
        },
        debtPayments: {
          where: {
            transaction: {
              isDeleted: false,
              occurredAt: {
                lte: endDate,
              },
            },
          },
          select: {
            amount: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    const items = debts.map((debt) => {
      const totalAmount = Number(debt.totalAmount);
      const paidAmount = debt.debtPayments.reduce((sum, payment) => {
        return sum + Number(payment.amount);
      }, 0);
      const remainingAmount = Math.max(0, totalAmount - paidAmount);

      return {
        id: debt.id,
        name: debt.name,
        totalAmount,
        paidAmount: Number(paidAmount.toFixed(2)),
        remainingAmount: Number(remainingAmount.toFixed(2)),
        paymentDays: debt.paymentDays.map((day) => day.dayOfMonth),
        isActive: debt.isActive,
        status: !debt.isActive ? 'inactive' : remainingAmount <= 0 ? 'paid' : 'active',
      };
    });

    const pendingItems = items.filter((debt) => debt.isActive && debt.remainingAmount > 0);
    const totalPendingAmount = pendingItems.reduce((sum, debt) => sum + debt.remainingAmount, 0);

    return {
      totalPendingAmount: Number(totalPendingAmount.toFixed(2)),
      pendingCount: pendingItems.length,
      items: pendingItems,
    };
  }

  static async getMonthlyPlan(userId: string, range: DateRange) {
    const [user, categories, transactions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          monthlyExpenseBase: true,
          currencyCode: true,
          monthlyPlanMode: true,
        },
      }),
      prisma.category.findMany({
        where: {
          userId,
          type: 'expense',
          isActive: true,
          deletedAt: null,
          isHidden: false,
        },
        include: {
          budgetAllocations: {
            where: {
              userId,
            },
            select: {
              id: true,
              percentage: true,
              amount: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          type: 'expense',
          isDeleted: false,
          occurredAt: {
            gte: range.startDate,
            lte: range.endDate,
          },
        },
        select: {
          categoryId: true,
          totalAmount: true,
        },
      }),
    ]);

    if (!user) {
      throw new Error('Usuario no encontrado.');
    }

    const actualByCategory = transactions.reduce((map, transaction) => {
      const current = map.get(transaction.categoryId) ?? 0;
      map.set(transaction.categoryId, current + amountToCents(Number(transaction.totalAmount)));
      return map;
    }, new Map<string, number>());

    const baseCents = amountToCents(Number(user.monthlyExpenseBase));
    const monthlyPlanMode = user.monthlyPlanMode === 'percentage' ? 'percentage' : 'amount';

    const forecastFactor = (() => {
      let pointer = startOfMonth(range.startDate);
      let totalFactor = 0;

      while (pointer <= range.endDate) {
        const monthStart = startOfMonth(pointer);
        const monthEnd = endOfMonth(pointer);
        const overlapDays = getOverlapDays(range.startDate, range.endDate, monthStart, monthEnd);
        const daysInMonth = getDaysInMonth(pointer);
        totalFactor += overlapDays / daysInMonth;
        pointer = new Date(pointer.getFullYear(), pointer.getMonth() + 1, 1);
      }

      return totalFactor;
    })();

    const items = categories.map((category) => {
      const percentage = Number(category.budgetAllocations[0]?.percentage ?? 0);
      const plannedAmountCents = amountToCents(Number(category.budgetAllocations[0]?.amount ?? 0));
      const forecastCents = monthlyPlanMode === 'percentage'
        ? Math.round(baseCents * (percentage / 100) * forecastFactor)
        : Math.round(plannedAmountCents * forecastFactor);
      const actualCents = actualByCategory.get(category.id) ?? 0;

      return {
        categoryId: category.id,
        categoryName: category.name,
        percentage: Number(percentage.toFixed(2)),
        amount: centsToAmount(plannedAmountCents),
        forecastAmount: centsToAmount(forecastCents),
        actualAmount: centsToAmount(actualCents),
        varianceAmount: centsToAmount(actualCents - forecastCents),
        executionPercentage: forecastCents <= 0
          ? actualCents > 0 ? 100 : 0
          : Number(((actualCents / forecastCents) * 100).toFixed(2)),
      };
    });

    const totalAssignedPercentage = items.reduce((sum, item) => sum + item.percentage, 0);
    const totalAssignedAmountCents = items.reduce((sum, item) => sum + amountToCents(item.amount), 0);

    return {
      currencyCode: user.currencyCode,
      monthlyExpenseBase: Number(user.monthlyExpenseBase),
      monthlyPlanMode,
      forecastFactor: Number(forecastFactor.toFixed(4)),
      totalAssignedPercentage: Number(totalAssignedPercentage.toFixed(2)),
      totalAssignedAmount: centsToAmount(totalAssignedAmountCents),
      items,
    };
  }
}
