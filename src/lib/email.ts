import nodemailer from 'nodemailer';

const host = process.env.EMAIL_HOST;
const port = parseInt(process.env.EMAIL_PORT || '587', 10);
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;
const from = process.env.EMAIL_FROM || 'noreply@secureauth.com';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function getTransporter() {
  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }
  return null;
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyLink = `${appUrl}/verify-email?token=${token}`;
  const transporter = getTransporter();

  const text = `Please verify your email address by clicking on the link below:\n\n${verifyLink}\n\nThis link expires in 24 hours.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #4f46e5; text-align: center;">Verify Your Email Address</h2>
      <p>Thank you for registering! Please confirm your email address to activate your account:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email</a>
      </div>
      <p style="font-size: 12px; color: #666;">Or copy and paste this URL into your browser:</p>
      <p style="font-size: 12px; color: #4f46e5; word-break: break-all;">${verifyLink}</p>
      <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
      <p style="font-size: 11px; color: #999; text-align: center;">This verification link will expire in 24 hours.</p>
    </div>
  `;

  if (transporter) {
    await transporter.sendMail({
      from,
      to: email,
      subject: 'Verify your email address',
      text,
      html,
    });
  } else {
    console.log('\n--- EMAIL VERIFICATION MOCK ---');
    console.log(`To: ${email}`);
    console.log(`Link: ${verifyLink}`);
    console.log('-------------------------------\n');
  }
}

export async function sendPasswordResetOtpEmail(email: string, otp: string) {
  const transporter = getTransporter();

  const text = `Your password reset verification code is: ${otp}\n\nThis OTP is valid for 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #4f46e5; text-align: center;">Reset Your Password</h2>
      <p>We received a request to reset your password. Use the following verification code to proceed:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4f46e5; background-color: #f3f4f6; padding: 12px 24px; border-radius: 8px; display: inline-block;">${otp}</span>
      </div>
      <p style="font-size: 14px; color: #666; text-align: center;">This code will expire in 10 minutes.</p>
      <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
      <p style="font-size: 11px; color: #999; text-align: center;">If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  if (transporter) {
    await transporter.sendMail({
      from,
      to: email,
      subject: 'Your password reset verification code',
      text,
      html,
    });
  } else {
    console.log('\n--- PASSWORD RESET OTP MOCK ---');
    console.log(`To: ${email}`);
    console.log(`Code: ${otp}`);
    console.log('-------------------------------\n');
  }
}

