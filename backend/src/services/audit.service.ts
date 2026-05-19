import { prisma } from '../lib/prisma.js';

export class AuditService {
  static async log(
    tx: any, 
    userId: string, 
    actorUserId: string, 
    entityType: string, 
    entityId: string, 
    action: 'create' | 'update' | 'delete' | 'deactivate',
    previousValues?: any,
    newValues?: any
  ) {
    const db = tx || prisma;
    await db.auditLog.create({
      data: {
        userId,
        actorUserId,
        entityType,
        entityId,
        action,
        previousValues: previousValues ? JSON.parse(JSON.stringify(previousValues)) : null,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null
      }
    });
  }
}
