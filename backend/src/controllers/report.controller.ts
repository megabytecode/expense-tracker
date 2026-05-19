import express from 'express';
import type { Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { ReportService } from '../services/report.service.js';

export const reportRouter = express.Router();

function parseOptionalDate(value: unknown) {
  if (!value || typeof value !== 'string') {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('La fecha enviada no es válida.');
  }

  return parsed;
}

function parsePagination(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return Math.floor(numeric);
}

reportRouter.get('/overview', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const range = ReportService.normalizeRange(
      parseOptionalDate(req.query.startDate),
      parseOptionalDate(req.query.endDate),
    );

    const overview = await ReportService.getOverview(req.user.id, range);
    res.json(overview);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

reportRouter.get('/category-breakdown', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const type = req.query.type;
    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ error: 'Debes indicar un tipo válido: income o expense.' });
    }

    const range = ReportService.normalizeRange(
      parseOptionalDate(req.query.startDate),
      parseOptionalDate(req.query.endDate),
    );

    const breakdown = await ReportService.getCategoryBreakdown(req.user.id, type, range);
    res.json({
      type,
      range,
      items: breakdown,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

reportRouter.get('/category-movements', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const type = req.query.type;
    const categoryId = req.query.categoryId;

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ error: 'Debes indicar un tipo válido: income o expense.' });
    }

    if (!categoryId || typeof categoryId !== 'string') {
      return res.status(400).json({ error: 'La categoría es obligatoria.' });
    }

    const range = ReportService.normalizeRange(
      parseOptionalDate(req.query.startDate),
      parseOptionalDate(req.query.endDate),
    );

    const result = await ReportService.getCategoryMovements(req.user.id, type, categoryId, range, {
      page: parsePagination(req.query.page, 1),
      pageSize: Math.min(50, parsePagination(req.query.pageSize, 10)),
    });

    res.json({
      type,
      range,
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

reportRouter.get('/transfers', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const range = ReportService.normalizeRange(
      parseOptionalDate(req.query.startDate),
      parseOptionalDate(req.query.endDate),
    );

    const result = await ReportService.getTransferSummary(req.user.id, range, {
      page: parsePagination(req.query.page, 1),
      pageSize: Math.min(50, parsePagination(req.query.pageSize, 10)),
    });

    res.json({
      range,
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
