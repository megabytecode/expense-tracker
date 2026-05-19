import express from 'express';
import type { Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { AccountService } from '../services/account.service.js';
import { parseFiniteNumber, parseRequiredString } from '../lib/request-validation.js';

export const accountRouter = express.Router();

accountRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const accounts = await AccountService.listAccounts(userId);
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

accountRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const { name, type, initialBalance } = req.body;

    if (type !== 'savings' && type !== 'cash') {
      return res.status(400).json({ error: 'Tipo de cuenta inválido' });
    }

    const account = await AccountService.createAccount(userId, {
      name: parseRequiredString(name, 'El nombre de la cuenta'),
      type,
      initialBalance: initialBalance === undefined ? 0 : parseFiniteNumber(initialBalance, 'El saldo inicial'),
    });

    res.status(201).json(account);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

accountRouter.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const accountId = req.params.id as string;
    const { name, type } = req.body;

    if (type && type !== 'savings' && type !== 'cash') {
      return res.status(400).json({ error: 'Tipo de cuenta inválido' });
    }

    const payload = {
      ...(name !== undefined ? { name: parseRequiredString(name, 'El nombre de la cuenta') } : {}),
      ...(type !== undefined ? { type } : {}),
    };

    const account = await AccountService.updateAccount(userId, accountId, payload);
    res.json(account);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

accountRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const accountId = req.params.id as string;

    await AccountService.deactivateAccount(userId, accountId);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
