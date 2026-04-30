import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.emailTemplate.findMany({
      where: { generalAccountId: session.user.id },
      select: { name: true, content: true , subject: true, senderName: true}
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, content, subject, senderName } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Upsert template - create or update if exists
    const template = await prisma.emailTemplate.upsert({
      where: { 
        name_generalAccountId: {
          name,
          generalAccountId: session.user.id
        }
      },
      update: { 
        content, 
        subject, 
        senderName 
      },
      create: { 
        name, 
        content, 
        subject, 
        senderName,
        generalAccountId: session.user.id 
      }
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error creating/updating template:', error);
    return NextResponse.json({ error: 'Failed to create/update template' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    await prisma.emailTemplate.delete({
      where: { 
        name_generalAccountId: {
          name,
          generalAccountId: session.user.id
        }
      }
    });

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}