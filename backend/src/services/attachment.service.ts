import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';

export const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024;

const DEFAULT_ATTACHMENT_DIR = path.resolve(process.cwd(), 'storage', 'attachments');

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

type AttachmentOwner = {
  transactionId?: string;
  transferId?: string;
};

type StoredAttachment = {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

function getAttachmentBaseDir() {
  return process.env.ATTACHMENTS_LOCAL_DIR || DEFAULT_ATTACHMENT_DIR;
}

function serializeAttachment(attachment: {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  sizeBytes: bigint;
  createdAt: Date;
}): StoredAttachment {
  return {
    id: attachment.id,
    originalName: attachment.originalName,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: Number(attachment.sizeBytes),
    createdAt: attachment.createdAt,
  };
}

function sanitizeExtension(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  return extension.replace(/[^a-z0-9.]/g, '').slice(0, 16);
}

export class AttachmentService {
  static isAllowedMimeType(mimeType: string) {
    return ALLOWED_MIME_TYPES.has(mimeType);
  }

  private static async ensureTransactionOwner(userId: string, transactionId: string) {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!transaction) {
      throw new Error('Movimiento no encontrado.');
    }
  }

  private static async ensureTransferOwner(userId: string, transferId: string) {
    const transfer = await prisma.transfer.findFirst({
      where: {
        id: transferId,
        userId,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!transfer) {
      throw new Error('Transferencia no encontrada.');
    }
  }

  private static async ensureOwner(userId: string, owner: AttachmentOwner) {
    if (owner.transactionId) {
      await this.ensureTransactionOwner(userId, owner.transactionId);
      return;
    }

    if (owner.transferId) {
      await this.ensureTransferOwner(userId, owner.transferId);
      return;
    }

    throw new Error('Debes asociar el comprobante a un movimiento o transferencia.');
  }

  private static buildOwnerWhere(owner: AttachmentOwner) {
    if (owner.transactionId) {
      return { transactionId: owner.transactionId };
    }

    if (owner.transferId) {
      return { transferId: owner.transferId };
    }

    throw new Error('Debes asociar el comprobante a un movimiento o transferencia.');
  }

  static async listForOwner(userId: string, owner: AttachmentOwner) {
    await this.ensureOwner(userId, owner);

    const attachments = await prisma.attachment.findMany({
      where: {
        userId,
        isDeleted: false,
        ...this.buildOwnerWhere(owner),
      },
      orderBy: { createdAt: 'desc' },
    });

    return attachments.map(serializeAttachment);
  }

  static async addFilesToOwner(userId: string, owner: AttachmentOwner, files: Express.Multer.File[]) {
    if (files.length === 0) {
      throw new Error('Debes seleccionar al menos un comprobante.');
    }

    for (const file of files) {
      if (!this.isAllowedMimeType(file.mimetype)) {
        throw new Error(`El archivo ${file.originalname} no tiene un tipo permitido.`);
      }

      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        throw new Error(`El archivo ${file.originalname} supera el límite de 50 MB.`);
      }
    }

    await this.ensureOwner(userId, owner);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        storageLimitBytes: true,
        storageUsedBytes: true,
        maxAttachmentsPerMovement: true,
      },
    });

    if (!user) {
      throw new Error('Usuario no encontrado.');
    }

    const ownerWhere = this.buildOwnerWhere(owner);
    const existingCount = await prisma.attachment.count({
      where: {
        userId,
        isDeleted: false,
        ...ownerWhere,
      },
    });

    if (existingCount + files.length > user.maxAttachmentsPerMovement) {
      throw new Error(`Este movimiento permite máximo ${user.maxAttachmentsPerMovement} comprobantes.`);
    }

    const uploadSize = files.reduce((sum, file) => sum + BigInt(file.size), 0n);
    if (user.storageUsedBytes + uploadSize > user.storageLimitBytes) {
      throw new Error('No tienes espacio disponible suficiente para guardar estos comprobantes.');
    }

    const baseDir = getAttachmentBaseDir();
    const userDir = path.join(baseDir, userId);
    await fs.mkdir(userDir, { recursive: true });

    const stagedFiles: Array<{ storageKey: string; absolutePath: string }> = [];

    try {
      for (const file of files) {
        const fileName = `${randomUUID()}${sanitizeExtension(file.originalname)}`;
        const storageKey = path.join(userId, fileName);
        const absolutePath = path.join(baseDir, storageKey);
        await fs.writeFile(absolutePath, file.buffer, { flag: 'wx' });
        stagedFiles.push({ storageKey, absolutePath });
      }

      const created = await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            storageUsedBytes: {
              increment: uploadSize,
            },
          },
        });

        const records = [];
        for (const [index, file] of files.entries()) {
          const staged = stagedFiles[index];
          if (!staged) {
            throw new Error('No se pudo preparar el comprobante para guardarlo.');
          }

          const attachment = await tx.attachment.create({
            data: {
              userId,
              ...owner,
              originalName: file.originalname,
              fileName: path.basename(staged.storageKey),
              mimeType: file.mimetype,
              sizeBytes: BigInt(file.size),
              storageProvider: 'local',
              storageKey: staged.storageKey,
            },
          });

          records.push(attachment);
        }

        return records;
      });

      return created.map(serializeAttachment);
    } catch (error) {
      await Promise.allSettled(stagedFiles.map((file) => fs.rm(file.absolutePath, { force: true })));
      throw error;
    }
  }

  static async getDownload(userId: string, attachmentId: string) {
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        userId,
        isDeleted: false,
      },
    });

    if (!attachment) {
      throw new Error('Comprobante no encontrado.');
    }

    const absolutePath = path.join(getAttachmentBaseDir(), attachment.storageKey);

    return {
      stream: createReadStream(absolutePath),
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: Number(attachment.sizeBytes),
    };
  }

  static async softDelete(userId: string, attachmentId: string) {
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        userId,
        isDeleted: false,
      },
    });

    if (!attachment) {
      throw new Error('Comprobante no encontrado.');
    }

    await prisma.$transaction([
      prisma.attachment.update({
        where: { id: attachmentId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          storageUsedBytes: {
            decrement: attachment.sizeBytes,
          },
        },
      }),
    ]);
  }
}
