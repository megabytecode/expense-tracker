import { prisma } from '../lib/prisma.js';
import { amountToCents, centsToAmount } from '../lib/money.js';

type CategoryPayload = {
  name: string;
  type: 'income' | 'expense';
  monthlyBudgetAmount?: number;
};

function parseMonthlyBudgetAmount(value: number | undefined) {
  if (value === undefined) {
    return 0;
  }

  if (!Number.isFinite(value) || value < 0) {
    throw new Error('El monto mensual de la categoría debe ser mayor o igual a cero.');
  }

  return centsToAmount(amountToCents(value));
}

function serializeCategory(category: {
  id: string;
  name: string;
  type: string;
  isHidden: boolean;
  isProtected: boolean;
  systemKey: string | null;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  budgetAllocations?: Array<{ amount: unknown }>;
}) {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    isHidden: category.isHidden,
    isProtected: category.isProtected,
    systemKey: category.systemKey,
    isActive: category.isActive,
    deletedAt: category.deletedAt,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    monthlyBudgetAmount: Number(category.budgetAllocations?.[0]?.amount ?? 0),
  };
}

export class CategoryService {
  static async getOrCreateSystemCategory(userId: string, systemKey: 'MANUAL_ADJUSTMENT' | 'DEBT') {
    let category = await prisma.category.findFirst({
      where: { userId, systemKey, isActive: true, deletedAt: null },
    });

    if (!category) {
      const data = systemKey === 'MANUAL_ADJUSTMENT' 
        ? { name: 'Ajustes manuales', type: 'expense', isHidden: true, isProtected: true, systemKey }
        : { name: 'Deudas', type: 'expense', isHidden: false, isProtected: true, systemKey };

      category = await prisma.category.create({
        data: {
          ...data,
          userId,
        },
      });
    }

    return category;
  }

  static async listCategories(userId: string) {
    await Promise.all([
      this.getOrCreateSystemCategory(userId, 'MANUAL_ADJUSTMENT'),
      this.getOrCreateSystemCategory(userId, 'DEBT'),
    ]);

    const categories = await prisma.category.findMany({
      where: { 
        userId, 
        isActive: true, 
        deletedAt: null,
        isHidden: false, // Don't show manual adjustment
      },
      include: {
        budgetAllocations: {
          where: { userId },
          select: { amount: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map(serializeCategory);
  }

  static async createCategory(userId: string, data: CategoryPayload) {
    const name = data.name.trim();
    if (!name) {
      throw new Error('El nombre de la categoría es obligatorio.');
    }
    const monthlyBudgetAmount = parseMonthlyBudgetAmount(data.monthlyBudgetAmount);

    // Check for active duplicates
    const existing = await prisma.category.findFirst({
      where: {
        userId,
        name,
        type: data.type,
        isActive: true,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new Error(`Ya existe una categoría activa llamada '${name}' para el tipo '${data.type}'.`);
    }

    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({
        data: {
          userId,
          name,
          type: data.type,
        },
        include: {
          budgetAllocations: {
            where: { userId },
            select: { amount: true },
          },
        },
      });

      if (data.type === 'expense') {
        await tx.user.update({
          where: { id: userId },
          data: { monthlyPlanMode: 'amount' },
        });

        await tx.categoryBudgetAllocation.create({
          data: {
            userId,
            categoryId: created.id,
            percentage: 0,
            amount: monthlyBudgetAmount,
          },
        });
      }

      return created;
    });

    return serializeCategory({
      ...category,
      budgetAllocations: data.type === 'expense'
        ? [{ amount: monthlyBudgetAmount }]
        : category.budgetAllocations,
    });
  }

  static async updateCategory(userId: string, categoryId: string, data: Partial<CategoryPayload>) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId, isActive: true, deletedAt: null },
    });

    if (!category) {
      throw new Error('Categoría no encontrada');
    }

    if (category.isProtected) {
      throw new Error('No se pueden modificar las categorías protegidas');
    }

    const normalizedData = {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
    };
    const nextType = normalizedData.type ?? category.type;
    const monthlyBudgetAmount = parseMonthlyBudgetAmount(data.monthlyBudgetAmount);

    if (normalizedData.name !== undefined && !normalizedData.name) {
      throw new Error('El nombre de la categoría es obligatorio.');
    }

    if (normalizedData.name || normalizedData.type) {
      const nameToCheck = normalizedData.name || category.name;
      const typeToCheck = normalizedData.type || category.type;
      
      const existing = await prisma.category.findFirst({
        where: {
          userId,
          name: nameToCheck,
          type: typeToCheck,
          isActive: true,
          deletedAt: null,
          id: { not: categoryId },
        },
      });

      if (existing) {
        throw new Error(`Ya existe una categoría activa llamada '${nameToCheck}' para el tipo '${typeToCheck}'.`);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedCategory = await tx.category.update({
        where: { id: categoryId },
        data: normalizedData,
        include: {
          budgetAllocations: {
            where: { userId },
            select: { amount: true },
          },
        },
      });

      if (nextType === 'expense') {
        await tx.user.update({
          where: { id: userId },
          data: { monthlyPlanMode: 'amount' },
        });

        await tx.categoryBudgetAllocation.upsert({
          where: {
            userId_categoryId: {
              userId,
              categoryId,
            },
          },
          create: {
            userId,
            categoryId,
            percentage: 0,
            amount: monthlyBudgetAmount,
          },
          update: {
            percentage: 0,
            amount: monthlyBudgetAmount,
          },
        });
      } else {
        await tx.categoryBudgetAllocation.deleteMany({
          where: {
            userId,
            categoryId,
          },
        });
      }

      return updatedCategory;
    });

    return serializeCategory({
      ...updated,
      budgetAllocations: nextType === 'expense'
        ? [{ amount: monthlyBudgetAmount }]
        : updated.budgetAllocations,
    });
  }

  static async deactivateCategory(userId: string, categoryId: string) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId },
    });

    if (!category) {
      throw new Error('Categoría no encontrada');
    }

    if (category.isProtected) {
      throw new Error('No se pueden eliminar las categorías protegidas (ej. Deudas)');
    }

    return prisma.category.update({
      where: { id: categoryId },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }
}
