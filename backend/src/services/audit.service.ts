import { prisma } from '../lib/prisma.js';
import { serializeJsonValue } from '../lib/json.js';

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
        previousValues: previousValues ? serializeJsonValue(previousValues) : null,
        newValues: newValues ? serializeJsonValue(newValues) : null
      }
    });
  }
}
