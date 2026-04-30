import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { decryptPassword } from '@/lib/encryption';

export async function POST(request: Request) {
  // Check if user is authenticated
  const session = await getServerSession(authOptions);
  if (!session || session?.user?.role === 'DEMO') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const accountId = formData.get('accountId') as string;

  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const smtpServer = account.smtpServer;
  const port = account.smtpPort.toString();
  const email = account.email;
  const password = decryptPassword(account.password);
  const to = formData.get('to') as string;
  const subject = formData.get('subject') as string;
  const htmlContent = formData.get('htmlContent') as string;
  const senderName = formData.get('senderName') as string;
  const attachments = formData.getAll('attachments') as File[];
  const cidImages = formData.getAll('cidImages') as string[];

  let transporter = nodemailer.createTransport({
    host: smtpServer,
    port: parseInt(port, 10),
    secure: parseInt(port, 10) === 465,
    auth: {
      user: email,
      pass: password,
    },
  });

  try {
    await transporter.verify();
    await transporter.sendMail({
      from: `${senderName} <${email}>`,
      to: to,
      subject: subject,
      html: htmlContent,
      attachments: [
        // Process CID images
        ...await Promise.all(cidImages.map(async (file, index) => {
          const base64Data = file.split(',')[1];
          const mimeType = file.split(';')[0].split(':')[1];
          const filename = `image_${index}.${mimeType.split('/')[1]}`;
          return {
            filename: filename,
            content: Buffer.from(base64Data, 'base64'),
            cid: filename.replace(/\.[^/.]+$/, ''),
          };
        })).then(attachments => attachments.filter(attachment => attachment !== null)),
        // Process regular attachments
        ...await Promise.all(attachments.map(async (file) => ({
          filename: file.name,
          content: Buffer.from(await file.arrayBuffer()),
        }))),
      ],
    });
    return NextResponse.json({ message: 'Email sent successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to send email:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to send email' }, { status: 500 });
  }
}