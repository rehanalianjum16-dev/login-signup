import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';

export async function POST() {
  try {
    const refreshToken = cookies().get('refresh_token')?.value;

    if (refreshToken) {
      // Invalidate the token in the database by deleting it
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
      });
    }

    // Clear the HTTP-only secure cookie
    cookies().set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0), // Set to epoch to force expiration
      path: '/'
    });

    return NextResponse.json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred during logout.' },
      { status: 500 }
    );
  }
}
