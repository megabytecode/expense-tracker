import { prisma } from '../lib/prisma.js';

function serializeAuditValue(value: unknown) {
  return JSON.parse(
    JSON.stringify(value, (_key, nestedValue) => {
      if (typeof nestedValue === 'bigint') {
        return nestedValue.toString();
      }

      return nestedValue;
    }),
  );
}

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
        previousValues: previousValues ? serializeAuditValue(previousValues) : null,
        newValues: newValues ? serializeAuditValue(newValues) : null
      }
    });
  }
}
