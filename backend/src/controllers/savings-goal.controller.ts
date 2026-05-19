import express from 'express';
import type { Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { SavingsGoalService } from '../services/savings-goal.service.js';

export const savingsGoalRouter = express.Router();

savingsGoalRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const goals = await SavingsGoalService.listGoals(req.user.id);
    res.json(goals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

savingsGoalRouter.get('/overview', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const overview = await SavingsGoalService.getOverview(req.user.id);
    res.json(overview);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

savingsGoalRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { name, description, targetAmount, targetDate, status } = req.body;
    const goal = await SavingsGoalService.createGoal(req.user.id, {
      name,
      description,
      targetAmount: Number(targetAmount),
      targetDate: targetDate ? new Date(targetDate) : null,
      status,
    });

    res.status(201).json(goal);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

savingsGoalRouter.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const { name, description, targetAmount, targetDate, status } = req.body;
    const goal = await SavingsGoalService.updateGoal(req.user.id, req.params.id as string, {
      name,
      description,
      targetAmount: Number(targetAmount),
      targetDate: targetDate ? new Date(targetDate) : null,
      status,
    });

    res.json(goal);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

savingsGoalRouter.put('/allocations', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const allocations = Array.isArray(req.body?.allocations) ? req.body.allocations : [];
    const overview = await SavingsGoalService.setAllocations(
      req.user.id,
      allocations.map((allocation: any) => ({
        goalId: allocation.goalId,
        amount: Number(allocation.amount),
      })),
    );

    res.json(overview);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

savingsGoalRouter.post('/rebalance-notice/acknowledge', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    await SavingsGoalService.acknowledgeRebalanceNotice(req.user.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

savingsGoalRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const goal = await SavingsGoalService.deactivateGoal(req.user.id, req.params.id as string);
    res.json(goal);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
