import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { message: 'Verification token is required.' },
        { status: 400 }
      );
    }

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token }
    });

    if (!verificationToken) {
      return NextResponse.json(
        { message: 'Invalid or expired email verification token.' },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date() > verificationToken.expiresAt) {
      await prisma.verificationToken.delete({
        where: { id: verificationToken.id }
      });
      return NextResponse.json(
        { message: 'Verification link has expired. Please sign up again.' },
        { status: 400 }
      );
    }

    // Transaction: Verify user and delete token
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { email: verificationToken.email },
        data: { isVerified: true }
      });

      await tx.verificationToken.delete({
        where: { id: verificationToken.id }
      });
    });

    return NextResponse.json({
      message: 'Your email address has been verified successfully! You can now log in.'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred during email verification.' },
      { status: 500 }
    );
  }
}
