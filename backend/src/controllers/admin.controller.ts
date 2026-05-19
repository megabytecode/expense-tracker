import express from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import { requireAdmin, requireAuth, type AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { AdminService } from '../services/admin.service.js';

export const adminRouter = express.Router();

const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['admin', 'user']).optional(),
  segment: z.enum(['all', 'admins', 'risk']).optional(),
});

const updateLimitsSchema = z.object({
  storageLimitBytes: z.number().int().positive().optional(),
  maxAttachmentsPerMovement: z.number().int().positive().optional(),
}).refine((payload) => payload.storageLimitBytes !== undefined || payload.maxAttachmentsPerMovement !== undefined, {
  message: 'Debes enviar al menos un ajuste administrativo.',
});

adminRouter.get('/users', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const parsed = listUsersQuerySchema.parse(req.query);
    const filters = {
      ...(parsed.search ? { search: parsed.search } : {}),
      ...(parsed.role ? { role: parsed.role } : {}),
      ...(parsed.segment ? { segment: parsed.segment } : {}),
    };
    const result = await AdminService.listUsers(filters);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

adminRouter.patch('/users/:id/deactivate', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const result = await AdminService.deactivateUser(req.user.id, req.params.id as string);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

adminRouter.patch('/users/:id/limits', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const payload = updateLimitsSchema.parse({
      storageLimitBytes: req.body?.storageLimitBytes !== undefined ? Number(req.body.storageLimitBytes) : undefined,
      maxAttachmentsPerMovement: req.body?.maxAttachmentsPerMovement !== undefined ? Number(req.body.maxAttachmentsPerMovement) : undefined,
    });

    const normalizedPayload = {
      ...(payload.storageLimitBytes !== undefined ? { storageLimitBytes: payload.storageLimitBytes } : {}),
      ...(payload.maxAttachmentsPerMovement !== undefined
        ? { maxAttachmentsPerMovement: payload.maxAttachmentsPerMovement }
        : {}),
    };

    const result = await AdminService.updateUserLimits(req.user.id, req.params.id as string, normalizedPayload);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

adminRouter.delete('/users/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const result = await AdminService.deleteUser(req.user.id, req.params.id as string);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
