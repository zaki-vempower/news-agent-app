import { NextRequest, NextResponse } from 'next/server';
import { articleContentScraper } from '@/lib/scraper';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Valid article URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    console.log(`Scraping full content for article: ${url}`);
    
    // Scrape the full article content
    const articleContent = await articleContentScraper.scrapeArticleContent(url);
    
    return NextResponse.json({
      success: true,
      url,
      ...articleContent
    });
    
  } catch (error) {
    console.error('Error scraping article content:', error);
    return NextResponse.json(
      { 
        error: 'Failed to scrape article content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Article content scraper API',
    usage: 'POST with { "url": "article_url" } to scrape full article content',
    description: 'This endpoint uses Puppeteer to extract the full content of individual articles'
  });
}
