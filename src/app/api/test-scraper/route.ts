import { NextRequest, NextResponse } from 'next/server';
import { newsScraper } from '@/lib/scraper';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing scraper with a single source...');
    
    // Get news articles
    const articles = await newsScraper.getLatestNews();
    
    console.log(`Retrieved ${articles.length} articles`);
    
    return NextResponse.json({
      success: true,
      count: articles.length,
      articles: articles.slice(0, 5) // Return first 5 for testing
    });
    
  } catch (error) {
    console.error('Error in test scraper:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        articles: []
      },
      { status: 500 }
    );
  }
}
