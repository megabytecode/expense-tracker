import express from 'express';
import type { Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { TransactionService } from '../services/transaction.service.js';
import {
  parseArray,
  parseFiniteNumber,
  parseOptionalString,
  parseRequiredDate,
  parseRequiredString,
} from '../lib/request-validation.js';

export const transactionRouter = express.Router();

function parsePagination(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return Math.floor(numeric);
}

function parseAllocations(value: unknown) {
  const allocations = parseArray(value, 'Las asignaciones');
  if (allocations.length === 0) {
    throw new Error('Debes registrar al menos una cuenta afectada.');
  }

  return allocations.map((allocation: any) => {
    const direction = allocation?.direction;
    if (direction !== undefined && direction !== 'in' && direction !== 'out') {
      throw new Error('La dirección de una asignación no es válida.');
    }

    return {
      accountId: parseRequiredString(allocation?.accountId, 'La cuenta'),
      amount: parseFiniteNumber(allocation?.amount, 'El monto de la asignación'),
      ...(direction ? { direction } : {}),
    };
  });
}

transactionRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const hasPagination = req.query.page !== undefined || req.query.pageSize !== undefined;
    const transactions = await TransactionService.listTransactions(
      userId,
      hasPagination
        ? {
            page: parsePagination(req.query.page, 1),
            pageSize: Math.min(50, parsePagination(req.query.pageSize, 20)),
          }
        : undefined,
    );
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

transactionRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const id = req.params.id as string;
    const tx = await TransactionService.getTransaction(userId, id);
    res.json(tx);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

transactionRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const { type, categoryId, description, notes, totalAmount, debtId, occurredAt, allocations } = req.body;

    if (!['income', 'expense', 'manual_adjustment'].includes(type)) {
      return res.status(400).json({ error: 'Tipo de movimiento inválido' });
    }

    const parsedNotes = parseOptionalString(notes);
    const parsedDebtId = debtId === undefined || debtId === null ? undefined : parseRequiredString(debtId, 'La deuda');
    const tx = await TransactionService.createTransaction(userId, {
      type,
      categoryId,
      description: parseRequiredString(description, 'La descripción'),
      totalAmount: parseFiniteNumber(totalAmount, 'El monto total'),
      occurredAt: parseRequiredDate(occurredAt, 'La fecha'),
      allocations: parseAllocations(allocations),
      ...(parsedNotes !== undefined ? { notes: parsedNotes } : {}),
      ...(parsedDebtId !== undefined ? { debtId: parsedDebtId } : {}),
    });

    res.status(201).json(tx);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

transactionRouter.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const id = req.params.id as string;
    const { categoryId, description, notes, totalAmount, debtId, occurredAt, allocations } = req.body;

    const parsedNotes = parseOptionalString(notes);
    const parsedDebtId = debtId === undefined || debtId === null ? undefined : parseRequiredString(debtId, 'La deuda');
    const parsedCategoryId =
      categoryId === undefined || categoryId === null ? undefined : parseRequiredString(categoryId, 'La categoría');
    const tx = await TransactionService.updateTransaction(userId, id, {
      description: parseRequiredString(description, 'La descripción'),
      totalAmount: parseFiniteNumber(totalAmount, 'El monto total'),
      occurredAt: parseRequiredDate(occurredAt, 'La fecha'),
      allocations: parseAllocations(allocations),
      ...(parsedCategoryId !== undefined ? { categoryId: parsedCategoryId } : {}),
      ...(parsedNotes !== undefined ? { notes: parsedNotes } : {}),
      ...(parsedDebtId !== undefined ? { debtId: parsedDebtId } : {}),
    });

    res.json(tx);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

transactionRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user.id;
    const id = req.params.id as string;

    await TransactionService.deleteTransaction(userId, id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
