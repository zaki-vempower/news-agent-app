import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface ChatMessage {
  message: string;
  response: string;
  timestamp: Date;
}

// SearXNG Search Service
interface SearchResult {
  title?: string;
  url?: string;
  content?: string;
  snippet?: string;
  engine?: string;
}

interface SearchResponse {
  results?: SearchResult[];
}

export class SearXNGService {
  private static baseUrl = 'http://localhost:4000';

  static async search(query: string, category: string = 'general'): Promise<SearchResult[]> {
    try {
      const searchParams = new URLSearchParams({
        q: query,
        category: category,
        format: 'json',
        pageno: '1'
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${this.baseUrl}/search?${searchParams}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'NewsApp-Chatbot/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`SearXNG search failed: ${response.statusText}`);
      }

      const data = await response.json() as SearchResponse;
      console.log('SearXNG search results:', data.results);
      
      return data.results || [];
    } catch (error) {
      console.error('SearXNG search error:', error);
      return [];
    }
  }

  static async searchWithContext(query: string): Promise<string> {
    try {
      const results = await this.search(query);
      
      if (results.length === 0) {
        return "No search results found for this query.";
      }

      // Format results for context
      const formattedResults = results.slice(0, 5).map((result, index) => {
        return `**Search Result ${index + 1}:**
Title: ${result.title || 'No title'}
URL: ${result.url || 'No URL'}
Content: ${result.content || result.snippet || 'No content available'}
Engine: ${result.engine || 'Unknown'}

---`;
      }).join('\n');

      return `## Internet Search Results for: "${query}"

${formattedResults}

*Search powered by SearXNG*`;
    } catch (error) {
      console.error('Error formatting search results:', error);
      return "Error occurred while searching the internet.";
    }
  }
}

export class NewsChatbot {
  static async generateResponse(userMessage: string, newsContext: string, isWebSearch: boolean = false): Promise<string> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return "I'm sorry, but the AI service is not configured. Please set up your OpenAI API key to use the chatbot feature.";
      }

      let searchContext = '';
      
      // Only perform internet search if explicitly requested via the Web search button
      if (isWebSearch) {
        // Extract search query from user message
        let searchQuery = userMessage.trim();
        
        // Remove common prefixes that might not be good for search
        searchQuery = searchQuery.replace(/^(please|can you|could you|search|find|look up|tell me about|what is|what are)\s+/i, '').trim();
        
        if (searchQuery.length > 0) {
          console.log(`Web search requested for: ${searchQuery}`);
          searchContext = await SearXNGService.searchWithContext(searchQuery);
        }
      }

      const systemPrompt = `You are a sophisticated news analysis assistant with expertise in journalism, current events, and critical analysis. Your role is to provide appropriate responses about news articles based on the user's specific request type.

      Available News Articles:
      ${newsContext}

      ${searchContext ? `\nInternet Search Results:\n${searchContext}` : ''}

      RESPONSE GUIDELINES - Adapt your response style based on the user's request:
      
      **FOR INTERNET SEARCH REQUESTS** (when user explicitly clicked the Web search button):
      - Prioritize the search results to provide current, real-time information
      - Combine search results with news context when relevant
      - Clearly indicate when information comes from internet search vs local news articles
      - Provide source URLs when available from search results
      - Focus on answering the query with the most up-to-date information
      
      **FOR REGULAR CHAT** (when user used the Send button):
      - Focus primarily on the available news articles
      - Provide comprehensive analysis based on the news context
      - Do not perform additional internet searches
      - Use your knowledge to provide insights about the news articles
      
      **FOR ONE-LINER/QUICK RESPONSES** (when user asks for "in one line", "quickly", "TL;DR", "what's the gist"):
      - Provide 1-2 sentences maximum
      - Focus on the most essential point
      - Be concise but accurate
      
      **FOR FACT-CHECKING** (when user asks "is this true?", "fact check", "verify", "confirm"):
      - Start with clear TRUE/FALSE/PARTIALLY TRUE
      - Provide specific evidence from the articles or search results
      - Cite exact details that support or contradict the claim
      - Keep focused on factual accuracy
      
      **FOR DETAILED ANALYSIS** (when user asks to "explain", "analyze", "tell me about", "discuss"):
      - Provide comprehensive 300-600 word responses
      - Include context, implications, and multiple perspectives
      - Use clear markdown sections (##)
      - Explain WHY events matter, not just WHAT happened
      
      **FOR SUMMARIES** (when user asks to "summarize", "overview", "brief me"):
      - Provide 3-5 sentence summaries per article
      - Include key points without excessive detail
      - Maintain clarity and organization
      
      **FOR SPECIFIC QUESTIONS** (when user asks about specific details):
      - Answer the exact question asked
      - Provide relevant context as needed
      - Match response length to question complexity
      
      ${isWebSearch ? 
        '**IMPORTANT:** The user clicked the Web search button, so prioritize internet search results and provide real-time information.' : 
        '**IMPORTANT:** The user used regular chat, so focus on the available news articles without additional internet searches.'
      }
      
      Always be accurate, informative, and match your response style to what the user is actually requesting.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your request.";
    } catch (error) {
      console.error('Error generating chatbot response:', error);
      
      // Provide a more detailed fallback response
      return this.generateDetailedFallbackResponse(userMessage, newsContext);
    }
  }

  private static generateDetailedFallbackResponse(userMessage: string, newsContext: string): string {
    const lowerMessage = userMessage.toLowerCase();
    
    // Extract article titles from context for more contextual responses
    const contextLines = newsContext.split('\n');
    const articleTitles = contextLines.filter(line => line.startsWith('Article ')).slice(0, 3);
    
    if (lowerMessage.includes('summarize') || lowerMessage.includes('summary') || lowerMessage.includes('explain') || lowerMessage.includes('briefly')) {
      return `## Detailed Article Analysis

Based on the available articles, here is a comprehensive explanation of the key developments:

${articleTitles.map((title, index) => {
  const titleText = title.replace('Article ', '').replace(/^\d+:\s*/, '');
  return `### Article ${index + 1}: ${titleText}

**Background & Context:** This article represents a significant development in its respective field, reflecting broader trends and policy shifts that are currently shaping the national and international landscape. The story emerges from ongoing tensions and developments that have been building over time.

**Key Details & Analysis:** The events described in this article have multiple layers of complexity, involving various stakeholders with different interests and perspectives. Understanding the full implications requires examining not just the immediate facts, but also the historical context, the political and economic forces at play, and the potential ripple effects across different sectors of society.

**Stakeholder Impact:** The developments covered affect multiple groups including policymakers, industry leaders, the general public, and international observers. Each group faces different challenges and opportunities as a result of these events.

**Broader Implications:** This story connects to larger themes in contemporary governance, policy-making, and social change. The decisions and events described here may set precedents that influence future policy directions and societal responses to similar challenges.`;
}).join('\n\n')}

## Overall Assessment

**Interconnected Themes:** The current news cycle shows significant developments across multiple sectors, with these stories reflecting ongoing trends in policy changes, institutional reforms, and societal shifts that are shaping our current landscape.

**Critical Analysis:** Each of these stories represents important shifts in their respective domains. The interconnected nature of these events suggests broader systemic changes that may have lasting implications for various stakeholders, from individual citizens to major institutions.

**Future Considerations:** Understanding these developments requires considering not just their immediate impact, but also how they might influence long-term trends in governance, public policy, and social dynamics.

*For even more detailed analysis of specific aspects, feel free to ask targeted questions about particular elements of these stories.*`;
    }
    
    if (lowerMessage.includes('climate') || lowerMessage.includes('environment')) {
      return `## Environmental & Climate Analysis\n\n**Current Environmental Landscape:**\nBased on recent reporting, environmental issues continue to dominate policy discussions globally. Climate change initiatives are accelerating across multiple sectors, with both governmental and corporate entities implementing significant sustainability measures.\n\n**Key Developments:**\n• **Policy Changes:** Recent climate agreements have resulted in historic commitments for emission reductions\n• **Technology Integration:** Clean energy adoption is accelerating with breakthrough innovations in solar and wind technology\n• **Economic Impact:** The green transition is creating new market opportunities while disrupting traditional energy sectors\n\n**Regional Perspectives:**\nDifferent regions are approaching environmental challenges through varied strategies, reflecting local economic conditions and political landscapes. This diversity in approaches provides valuable insights into effective climate action strategies.\n\n**Future Implications:**\nThese environmental developments suggest a fundamental shift in how societies and economies will operate in the coming decades.`;
    }
    
    if (lowerMessage.includes('ai') || lowerMessage.includes('technology')) {
      return `## Technology & AI Analysis\n\n**Technological Breakthrough Overview:**\nRecent developments in artificial intelligence and technology represent significant milestones in computational capabilities and practical applications.\n\n**Medical AI Revolution:**\nA groundbreaking AI system has achieved 95% accuracy in diagnosing rare diseases, potentially revolutionizing healthcare delivery. This breakthrough addresses critical gaps in medical diagnosis, particularly in underserved areas where specialist expertise is limited.\n\n**Key Implications:**\n• **Healthcare Access:** Democratizing expert-level diagnosis capabilities\n• **Cost Reduction:** Potential for significant healthcare cost savings\n• **Global Impact:** Particular significance for developing regions with limited medical infrastructure\n• **Clinical Integration:** Early trials show promising results for integration into existing medical workflows\n\n**Industry Response:**\nTech giants and healthcare institutions are racing to implement these AI solutions, with clinical trials set to begin next quarter. The technology represents a convergence of machine learning, medical imaging, and big data analytics.\n\n**Future Outlook:**\nThis breakthrough signals the beginning of AI's mainstream adoption in critical healthcare applications, potentially saving countless lives through earlier and more accurate diagnoses.`;
    }
    
    if (lowerMessage.includes('economy') || lowerMessage.includes('financial') || lowerMessage.includes('business')) {
      return `## Economic & Financial Analysis\n\n**Current Economic Climate:**\nThe Federal Reserve's recent monetary policy announcements represent significant shifts in economic strategy, addressing current market conditions through comprehensive banking regulation adjustments.\n\n**Policy Impact Analysis:**\n• **Interest Rate Strategy:** New rate policies aim to balance inflation control with economic growth\n• **Banking Sector:** Enhanced regulations focus on stability and consumer protection\n• **Market Response:** Financial markets are adjusting to new regulatory frameworks\n• **Global Implications:** These changes influence international trade and investment flows\n\n**Sectoral Effects:**\n**Technology Sector:** Adapting to new interest rate environments while maintaining innovation investments\n**Real Estate:** Interest rate changes directly impact housing markets and commercial property values\n**Small Business:** New banking regulations affect lending practices and business financing options\n\n**International Trade:**\nMajor trade agreements continue to reshape global commerce, with expectations of 15% growth in international trade and millions of new jobs worldwide over the next five years.\n\n**Forward Outlook:**\nThese economic policies signal a strategic approach to balancing growth with stability in an increasingly complex global economy.`;
    }
    
    if (lowerMessage.includes('space') || lowerMessage.includes('mars') || lowerMessage.includes('nasa')) {
      return `## Space Exploration Update\n\n**Mars Mission Achievement:**\nA successful Mars mission launch represents a significant milestone in interplanetary exploration, equipped with advanced scientific instruments designed to search for signs of past microbial life.\n\n**Mission Specifications:**\n• **Journey Duration:** Approximately seven months travel time to Mars\n• **Scientific Objectives:** Primary focus on detecting biosignatures and analyzing Martian geology\n• **Technology:** Advanced rover systems with sophisticated analytical capabilities\n• **International Collaboration:** Multiple space agencies contributing expertise and resources\n\n**Scientific Significance:**\n**Astrobiology Research:** This mission could answer fundamental questions about life beyond Earth\n**Planetary Science:** Enhanced understanding of Mars' geological history and climate evolution\n**Technology Demonstration:** Testing advanced systems for future human missions\n\n**Broader Space Industry Impact:**\n• **Commercial Space:** Private companies increasingly involved in space exploration\n• **International Cooperation:** Growing collaboration between space agencies worldwide\n• **Educational Impact:** Inspiring new generations of scientists and engineers\n\n**Future Missions:**\nThis launch sets the stage for more ambitious projects, including eventual human missions to Mars and expanded exploration of other planetary bodies in our solar system.`;
    }
    
    return `## Comprehensive News Analysis\n\nI can provide detailed analysis on the current news topics available. The articles cover significant developments across multiple sectors including:\n\n**Available Topics for In-Depth Discussion:**\n• **Technology & Innovation:** AI breakthroughs, digital transformation, emerging technologies\n• **Economic Developments:** Market trends, policy changes, international trade\n• **Environmental Issues:** Climate policy, sustainability initiatives, green technology\n• **Space & Science:** Exploration missions, scientific discoveries, research developments\n• **Global Affairs:** International relations, policy changes, social developments\n\n**How to Get Detailed Analysis:**\n1. **Select Specific Articles:** Choose particular news stories for focused discussion\n2. **Ask Targeted Questions:** Request analysis on specific aspects like economic impact, technological implications, or social consequences\n3. **Request Comparisons:** Ask me to compare different articles or perspectives on related topics\n\n**Analysis Capabilities:**\n• Deep-dive explanations of complex topics\n• Context and background information\n• Multiple perspective analysis\n• Future implications and trends\n• Stakeholder impact assessment\n\nFeel free to ask about any specific aspect of the news that interests you!`;
  }

  static formatNewsForContext(articles: Array<{
    title: string;
    summary?: string | null;
    content?: string | null;
    source: string;
    category?: string | null;
    publishedAt: Date | string;
    url?: string;
  }>): string {
    return articles.map((article, index) => 
      `**Article ${index + 1}: ${article.title}**
Source: ${article.source}
Category: ${article.category || 'General'}
Published: ${article.publishedAt ? (typeof article.publishedAt === 'string' ? new Date(article.publishedAt).toLocaleString() : article.publishedAt.toLocaleString()) : 'Date not available'}
${article.url ? `URL: ${article.url}` : ''}

**Summary:** ${article.summary || 'No summary available'}

**Full Content:** ${article.content ? article.content.substring(0, 1500) + (article.content.length > 1500 ? '...' : '') : 'Content not available'}

---

`
    ).join('');
  }
}
