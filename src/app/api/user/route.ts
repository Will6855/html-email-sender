import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Delete all email accounts associated with the user
    await prisma.emailAccount.deleteMany({
      where: { generalAccountId: session.user.id }
    });

    // Delete the user account
    await prisma.generalAccount.delete({
      where: { id: session.user.id }
    });

    return NextResponse.json({ message: 'Account deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting user account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}