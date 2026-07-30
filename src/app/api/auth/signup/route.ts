import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if duplicate user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'An account with this email address already exists.' },
        { status: 409 }
      );
    }

    // Hash password with cost factor 12
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate email verification token (expires in 24h)
    const verificationTokenVal = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // DB Transaction: Create user and verification token
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          isVerified: false,
          role: 'USER'
        }
      });

      await tx.verificationToken.create({
        data: {
          token: verificationTokenVal,
          email: normalizedEmail,
          expiresAt: tokenExpires
        }
      });
    });

    // Send verification email
    await sendVerificationEmail(normalizedEmail, verificationTokenVal);

    return NextResponse.json(
      { message: 'User registered successfully. Please check your email to verify your account.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred during signup.' },
      { status: 500 }
    );
  }
}
