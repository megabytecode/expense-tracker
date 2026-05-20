import express from 'express';
import type { NextFunction, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middlewares/auth.middleware.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { AttachmentService, MAX_ATTACHMENT_SIZE_BYTES } from '../services/attachment.service.js';

export const attachmentRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ATTACHMENT_SIZE_BYTES,
    files: 20,
  },
  fileFilter: (_req, file, cb) => {
    if (!AttachmentService.isAllowedMimeType(file.mimetype)) {
      cb(new Error(`El archivo ${file.originalname} no tiene un tipo permitido.`));
      return;
    }

    cb(null, true);
  },
});

function uploadFiles(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  upload.array('files')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'Cada comprobante debe pesar máximo 50 MB.' });
      return;
    }

    res.status(400).json({ error: error.message || 'No se pudieron procesar los comprobantes.' });
  });
}

function getFiles(req: AuthenticatedRequest) {
  return Array.isArray(req.files) ? req.files : [];
}

attachmentRouter.get(
  '/transactions/:transactionId/attachments',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const attachments = await AttachmentService.listForOwner(req.user.id, {
        transactionId: req.params.transactionId as string,
      });
      res.json(attachments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

attachmentRouter.post(
  '/transactions/:transactionId/attachments',
  requireAuth,
  uploadFiles,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const attachments = await AttachmentService.addFilesToOwner(
        req.user.id,
        { transactionId: req.params.transactionId as string },
        getFiles(req),
      );
      res.status(201).json(attachments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

attachmentRouter.get(
  '/transfers/:transferId/attachments',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const attachments = await AttachmentService.listForOwner(req.user.id, {
        transferId: req.params.transferId as string,
      });
      res.json(attachments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

attachmentRouter.post(
  '/transfers/:transferId/attachments',
  requireAuth,
  uploadFiles,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const attachments = await AttachmentService.addFilesToOwner(
        req.user.id,
        { transferId: req.params.transferId as string },
        getFiles(req),
      );
      res.status(201).json(attachments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);

attachmentRouter.get(
  '/attachments/:id/download',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      const download = await AttachmentService.getDownload(req.user.id, req.params.id as string);
      res.setHeader('Content-Type', download.mimeType);
      res.setHeader('Content-Length', String(download.sizeBytes));
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(download.originalName)}"`);
      download.stream.on('error', () => {
        if (!res.headersSent) {
          res.status(404).json({ error: 'No se pudo leer el comprobante.' });
        } else {
          res.end();
        }
      });
      download.stream.pipe(res);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  },
);

attachmentRouter.delete(
  '/attachments/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
      await AttachmentService.softDelete(req.user.id, req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
);
