import { prisma } from '../lib/prisma.js';
import { amountToCents, centsToAmount } from '../lib/money.js';

type MonthlyPlanMode = 'amount' | 'percentage';

function normalizeMonthlyPlanMode(value: unknown): MonthlyPlanMode {
  if (value === 'amount' || value === 'percentage') {
    return value;
  }

  throw new Error('El modo de planeación mensual no es válido.');
}

export class SettingsService {
  static async getUserSettings(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        currencyCode: true,
        monthlyExpenseBase: true,
        monthlyPlanMode: true,
      }
    });
  }

  static async getMonthlyPlanSettings(userId: string) {
    const [user, categories] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          currencyCode: true,
          monthlyExpenseBase: true,
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
    ]);

    if (!user) {
      throw new Error('Usuario no encontrado.');
    }

    const allocations = categories.map((category) => ({
      categoryId: category.id,
      categoryName: category.name,
      percentage: Number(category.budgetAllocations[0]?.percentage ?? 0),
      amount: Number(category.budgetAllocations[0]?.amount ?? 0),
    }));

    return {
      currencyCode: user.currencyCode,
      monthlyExpenseBase: Number(user.monthlyExpenseBase),
      monthlyPlanMode: normalizeMonthlyPlanMode(user.monthlyPlanMode),
      totalAssignedPercentage: Number(
        allocations.reduce((sum, allocation) => sum + allocation.percentage, 0).toFixed(2),
      ),
      totalAssignedAmount: centsToAmount(
        allocations.reduce((sum, allocation) => sum + amountToCents(allocation.amount), 0),
      ),
      allocations,
    };
  }

  static async updateCurrency(userId: string, currencyCode: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { currencyCode },
    });
  }

  static async updateMonthlyPlanMode(userId: string, monthlyPlanMode: MonthlyPlanMode) {
    normalizeMonthlyPlanMode(monthlyPlanMode);

    return prisma.user.update({
      where: { id: userId },
      data: { monthlyPlanMode },
      select: {
        currencyCode: true,
        monthlyExpenseBase: true,
        monthlyPlanMode: true,
      },
    });
  }

  static async upsertMonthlyPlanSettings(
    userId: string,
    payload: {
      monthlyExpenseBase: number;
      monthlyPlanMode: MonthlyPlanMode;
      allocations: Array<{ categoryId: string; percentage?: number; amount?: number }>;
    },
  ) {
    if (!Number.isFinite(payload.monthlyExpenseBase) || payload.monthlyExpenseBase < 0) {
      throw new Error('La base mensual debe ser un número mayor o igual a cero.');
    }

    const monthlyPlanMode = normalizeMonthlyPlanMode(payload.monthlyPlanMode);
    const monthlyExpenseBaseCents = amountToCents(payload.monthlyExpenseBase);

    const normalizedAllocations = payload.allocations.map((allocation) => ({
      categoryId: allocation.categoryId,
      percentage: Number(allocation.percentage ?? 0),
      amount: Number(allocation.amount ?? 0),
    }));

    if (normalizedAllocations.some((allocation) => !Number.isFinite(allocation.percentage) || allocation.percentage < 0)) {
      throw new Error('Los porcentajes deben ser números mayores o iguales a cero.');
    }

    if (normalizedAllocations.some((allocation) => !Number.isFinite(allocation.amount) || allocation.amount < 0)) {
      throw new Error('Los montos deben ser números mayores o iguales a cero.');
    }

    const duplicatedCategoryIds = normalizedAllocations
      .map((allocation) => allocation.categoryId)
      .filter((categoryId, index, array) => array.indexOf(categoryId) !== index);

    if (duplicatedCategoryIds.length > 0) {
      throw new Error('No puedes repetir categorías en la planeación mensual.');
    }

    const allocationsToPersist = normalizedAllocations.map((allocation) => {
      if (monthlyPlanMode === 'percentage') {
        const percentage = Number(allocation.percentage.toFixed(2));
        const amountCents = Math.round(monthlyExpenseBaseCents * (percentage / 100));
        return {
          categoryId: allocation.categoryId,
          percentage,
          amount: centsToAmount(amountCents),
        };
      }

      const amountCents = amountToCents(allocation.amount);
      const percentage = monthlyExpenseBaseCents > 0
        ? Number(((amountCents / monthlyExpenseBaseCents) * 100).toFixed(2))
        : 0;

      return {
        categoryId: allocation.categoryId,
        percentage,
        amount: centsToAmount(amountCents),
      };
    });

    const totalAssignedPercentage = allocationsToPersist.reduce((sum, allocation) => sum + allocation.percentage, 0);
    if (monthlyPlanMode === 'percentage' && totalAssignedPercentage > 100.0001) {
      throw new Error('La suma de porcentajes no puede superar el 100%.');
    }

    await prisma.$transaction(async (tx) => {
      const categories = await tx.category.findMany({
        where: {
          userId,
          type: 'expense',
          isActive: true,
          deletedAt: null,
          isHidden: false,
          id: {
            in: normalizedAllocations.map((allocation) => allocation.categoryId),
          },
        },
        select: {
          id: true,
        },
      });

      if (categories.length !== normalizedAllocations.length) {
        throw new Error('Una o más categorías de gasto no existen o no pertenecen al usuario.');
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          monthlyExpenseBase: payload.monthlyExpenseBase,
          monthlyPlanMode,
        },
      });

      await tx.categoryBudgetAllocation.deleteMany({
        where: { userId },
      });

      if (allocationsToPersist.length > 0) {
        await tx.categoryBudgetAllocation.createMany({
          data: allocationsToPersist.map((allocation) => ({
            userId,
            categoryId: allocation.categoryId,
            percentage: allocation.percentage,
            amount: allocation.amount,
          })),
        });
      }
    });

    return this.getMonthlyPlanSettings(userId);
  }
}
