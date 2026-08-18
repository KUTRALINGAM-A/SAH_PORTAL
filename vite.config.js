import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import nodemailer from 'nodemailer'

function otpEmailPlugin() {
  return {
    name: 'otp-email-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/send-otp' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', async () => {
            try {
              const { email, otpCode } = JSON.parse(body || '{}');

              if (!email || !otpCode) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Email and OTP code are required.' }));
                return;
              }

              const smtpUser = process.env.SMTP_USER || process.env.VITE_SMTP_USER || '27.kutralingam.xi.b@gmail.com';
              const smtpPass = process.env.SMTP_PASS || process.env.VITE_SMTP_PASS || 'ccmdrfqcdibluewc';

              const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                  user: smtpUser,
                  pass: smtpPass
                }
              });

              await transporter.sendMail({
                from: `"SAH Admin" <${smtpUser}>`,
                to: email,
                subject: 'SAH 2026 Portal - 6-Digit Password Reset OTP',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 20px;">
                      <h2 style="color: #E65100; margin: 0;">Smart Amrita Hackathon 2026</h2>
                      <p style="color: #666666; font-size: 0.9rem; margin-top: 4px;">Password Reset Request</p>
                    </div>
                    <p style="font-size: 0.95rem; color: #333333;">Your 6-digit OTP security code is:</p>
                    <div style="text-align: center; margin: 24px 0; padding: 16px; background-color: #FFF3E0; border-radius: 8px;">
                      <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #E65100; font-family: monospace;">${otpCode}</span>
                    </div>
                    <p style="font-size: 0.85rem; color: #666666;">This code is valid for 10 minutes. If you did not request this password reset, please ignore this email.</p>
                  </div>
                `
              });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'OTP sent successfully.' }));
            } catch (err) {
              console.error('OTP Send Error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Failed to send OTP email.' }));
            }
          });
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), otpEmailPlugin()],
})
