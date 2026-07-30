import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import prisma from '@/lib/db';
import { signAccessToken } from '@/lib/jwt';

export async function POST() {
  try {
    const tokenVal = cookies().get('refresh_token')?.value;

    if (!tokenVal) {
      return NextResponse.json(
        { message: 'Refresh token is missing.' },
        { status: 401 }
      );
    }

    // Find the token in the DB
    const existingToken = await prisma.refreshToken.findUnique({
      where: { token: tokenVal },
      include: { user: true }
    });

    if (!existingToken) {
      return NextResponse.json(
        { message: 'Invalid refresh token.' },
        { status: 401 }
      );
    }

    // Check expiration
    if (new Date() > existingToken.expiresAt) {
      await prisma.refreshToken.delete({
        where: { id: existingToken.id }
      });
      return NextResponse.json(
        { message: 'Refresh token has expired.' },
        { status: 401 }
      );
    }

    // Token reuse detection (Security Guard)
    if (existingToken.revoked) {
      // Stolen token detected! Invalidate all sessions for this user.
      await prisma.refreshToken.deleteMany({
        where: { userId: existingToken.userId }
      });

      // Clear cookie
      cookies().set('refresh_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: new Date(0),
        path: '/'
      });

      return NextResponse.json(
        { message: 'Security Compromise Detected: All active sessions have been terminated. Please log in again.' },
        { status: 401 }
      );
    }

    // Rotate tokens
    // 1. Mark current token as revoked
    await prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { revoked: true }
    });

    // 2. Generate new refresh token
    const newRefreshTokenVal = crypto.randomBytes(64).toString('hex');
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.refreshToken.create({
      data: {
        token: newRefreshTokenVal,
        userId: existingToken.userId,
        expiresAt: refreshExpires
      }
    });

    // 3. Set the new cookie
    cookies().set('refresh_token', newRefreshTokenVal, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: refreshExpires,
      path: '/'
    });

    // 4. Generate new access token
    const accessToken = signAccessToken({
      userId: existingToken.user.id,
      email: existingToken.user.email,
      role: existingToken.user.role
    });

    return NextResponse.json({
      accessToken,
      user: {
        id: existingToken.user.id,
        name: existingToken.user.name,
        email: existingToken.user.email,
        role: existingToken.user.role,
        isVerified: existingToken.user.isVerified
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred while refreshing your token.' },
      { status: 500 }
    );
  }
}
