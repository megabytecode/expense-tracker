import express from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { SettingsService } from '../services/settings.service.js';
import { prisma } from '../lib/prisma.js';

export const settingsRouter = express.Router();

settingsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const settings = await SettingsService.getUserSettings(userId);
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

settingsRouter.get('/monthly-plan', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const settings = await SettingsService.getMonthlyPlanSettings(userId);
    res.json(settings);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

settingsRouter.patch('/currency', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const { currencyCode } = req.body;

    if (!currencyCode) {
      return res.status(400).json({ error: 'Código de moneda requerido' });
    }
    
    const settings = await SettingsService.updateCurrency(userId, currencyCode);
    res.json(settings);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

settingsRouter.put('/monthly-plan', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const monthlyExpenseBase = Number(req.body?.monthlyExpenseBase ?? 0);
    const allocations = Array.isArray(req.body?.allocations) ? req.body.allocations : [];

    const settings = await SettingsService.upsertMonthlyPlanSettings(userId, {
      monthlyExpenseBase,
      allocations: allocations.map((allocation: any) => ({
        categoryId: allocation.categoryId,
        percentage: Number(allocation.percentage),
      })),
    });

    res.json(settings);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
