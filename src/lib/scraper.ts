import puppeteer, { Page, Browser, ElementHandle } from 'puppeteer';

export interface NewsArticle {
  title: string;
  content: string;
  url: string;
  imageUrl?: string;
  category: string;
  publishedAt: Date;
  source: string;
}

interface NewsSource {
  name: string;
  url: string;
  selectors: {
    articles: string;
    title: string;
    link: string;
    image: string;
    category: string;
  };
}

export class NewsScraper {
  private browser?: Browser;
  private readonly sources = [
    {
      name: 'HackerNews',
      url: 'https://news.ycombinator.com',
      selectors: {
        articles: '.athing',
        title: '.titleline > a:first-child',
        link: '.titleline > a:first-child',
        image: '',
        category: ''
      }
    },
    {
      name: 'BBC',
      url: 'https://www.bbc.com/news',
      selectors: {
        articles: 'article, [data-testid*="card"], .media, .story-promo, .gs-c-promo',
        title: 'h2, h3, .media__title, [data-testid*="headline"], .story-promo__headline, .gs-c-promo-heading__title',
        link: 'a',
        image: 'img',
        category: '.story-promo__section, .media__tag, [data-testid*="section"], .gs-c-section-link'
      }
    },
    {
      name: 'CNN',
      url: 'https://edition.cnn.com',
      selectors: {
        articles: 'article, .card, .cd__content, [data-module*="Article"], .container__item',
        title: 'h2, h3, .headline, .cd__headline, [data-module*="headline"], .container__headline',
        link: 'a',
        image: 'img',
        category: '.cd__category, .section, .kicker, .container__label'
      }
    },
    {
      name: 'Guardian',
      url: 'https://www.theguardian.com/international',
      selectors: {
        articles: 'article, [data-component*="Card"], .fc-item, .u-faux-block-link',
        title: 'h2, h3, .headline, [data-component*="Headline"], .fc-item__title',
        link: 'a',
        image: 'img',
        category: '.kicker, [data-component*="Kicker"], .fc-item__kicker'
      }
    },
    {
      name: 'Reuters',
      url: 'https://www.reuters.com',
      selectors: {
        articles: 'article, .story-card, [data-testid*="Card"], .media-story-card',
        title: 'h2, h3, .headline, [data-testid*="Heading"], .story-card__headline',
        link: 'a',
        image: 'img',
        category: '.section, [data-testid*="Section"], .story-card__section'
      }
    }
  ];

  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }

  private async scrapeArticleContent(url: string, page: Page): Promise<string> {
    try {
      // For HackerNews, don't try to scrape external content, create a summary
      if (url.includes('ycombinator.com') || url.startsWith('vote?')) {
        return 'This is a Hacker News submission. Click to view the full discussion and article.';
      }
      
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });
      
      // Common selectors for article content across different news sites
      const contentSelectors = [
        '[data-component="ArticleBody"] p',
        '.article-body p',
        '.story-body p',
        '.content p',
        'article p',
        '.post-content p',
        '.entry-content p',
        '.story-content p',
        '.article-content p'
      ];

      let content = '';
      
      for (const selector of contentSelectors) {
        try {
          const elements = await page.$$(selector);
          if (elements.length > 0) {
            const paragraphs = await Promise.all(
              elements.slice(0, 3).map(el => page.evaluate(element => element.textContent, el))
            );
            content = paragraphs.filter(p => p && p.trim().length > 50).join('\n\n');
            if (content.length > 100) break;
          }
        } catch {
          continue;
        }
      }

      return content || 'This article contains relevant news content. Click to read the full story.';
    } catch (error) {
      console.error(`Error scraping content from ${url}:`, error);
      return 'This article contains relevant news content. Click to read the full story.';
    }
  }

  private categorizeContent(title: string, content: string, sourceCategory?: string): string {
    const categories = {
      Technology: ['tech', 'ai', 'artificial intelligence', 'computer', 'software', 'digital', 'cyber', 'data', 'innovation'],
      Politics: ['politics', 'government', 'election', 'vote', 'democracy', 'policy', 'parliament', 'congress', 'senate'],
      Business: ['business', 'economy', 'finance', 'market', 'stock', 'trade', 'investment', 'corporate', 'company'],
      Health: ['health', 'medical', 'medicine', 'doctor', 'hospital', 'disease', 'covid', 'pandemic', 'vaccine'],
      Sports: ['sport', 'football', 'soccer', 'basketball', 'tennis', 'olympics', 'game', 'match', 'player'],
      Entertainment: ['entertainment', 'movie', 'film', 'music', 'celebrity', 'hollywood', 'actor', 'singer'],
      Science: ['science', 'research', 'study', 'discovery', 'climate', 'environment', 'space', 'biology'],
      World: ['world', 'international', 'global', 'country', 'war', 'conflict', 'diplomacy']
    };

    const text = `${title} ${content}`.toLowerCase();
    
    // First try to use source category if available
    if (sourceCategory) {
      for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => sourceCategory.toLowerCase().includes(keyword))) {
          return category;
        }
      }
    }

    // Then categorize based on content
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }
    
    return 'General';
  }

  private async scrapeSource(source: NewsSource): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];
    let page: Page | undefined;

    try {
      if (!this.browser) {
        await this.initBrowser();
      }

      page = await this.browser!.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      console.log(`Scraping ${source.name}...`);
      await page.goto(source.url, { waitUntil: 'networkidle0', timeout: 15000 });

      // Try multiple selector strategies
      let articleElements: ElementHandle[] = [];
      const selectorList = source.selectors.articles.split(', ');
      
      for (const selector of selectorList) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          articleElements = await page.$$(selector);
          if (articleElements.length > 0) {
            console.log(`Found ${articleElements.length} articles using selector: ${selector}`);
            break;
          }
        } catch {
          continue;
        }
      }
      
      if (articleElements.length === 0) {
        console.log(`No articles found for ${source.name} with any selector`);
        return articles;
      }

      for (let i = 0; i < Math.min(articleElements.length, 10); i++) {
        try {
          const element = articleElements[i];
          
          // Extract title with multiple selector fallback
          let title = null;
          const titleSelectors = source.selectors.title.split(', ');
          
          for (const titleSelector of titleSelectors) {
            try {
              const titleElement = await element.$(titleSelector);
              if (titleElement) {
                title = await page.evaluate(el => el.textContent?.trim(), titleElement);
                if (title && title.length > 10) break;
              }
            } catch {
              continue;
            }
          }
          
          if (!title || title.length < 10) continue;

          // Extract link with better fallback
          let url = null;
          try {
            // For HackerNews, get the actual article link, not the vote link
            if (source.name === 'HackerNews') {
              const linkElement = await element.$('.titleline > a:first-child');
              if (linkElement) {
                url = await page.evaluate(el => el.getAttribute('href'), linkElement);
                // If it's a relative link to HN, make it absolute
                if (url && url.startsWith('item?')) {
                  url = `https://news.ycombinator.com/${url}`;
                }
              }
            } else {
              const linkElement = await element.$('a');
              if (linkElement) {
                url = await page.evaluate(el => el.getAttribute('href'), linkElement);
              }
            }
          } catch {
            // If no direct link, try to find href in parent
            try {
              url = await page.evaluate(el => {
                const link = el.closest('a') || el.querySelector('a');
                return link ? link.getAttribute('href') : null;
              }, element);
            } catch {
              continue;
            }
          }
          
          if (!url) continue;
          
          // Make URL absolute if relative
          if (url.startsWith('/')) {
            const baseUrl = new URL(source.url).origin;
            url = `${baseUrl}${url}`;
          }

          // Extract image (only if selector is not empty)
          let imageUrl = null;
          if (source.selectors.image && source.selectors.image.trim()) {
            try {
              const imageElement = await element.$(source.selectors.image);
              imageUrl = imageElement ? await page.evaluate(el => 
                el.getAttribute('src') || el.getAttribute('data-src') || el.getAttribute('data-lazy-src')
              , imageElement) : null;
              
              if (imageUrl && imageUrl.startsWith('/')) {
                const baseUrl = new URL(source.url).origin;
                imageUrl = `${baseUrl}${imageUrl}`;
              }
            } catch {
              imageUrl = null;
            }
          }

          // Extract category (only if selector is not empty)
          let sourceCategory = null;
          if (source.selectors.category && source.selectors.category.trim()) {
            try {
              const categoryElement = await element.$(source.selectors.category);
              sourceCategory = categoryElement ? await page.evaluate(el => el.textContent?.trim(), categoryElement) : null;
            } catch {
              sourceCategory = null;
            }
          }

          // Scrape full article content
          const content = await this.scrapeArticleContent(url, page);
          
          // Categorize the article
          const category = this.categorizeContent(title, content, sourceCategory || undefined);

          articles.push({
            title,
            content,
            url,
            imageUrl: imageUrl || undefined,
            category,
            publishedAt: new Date(),
            source: source.name
          });

          // Add delay between articles
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`Error scraping article from ${source.name}:`, error);
          continue;
        }
      }

    } catch (error) {
      console.error(`Error scraping ${source.name}:`, error);
    } finally {
      if (page) {
        await page.close();
      }
    }

    return articles;
  }

  async getLatestNews(categoryFilter?: string): Promise<NewsArticle[]> {
    try {
      await this.initBrowser();
      
      const allArticles: NewsArticle[] = [];
      
      // Scrape from all sources
      for (const source of this.sources) {
        try {
          const articles = await this.scrapeSource(source);
          allArticles.push(...articles);
          
          // Add delay between sources to be respectful
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Failed to scrape ${source.name}:`, error);
        }
      }

      console.log(`Total articles scraped: ${allArticles.length}`);
      
      // Remove duplicates based on title similarity
      const uniqueArticles = this.removeDuplicates(allArticles);
      console.log(`Unique articles after deduplication: ${uniqueArticles.length}`);
      
      // Filter by category if specified
      if (categoryFilter && categoryFilter !== 'all') {
        const filteredArticles = uniqueArticles.filter(article => 
          article.category.toLowerCase() === categoryFilter.toLowerCase()
        );
        console.log(`Articles after category filter (${categoryFilter}): ${filteredArticles.length}`);
        return filteredArticles;
      }
      
      return uniqueArticles;
      
    } catch (error) {
      console.error('Error in getLatestNews:', error);
      return [];
    } finally {
      await this.closeBrowser();
    }
  }

  private removeDuplicates(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>();
    const unique: NewsArticle[] = [];
    
    for (const article of articles) {
      // Create a simple hash based on title
      const titleWords = article.title.toLowerCase().split(' ').slice(0, 5).join(' ');
      
      if (!seen.has(titleWords)) {
        seen.add(titleWords);
        unique.push(article);
      }
    }
    
    return unique;
  }

  async destroy(): Promise<void> {
    await this.closeBrowser();
  }
}

// Export a singleton instance
export const newsScraper = new NewsScraper();