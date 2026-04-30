import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { encryptPassword, decryptPassword } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const userAccounts = await prisma.emailAccount.findMany({
      where: { generalAccountId: userId }
    });

    userAccounts.forEach(account => {
      account.password = decryptPassword(account.password);
    });

    return NextResponse.json(userAccounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { email, password, name, smtpServer, smtpPort } = await request.json();

    // Validate input
    if (!email || !password || !name || !smtpServer || !smtpPort) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newAccount = await prisma.emailAccount.create({
      data: {
        email,
        password: encryptPassword(password),
        name,
        smtpServer,
        smtpPort,
        generalAccountId: userId
      }
    });

    return NextResponse.json(newAccount, { status: 201 });
  } catch (error) {
    console.error('Error adding account:', error);
    return NextResponse.json({ error: 'Failed to add account' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id, email, password, name, smtpServer, smtpPort } = await request.json();

    // Validate input
    if (!id || !email || !name || !smtpServer || !smtpPort) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updatedAccount = await prisma.emailAccount.update({
      where: { 
        id: id,
        generalAccountId: userId 
      },
      data: {
        email,
        name,
        smtpServer,
        smtpPort,
        // Only update password if a new one is provided
        ...(password && { password: encryptPassword(password) }),
      }
    });

    return NextResponse.json(updatedAccount, { status: 200 });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('id');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    await prisma.emailAccount.delete({
      where: { 
        id: accountId,
        generalAccountId: session.user.id 
      }
    });

    return NextResponse.json({ message: 'Account deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}