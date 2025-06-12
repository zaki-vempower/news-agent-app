import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Fetch all chat sessions for the authenticated user
export async function GET() {
  try {
    const session = await getServerSession(authOptions) as { user?: { email?: string } } | null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const chatSessions = await prisma.chatSession.findMany({
      where: { userId: user.id },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(chatSessions);
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new chat session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as { user?: { email?: string } } | null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { title, selectedArticles } = await request.json();

    // Set all other sessions to inactive
    await prisma.chatSession.updateMany({
      where: { userId: user.id },
      data: { isActive: false },
    });

    const chatSession = await prisma.chatSession.create({
      data: {
        userId: user.id,
        title: title || `Chat ${new Date().toLocaleDateString()}`,
        isActive: true,
        selectedArticles: selectedArticles ? JSON.stringify(selectedArticles) : null,
      },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    return NextResponse.json(chatSession, { status: 201 });
  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
