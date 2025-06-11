import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as { user?: { id?: string } } | null;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const savedArticles = await prisma.savedArticle.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        article: true,
      },
      orderBy: {
        savedAt: 'desc',
      },
    });

    return NextResponse.json(savedArticles);
  } catch (error) {
    console.error('Error fetching saved articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved articles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as { user?: { id?: string } } | null;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { articleId, notes } = await request.json();

    if (!articleId) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      );
    }

    // Check if article exists
    const article = await prisma.newsArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Check if already saved
    const existingSave = await prisma.savedArticle.findUnique({
      where: {
        userId_articleId: {
          userId: session.user.id,
          articleId: articleId,
        },
      },
    });

    if (existingSave) {
      return NextResponse.json(
        { error: 'Article already saved' },
        { status: 409 }
      );
    }

    // Save the article
    const savedArticle = await prisma.savedArticle.create({
      data: {
        userId: session.user.id,
        articleId: articleId,
        notes: notes || null,
      },
      include: {
        article: true,
      },
    });

    return NextResponse.json(savedArticle);
  } catch (error) {
    console.error('Error saving article:', error);
    return NextResponse.json(
      { error: 'Failed to save article' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as { user?: { id?: string } } | null;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');

    if (!articleId) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      );
    }

    // Remove the saved article
    await prisma.savedArticle.delete({
      where: {
        userId_articleId: {
          userId: session.user.id,
          articleId: articleId,
        },
      },
    });

    return NextResponse.json({ message: 'Article removed from saved list' });
  } catch (error) {
    console.error('Error removing saved article:', error);
    return NextResponse.json(
      { error: 'Failed to remove saved article' },
      { status: 500 }
    );
  }
}
