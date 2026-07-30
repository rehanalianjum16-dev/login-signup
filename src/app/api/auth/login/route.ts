import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@/lib/db';
import { signAccessToken } from '@/lib/jwt';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  let emailInput = '';

  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    emailInput = email.toLowerCase().trim();

    // 1. Rate Limiting Check
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const failedAttempts = await prisma.loginAttempt.count({
      where: {
        OR: [
          { email: emailInput },
          { ip: ip }
        ],
        success: false,
        timestamp: {
          gte: fifteenMinutesAgo
        }
      }
    });

    if (failedAttempts >= 5) {
      return NextResponse.json(
        { message: 'Too many failed login attempts. Account temporarily locked out. Please try again after 15 minutes.' },
        { status: 429 }
      );
    }

    // 2. Fetch User
    const user = await prisma.user.findUnique({
      where: { email: emailInput }
    });

    // 3. Check User Credentials (generic error messages to prevent email enumeration)
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      // Record failed attempt
      await prisma.loginAttempt.create({
        data: {
          email: emailInput,
          ip,
          success: false
        }
      });

      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // 4. Verify email status
    if (!user.isVerified) {
      // Create a failed attempt because login was blocked
      await prisma.loginAttempt.create({
        data: {
          email: emailInput,
          ip,
          success: false
        }
      });

      return NextResponse.json(
        { message: 'Your email address is not verified. Please check your inbox for a verification email.' },
        { status: 403 }
      );
    }

    // 5. Successful login audit log
    await prisma.loginAttempt.create({
      data: {
        email: emailInput,
        ip,
        success: true
      }
    });

    // 6. Generate access JWT token
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // 7. Generate long-lived refresh token
    const refreshTokenVal = crypto.randomBytes(64).toString('hex');
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store refresh token in DB
    await prisma.refreshToken.create({
      data: {
        token: refreshTokenVal,
        userId: user.id,
        expiresAt: refreshExpires
      }
    });

    // 8. Set refresh token inside HTTP-only secure cookie
    cookies().set('refresh_token', refreshTokenVal, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: refreshExpires,
      path: '/'
    });

    // Return safe user object + access token
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      },
      accessToken
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred during login.' },
      { status: 500 }
    );
  }
}
