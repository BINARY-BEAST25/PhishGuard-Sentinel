// Email utility using Nodemailer
const nodemailer = require('nodemailer');

const createTransporter = () => nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html
  });
};

const sendVerificationEmail = async (email, token) => {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: '🛡️ Verify your SafeGuard AI account',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:12px">
        <h1 style="color:#6366f1">SafeGuard AI</h1>
        <h2>Verify Your Email</h2>
        <p>Click the button below to verify your email address and activate your account.</p>
        <a href="${url}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:20px 0">Verify Email</a>
        <p style="color:#94a3b8;font-size:14px">This link expires in 24 hours. If you didn't sign up, ignore this email.</p>
      </div>
    `
  });
};

const sendPasswordResetEmail = async (email, token) => {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: '🔐 SafeGuard AI - Password Reset',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:12px">
        <h1 style="color:#6366f1">SafeGuard AI</h1>
        <h2>Reset Your Password</h2>
        <p>You requested a password reset. Click below to set a new password.</p>
        <a href="${url}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:20px 0">Reset Password</a>
        <p style="color:#94a3b8;font-size:14px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
