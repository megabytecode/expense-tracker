import express from 'express';
import type { Response } from 'express';
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

settingsRouter.patch('/monthly-plan-mode', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const { monthlyPlanMode } = req.body;

    const settings = await SettingsService.updateMonthlyPlanMode(userId, monthlyPlanMode);
    res.json(settings);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

settingsRouter.put('/monthly-plan', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const monthlyExpenseBase = Number(req.body?.monthlyExpenseBase ?? 0);
    const monthlyPlanMode = req.body?.monthlyPlanMode ?? 'amount';
    const allocations = Array.isArray(req.body?.allocations) ? req.body.allocations : [];

    const settings = await SettingsService.upsertMonthlyPlanSettings(userId, {
      monthlyExpenseBase,
      monthlyPlanMode,
      allocations: allocations.map((allocation: any) => ({
        categoryId: allocation.categoryId,
        percentage: Number(allocation.percentage ?? 0),
        amount: Number(allocation.amount ?? 0),
      })),
    });

    res.json(settings);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
