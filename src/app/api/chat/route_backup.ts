import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NewsChatbot } from '@/lib/chatbot';
import { newsAPIService } from '@/lib/newsAPI';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { message, selectedArticles, sessionId } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get user if authenticated
    let user = null;
    if (session?.user?.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
    }

    // Handle chat session
    let chatSession = null;
    if (user && sessionId) {
      // Find existing session
      chatSession = await prisma.chatSession.findFirst({
        where: { 
          id: sessionId,
          userId: user.id 
        },
      });
    } else if (user && !sessionId) {
      // Create new session if authenticated but no session provided
      chatSession = await prisma.chatSession.create({
        data: {
          userId: user.id,
          title: `Chat ${new Date().toLocaleDateString()}`,
          isActive: true,
        },
      });

      // Set all other sessions to inactive
      await prisma.chatSession.updateMany({
        where: { 
          userId: user.id,
          id: { not: chatSession.id }
        },
        data: { isActive: false },
      });
    }

    let newsContext: string;

    if (selectedArticles && selectedArticles.length > 0) {
      // Use selected articles for focused context  
      newsContext = NewsChatbot.formatNewsForContext(selectedArticles);
    } else {
      // Get recent news articles from database first
      let recentArticles = await prisma.newsArticle.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 15,
        select: {
          title: true,
          summary: true,
          content: true,
          source: true,
          category: true,
          publishedAt: true,
          url: true
        }
      });

      // If we don't have enough recent articles (less than 5 or older than 6 hours), 
      // fetch some fresh ones from the news API
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const veryRecentArticles = recentArticles.filter(article => 
        new Date(article.publishedAt) > sixHoursAgo
      );

      if (veryRecentArticles.length < 5) {
        try {
          // Fetch fresh articles from news APIs
          const freshArticles = await newsAPIService.fetchTopHeadlines({
            pageSize: 10
          });

          // Save fresh articles to database asynchronously
          setImmediate(async () => {
            for (const article of freshArticles) {
              try {
                await prisma.newsArticle.upsert({
                  where: { url: article.url },
                  update: {
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
                console.error('Error saving chat context article:', error);
              }
            }
          });

          // Convert fresh articles to our format and combine with existing
          const formattedFreshArticles = freshArticles.map(article => ({
            title: article.title,
            summary: article.description || article.content?.substring(0, 300) + '...',
            content: article.content || article.description || '',
            source: article.source.name,
            category: article.category || 'general',
            publishedAt: new Date(article.publishedAt),
            url: article.url
          }));

          // Combine and limit to top 15 articles
          recentArticles = [...formattedFreshArticles, ...recentArticles].slice(0, 15);
        } catch (error) {
          console.error('Error fetching fresh articles for chat context:', error);
          // Continue with existing articles
        }
      }

      // Format news for context
      newsContext = NewsChatbot.formatNewsForContext(recentArticles);
    }

    // Generate response
    const response = await NewsChatbot.generateResponse(message, newsContext);

    // Save chat messages to database if we have a session
    if (chatSession) {
      try {
        // Save user message
        await prisma.chatMessage.create({
          data: {
            sessionId: chatSession.id,
            content: message,
            isUser: true,
          }
        });

        // Save AI response
        await prisma.chatMessage.create({
          data: {
            sessionId: chatSession.id,
            content: response,
            isUser: false,
          }
        });

        // Update session timestamp
        await prisma.chatSession.update({
          where: { id: chatSession.id },
          data: { updatedAt: new Date() }
        });
      } catch (dbError) {
        console.error('Error saving chat messages:', dbError);
        // Continue even if saving fails
      }
    }

    return NextResponse.json({ 
      response,
      sessionId: chatSession?.id 
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const chatHistory = await prisma.chatMessage.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    return NextResponse.json(chatHistory);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}
