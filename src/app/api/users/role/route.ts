import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function PUT(request: Request) {
  // Check if user is authenticated and is an admin
  const session = await getServerSession(authOptions);
  
  if (!session || session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId, role } = await request.json();

    // Validate input
    if (!userId || !role || !['ADMIN', 'USER', 'DEMO'].includes(role)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Update user role
    const updatedUser = await prisma.generalAccount.update({
      where: { id: userId },
      data: { role }
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error('User role update error:', error);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
}