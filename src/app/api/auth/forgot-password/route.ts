import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { sendPasswordResetOtpEmail } from '@/lib/email';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check user existence
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    // Prevent user enumeration by always returning a generic response
    const genericSuccessResponse = NextResponse.json({
      message: 'If an account exists with that email, a 6-digit OTP code has been sent.'
    });

    if (!user) {
      return genericSuccessResponse;
    }

    // Check existing OTP status for rate-limiting
    const existingOtp = await prisma.passwordResetOtp.findUnique({
      where: { email: normalizedEmail }
    });

    const now = new Date();
    let requestCount = 1;
    let lastRequestedAt = now;

    if (existingOtp) {
      const timeSinceLastRequest = now.getTime() - existingOtp.lastRequestedAt.getTime();
      
      // 1. Cooldown check (60 seconds)
      if (timeSinceLastRequest < 60000) {
        const secondsLeft = Math.ceil((60000 - timeSinceLastRequest) / 1000);
        return NextResponse.json(
          { message: `Please wait ${secondsLeft} seconds before requesting a new OTP.` },
          { status: 429 }
        );
      }

      // 2. Hourly rate-limiting check (Max 3 per hour)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      if (existingOtp.lastRequestedAt > oneHourAgo) {
        if (existingOtp.requestCount >= 3) {
          return NextResponse.json(
            { message: 'Maximum OTP requests exceeded. Please try again in an hour.' },
            { status: 429 }
          );
        }
        requestCount = existingOtp.requestCount + 1;
      } else {
        requestCount = 1; // Reset hourly window
      }
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash the OTP (cost factor 12 for strong storage encryption)
    const otpHash = await bcrypt.hash(otp, 12);
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes expiry

    // Save/Upsert OTP record in the DB
    await prisma.passwordResetOtp.upsert({
      where: { email: normalizedEmail },
      update: {
        userId: user.id,
        otpHash,
        attempts: 0,
        expiresAt,
        requestCount,
        lastRequestedAt
      },
      create: {
        email: normalizedEmail,
        userId: user.id,
        otpHash,
        attempts: 0,
        expiresAt,
        requestCount,
        lastRequestedAt
      }
    });

    // Send the plain OTP code
    await sendPasswordResetOtpEmail(normalizedEmail, otp);

    return genericSuccessResponse;
  } catch (error) {
    console.error('Forgot password OTP request error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
