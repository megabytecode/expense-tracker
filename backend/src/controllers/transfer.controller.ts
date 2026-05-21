import express from 'express';
import type { Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { TransferService } from '../services/transfer.service.js';
import {
  parseOptionalString,
  parsePositiveAmount,
  parseRequiredDate,
  parseRequiredString,
} from '../lib/request-validation.js';

export const transferRouter = express.Router();

function parsePagination(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return Math.floor(numeric);
}

transferRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const hasPagination = req.query.page !== undefined || req.query.pageSize !== undefined;
    const transfers = await TransferService.listTransfers(
      userId,
      hasPagination
        ? {
            page: parsePagination(req.query.page, 1),
            pageSize: Math.min(50, parsePagination(req.query.pageSize, 20)),
          }
        : undefined,
    );
    res.json(transfers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

transferRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const { sourceAccountId, destinationAccountId, reason, amount, notes, occurredAt } = req.body;

    const parsedNotes = parseOptionalString(notes);
    const transfer = await TransferService.createTransfer(userId, {
      sourceAccountId: parseRequiredString(sourceAccountId, 'La cuenta origen'),
      destinationAccountId: parseRequiredString(destinationAccountId, 'La cuenta destino'),
      reason: parseRequiredString(reason, 'El motivo'),
      amount: parsePositiveAmount(amount, 'El monto'),
      occurredAt: parseRequiredDate(occurredAt, 'La fecha'),
      ...(parsedNotes !== undefined ? { notes: parsedNotes } : {}),
    });

    res.status(201).json(transfer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

transferRouter.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const id = req.params.id as string;
    const { sourceAccountId, destinationAccountId, reason, amount, notes, occurredAt } = req.body;

    const parsedNotes = parseOptionalString(notes);
    const transfer = await TransferService.updateTransfer(userId, id, {
      sourceAccountId: parseRequiredString(sourceAccountId, 'La cuenta origen'),
      destinationAccountId: parseRequiredString(destinationAccountId, 'La cuenta destino'),
      reason: parseRequiredString(reason, 'El motivo'),
      amount: parsePositiveAmount(amount, 'El monto'),
      occurredAt: parseRequiredDate(occurredAt, 'La fecha'),
      ...(parsedNotes !== undefined ? { notes: parsedNotes } : {}),
    });

    res.json(transfer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

transferRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const id = req.params.id as string;

    await TransferService.deleteTransfer(userId, id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
