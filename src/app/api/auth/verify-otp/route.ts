import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Verification code must be 6 digits')
});

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-prod';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = verifyOtpSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, code } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Fetch the OTP session
    const otpRecord = await prisma.passwordResetOtp.findUnique({
      where: { email: normalizedEmail }
    });

    if (!otpRecord) {
      return NextResponse.json(
        { message: 'Invalid or expired verification session.' },
        { status: 400 }
      );
    }

    // 1. Check expiration
    if (new Date() > otpRecord.expiresAt) {
      await prisma.passwordResetOtp.delete({
        where: { id: otpRecord.id }
      });
      return NextResponse.json(
        { message: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // 2. Check failed attempts (lockout threshold)
    if (otpRecord.attempts >= 5) {
      await prisma.passwordResetOtp.delete({
        where: { id: otpRecord.id }
      });
      return NextResponse.json(
        { message: 'Too many failed verification attempts. This OTP has been invalidated. Please request a new one.' },
        { status: 400 }
      );
    }

    // 3. Compare code against hash
    const isValid = await bcrypt.compare(code, otpRecord.otpHash);

    if (!isValid) {
      const nextAttemptsCount = otpRecord.attempts + 1;
      
      if (nextAttemptsCount >= 5) {
        // Purge token immediately on 5th failure
        await prisma.passwordResetOtp.delete({
          where: { id: otpRecord.id }
        });
        return NextResponse.json(
          { message: 'Too many failed verification attempts. This OTP has been invalidated. Please request a new one.' },
          { status: 400 }
        );
      }

      // Increment attempt count
      await prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: nextAttemptsCount }
      });

      return NextResponse.json(
        { message: `Invalid verification code. You have ${5 - nextAttemptsCount} attempts remaining.` },
        { status: 400 }
      );
    }

    // 4. Verification Successful!
    // Transaction: Delete the verification record to prevent reuse, and prepare token response
    await prisma.passwordResetOtp.delete({
      where: { id: otpRecord.id }
    });

    // Generate a temporary reset JWT (5 minutes validity)
    const tempResetToken = jwt.sign(
      { email: normalizedEmail, purpose: 'reset-password' },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    return NextResponse.json({
      message: 'OTP verified successfully.',
      tempResetToken
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
