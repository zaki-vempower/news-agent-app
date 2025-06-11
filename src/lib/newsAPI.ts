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

  async fetchTopHeadlines(params: {
    category?: string;
    country?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<NewsAPIArticle[]> {
    const { category = '', country = 'us', page = 1, pageSize = 20 } = params;

    try {
      // Try NewsAPI first (if API key is available)
      if (this.NEWS_API_KEY) {
        const articles = await this.fetchFromNewsAPI(category, country, page, pageSize);
        if (articles.length > 0) return articles;
      }

      // Fallback to GNews API
      if (this.GNEWS_API_KEY) {
        const articles = await this.fetchFromGNewsAPI(category, page, pageSize);
        if (articles.length > 0) return articles;
      }

      // Final fallback to free sources
      return await this.fetchFromFreeAPIs(category, page, pageSize);

    } catch (error) {
      console.error('Error fetching news from APIs:', error);
      // Return mock data for development
      return this.getMockArticles(page, pageSize);
    }
  }

  private async fetchFromNewsAPI(
    category: string, 
    country: string, 
    page: number, 
    pageSize: number
  ): Promise<NewsAPIArticle[]> {
    const params = new URLSearchParams({
      country,
      pageSize: pageSize.toString(),
      page: page.toString(),
      apiKey: this.NEWS_API_KEY!
    });

    if (category && category !== 'all') {
      // Map our categories to NewsAPI categories
      const categoryMap: Record<string, string> = {
        'technology': 'technology',
        'business': 'business', 
        'health': 'health',
        'science': 'science',
        'sports': 'sports',
        'entertainment': 'entertainment',
        'general': 'general'
      };
      
      const newsAPICategory = categoryMap[category.toLowerCase()] || 'general';
      params.append('category', newsAPICategory);
    }

    const response = await fetch(`${this.NEWS_API_BASE_URL}/top-headlines?${params}`);
    
    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`);
    }

    const data: NewsAPIResponse = await response.json();
    return data.articles || [];
  }

  private async fetchFromGNewsAPI(
    category: string,
    page: number,
    pageSize: number
  ): Promise<NewsAPIArticle[]> {
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
      throw new Error(`GNews API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Convert GNews format to our format
    return (data.articles || []).map((article: any) => ({
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

  async searchNews(query: string, page: number = 1, pageSize: number = 20): Promise<NewsAPIArticle[]> {
    try {
      if (this.NEWS_API_KEY) {
        const params = new URLSearchParams({
          q: query,
          pageSize: pageSize.toString(),
          page: page.toString(),
          sortBy: 'publishedAt',
          apiKey: this.NEWS_API_KEY
        });

        const response = await fetch(`${this.NEWS_API_BASE_URL}/everything?${params}`);
        
        if (response.ok) {
          const data: NewsAPIResponse = await response.json();
          return data.articles || [];
        }
      }

      // Fallback to Reddit search
      const response = await fetch(
        `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=${pageSize}`,
        {
          headers: {
            'User-Agent': 'NewsBot/1.0'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const posts = data.data?.children || [];

        return posts.map((post: any) => ({
          title: post.data.title,
          description: post.data.selftext?.substring(0, 200) || '',
          content: post.data.selftext || 'Click to read the full article.',
          url: post.data.url,
          urlToImage: post.data.thumbnail !== 'self' ? post.data.thumbnail : undefined,
          source: {
            name: `Reddit r/${post.data.subreddit}`
          },
          author: post.data.author,
          publishedAt: new Date(post.data.created_utc * 1000).toISOString(),
          category: 'general'
        })).slice(0, pageSize);
      }

      return [];
    } catch (error) {
      console.error('Error searching news:', error);
      return [];
    }
  }
}

export const newsAPIService = new NewsAPIService();
