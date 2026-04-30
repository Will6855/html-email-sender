import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Ensure user is authenticated
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      newEmail, 
      currentPassword 
    } = await req.json();

    // Find the current user
    const user = await prisma.generalAccount.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
    }

    // Check if new email is already in use
    const existingUserWithEmail = await prisma.generalAccount.findUnique({
      where: { email: newEmail }
    });

    if (existingUserWithEmail) {
      return NextResponse.json({ error: 'Email is already in use' }, { status: 400 });
    }

    // Update email
    await prisma.generalAccount.update({
      where: { id: session.user.id },
      data: { email: newEmail }
    });

    return NextResponse.json({ message: 'Email changed successfully' }, { status: 200 });

  } catch (error) {
    console.error('Email change error:', error);
    return NextResponse.json({ error: 'Email change failed' }, { status: 500 });
  }
}