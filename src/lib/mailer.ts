import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.HOSTINGER_SMTP_HOST || "smtp.hostinger.com",
  port: Number(process.env.HOSTINGER_SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.HOSTINGER_SMTP_USER,
    pass: process.env.HOSTINGER_SMTP_PASS,
  },
});

const DEFAULT_FROM = process.env.HOSTINGER_SMTP_FROM || `SitioHoy <${process.env.HOSTINGER_SMTP_USER}>`;

export async function sendMail(options: { to: string; subject: string; html: string; from?: string }) {
  try {
    await transporter.sendMail({
      from: options.from || DEFAULT_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al enviar el email" };
  }
}
