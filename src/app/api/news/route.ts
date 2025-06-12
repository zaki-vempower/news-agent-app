import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { newsAPIService, NewsAPIArticle } from '@/lib/newsAPI';

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
      
      // Filter search results to only include articles from last 2 days
      const searchTwoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const recentArticles = articles.filter(article => {
        const publishedDate = new Date(article.publishedAt);
        return publishedDate >= searchTwoDaysAgo;
      });
      
      // Save search results to database asynchronously
      setImmediate(async () => {
        for (const article of recentArticles) {
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
        articles: recentArticles.map(article => ({
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
          hasMore: recentArticles.length === pageSize
        }
      });
    }

    // For regular news fetching, check if we have recent articles first
    // Only show articles from the last 2 days
    const mainTwoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    
    const whereClause = {
      publishedAt: {
        gte: mainTwoDaysAgo
      },
      ...(category && category !== 'all' 
        ? { category: { equals: category } }
        : {})
    };

    // Get cached articles from database (within last 2 days only)
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

    // Fetch fresh articles from APIs with priority on breaking news
    let freshArticles: NewsAPIArticle[] = [];

    // First, try to get some breaking news
    try {
      const breakingNews = await newsAPIService.fetchBreakingNews(5);
      freshArticles.push(...breakingNews);
    } catch (error) {
      console.warn('Could not fetch breaking news:', error);
    }

    // Then get regular articles to fill the rest
    const regularArticles = await newsAPIService.fetchTopHeadlines({
      category: category === 'all' ? undefined : (category || undefined),
      page,
      pageSize: Math.max(pageSize - freshArticles.length, 10)
    });

    // Combine and deduplicate
    const allArticles = [...freshArticles, ...regularArticles];
    const uniqueArticles = allArticles.filter((article, index, self) => 
      index === self.findIndex(a => a.url === article.url)
    );

    // Sort by publication date (most recent first)
    freshArticles = uniqueArticles
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, pageSize);

    // Filter fresh articles to only include those published within last 2 days
    const recentFreshArticles = freshArticles.filter(article => {
      const publishedDate = new Date(article.publishedAt);
      return publishedDate >= mainTwoDaysAgo;
    });

    // Save new articles to database asynchronously
    const savedArticles = [];
    for (const article of recentFreshArticles) {
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
        hasMore: recentFreshArticles.length === pageSize
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
    
    // Define date constants for the POST function
    const postTwoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    if (forceRefresh) {
      // Clear old articles (older than 2 days) and scraped data older than 24 hours
      await prisma.newsArticle.deleteMany({
        where: {
          OR: [
            {
              publishedAt: {
                lt: postTwoDaysAgo
              }
            },
            {
              scrapedAt: {
                lt: oneDayAgo
              }
            }
          ]
        }
      });
    }

    // Fetch fresh articles from APIs with breaking news priority
    let freshArticles: NewsAPIArticle[] = [];

    // First, get breaking news
    try {
      const breakingNews = await newsAPIService.fetchBreakingNews(5);
      freshArticles.push(...breakingNews);
    } catch (error) {
      console.warn('Could not fetch breaking news:', error);
    }

    // Then get regular top headlines
    const regularArticles = await newsAPIService.fetchTopHeadlines({
      category: category === 'all' ? undefined : category,
      page,
      pageSize: Math.max(20 - freshArticles.length, 10)
    });

    // Combine, deduplicate, and sort
    const allArticles = [...freshArticles, ...regularArticles];
    const uniqueArticles = allArticles.filter((article, index, self) => 
      index === self.findIndex(a => a.url === article.url)
    );

    freshArticles = uniqueArticles
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 20);
    
    // Filter fresh articles to only include those published within last 2 days
    const recentFreshArticles = freshArticles.filter(article => {
      const publishedDate = new Date(article.publishedAt);
      return publishedDate >= postTwoDaysAgo;
    });
    
    const savedArticles = [];
    for (const article of recentFreshArticles) {
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
        hasMore: recentFreshArticles.length === 20
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
