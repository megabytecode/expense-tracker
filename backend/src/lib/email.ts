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

function buildOtpEmailText(otp: string) {
  return [
    'Expense Tracker',
    '',
    'Tu código de acceso es:',
    otp,
    '',
    'Este código vence en 10 minutos.',
    '',
    'GUÍA',
    '1. Configuración inicial',
    'Empiezas creando tus cuentas, que representan dónde está tu dinero. Puedes crear cuentas normales para uso diario, como efectivo, banco o billetera, y también cuentas de ahorro. La diferencia principal es que una cuenta normal se usa para registrar movimientos financieros habituales, como ingresos, gastos, transferencias y ajustes. En cambio, una cuenta de ahorro se usa para separar dinero destinado a ahorro y llevar un control más claro de ese saldo.',
    '',
    '2. Registro de movimientos diarios',
    'Cuando recibes dinero, registras un ingreso. Cuando gastas, registras un gasto. Si mueves dinero entre tus propias cuentas, registras una transferencia (un movimiento entre tus cuentas que no cuenta como gasto ni ingreso, y sirve también como tracking para quienes declaran renta y mueven mucho dinero entre cuentas). Cada movimiento puede incluir descripción, monto, fecha, categoría y, si hace falta, distribución entre varias cuentas. Esto permite que el dinero quede correctamente ubicado.',
    '',
    '3. Manejo de ahorros',
    'Los ahorros se organizan usando las cuentas de tipo ahorro. Los objetivos de ahorro son organizativos: te ayudan a dar seguimiento al propósito del dinero, pero no crean transacciones financieras por sí solos. El dinero real sigue viviendo dentro de las cuentas de ahorro. Para abonarle a un ahorro, normalmente mueves dinero hacia una cuenta de ahorro, por ejemplo mediante una transferencia desde una cuenta normal.',
    '',
    '4. Manejo de deudas',
    'Las deudas no se llevan como un sistema separado del flujo financiero diario, pero te permiten tener un listado de las mismas para que, de la mano de la herramienta de ahorro, puedas hacer presupuestos. Cuando pagas una deuda, registras ese pago como un gasto, usando la categoría correspondiente. Así el pago impacta correctamente tus movimientos, tus cuentas y tu historial.',
    '',
    '5. Revisión y control',
    'Desde el historial de movimientos puedes revisar, editar y corregir registros. Mientras más constante seas al registrar ingresos, gastos, ahorros, transferencias y pagos de deuda, mayor claridad tendrás sobre tu situación financiera.',
  ].join('\n');
}

function buildOtpEmailHtml(otp: string) {
  return `
    <!doctype html>
    <html lang="es">
      <body style="margin:0;padding:0;background:#07111f;font-family:Arial,Helvetica,sans-serif;color:#e5eef8;">
        <div style="padding:24px 12px;background:
          radial-gradient(circle at top left,#12345a 0%,rgba(18,52,90,0) 35%),
          radial-gradient(circle at top right,#0f766e 0%,rgba(15,118,110,0) 28%),
          linear-gradient(180deg,#07111f 0%,#0b1728 100%);
        ">
          <div style="max-width:720px;margin:0 auto;background:#0f1c2e;border:1px solid rgba(148,163,184,.18);border-radius:28px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.32);">
            <div style="padding:32px 28px 24px;border-bottom:1px solid rgba(148,163,184,.12);background:linear-gradient(180deg,rgba(20,184,166,.12) 0%,rgba(15,23,42,0) 100%);">
              <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(20,184,166,.12);border:1px solid rgba(45,212,191,.22);color:#99f6e4;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">
                Expense Tracker
              </div>
              <h1 style="margin:18px 0 8px;font-size:30px;line-height:1.15;color:#f8fafc;">
                🔐 Código de acceso
              </h1>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#cbd5e1;">
                Aquí tienes tu código OTP para ingresar a Expense Tracker. Es personal y vence en <strong style="color:#f8fafc;">10 minutos</strong>.
              </p>
            </div>

            <div style="padding:28px;">
              <div style="margin-bottom:24px;border-radius:24px;background:linear-gradient(135deg,rgba(37,99,235,.16),rgba(20,184,166,.12));border:1px solid rgba(96,165,250,.18);padding:22px;">
                <p style="margin:0 0 10px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#93c5fd;font-weight:700;">
                  Código OTP
                </p>
                <div style="font-size:36px;line-height:1;font-weight:800;letter-spacing:.28em;color:#ffffff;">
                  ${otp}
                </div>
                <p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#bfdbfe;">
                  Si no fuiste tú quien intentó ingresar, puedes ignorar este correo con tranquilidad.
                </p>
              </div>

              <div style="margin-bottom:24px;border-radius:22px;background:#111f34;border:1px solid rgba(148,163,184,.14);padding:22px;">
                <h2 style="margin:0 0 6px;font-size:22px;color:#f8fafc;">📘 Guía</h2>
                <p style="margin:0;font-size:14px;line-height:1.7;color:#cbd5e1;">
                  Un resumen rápido para ayudarte a entender cómo registrar y organizar tus finanzas dentro de la aplicación.
                </p>
              </div>

              <div style="display:grid;gap:14px;">
                <div style="border-radius:20px;background:#0b1728;border:1px solid rgba(148,163,184,.12);padding:18px;">
                  <h3 style="margin:0 0 8px;font-size:17px;color:#f8fafc;">🧱 1. Configuración inicial</h3>
                  <p style="margin:0;font-size:14px;line-height:1.75;color:#d7e0ea;">
                    Empiezas creando tus cuentas, que representan dónde está tu dinero. Puedes crear cuentas normales para uso diario, como efectivo, banco o billetera, y también cuentas de ahorro. La diferencia principal es que una cuenta normal se usa para registrar movimientos financieros habituales, como ingresos, gastos, transferencias y ajustes. En cambio, una cuenta de ahorro se usa para separar dinero destinado a ahorro y llevar un control más claro de ese saldo.
                  </p>
                </div>

                <div style="border-radius:20px;background:#0b1728;border:1px solid rgba(148,163,184,.12);padding:18px;">
                  <h3 style="margin:0 0 8px;font-size:17px;color:#f8fafc;">💸 2. Registro de movimientos diarios</h3>
                  <p style="margin:0;font-size:14px;line-height:1.75;color:#d7e0ea;">
                    Cuando recibes dinero, registras un ingreso. Cuando gastas, registras un gasto. Si mueves dinero entre tus propias cuentas, registras una transferencia, un movimiento entre tus cuentas que no cuenta como gasto ni ingreso y que también sirve como tracking para quienes declaran renta y mueven mucho dinero entre cuentas. Cada movimiento puede incluir descripción, monto, fecha, categoría y, si hace falta, distribución entre varias cuentas. Esto permite que el dinero quede correctamente ubicado.
                  </p>
                </div>

                <div style="border-radius:20px;background:#0b1728;border:1px solid rgba(148,163,184,.12);padding:18px;">
                  <h3 style="margin:0 0 8px;font-size:17px;color:#f8fafc;">🏦 3. Manejo de ahorros</h3>
                  <p style="margin:0;font-size:14px;line-height:1.75;color:#d7e0ea;">
                    Los ahorros se organizan usando las cuentas de tipo ahorro. Los objetivos de ahorro son organizativos: te ayudan a dar seguimiento al propósito del dinero, pero no crean transacciones financieras por sí solos. El dinero real sigue viviendo dentro de las cuentas de ahorro. Para abonarle a un ahorro, normalmente mueves dinero hacia una cuenta de ahorro, por ejemplo mediante una transferencia desde una cuenta normal.
                  </p>
                </div>

                <div style="border-radius:20px;background:#0b1728;border:1px solid rgba(148,163,184,.12);padding:18px;">
                  <h3 style="margin:0 0 8px;font-size:17px;color:#f8fafc;">📉 4. Manejo de deudas</h3>
                  <p style="margin:0;font-size:14px;line-height:1.75;color:#d7e0ea;">
                    Las deudas no se llevan como un sistema separado del flujo financiero diario, pero te permiten tener un listado de las mismas para que, de la mano de la herramienta de ahorro, puedas hacer presupuestos. Cuando pagas una deuda, registras ese pago como un gasto, usando la categoría correspondiente. Así el pago impacta correctamente tus movimientos, tus cuentas y tu historial.
                  </p>
                </div>

                <div style="border-radius:20px;background:#0b1728;border:1px solid rgba(148,163,184,.12);padding:18px;">
                  <h3 style="margin:0 0 8px;font-size:17px;color:#f8fafc;">📊 5. Revisión y control</h3>
                  <p style="margin:0;font-size:14px;line-height:1.75;color:#d7e0ea;">
                    Desde el historial de movimientos puedes revisar, editar y corregir registros. Mientras más constante seas al registrar ingresos, gastos, ahorros, transferencias y pagos de deuda, mayor claridad tendrás sobre tu situación financiera.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendOtpEmail(to: string, otp: string) {
  // In a real scenario we'd send the email. For local dev without real creds, we just log it.
  if (process.env.NODE_ENV !== 'production' && env.SMTP_USER === 'test@gmail.com') {
    console.log(`[MOCK EMAIL] OTP for ${to} is: ${otp}`);
    return;
  }
  
  await emailTransporter.sendMail({
    from: `"Expense Tracker" <${env.SMTP_USER}>`,
    to,
    subject: '🔐 Tu código de acceso a Expense Tracker',
    text: buildOtpEmailText(otp),
    html: buildOtpEmailHtml(otp),
  });
}
