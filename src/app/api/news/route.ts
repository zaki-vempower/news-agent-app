import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { newsAPIService } from '@/lib/newsAPI';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search');

    // If it's a search request, handle it separately
    if (search) {
      const articles = await newsAPIService.searchNews(search, page, pageSize);
      
      // Save search results to database asynchronously
      setImmediate(async () => {
        for (const article of articles) {
          try {
            await prisma.newsArticle.upsert({
              where: { url: article.url },
              update: {
                title: article.title,
                summary: article.description || article.content?.substring(0, 300) + '...',
                content: article.content || article.description || '',
                scrapedAt: new Date()
              },
              create: {
                title: article.title,
                summary: article.description || article.content?.substring(0, 300) + '...',
                content: article.content || article.description || '',
                url: article.url,
                imageUrl: article.urlToImage || undefined,
                source: article.source.name,
                category: article.category || 'general',
                publishedAt: new Date(article.publishedAt)
              }
            });
          } catch (error) {
            console.error('Error saving search result:', error);
          }
        }
      });

      return NextResponse.json({
        articles: articles.map(article => ({
          id: `search-${Date.now()}-${Math.random()}`,
          title: article.title,
          summary: article.description || article.content?.substring(0, 300) + '...',
          content: article.content || article.description || '',
          url: article.url,
          imageUrl: article.urlToImage,
          source: article.source.name,
          category: article.category || 'general',
          publishedAt: article.publishedAt,
          scrapedAt: new Date().toISOString()
        })),
        pagination: {
          page,
          pageSize,
          hasMore: articles.length === pageSize
        }
      });
    }

    // For regular news fetching, check if we have recent articles first
    const whereClause = category && category !== 'all' 
      ? { category: { equals: category } }
      : {};

    // Get cached articles from database
    const existingArticles = await prisma.newsArticle.findMany({
      where: whereClause,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    // Check if we have recent articles (less than 1 hour old)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hasRecentArticles = existingArticles.some(article => 
      new Date(article.scrapedAt) > oneHourAgo
    );

    // If we have recent articles, use cached data with proper pagination
    if (hasRecentArticles && existingArticles.length > 0) {
      const totalCount = await prisma.newsArticle.count({ where: whereClause });
      
      return NextResponse.json({
        articles: existingArticles,
        pagination: {
          page,
          pageSize,
          total: totalCount,
          hasMore: (page * pageSize) < totalCount
        }
      });
    }

    // Fetch fresh articles from APIs
    const freshArticles = await newsAPIService.fetchTopHeadlines({
      category: category === 'all' ? undefined : (category || undefined),
      page,
      pageSize
    });

    // Save new articles to database asynchronously
    const savedArticles = [];
    for (const article of freshArticles) {
      try {
        const saved = await prisma.newsArticle.upsert({
          where: { url: article.url },
          update: {
            title: article.title,
            summary: article.description || article.content?.substring(0, 300) + '...',
            content: article.content || article.description || '',
            imageUrl: article.urlToImage || undefined,
            category: article.category || 'general',
            scrapedAt: new Date()
          },
          create: {
            title: article.title,
            summary: article.description || article.content?.substring(0, 300) + '...',
            content: article.content || article.description || '',
            url: article.url,
            imageUrl: article.urlToImage || undefined,
            source: article.source.name,
            category: article.category || 'general',
            publishedAt: new Date(article.publishedAt)
          }
        });
        savedArticles.push(saved);
      } catch (error) {
        console.error('Error saving article:', error);
      }
    }

    return NextResponse.json({
      articles: savedArticles,
      pagination: {
        page,
        pageSize,
        hasMore: freshArticles.length === pageSize
      }
    });

  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch news',
        articles: [],
        pagination: { page: 1, pageSize: 20, hasMore: false }
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { forceRefresh, category, page = 1 } = await request.json();
    
    if (forceRefresh) {
      // Clear old articles and fetch fresh ones
      await prisma.newsArticle.deleteMany({
        where: {
          scrapedAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // older than 24 hours
          }
        }
      });
    }

    // Fetch fresh articles from APIs
    const freshArticles = await newsAPIService.fetchTopHeadlines({
      category: category === 'all' ? undefined : category,
      page,
      pageSize: 20
    });
    
    const savedArticles = [];
    for (const article of freshArticles) {
      try {
        const saved = await prisma.newsArticle.upsert({
          where: { url: article.url },
          update: {
            title: article.title,
            summary: article.description || article.content?.substring(0, 300) + '...',
            content: article.content || article.description || '',
            imageUrl: article.urlToImage || undefined,
            category: article.category || 'general',
            scrapedAt: new Date()
          },
          create: {
            title: article.title,
            summary: article.description || article.content?.substring(0, 300) + '...',
            content: article.content || article.description || '',
            url: article.url,
            imageUrl: article.urlToImage || undefined,
            source: article.source.name,
            category: article.category || 'general',
            publishedAt: new Date(article.publishedAt)
          }
        });
        savedArticles.push(saved);
      } catch (error) {
        console.error('Error upserting article:', error);
      }
    }

    // Filter by category if specified
    const filteredArticles = category && category !== 'all' 
      ? savedArticles.filter(article => 
          article.category?.toLowerCase() === category.toLowerCase()
        )
      : savedArticles;

    return NextResponse.json({
      articles: filteredArticles,
      pagination: {
        page,
        pageSize: 20,
        hasMore: freshArticles.length === 20
      }
    });
  } catch (error) {
    console.error('Error refreshing news:', error);
    return NextResponse.json(
      { 
        error: 'Failed to refresh news',
        articles: [],
        pagination: { page: 1, pageSize: 20, hasMore: false }
      },
      { status: 500 }
    );
  }
}
