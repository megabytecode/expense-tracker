import express from 'express';
import type { Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { DebtService } from '../services/debt.service.js';

export const debtRouter = express.Router();

debtRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const debts = await DebtService.listDebts(req.user.id);
    res.json(debts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

debtRouter.get('/active-with-balance', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const debts = await DebtService.listActiveDebtsWithBalance(req.user.id);
    res.json(debts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

debtRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { name, description, totalAmount, paymentDays, isActive } = req.body;

    const debt = await DebtService.createDebt(req.user.id, {
      name,
      description,
      totalAmount: Number(totalAmount),
      paymentDays: Array.isArray(paymentDays) ? paymentDays.map((day) => Number(day)) : [],
      isActive: isActive === undefined ? true : Boolean(isActive),
    });

    res.status(201).json(debt);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

debtRouter.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { name, description, totalAmount, paymentDays, isActive } = req.body;

    const debt = await DebtService.updateDebt(req.user.id, req.params.id as string, {
      name,
      description,
      totalAmount: Number(totalAmount),
      paymentDays: Array.isArray(paymentDays) ? paymentDays.map((day) => Number(day)) : [],
      isActive: isActive === undefined ? undefined : Boolean(isActive),
    });

    res.json(debt);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

debtRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const debt = await DebtService.deactivateDebt(req.user.id, req.params.id as string);
    res.json(debt);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
