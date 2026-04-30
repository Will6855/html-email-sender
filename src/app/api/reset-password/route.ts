import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { 
      userId, 
      newPassword, 
      currentPassword, 
      resetToken 
    } = await req.json();

    // Scenario 1: Admin generating reset link
    if (!newPassword && session?.user.role === 'ADMIN') {
      // Find the user
      const user = await prisma.generalAccount.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Generate a unique reset token
      const generatedResetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Save the reset token and expiry in the database
      await prisma.generalAccount.update({
        where: { id: userId },
        data: {
          resetToken: generatedResetToken,
          resetTokenExpiry
        }
      });

      // Return the reset token 
      return NextResponse.json({ 
        message: 'Password reset link generated', 
        resetLink: `/reset-password?token=${generatedResetToken}` 
      }, { status: 200 });
    }

    // Scenario 2: Password reset with token
    if (resetToken) {
      const user = await prisma.generalAccount.findFirst({
        where: {
          resetToken,
          resetTokenExpiry: { gt: new Date() }
        }
      });

      if (!user) {
        return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      console.log(resetToken, hashedPassword);

      // Update password and clear reset token
      await prisma.generalAccount.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        }
      });

      return NextResponse.json({ message: 'Password reset successfully' }, { status: 200 });
    }

    // Scenario 3: Regular user changing their own password
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify current password for user-initiated password change
    const user = await prisma.generalAccount.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Add defensive checks for currentPassword and user.password
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }

    if (!user.password) {
      return NextResponse.json({ error: 'User password is not set' }, { status: 400 });
    }

    // Check current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await prisma.generalAccount.update({
      where: { id: session.user.id },
      data: { password: hashedPassword }
    });

    return NextResponse.json({ message: 'Password changed successfully' }, { status: 200 });

  } catch (error) {
    console.error('Password reset/change error:', error);
    return NextResponse.json({ error: 'Password operation failed' }, { status: 500 });
  }
}