import { NextRequest, NextResponse } from 'next/server';
import { articleContentScraper } from '@/lib/scraper';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { 
          success: false,
          error: 'URL parameter is required',
          usage: 'Use ?url=<article_url> to test article content scraping'
        },
        { status: 400 }
      );
    }

    console.log(`Testing article content scraper for URL: ${url}`);
    
    // Get article content
    const articleContent = await articleContentScraper.scrapeArticleContent(url);
    
    console.log(`Retrieved article content (${articleContent.content.length} characters)`);
    
    return NextResponse.json({
      success: true,
      url,
      content: articleContent
    });
    
  } catch (error) {
    console.error('Error in test article scraper:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
