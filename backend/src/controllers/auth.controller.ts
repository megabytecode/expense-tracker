import { Router, type Request, type Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { requireAuth, type AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { z } from 'zod';

export const authRouter = Router();

const requestOtpSchema = z.object({
  email: z.string().email(),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

authRouter.post('/request-otp', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = requestOtpSchema.parse(req.body);
    await AuthService.requestOtp(email);
    res.json({ message: 'OTP sent' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error requesting OTP' });
  }
});

authRouter.post('/verify-otp', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, otp } = verifyOtpSchema.parse(req.body);
    const { user, sessionToken } = await AuthService.verifyOtp(email, otp);
    
    res.cookie('sessionId', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({ user });
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Invalid OTP' });
  }
});

authRouter.post('/logout', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const token = req.cookies.sessionId;
    if (token) {
      await AuthService.revokeSession(token);
      res.clearCookie('sessionId');
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  res.json({ user: req.user });
});
