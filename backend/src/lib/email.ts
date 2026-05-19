import nodemailer from 'nodemailer';
import { z } from 'zod';

const smtpSchema = z.object({
  SMTP_HOST: z.string().optional().default('smtp.gmail.com'),
  SMTP_PORT: z.string().optional().default('587'),
  SMTP_USER: z.string().optional().default('test@gmail.com'),
  SMTP_PASS: z.string().optional().default('password'),
});

const env = smtpSchema.parse(process.env);

export const emailTransporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: parseInt(env.SMTP_PORT, 10),
  secure: parseInt(env.SMTP_PORT, 10) === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string) {
  // In a real scenario we'd send the email. For local dev without real creds, we just log it.
  if (process.env.NODE_ENV !== 'production' && env.SMTP_USER === 'test@gmail.com') {
    console.log(`[MOCK EMAIL] OTP for ${to} is: ${otp}`);
    return;
  }
  
  await emailTransporter.sendMail({
    from: `"Expense Tracker" <${env.SMTP_USER}>`,
    to,
    subject: 'Your Login Code',
    text: `Your login code is: ${otp}. It will expire in 10 minutes.`,
  });
}
