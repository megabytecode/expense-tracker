import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  currencyCode: string;
  isActive: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: SessionUser | any;
}

function serializeSessionUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  currencyCode: string;
  isActive: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    currencyCode: user.currencyCode,
    isActive: user.isActive,
  } satisfies SessionUser;
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  const { prisma } = await import('../lib/prisma.js');
  const token = req.cookies?.sessionId;
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          currencyCode: true,
          isActive: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!session || session.revokedAt) {
    return res.status(401).json({ error: 'Session invalid or expired' });
  }

  if (!session.user || !session.user.isActive || session.user.deletedAt) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: session.revokedAt ?? new Date() },
    });

    return res.status(403).json({ error: 'User account is inactive.' });
  }

  // Update last used at
  await prisma.session.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() }
  });

  req.user = serializeSessionUser(session.user);
  next();
};

export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin role required.' });
  }
  next();
};
