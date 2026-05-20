import express from 'express';
import type { Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { CategoryService } from '../services/category.service.js';
import { parseFiniteNumber, parseRequiredString } from '../lib/request-validation.js';

export const categoryRouter = express.Router();

categoryRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const categories = await CategoryService.listCategories(userId);
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

categoryRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const { name, type, monthlyBudgetAmount } = req.body;

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ error: 'Tipo de categoría inválido' });
    }

    const category = await CategoryService.createCategory(userId, {
      name: parseRequiredString(name, 'El nombre de la categoría'),
      type,
      ...(monthlyBudgetAmount !== undefined
        ? { monthlyBudgetAmount: parseFiniteNumber(monthlyBudgetAmount, 'El monto mensual') }
        : {}),
    });
    res.status(201).json(category);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

categoryRouter.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const categoryId = req.params.id as string;
    const { name, type, monthlyBudgetAmount } = req.body;

    if (type && type !== 'income' && type !== 'expense') {
      return res.status(400).json({ error: 'Tipo de categoría inválido' });
    }

    const payload = {
      ...(name !== undefined ? { name: parseRequiredString(name, 'El nombre de la categoría') } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(monthlyBudgetAmount !== undefined
        ? { monthlyBudgetAmount: parseFiniteNumber(monthlyBudgetAmount, 'El monto mensual') }
        : {}),
    };

    const category = await CategoryService.updateCategory(userId, categoryId, payload);
    res.json(category);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

categoryRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const categoryId = req.params.id as string;

    await CategoryService.deactivateCategory(userId, categoryId);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
