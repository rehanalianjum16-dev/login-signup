import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

const resetPasswordSchema = z.object({
  tempResetToken: z.string().min(1, 'Temporary reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-prod';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = resetPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { tempResetToken, password } = result.data;

    // Verify the temporary reset JWT
    let email = '';
    try {
      const payload = jwt.verify(tempResetToken, JWT_SECRET) as { email?: string; purpose?: string };
      
      if (!payload.email || payload.purpose !== 'reset-password') {
        return NextResponse.json(
          { message: 'Invalid or expired password reset token.' },
          { status: 400 }
        );
      }
      
      email = payload.email;
    } catch (err) {
      return NextResponse.json(
        { message: 'Your reset window has expired. Please verify your OTP code again.' },
        { status: 400 }
      );
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User account not found.' },
        { status: 404 }
      );
    }

    // Hash the new password with bcrypt cost factor 12
    const newPasswordHash = await bcrypt.hash(password, 12);

    // DB Transaction: Update user's password and invalidate all active session refresh tokens
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash }
      });

      await tx.refreshToken.deleteMany({
        where: { userId: user.id }
      });
    });

    return NextResponse.json({
      message: 'Password reset successfully! You can now log in.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
