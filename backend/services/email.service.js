const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const sendVerificationEmail = async (email, token) => {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify your SafeGuard AI account',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:12px">
        <h1 style="color:#6366f1">🛡️ SafeGuard AI</h1>
        <h2>Verify Your Email</h2>
        <p>Click the button below to verify your account:</p>
        <a href="${url}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Verify Email</a>
        <p style="color:#64748b;margin-top:24px;font-size:14px">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async (email, token) => {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Reset your SafeGuard AI password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:12px">
        <h1 style="color:#6366f1">🛡️ SafeGuard AI</h1>
        <h2>Password Reset</h2>
        <p>You requested a password reset. Click below to set a new password:</p>
        <a href="${url}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Reset Password</a>
        <p style="color:#64748b;margin-top:24px;font-size:14px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
