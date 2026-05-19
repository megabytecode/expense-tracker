import { prisma } from '../lib/prisma.js';
import { sendOtpEmail } from '../lib/email.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const MAX_ATTEMPTS = 5;
const COOLDOWN_MINUTES = 60;
const OTP_EXPIRY_MINUTES = 10;

function serializeAuthUser(user: {
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
  };
}

export class AuthService {
  static async requestOtp(email: string) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (existingUser && (!existingUser.isActive || existingUser.deletedAt)) {
      throw new Error('Tu cuenta está inactiva. Contacta a soporte si necesitas reactivarla.');
    }

    const activeOtp = await prisma.authOtp.findFirst({
      where: {
        email,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeOtp && activeOtp.cooldownUntil && activeOtp.cooldownUntil > new Date()) {
      throw new Error(`Too many attempts. Try again in ${Math.ceil((activeOtp.cooldownUntil.getTime() - Date.now()) / 60000)} minutes.`);
    }

    if (activeOtp) {
      await prisma.authOtp.update({
        where: { id: activeOtp.id },
        data: { consumedAt: new Date() }, // invalidate previous
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const codeHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

    await prisma.authOtp.create({
      data: {
        email,
        codeHash,
        expiresAt,
      },
    });

    await sendOtpEmail(email, otp);
  }

  static async verifyOtp(email: string, otp: string) {
    const activeOtp = await prisma.authOtp.findFirst({
      where: {
        email,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeOtp) {
      throw new Error('No active OTP found.');
    }

    if (activeOtp.cooldownUntil && activeOtp.cooldownUntil > new Date()) {
      throw new Error('Account temporarily locked due to too many failed attempts.');
    }

    if (activeOtp.expiresAt < new Date()) {
      throw new Error('OTP has expired.');
    }

    const isValid = await bcrypt.compare(otp, activeOtp.codeHash);

    if (!isValid) {
      const attemptsCount = activeOtp.attemptsCount + 1;
      let cooldownUntil = null;
      if (attemptsCount >= MAX_ATTEMPTS) {
        cooldownUntil = new Date(Date.now() + COOLDOWN_MINUTES * 60000);
      }
      
      await prisma.authOtp.update({
        where: { id: activeOtp.id },
        data: { attemptsCount, cooldownUntil },
      });

      throw new Error('Invalid OTP.');
    }

    await prisma.authOtp.update({
      where: { id: activeOtp.id },
      data: { consumedAt: new Date() },
    });

    // Create or find user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0] || 'User',
          // Defaults are handled by DB
        },
      });
    } else if (!user.isActive || user.deletedAt) {
      throw new Error('Tu cuenta está inactiva. Contacta a soporte si necesitas reactivarla.');
    }

    // Create session
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
      },
    });

    return { user: serializeAuthUser(user), sessionToken: rawToken };
  }

  static async revokeSession(rawToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const session = await prisma.session.findUnique({ where: { tokenHash } });
    
    if (session && !session.revokedAt) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
    }
  }
}
