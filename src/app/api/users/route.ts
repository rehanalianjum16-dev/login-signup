import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { verifyAccessToken } from '@/lib/jwt';

const createStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  role: z.enum(['OWNER', 'MANAGER', 'CASHIER'])
});

async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);
  if (!payload) return null;

  return prisma.user.findUnique({
    where: { id: payload.userId }
  });
}

export async function GET(request: Request) {
  try {
    const caller = await getAuthenticatedUser(request);

    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (caller.role === 'CASHIER') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    let users = [];

    if (caller.role === 'OWNER') {
      // Owners see everyone
      users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isVerified: true,
          createdAt: true
        }
      });
    } else if (caller.role === 'MANAGER') {
      // Managers only see Cashiers
      users = await prisma.user.findMany({
        where: {
          role: 'CASHIER'
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isVerified: true,
          createdAt: true
        }
      });
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const caller = await getAuthenticatedUser(request);

    if (!caller) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (caller.role === 'CASHIER') {
      return NextResponse.json({ message: 'Forbidden: Cashiers cannot create staff accounts.' }, { status: 403 });
    }

    const body = await request.json();
    const result = createStaffSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, role } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Enforce role hierarchy: Managers can ONLY create Cashiers
    if (caller.role === 'MANAGER' && role !== 'CASHIER') {
      return NextResponse.json(
        { message: 'Forbidden: Managers are only authorized to register Cashier accounts.' },
        { status: 403 }
      );
    }

    // Check duplicate email
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

    // Create staff member (isVerified is true by default since admin created)
    const newStaff = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role,
        isVerified: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      message: `${role} account created successfully.`,
      user: newStaff
    }, { status: 201 });
  } catch (error) {
    console.error('Create staff error:', error);
    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
