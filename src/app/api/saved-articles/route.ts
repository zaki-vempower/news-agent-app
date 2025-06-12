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

    const { articleId, notes, articleData } = await request.json();

    if (!articleId) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      );
    }

    // Check if article exists in database
    let article = await prisma.newsArticle.findUnique({
      where: { id: articleId },
    });

    // If article doesn't exist and we have article data, try to find by URL or create it
    if (!article && articleData) {
      // First try to find by URL (in case it was saved with a different ID)
      article = await prisma.newsArticle.findUnique({
        where: { url: articleData.url },
      });

      // If still not found, create the article
      if (!article) {
        try {
          article = await prisma.newsArticle.create({
            data: {
              title: articleData.title,
              summary: articleData.summary || '',
              content: articleData.content || '',
              url: articleData.url,
              imageUrl: articleData.imageUrl || undefined,
              source: articleData.source,
              category: articleData.category || 'general',
              publishedAt: new Date(articleData.publishedAt)
            }
          });
        } catch (error) {
          console.error('Error creating article:', error);
          return NextResponse.json(
            { error: 'Failed to save article to database' },
            { status: 500 }
          );
        }
      }
    }

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found and no article data provided' },
        { status: 404 }
      );
    }

    // Use the actual article ID from the database
    const dbArticleId = article.id;

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      console.error('User not found in database:', session.user.id);
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Check if already saved
    const existingSave = await prisma.savedArticle.findUnique({
      where: {
        userId_articleId: {
          userId: session.user.id,
          articleId: dbArticleId,
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
    try {
      const savedArticle = await prisma.savedArticle.create({
        data: {
          userId: session.user.id,
          articleId: dbArticleId,
          notes: notes || null,
        },
        include: {
          article: true,
        },
      });

      return NextResponse.json(savedArticle);
    } catch (createError: unknown) {
      console.error('Error creating saved article:', {
        error: createError instanceof Error ? createError.message : 'Unknown error',
        userId: session.user.id,
        articleId: dbArticleId
      });

      return NextResponse.json(
        { 
          error: 'Failed to save article', 
          details: process.env.NODE_ENV === 'development' && createError instanceof Error ? createError.message : undefined 
        },
        { status: 500 }
      );
    }
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

    // First find the saved article to make sure it exists
    const savedArticle = await prisma.savedArticle.findUnique({
      where: {
        userId_articleId: {
          userId: session.user.id,
          articleId: articleId,
        },
      },
    });

    if (!savedArticle) {
      return NextResponse.json(
        { error: 'Saved article not found' },
        { status: 404 }
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
