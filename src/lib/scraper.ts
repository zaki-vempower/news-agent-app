import puppeteer, { Page, Browser } from 'puppeteer';

export interface ArticleContent {
  content: string;
  imageUrl?: string;
  publishedAt?: Date;
  author?: string;
}

export class ArticleContentScraper {
  private browser?: Browser;

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

  /**
   * Scrapes the full content of an individual article from its URL
   * This is used to get detailed content when a user wants to read more
   */
  async scrapeArticleContent(url: string): Promise<ArticleContent> {
    let page: Page | undefined;
    
    try {
      await this.initBrowser();
      page = await this.browser!.newPage();
      
      // Set user agent to avoid bot detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to article
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Extract article content using multiple selector strategies
      const content = await this.extractContent(page);
      const imageUrl = await this.extractMainImage(page);
      const publishedAt = await this.extractPublishDate(page);
      const author = await this.extractAuthor(page);
      
      return {
        content: content || 'Unable to extract full content. Please visit the original article.',
        imageUrl,
        publishedAt,
        author
      };
      
    } catch (error) {
      console.error(`Error scraping article content from ${url}:`, error);
      return {
        content: 'Unable to extract full content due to an error. Please visit the original article.',
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  private async extractContent(page: Page): Promise<string> {
    // Common selectors for article content across different news sites
    const contentSelectors = [
      // General article selectors
      'article p',
      '[data-component="ArticleBody"] p',
      '.article-body p',
      '.story-body p',
      '.content p',
      '.post-content p',
      '.entry-content p',
      '.story-content p',
      '.article-content p',
      
      // Site-specific selectors
      '.story-body-text p', // BBC
      '.story-body__element p', // BBC
      '.in-depth-post-body p', // CNN
      '.l-container p', // CNN
      '.story-content p', // Guardian
      '.content__article-body p', // Guardian
      '.ArticleBody-articleBody p', // Reuters
      '.StandardArticleBody_body p', // Reuters
      '.post-content p', // Generic WordPress
      '.entry-content p', // Generic WordPress
    ];

    let content = '';
    
    for (const selector of contentSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          const paragraphs = await Promise.all(
            elements.map(el => page.evaluate(element => element.textContent?.trim(), el))
          );
          
          // Filter out empty paragraphs and join
          const validParagraphs = paragraphs
            .filter((p): p is string => p !== null && p !== undefined && p.trim().length > 20) // Minimum length to avoid ads/navigation
            .filter(p => !p.includes('Read more') && !p.includes('Subscribe')) // Filter common non-content
            .slice(0, 10); // Limit to first 10 paragraphs
          
          if (validParagraphs.length > 0) {
            content = validParagraphs.join('\n\n');
            break;
          }
        }
      } catch {
        continue;
      }
    }

    return content;
  }

  private async extractMainImage(page: Page): Promise<string | undefined> {
    const imageSelectors = [
      'article img',
      '.article-image img',
      '.story-image img',
      '.hero-image img',
      '.featured-image img',
      'meta[property="og:image"]',
      'meta[name="twitter:image"]'
    ];

    for (const selector of imageSelectors) {
      try {
        if (selector.includes('meta')) {
          const imageUrl = await page.$eval(selector, el => el.getAttribute('content'));
          if (imageUrl && imageUrl.startsWith('http')) {
            return imageUrl;
          }
        } else {
          const imageUrl = await page.$eval(selector, el => 
            el.getAttribute('src') || el.getAttribute('data-src') || el.getAttribute('data-lazy-src')
          );
          if (imageUrl) {
            // Make absolute URL if relative
            if (imageUrl.startsWith('/')) {
              const baseUrl = new URL(page.url()).origin;
              return `${baseUrl}${imageUrl}`;
            }
            if (imageUrl.startsWith('http')) {
              return imageUrl;
            }
          }
        }
      } catch {
        continue;
      }
    }

    return undefined;
  }

  private async extractPublishDate(page: Page): Promise<Date | undefined> {
    const dateSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="pubdate"]',
      'meta[name="date"]',
      'time[datetime]',
      '.publish-date',
      '.article-date',
      '.story-date'
    ];

    for (const selector of dateSelectors) {
      try {
        let dateString: string | null = null;
        
        if (selector.includes('meta')) {
          dateString = await page.$eval(selector, el => el.getAttribute('content'));
        } else if (selector === 'time[datetime]') {
          dateString = await page.$eval(selector, el => el.getAttribute('datetime'));
        } else {
          dateString = await page.$eval(selector, el => el.textContent?.trim() || null);
        }
        
        if (dateString) {
          const date = new Date(dateString);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      } catch {
        continue;
      }
    }

    return undefined;
  }

  private async extractAuthor(page: Page): Promise<string | undefined> {
    const authorSelectors = [
      'meta[name="author"]',
      'meta[property="article:author"]',
      '.author',
      '.byline',
      '.article-author',
      '.story-author',
      '[rel="author"]'
    ];

    for (const selector of authorSelectors) {
      try {
        let author: string | null = null;
        
        if (selector.includes('meta')) {
          author = await page.$eval(selector, el => el.getAttribute('content'));
        } else {
          author = await page.$eval(selector, el => el.textContent?.trim() || null);
        }
        
        if (author && author.length > 0 && author.length < 100) {
          return author;
        }
      } catch {
        continue;
      }
    }

    return undefined;
  }

  async destroy(): Promise<void> {
    await this.closeBrowser();
  }
}

// Export a singleton instance for article content scraping
export const articleContentScraper = new ArticleContentScraper();