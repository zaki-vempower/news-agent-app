// News API service for fetching from real APIs instead of scraping
export interface NewsAPIArticle {
  title: string;
  description?: string;
  content?: string;
  url: string;
  urlToImage?: string;
  source: {
    id?: string;
    name: string;
  };
  author?: string;
  publishedAt: string;
  category?: string;
}

export interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

export class NewsAPIService {
  private readonly NEWS_API_KEY = process.env.NEWS_API_KEY;
  private readonly NEWS_API_BASE_URL = 'https://newsapi.org/v2';
  
  // Fallback free APIs
  private readonly GNEWS_API_KEY = process.env.GNEWS_API_KEY;
  private readonly GNEWS_BASE_URL = 'https://gnews.io/api/v4';
  
  // Guardian API
  private readonly GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY;
  private readonly GUARDIAN_BASE_URL = 'https://content.guardianapis.com';

  async fetchTopHeadlines(params: {
    category?: string;
    country?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<NewsAPIArticle[]> {
    const { category = '', country = 'us', page = 1, pageSize = 20 } = params;

    try {
      // Try NewsAPI first (if API key is available) - prioritize for latest news
      if (this.NEWS_API_KEY) {
        console.log('Fetching from NewsAPI...');
        const articles = await this.fetchFromNewsAPI(category, country, page, pageSize);
        if (articles.length > 0) {
          console.log(`NewsAPI returned ${articles.length} articles`);
          return articles;
        }
      }

      // Fallback to GNews API
      if (this.GNEWS_API_KEY) {
        console.log('Falling back to GNews API...');
        const articles = await this.fetchFromGNewsAPI(category, page, pageSize);
        if (articles.length > 0) {
          console.log(`GNews returned ${articles.length} articles`);
          return articles;
        }
      }

      // Fallback to Guardian API
      if (this.GUARDIAN_API_KEY) {
        console.log('Falling back to Guardian API...');
        const articles = await this.fetchFromGuardianAPI(category, page, pageSize);
        if (articles.length > 0) {
          console.log(`Guardian returned ${articles.length} articles`);
          return articles;
        }
      }

      // Final fallback to free sources
      console.log('Using free API sources...');
      return await this.fetchFromFreeAPIs(category, page, pageSize);

    } catch (error) {
      console.error('Error fetching news from APIs:', error);
      // All APIs failed - return empty array
      return [];
    }
  }

  // Fetch breaking news specifically
  async fetchBreakingNews(pageSize: number = 10): Promise<NewsAPIArticle[]> {
    try {
      const breakingKeywords = ['breaking', 'urgent', 'developing', 'live', 'alert'];
      const results: NewsAPIArticle[] = [];

      // Try to fetch breaking news from NewsAPI
      if (this.NEWS_API_KEY) {
        for (const keyword of breakingKeywords) {
          try {
            const articles = await this.searchNews(keyword, 1, 5);
            results.push(...articles);
            if (results.length >= pageSize) break;
          } catch (error) {
            console.warn(`Failed to search for ${keyword}:`, error);
          }
        }
      }

      // Remove duplicates and return most recent
      const uniqueArticles = results.filter((article, index, self) => 
        index === self.findIndex(a => a.url === article.url)
      );

      return uniqueArticles
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, pageSize);
    } catch (error) {
      console.error('Error fetching breaking news:', error);
      return [];
    }
  }

  // Method to search news using /everything endpoint - for comprehensive news search
  async searchNews(
    query: string,
    page: number,
    pageSize: number,
    language: string = 'en',
    sortBy: string = 'publishedAt'
  ): Promise<NewsAPIArticle[]> {
    if (!this.NEWS_API_KEY) {
      console.warn('NewsAPI key not available for searchNews.');
      return [];
    }
    let requestUrl = '';
    try {
      const params = new URLSearchParams({
        q: query,
        pageSize: pageSize.toString(),
        page: page.toString(),
        language: language,
        sortBy: sortBy,
        apiKey: this.NEWS_API_KEY!,
      });
      requestUrl = `${this.NEWS_API_BASE_URL}/everything?${params.toString()}`;
      console.log(`NewsAPI Search Request URL: ${requestUrl}`);

      const response = await fetch(requestUrl);
      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {
          // ignore if text extraction fails
        }
        console.warn(`NewsAPI search failed with status ${response.status}: ${response.statusText}. URL: ${requestUrl}. Body: ${errorBody}`);
        return [];
      }
      const data: NewsAPIResponse = await response.json();
      return (data.articles || []).map(article => ({
        ...article,
        category: article.category || 'general' 
      }));
    } catch (error) {
      let errorMessage = 'Unknown error during NewsAPI search';
      if (error instanceof Error) {
          errorMessage = error.message;
      }
      console.warn(`NewsAPI search failed: ${errorMessage}. URL attempted: ${requestUrl || 'N/A'}. Error: ${error instanceof Error ? error.stack : String(error)}`);
      return [];
    }
  }

  private async fetchFromNewsAPI(
    category: string,
    country: string, 
    page: number,
    pageSize: number
  ): Promise<NewsAPIArticle[]> {
    let requestUrl = ''; 
    try {
      const commonParams: Record<string, string> = {
        pageSize: pageSize.toString(),
        page: page.toString(),
        apiKey: this.NEWS_API_KEY!, 
      };

      const params = new URLSearchParams(commonParams);

      if (!category || category.toLowerCase() === 'all') {
        // 🔍 Use /everything for latest comprehensive news (as recommended)
        // This gets the absolute latest news from all sources, sorted by publishedAt
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        params.append('q', 'breaking OR latest OR news OR headlines OR "current events" OR international OR world OR national');
        params.append('sortBy', 'publishedAt'); // Sort by newest first
        params.append('language', 'en');
        params.append('from', yesterday.toISOString()); // Only last 24 hours for freshness
        requestUrl = `${this.NEWS_API_BASE_URL}/everything?${params.toString()}`;
        console.log('✅ Using /everything for latest comprehensive news');
      } else {
        // ✅ Use /top-headlines for category-specific breaking news (as recommended)
        // This gets the most recent and relevant headlines for specific categories
        params.append('country', country);
        
        const categoryMap: Record<string, string> = {
          'technology': 'technology',
          'business': 'business', 
          'health': 'health',
          'science': 'science',
          'sports': 'sports',
          'entertainment': 'entertainment',
          'general': 'general'
        };
        const newsAPICategory = categoryMap[category.toLowerCase()] || category.toLowerCase(); 
        params.append('category', newsAPICategory);
        requestUrl = `${this.NEWS_API_BASE_URL}/top-headlines?${params.toString()}`;
        console.log(`✅ Using /top-headlines for category: ${newsAPICategory}`);
      }

      console.log(`NewsAPI Request URL: ${requestUrl}`);
      const response = await fetch(requestUrl);

      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {
          // ignore if text extraction fails
        }
        console.warn(`NewsAPI failed with status ${response.status}: ${response.statusText}. URL: ${requestUrl}. Body: ${errorBody}`);
        return [];
      }

      const data: NewsAPIResponse = await response.json();
      
      // Ensure articles have a category field, especially for those from /everything
      return (data.articles || []).map(article => ({
        ...article,
        category: article.category || (category && category.toLowerCase() !== 'all' ? category : 'general') 
      }));
    } catch (error) {
      let errorMessage = 'Unknown error during NewsAPI fetch';
      if (error instanceof Error) {
          errorMessage = error.message;
      }
      console.warn(`NewsAPI fetch failed: ${errorMessage}. URL attempted: ${requestUrl || 'N/A'}. Error: ${error instanceof Error ? error.stack : String(error)}`);
      return [];
    }
  }


  private async fetchFromGNewsAPI(
    category: string,
    page: number,
    pageSize: number
  ): Promise<NewsAPIArticle[]> {
    try {
      const params = new URLSearchParams({
        token: this.GNEWS_API_KEY!,
        lang: 'en',
        country: 'us',
        max: pageSize.toString(),
        page: page.toString()
      });

      if (category && category !== 'all') {
        params.append('category', category.toLowerCase());
      }

      const response = await fetch(`${this.GNEWS_BASE_URL}/top-headlines?${params}`);
      
      if (!response.ok) {
        console.warn(`GNews API failed with status ${response.status}: ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      
      // Convert GNews format to our format
      return (data.articles || []).map((article: { 
        title: string; 
        description?: string; 
        content?: string; 
        url: string; 
        image?: string; 
        source?: { name?: string }; 
        publishedAt: string; 
      }) => ({
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        urlToImage: article.image,
        source: {
          name: article.source?.name || 'Unknown'
        },
        author: article.source?.name,
        publishedAt: article.publishedAt,
        category: category !== 'all' ? category : 'general'
      }));
    } catch (error) {
      console.warn('GNews API fetch failed:', error);
      return [];
    }
  }

  private async fetchFromGuardianAPI(
    category: string,
    page: number,
    pageSize: number
  ): Promise<NewsAPIArticle[]> {
    try {
      const params = new URLSearchParams({
        'api-key': this.GUARDIAN_API_KEY!,
        'show-fields': 'thumbnail,trailText,bodyText',
        'page-size': pageSize.toString(),
        'page': page.toString(),
        'order-by': 'newest'
      });

      if (category && category !== 'all') {
        // Map categories to Guardian sections
        const sectionMap: Record<string, string> = {
          'technology': 'technology',
          'business': 'business',
          'science': 'science',
          'sports': 'sport',
          'politics': 'politics',
          'environment': 'environment'
        };
        
        const section = sectionMap[category.toLowerCase()];
        if (section) {
          params.append('section', section);
        }
      }

      const response = await fetch(`${this.GUARDIAN_BASE_URL}/search?${params}`);
      
      if (!response.ok) {
        console.warn(`Guardian API failed with status ${response.status}: ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      
      return (data.response?.results || []).map((article: {
        webTitle: string;
        fields?: {
          trailText?: string;
          bodyText?: string;
          thumbnail?: string;
        };
        webUrl: string;
        webPublicationDate: string;
      }) => ({
        title: article.webTitle,
        description: article.fields?.trailText || '',
        content: article.fields?.bodyText?.substring(0, 500) || article.fields?.trailText || '',
        url: article.webUrl,
        urlToImage: article.fields?.thumbnail,
        source: {
          name: 'The Guardian'
        },
        author: 'The Guardian',
        publishedAt: article.webPublicationDate,
        category: category !== 'all' ? category : 'general'
      }));
    } catch (error) {
      console.warn('Guardian API fetch failed:', error);
      return [];
    }
  }

  private async fetchFromFreeAPIs(
    category: string,
    page: number,
    pageSize: number
  ): Promise<NewsAPIArticle[]> {
    try {
      // Use Reddit API as free news source
      const subreddits = this.getCategorySubreddits(category);
      const articles: NewsAPIArticle[] = [];

      for (const subreddit of subreddits.slice(0, 2)) { // Limit to 2 subreddits
        try {
          const response = await fetch(
            `https://www.reddit.com/r/${subreddit}/top.json?limit=${Math.ceil(pageSize / 2)}&t=day`,
            {
              headers: {
                'User-Agent': 'NewsBot/1.0'
              }
            }
          );

          if (response.ok) {
            const data = await response.json();
            const posts = data.data?.children || [];

            for (const post of posts) {
              const postData = post.data;
              if (postData.url && postData.title && !postData.is_self) {
                articles.push({
                  title: postData.title,
                  description: postData.selftext?.substring(0, 200) || '',
                  content: postData.selftext || 'Click to read the full article.',
                  url: postData.url,
                  urlToImage: postData.thumbnail !== 'self' ? postData.thumbnail : undefined,
                  source: {
                    name: `Reddit r/${subreddit}`
                  },
                  author: postData.author,
                  publishedAt: new Date(postData.created_utc * 1000).toISOString(),
                  category: category !== 'all' ? category : 'general'
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching from r/${subreddit}:`, error);
        }
      }

      return articles.slice(0, pageSize);
    } catch (error) {
      console.error('Error with free APIs:', error);
      return [];
    }
  }

  private getCategorySubreddits(category: string): string[] {
    const subredditMap: Record<string, string[]> = {
      'technology': ['technology', 'programming', 'artificial'],
      'business': ['business', 'economics', 'investing'],
      'science': ['science', 'physics', 'biology'],
      'health': ['health', 'medicine', 'fitness'],
      'sports': ['sports', 'nfl', 'nba'],
      'politics': ['politics', 'worldnews', 'news'],
      'entertainment': ['entertainment', 'movies', 'music'],
      'environment': ['environment', 'climate', 'earthporn'],
      'all': ['news', 'worldnews', 'technology', 'science']
    };

    return subredditMap[category.toLowerCase()] || subredditMap['all'];
  }

  private getMockArticles(page: number, pageSize: number): NewsAPIArticle[] {
    const mockArticles = [
      {
        title: "Revolutionary AI Breakthrough Announced",
        description: "Scientists unveil new AI system with unprecedented capabilities",
        content: "Researchers have developed a groundbreaking AI system that shows remarkable advances in natural language understanding and reasoning capabilities...",
        url: "https://example.com/ai-breakthrough",
        urlToImage: "https://via.placeholder.com/400x200?text=AI+News",
        source: { name: "Tech News" },
        author: "Tech Reporter",
        publishedAt: new Date().toISOString(),
        category: "technology"
      },
      {
        title: "Global Climate Summit Reaches Historic Agreement",
        description: "World leaders commit to ambitious new climate targets",
        content: "In a landmark decision, representatives from 195 countries have agreed to accelerate efforts to combat climate change...",
        url: "https://example.com/climate-summit",
        urlToImage: "https://via.placeholder.com/400x200?text=Climate+News",
        source: { name: "Environmental Times" },
        author: "Climate Correspondent",
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        category: "environment"
      },
      {
        title: "Stock Market Reaches Record High",
        description: "Markets surge following positive economic indicators",
        content: "Global stock markets have reached unprecedented levels as investors react to strong economic data and corporate earnings...",
        url: "https://example.com/market-high",
        urlToImage: "https://via.placeholder.com/400x200?text=Business+News",
        source: { name: "Financial Daily" },
        author: "Market Analyst",
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        category: "business"
      }
    ];

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    // Duplicate and modify articles to simulate pagination
    const extendedArticles = Array.from({ length: 50 }, (_, index) => ({
      ...mockArticles[index % mockArticles.length],
      title: `${mockArticles[index % mockArticles.length].title} (${Math.floor(index / mockArticles.length) + 1})`,
      publishedAt: new Date(Date.now() - (index * 3600000)).toISOString()
    }));

    return extendedArticles.slice(startIndex, endIndex);
  }

  // Fetch international breaking news from multiple countries
  async fetchInternationalBreakingNews(pageSize: number = 15): Promise<NewsAPIArticle[]> {
    if (!this.NEWS_API_KEY) {
      console.warn('NewsAPI key not available for international breaking news.');
      return [];
    }

    try {
      const results: NewsAPIArticle[] = [];
      
      // Get breaking news from major countries
      const countries = ['us', 'gb', 'ca', 'au', 'in', 'de', 'fr', 'jp'];
      
      for (const country of countries.slice(0, 4)) { // Limit to 4 countries to avoid rate limits
        try {
          const params = new URLSearchParams({
            country: country,
            category: 'general',
            pageSize: '5',
            apiKey: this.NEWS_API_KEY!
          });
          
          const response = await fetch(`${this.NEWS_API_BASE_URL}/top-headlines?${params.toString()}`);
          
          if (response.ok) {
            const data: NewsAPIResponse = await response.json();
            const articles = (data.articles || []).map(article => ({
              ...article,
              category: article.category || 'international'
            }));
            results.push(...articles);
          }
        } catch (error) {
          console.warn(`Failed to fetch breaking news from ${country}:`, error);
        }
        
        if (results.length >= pageSize) break;
      }

      // Remove duplicates and return most recent
      const uniqueArticles = results.filter((article, index, self) => 
        index === self.findIndex(a => a.url === article.url)
      );

      return uniqueArticles
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, pageSize);
    } catch (error) {
      console.error('Error fetching international breaking news:', error);
      return [];
    }
  }

  // Fetch the absolute latest news using /everything endpoint with comprehensive search
  async fetchLatestEverything(pageSize: number = 20): Promise<NewsAPIArticle[]> {
    if (!this.NEWS_API_KEY) {
      console.warn('NewsAPI key not available for latest everything search.');
      return [];
    }

    try {
      // Get current date for recent news filtering
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const params = new URLSearchParams({
        q: 'breaking OR urgent OR latest OR developing OR "just in" OR news OR headlines OR international OR world',
        language: 'en',
        sortBy: 'publishedAt',
        from: yesterday.toISOString(),
        pageSize: pageSize.toString(),
        apiKey: this.NEWS_API_KEY!
      });

      const requestUrl = `${this.NEWS_API_BASE_URL}/everything?${params.toString()}`;
      console.log(`Latest Everything Request URL: ${requestUrl}`);

      const response = await fetch(requestUrl);
      
      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {
          // ignore if text extraction fails
        }
        console.warn(`Latest everything fetch failed with status ${response.status}: ${response.statusText}. Body: ${errorBody}`);
        return [];
      }

      const data: NewsAPIResponse = await response.json();
      
      return (data.articles || []).map(article => ({
        ...article,
        category: article.category || 'breaking'
      }));
    } catch (error) {
      let errorMessage = 'Unknown error during latest everything fetch';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.warn(`Latest everything fetch failed: ${errorMessage}. Error: ${error instanceof Error ? error.stack : String(error)}`);
      return [];
    }
  }

  // Enhanced method to get comprehensive top stories combining multiple approaches
  async fetchComprehensiveTopStories(pageSize: number = 30): Promise<NewsAPIArticle[]> {
    try {
      const allResults: NewsAPIArticle[] = [];

      // 1. Get latest breaking news using /everything
      const latestNews = await this.fetchLatestEverything(10);
      allResults.push(...latestNews);

      // 2. Get international breaking news using /top-headlines
      const internationalNews = await this.fetchInternationalBreakingNews(10);
      allResults.push(...internationalNews);

      // 3. Get US top headlines for comparison
      const usHeadlines = await this.fetchTopHeadlines({ 
        category: '', 
        country: 'us', 
        pageSize: 10 
      });
      allResults.push(...usHeadlines);

      // Remove duplicates based on URL and title similarity
      const uniqueArticles = allResults.filter((article, index, self) => {
        return index === self.findIndex(a => 
          a.url === article.url || 
          (a.title.toLowerCase().substring(0, 50) === article.title.toLowerCase().substring(0, 50))
        );
      });

      // Sort by publication date (newest first) and return requested amount
      return uniqueArticles
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, pageSize);
    } catch (error) {
      console.error('Error fetching comprehensive top stories:', error);
      return [];
    }
  }

}

export const newsAPIService = new NewsAPIService();
