import { prisma } from '../lib/prisma.js';

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

    return prisma.category.findMany({
      where: { 
        userId, 
        isActive: true, 
        deletedAt: null,
        isHidden: false, // Don't show manual adjustment
      },
      orderBy: { name: 'asc' },
    });
  }

  static async createCategory(userId: string, data: { name: string; type: 'income' | 'expense' }) {
    const name = data.name.trim();
    if (!name) {
      throw new Error('El nombre de la categoría es obligatorio.');
    }

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

    return prisma.category.create({
      data: {
        userId,
        name,
        type: data.type,
      },
    });
  }

  static async updateCategory(userId: string, categoryId: string, data: { name?: string; type?: 'income' | 'expense' }) {
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

    return prisma.category.update({
      where: { id: categoryId },
      data: normalizedData,
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
