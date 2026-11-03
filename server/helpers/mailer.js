const nodemailer = require("nodemailer");

// Real SMTP when SMTP_HOST is set, otherwise messages are only logged (safe for local dev).
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

const sendMail = async ({ to, subject, html, attachments }) => {
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || "E-Learning <no-reply@elearning.local>",
    to,
    subject,
    html,
    attachments,
  });
  if (!process.env.SMTP_HOST) console.log(`[mail:dev] to=${to} subject="${subject}"`);
  return info;
};

module.exports = { sendMail };
