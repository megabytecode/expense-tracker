import { prisma } from '../lib/prisma.js';
import { amountToCents, centsToAmount } from '../lib/money.js';
import { AuditService } from './audit.service.js';

type SavingsGoalPayload = {
  name: string;
  description?: string;
  targetAmount: number;
  targetDate?: Date | null;
  status?: 'active' | 'inactive';
};

type AllocationInput = {
  goalId: string;
  amount: number;
};

type SavingsGoalRecord = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  targetAmount: unknown;
  targetDate: Date | null;
  status: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  allocations: Array<{ id: string; amount: unknown }>;
};

type SavingsGoalAllocationAuditContext = {
  source: 'manual_distribution' | 'automatic_rebalance';
  reason: string;
};

function normalizeGoalStatus(status?: string) {
  if (!status) {
    return 'active' as const;
  }

  if (status !== 'active' && status !== 'inactive') {
    throw new Error('El estado de la meta no es válido.');
  }

  return status;
}

function sanitizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalDate(value?: Date | null) {
  if (!value) {
    return null;
  }

  if (Number.isNaN(value.getTime())) {
    throw new Error('La fecha objetivo no es válida.');
  }

  return value;
}

export class SavingsGoalService {
  private static serializeGoal(goal: SavingsGoalRecord) {
    const targetAmount = Number(goal.targetAmount);
    const allocatedAmount = Number(goal.allocations[0]?.amount ?? 0);
    const remainingAmount = Math.max(0, targetAmount - allocatedAmount);
    const progressPercentage = targetAmount <= 0
      ? 0
      : Math.min(100, Number(((allocatedAmount / targetAmount) * 100).toFixed(2)));
    const computedStatus = goal.status === 'inactive'
      ? 'inactive'
      : progressPercentage >= 100
        ? 'completed'
        : 'active';

    return {
      id: goal.id,
      name: goal.name,
      description: goal.description,
      targetAmount,
      targetDate: goal.targetDate,
      status: computedStatus,
      baseStatus: goal.status,
      isActive: goal.isActive,
      allocatedAmount: Number(allocatedAmount.toFixed(2)),
      remainingAmount: Number(remainingAmount.toFixed(2)),
      progressPercentage,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    };
  }

  private static async getUserContext(tx: any, userId: string) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        currencyCode: true,
        savingsGoalRebalanceNotifiedAt: true,
        savingsGoalRebalanceSeenAt: true,
      },
    });

    if (!user) {
      throw new Error('Usuario no encontrado.');
    }

    return user;
  }

  private static async getGoals(tx: any, userId: string) {
    return tx.savingsGoal.findMany({
      where: { userId, deletedAt: null },
      include: {
        allocations: true,
      },
      orderBy: [
        { isActive: 'desc' },
        { targetDate: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  private static async logAllocationChange(
    tx: any,
    userId: string,
    goal: SavingsGoalRecord,
    previousAmountCents: number,
    nextAmountCents: number,
    context: SavingsGoalAllocationAuditContext,
  ) {
    const existingAllocationId = goal.allocations[0]?.id;

    await AuditService.log(
      tx,
      userId,
      userId,
      'savings_goal_allocation',
      existingAllocationId ?? goal.id,
      existingAllocationId ? 'update' : 'create',
      {
        savingsGoalId: goal.id,
        savingsGoalName: goal.name,
        amount: centsToAmount(previousAmountCents),
        ...context,
      },
      {
        savingsGoalId: goal.id,
        savingsGoalName: goal.name,
        amount: centsToAmount(nextAmountCents),
        ...context,
      },
    );
  }

  private static async buildOverview(tx: any, userId: string) {
    const [user, totalSavingsCents, goals] = await Promise.all([
      this.getUserContext(tx, userId),
      this.calculateTotalSavingsCents(tx, userId),
      this.getGoals(tx, userId),
    ]);

    const serializedGoals: Array<ReturnType<typeof SavingsGoalService.serializeGoal>> = goals.map(
      (goal: SavingsGoalRecord) => this.serializeGoal(goal),
    );
    const totalAllocatedCents = serializedGoals.reduce((sum: number, goal) => {
      if (goal.baseStatus === 'inactive') {
        return sum;
      }

      return sum + amountToCents(goal.allocatedAmount);
    }, 0);
    const activeGoals = serializedGoals.filter((goal) => goal.baseStatus === 'active');
    const activeGoalsTargetCents = activeGoals.reduce((sum: number, goal) => {
      return sum + amountToCents(goal.targetAmount);
    }, 0);
    const pendingRebalanceNotice = Boolean(
      user.savingsGoalRebalanceNotifiedAt &&
        (!user.savingsGoalRebalanceSeenAt || user.savingsGoalRebalanceSeenAt < user.savingsGoalRebalanceNotifiedAt),
    );

    return {
      currencyCode: user.currencyCode,
      totalSavings: centsToAmount(totalSavingsCents),
      totalAllocated: centsToAmount(totalAllocatedCents),
      unallocatedSavings: centsToAmount(Math.max(0, totalSavingsCents - totalAllocatedCents)),
      activeGoalsCount: activeGoals.length,
      completedGoalsCount: serializedGoals.filter((goal) => goal.status === 'completed').length,
      globalProgressPercentage: activeGoalsTargetCents <= 0
        ? 0
        : Math.min(100, Number((((totalAllocatedCents / activeGoalsTargetCents) * 100)).toFixed(2))),
      notice: pendingRebalanceNotice
        ? {
            type: 'rebalance',
            adjustedAt: user.savingsGoalRebalanceNotifiedAt,
            message: 'Tu ahorro disponible bajó y redistribuimos las metas proporcionalmente para mantener coherencia.',
          }
        : null,
      goals: serializedGoals,
    };
  }

  private static async calculateTotalSavingsCents(tx: any, userId: string) {
    const accounts = await tx.account.findMany({
      where: {
        userId,
        type: 'savings',
        isActive: true,
        deletedAt: null,
      },
      include: {
        transactionAllocations: {
          include: {
            transaction: {
              select: {
                isDeleted: true,
              },
            },
          },
        },
        transfersSent: {
          select: {
            amount: true,
            isDeleted: true,
          },
        },
        transfersReceived: {
          select: {
            amount: true,
            isDeleted: true,
          },
        },
      },
    });

    const totalCents = accounts.reduce((sum: number, account: any) => {
      let accountBalanceCents = 0;

      for (const allocation of account.transactionAllocations) {
        if (allocation.transaction.isDeleted) {
          continue;
        }

        const amountCents = amountToCents(Number(allocation.amount));
        accountBalanceCents += allocation.direction === 'in' ? amountCents : -amountCents;
      }

      for (const transfer of account.transfersReceived) {
        if (!transfer.isDeleted) {
          accountBalanceCents += amountToCents(Number(transfer.amount));
        }
      }

      for (const transfer of account.transfersSent) {
        if (!transfer.isDeleted) {
          accountBalanceCents -= amountToCents(Number(transfer.amount));
        }
      }

      return sum + accountBalanceCents;
    }, 0);

    return Math.max(0, totalCents);
  }

  private static proportionallyReduceAllocations(amounts: number[], targetTotal: number) {
    if (targetTotal <= 0 || amounts.every((amount) => amount <= 0)) {
      return amounts.map(() => 0);
    }

    const currentTotal = amounts.reduce((sum, amount) => sum + amount, 0);
    if (currentTotal <= targetTotal) {
      return amounts;
    }

    const scaled = amounts.map((amount, index) => {
      const raw = (amount * targetTotal) / currentTotal;
      const floored = Math.floor(raw);
      return {
        index,
        floored,
        remainder: raw - floored,
      };
    });

    let assigned = scaled.reduce((sum, item) => sum + item.floored, 0);
    const result = scaled.map((item) => item.floored);

    scaled
      .sort((left, right) => {
        if (right.remainder !== left.remainder) {
          return right.remainder - left.remainder;
        }

        return left.index - right.index;
      });

    for (const item of scaled) {
      if (assigned >= targetTotal) {
        break;
      }

      result[item.index] = (result[item.index] ?? 0) + 1;
      assigned += 1;
    }

    return result;
  }

  static async rebalanceAllocationsToAvailable(
    userId: string,
    tx: any = prisma,
    options?: { notifyUser?: boolean },
  ) {
    const notifyUser = options?.notifyUser ?? true;
    const now = new Date();
    const goals = await this.getGoals(tx, userId);
    const totalSavingsCents = await this.calculateTotalSavingsCents(tx, userId);

    const activeGoals = goals.filter((goal: SavingsGoalRecord) => goal.status === 'active' && goal.isActive);
    const currentActiveAllocations = activeGoals.map((goal: SavingsGoalRecord) => {
      const currentAmountCents = amountToCents(Number(goal.allocations[0]?.amount ?? 0));
      const targetAmountCents = amountToCents(Number(goal.targetAmount));
      return Math.min(Math.max(currentAmountCents, 0), targetAmountCents);
    });

    const currentAssignedCents = currentActiveAllocations.reduce((sum: number, amount: number) => {
      return sum + amount;
    }, 0);
    const reducedAllocations = currentAssignedCents > totalSavingsCents
      ? this.proportionallyReduceAllocations(currentActiveAllocations, totalSavingsCents)
      : currentActiveAllocations;

    let didChange = false;
    let reducedBecauseSavingsDropped = false;

    for (const goal of goals as SavingsGoalRecord[]) {
      const existingAllocationCents = amountToCents(Number(goal.allocations[0]?.amount ?? 0));
      let nextAmountCents = existingAllocationCents;

      if (goal.status !== 'active' || !goal.isActive) {
        nextAmountCents = 0;
      } else {
        const activeIndex = activeGoals.findIndex((activeGoal: SavingsGoalRecord) => activeGoal.id === goal.id);
        const targetAmountCents = amountToCents(Number(goal.targetAmount));
        const normalizedExisting = Math.min(Math.max(existingAllocationCents, 0), targetAmountCents);
        nextAmountCents = reducedAllocations[activeIndex] ?? normalizedExisting;

        if (currentAssignedCents > totalSavingsCents && nextAmountCents < normalizedExisting) {
          reducedBecauseSavingsDropped = true;
        }
      }

      if (nextAmountCents === existingAllocationCents) {
        continue;
      }

      didChange = true;

      if (goal.allocations[0]) {
        await tx.savingsGoalAllocation.update({
          where: { id: goal.allocations[0].id },
          data: {
            amount: centsToAmount(nextAmountCents),
          },
        });
      } else {
        await tx.savingsGoalAllocation.create({
          data: {
            savingsGoalId: goal.id,
            amount: centsToAmount(nextAmountCents),
          },
        });
      }

      await this.logAllocationChange(tx, userId, goal, existingAllocationCents, nextAmountCents, {
        source: 'automatic_rebalance',
        reason: currentAssignedCents > totalSavingsCents
          ? 'rebalance_after_available_savings_drop'
          : 'normalize_goal_allocation_after_goal_state_change',
      });
    }

    if (didChange && reducedBecauseSavingsDropped && notifyUser) {
      await tx.user.update({
        where: { id: userId },
        data: {
          savingsGoalRebalanceNotifiedAt: now,
        },
      });
    }

    return { didChange, reducedBecauseSavingsDropped };
  }

  static async getOverview(userId: string) {
    return prisma.$transaction(async (tx) => {
      return this.buildOverview(tx, userId);
    });
  }

  static async listGoals(userId: string) {
    const goals = await this.getGoals(prisma, userId);
    return goals.map((goal: SavingsGoalRecord) => this.serializeGoal(goal));
  }

  static async createGoal(userId: string, payload: SavingsGoalPayload) {
    const name = String(payload.name ?? '').trim();
    if (!name) {
      throw new Error('El nombre de la meta es obligatorio.');
    }

    const targetAmountCents = amountToCents(payload.targetAmount);
    if (targetAmountCents <= 0) {
      throw new Error('El monto objetivo debe ser mayor que cero.');
    }

    const status = normalizeGoalStatus(payload.status);

    const duplicate = await prisma.savingsGoal.findFirst({
      where: {
        userId,
        deletedAt: null,
        name,
      },
    });

    if (duplicate) {
      throw new Error(`Ya existe una meta llamada '${name}'.`);
    }

    return prisma.$transaction(async (tx) => {
      const goal = await tx.savingsGoal.create({
        data: {
          userId,
          name,
          description: sanitizeOptionalText(payload.description),
          targetAmount: centsToAmount(targetAmountCents),
          targetDate: normalizeOptionalDate(payload.targetDate),
          status,
          isActive: status === 'active',
          allocations: {
            create: {
              amount: 0,
            },
          },
        },
        include: {
          allocations: true,
        },
      });

      const serializedGoal = this.serializeGoal(goal);
      await AuditService.log(tx, userId, userId, 'savings_goal', goal.id, 'create', null, serializedGoal);

      return serializedGoal;
    });
  }

  static async updateGoal(userId: string, goalId: string, payload: SavingsGoalPayload) {
    const existing = await prisma.savingsGoal.findFirst({
      where: { id: goalId, userId, deletedAt: null },
      include: {
        allocations: true,
      },
    });

    if (!existing) {
      throw new Error('Meta de ahorro no encontrada.');
    }

    const name = String(payload.name ?? '').trim();
    if (!name) {
      throw new Error('El nombre de la meta es obligatorio.');
    }

    const targetAmountCents = amountToCents(payload.targetAmount);
    if (targetAmountCents <= 0) {
      throw new Error('El monto objetivo debe ser mayor que cero.');
    }

    const status = normalizeGoalStatus(payload.status ?? existing.status);

    const duplicate = await prisma.savingsGoal.findFirst({
      where: {
        userId,
        deletedAt: null,
        name,
        id: { not: goalId },
      },
    });

    if (duplicate) {
      throw new Error(`Ya existe una meta llamada '${name}'.`);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.savingsGoal.update({
        where: { id: goalId },
        data: {
          name,
          description: sanitizeOptionalText(payload.description),
          targetAmount: centsToAmount(targetAmountCents),
          targetDate: normalizeOptionalDate(payload.targetDate),
          status,
          isActive: status === 'active',
        },
        include: {
          allocations: true,
        },
      });

      const currentAllocationId = updated.allocations[0]?.id;
      const currentAllocationCents = amountToCents(Number(updated.allocations[0]?.amount ?? 0));
      const nextAllocationCents = status === 'inactive'
        ? 0
        : Math.min(currentAllocationCents, targetAmountCents);

      if (currentAllocationId) {
        await tx.savingsGoalAllocation.update({
          where: { id: currentAllocationId },
          data: {
            amount: centsToAmount(nextAllocationCents),
          },
        });
      } else {
        await tx.savingsGoalAllocation.create({
          data: {
            savingsGoalId: goalId,
            amount: centsToAmount(nextAllocationCents),
          },
        });
      }

      await this.rebalanceAllocationsToAvailable(userId, tx, { notifyUser: false });

      const refreshed = await tx.savingsGoal.findUniqueOrThrow({
        where: { id: goalId },
        include: {
          allocations: true,
        },
      });

      const previousValues = this.serializeGoal(existing as SavingsGoalRecord);
      const newValues = this.serializeGoal(refreshed as SavingsGoalRecord);
      await AuditService.log(tx, userId, userId, 'savings_goal', goalId, 'update', previousValues, newValues);

      return newValues;
    });
  }

  static async deactivateGoal(userId: string, goalId: string) {
    const existing = await prisma.savingsGoal.findFirst({
      where: { id: goalId, userId, deletedAt: null },
      include: {
        allocations: true,
      },
    });

    if (!existing) {
      throw new Error('Meta de ahorro no encontrada.');
    }

    if (existing.status === 'inactive' && !existing.isActive) {
      return this.serializeGoal(existing as SavingsGoalRecord);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.savingsGoal.update({
        where: { id: goalId },
        data: {
          status: 'inactive',
          isActive: false,
        },
        include: {
          allocations: true,
        },
      });

      if (updated.allocations[0]) {
        await tx.savingsGoalAllocation.update({
          where: { id: updated.allocations[0].id },
          data: {
            amount: 0,
          },
        });
      } else {
        await tx.savingsGoalAllocation.create({
          data: {
            savingsGoalId: goalId,
            amount: 0,
          },
        });
      }

      const refreshed = await tx.savingsGoal.findUniqueOrThrow({
        where: { id: goalId },
        include: {
          allocations: true,
        },
      });

      await AuditService.log(
        tx,
        userId,
        userId,
        'savings_goal',
        goalId,
        'deactivate',
        this.serializeGoal(existing as SavingsGoalRecord),
        this.serializeGoal(refreshed as SavingsGoalRecord),
      );

      return this.serializeGoal(refreshed as SavingsGoalRecord);
    });
  }

  static async setAllocations(userId: string, allocations: AllocationInput[]) {
    const normalized = allocations.map((allocation) => ({
      goalId: allocation.goalId,
      amountCents: amountToCents(allocation.amount),
    }));

    if (normalized.some((allocation) => allocation.amountCents < 0)) {
      throw new Error('No puedes asignar valores negativos a una meta.');
    }

    const duplicatedGoalIds = normalized
      .map((allocation) => allocation.goalId)
      .filter((goalId, index, array) => array.indexOf(goalId) !== index);

    if (duplicatedGoalIds.length > 0) {
      throw new Error('No puedes repetir la misma meta en la distribución.');
    }

    return prisma.$transaction(async (tx) => {
      const activeGoals = await tx.savingsGoal.findMany({
        where: {
          userId,
          deletedAt: null,
          status: 'active',
          isActive: true,
        },
        include: {
          allocations: true,
        },
      });

      const goalMap = new Map(activeGoals.map((goal: SavingsGoalRecord) => [goal.id, goal]));
      for (const allocation of normalized) {
        if (!goalMap.has(allocation.goalId)) {
          throw new Error('Una de las metas seleccionadas no existe o no está activa.');
        }
      }

      const totalSavingsCents = await this.calculateTotalSavingsCents(tx, userId);
      let totalAssignedCents = 0;

      for (const goal of activeGoals as SavingsGoalRecord[]) {
        const incoming = normalized.find((allocation) => allocation.goalId === goal.id);
        const nextAmountCents = incoming
          ? incoming.amountCents
          : amountToCents(Number(goal.allocations[0]?.amount ?? 0));
        const targetAmountCents = amountToCents(Number(goal.targetAmount));

        if (nextAmountCents > targetAmountCents) {
          throw new Error(`La meta '${goal.name}' no puede superar su monto objetivo.`);
        }

        totalAssignedCents += nextAmountCents;
      }

      if (totalAssignedCents > totalSavingsCents) {
        throw new Error('La suma asignada a metas no puede superar el total ahorrado disponible.');
      }

      for (const goal of activeGoals as SavingsGoalRecord[]) {
        const incoming = normalized.find((allocation) => allocation.goalId === goal.id);
        if (!incoming) {
          continue;
        }

        const existingAllocation = goal.allocations[0];
        const existingAmountCents = amountToCents(Number(goal.allocations[0]?.amount ?? 0));
        if (existingAmountCents === incoming.amountCents) {
          continue;
        }

        if (existingAllocation) {
          await tx.savingsGoalAllocation.update({
            where: { id: existingAllocation.id },
            data: {
              amount: centsToAmount(incoming.amountCents),
            },
          });
        } else {
          await tx.savingsGoalAllocation.create({
            data: {
              savingsGoalId: goal.id,
              amount: centsToAmount(incoming.amountCents),
            },
          });
        }

        await this.logAllocationChange(tx, userId, goal, existingAmountCents, incoming.amountCents, {
          source: 'manual_distribution',
          reason: 'user_updated_goal_distribution',
        });
      }

      return this.buildOverview(tx, userId);
    });
  }

  static async acknowledgeRebalanceNotice(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        savingsGoalRebalanceNotifiedAt: true,
      },
    });

    if (!user) {
      throw new Error('Usuario no encontrado.');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        savingsGoalRebalanceSeenAt: user.savingsGoalRebalanceNotifiedAt ?? new Date(),
      },
    });
  }
}
