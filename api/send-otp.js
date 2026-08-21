import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Enable CORS headers if needed
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { email, otpCode } = body;

    if (!email || !otpCode) {
      return res.status(400).json({ error: 'Email and OTP code are required.' });
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
      subject: 'SAH 2026 Portal - 6-Digit Security Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #E65100; margin: 0;">Smart Amrita Hackathon 2026</h2>
            <p style="color: #666666; font-size: 0.9rem; margin-top: 4px;">Security Verification Code</p>
          </div>
          <p style="font-size: 0.95rem; color: #333333;">Your 6-digit OTP security code is:</p>
          <div style="text-align: center; margin: 24px 0; padding: 16px; background-color: #FFF3E0; border-radius: 8px;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #E65100; font-family: monospace;">${otpCode}</span>
          </div>
          <p style="font-size: 0.85rem; color: #666666;">This code is valid for 10 minutes. If you did not request this verification code, please ignore this email.</p>
        </div>
      `
    });

    return res.status(200).json({ success: true, message: 'OTP sent successfully.' });
  } catch (err) {
    console.error('Vercel OTP Send Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to send OTP email.' });
  }
}
