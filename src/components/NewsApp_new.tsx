'use client';

import { useState, useEffect, useCallback } from 'react';
import { Newspaper, MessageCircle, RefreshCw, Clock, Filter, User, LogIn, LogOut, Bookmark, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NewsCard from './NewsCard';
import ChatBot from './ChatBot';

interface NewsArticle {
  id: string;
  title: string;
  summary?: string;
  content: string;
  url: string;
  imageUrl?: string;
  source: string;
  category?: string;
  publishedAt: string;
  scrapedAt: string;
}

export default function NewsApp() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<'news' | 'chat'>('news');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [savedArticles, setSavedArticles] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statsCollapsed, setStatsCollapsed] = useState(false);

  // Available categories for filtering
  const categories = [
    { value: 'all', label: 'All News' },
    { value: 'Environment', label: 'Environment' },
    { value: 'Technology', label: 'Technology' },
    { value: 'Economy', label: 'Economy' },
    { value: 'Science', label: 'Science' },
    { value: 'Business', label: 'Business' },
    { value: 'Politics', label: 'Politics' },
    { value: 'Sports', label: 'Sports' },
    { value: 'Health', label: 'Health' }
  ];

  // Filter articles by category
  const filterArticlesByCategory = (articleList: NewsArticle[], category: string) => {
    if (category === 'all') {
      setFilteredArticles(articleList);
    } else {
      const filtered = articleList.filter(article => 
        article.category?.toLowerCase() === category.toLowerCase()
      );
      setFilteredArticles(filtered);
    }
  };

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    setHasMore(true);
    setSearchQuery('');
    fetchNews(false, category, 1, false);
  };

  // Handle article selection
  const toggleArticleSelection = (articleId: string) => {
    setSelectedArticles(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(articleId)) {
        newSelection.delete(articleId);
      } else {
        newSelection.add(articleId);
      }
      return newSelection;
    });
  };

  // Select all visible articles
  const selectAllArticles = () => {
    const allIds = new Set(filteredArticles.map(article => article.id));
    setSelectedArticles(allIds);
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedArticles(new Set());
  };

  // Get selected articles data
  const getSelectedArticlesData = () => {
    return articles.filter(article => selectedArticles.has(article.id));
  };

  // Fetch saved articles for authenticated user
  const fetchSavedArticles = useCallback(async () => {
    if (!session) {
      setSavedArticles(new Set());
      return;
    }

    try {
      const response = await fetch('/api/saved-articles');
      if (response.ok) {
        const savedData: Array<{ article: { id: string } }> = await response.json();
        const savedIds = new Set(savedData.map((item) => item.article.id));
        setSavedArticles(savedIds);
      }
    } catch (error) {
      console.error('Error fetching saved articles:', error);
    }
  }, [session]);

  // Handle saving/unsaving articles
  const handleSaveToggle = async (articleId: string, shouldSave: boolean) => {
    if (!session) return;

    try {
      if (shouldSave) {
        // Find the article data to send with the save request
        const articleData = articles.find(article => article.id === articleId);
        
        const response = await fetch('/api/saved-articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            articleId, 
            articleData: articleData ? {
              title: articleData.title,
              summary: articleData.summary,
              content: articleData.content,
              url: articleData.url,
              imageUrl: articleData.imageUrl,
              source: articleData.source,
              category: articleData.category,
              publishedAt: articleData.publishedAt
            } : undefined
          }),
        });
        if (response.ok) {
          setSavedArticles(prev => new Set(prev).add(articleId));
        } else {
          console.error('Failed to save article:', await response.text());
        }
      } else {
        const response = await fetch(`/api/saved-articles?articleId=${articleId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setSavedArticles(prev => {
            const newSet = new Set(prev);
            newSet.delete(articleId);
            return newSet;
          });
        }
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  const fetchNews = useCallback(async (forceRefresh = false, category = selectedCategory, page = 1, append = false) => {
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      const searchParams = new URLSearchParams();
      if (category !== 'all') searchParams.append('category', category);
      searchParams.append('page', page.toString());
      searchParams.append('pageSize', '15');
      if (searchQuery) searchParams.append('search', searchQuery);

      const url = `/api/news?${searchParams}`;
      const response = await fetch(url, {
        method: forceRefresh ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: forceRefresh ? JSON.stringify({ forceRefresh: true, category, page }) : undefined,
      });
      
      if (response.ok) {
        const result = await response.json();
        const newArticles = result.articles || [];
        const pagination = result.pagination || {};

        if (append && page > 1) {
          setArticles(prev => [...prev, ...newArticles]);
        } else {
          setArticles(newArticles);
          setCurrentPage(1);
        }
        
        setHasMore(pagination.hasMore || false);
        setCurrentPage(page);
        
        // Filter articles by category
        const allArticles = append && page > 1 ? [...articles, ...newArticles] : newArticles;
        filterArticlesByCategory(allArticles, category);
      } else {
        console.error('Failed to fetch news');
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery, articles]);

  const loadMoreNews = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    await fetchNews(false, selectedCategory, currentPage + 1, true);
  }, [hasMore, loadingMore, selectedCategory, currentPage, fetchNews]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    setHasMore(true);
    await fetchNews(false, selectedCategory, 1, false);
  }, [selectedCategory, fetchNews]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);
    await fetchNews(true, selectedCategory, 1, false);
  };

  // Infinite scroll detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.innerHeight + document.documentElement.scrollTop;
      const documentHeight = document.documentElement.offsetHeight;
      const threshold = documentHeight - 1000;
      
      if (
        scrollPosition >= threshold
        && hasMore && !loadingMore && !loading
      ) {
        loadMoreNews();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, loading, loadMoreNews, currentPage]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Update filtered articles when articles or category changes
  useEffect(() => {
    filterArticlesByCategory(articles, selectedCategory);
  }, [articles, selectedCategory]);

  // Fetch saved articles when session changes
  useEffect(() => {
    fetchSavedArticles();
  }, [fetchSavedArticles]);

  if (loading && articles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Newspaper className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">NewsBot</h2>
            <p className="text-gray-600 text-lg mb-1">Loading latest news</p>
            <p className="text-gray-500">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Newspaper className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">NewsBot</h1>
                <p className="text-gray-600 text-sm">Stay informed with the latest news</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Category Dropdown */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search news..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                  className="w-64 px-4 py-2 pl-10 pr-4 bg-white border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                {searchQuery && (
                  <button
                    onClick={() => handleSearch(searchQuery)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    Search
                  </button>
                )}
              </div>

              {/* Authentication UI */}
              {status === 'loading' ? (
                <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
              ) : session ? (
                <div className="flex items-center space-x-3">
                  {/* Saved Articles Button */}
                  <button
                    onClick={() => router.push('/saved')}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors rounded-lg font-medium"
                    title="Saved articles"
                  >
                    <Bookmark className="h-4 w-4" />
                    <span className="text-sm">Saved ({savedArticles.size})</span>
                  </button>
                  
                  {/* User Menu */}
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg">
                      <User className="h-4 w-4" />
                      <span className="text-sm font-medium">{session.user?.name || session.user?.email}</span>
                    </div>
                    <button
                      onClick={() => signOut()}
                      className="flex items-center space-x-1 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 transition-colors rounded-lg"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="text-sm">Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => signIn()}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </button>
              )}
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('news')}
              className={`py-2 px-4 rounded-md font-medium text-sm transition-all ${
                activeTab === 'news'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Newspaper className="h-4 w-4" />
                <span>News</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-2 px-4 rounded-md font-medium text-sm transition-all ${
                activeTab === 'chat'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-4 w-4" />
                <span>AI Chat</span>
                {selectedArticles.size > 0 && (
                  <div className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {selectedArticles.size}
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'news' ? (
          <div className="relative">
            {/* News Grid */}
            {filteredArticles.length > 0 ? (
              <>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredArticles.map((article) => (
                    <NewsCard 
                      key={article.id} 
                      article={article}
                      isSelected={selectedArticles.has(article.id)}
                      onToggleSelection={() => toggleArticleSelection(article.id)}
                      isSaved={savedArticles.has(article.id)}
                      onSaveToggle={handleSaveToggle}
                    />
                  ))}
                </div>
                
                {/* Load More Indicator */}
                {loadingMore && (
                  <div className="flex justify-center items-center py-8">
                    <div className="bg-white rounded-lg shadow p-6 flex items-center space-x-4">
                      <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      <div>
                        <span className="font-medium text-gray-900">Loading more articles...</span>
                        <p className="text-gray-600 text-sm">Please wait</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* End of articles message */}
                {!hasMore && !loadingMore && filteredArticles.length > 0 && (
                  <div className="text-center py-8">
                    <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Newspaper className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                      <p className="text-gray-600 mb-4">You&apos;ve seen all available articles</p>
                      <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Refresh for more
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="bg-white rounded-lg shadow p-12 max-w-lg mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Newspaper className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-medium text-gray-900 mb-4">
                    {selectedCategory === 'all' 
                      ? 'No articles found' 
                      : `No ${categories.find(c => c.value === selectedCategory)?.label} articles found`
                    }
                  </h3>
                  <p className="text-gray-600 mb-8 text-lg">
                    {selectedCategory === 'all'
                      ? 'Try refreshing to load the latest news'
                      : 'Try a different category or refresh the page'
                    }
                  </p>
                  <button
                    onClick={handleRefresh}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Load News
                  </button>
                </div>
              </div>
            )}

            {/* Collapsible Stats Panel - Bottom Right */}
            <div className="fixed bottom-6 right-6 z-50">
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 max-w-sm">
                {/* Collapsible Header */}
                <button
                  onClick={() => setStatsCollapsed(!statsCollapsed)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-900">Live Feed</span>
                    </div>
                  </div>
                  {statsCollapsed ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </button>

                {/* Collapsible Content */}
                {!statsCollapsed && (
                  <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
                    {/* Stats */}
                    <div className="flex items-center space-x-2 text-gray-600 text-sm bg-gray-50 rounded-lg p-3">
                      <Clock className="h-4 w-4" />
                      <span>
                        {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} • 
                        {articles.length > 0 
                          ? ` Updated ${new Date(articles[0].scrapedAt).toLocaleTimeString()}`
                          : ' Never updated'
                        }
                      </span>
                    </div>
                    
                    {/* Controls */}
                    {filteredArticles.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={selectAllArticles}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Select All
                        </button>
                        {selectedArticles.size > 0 && (
                          <button
                            onClick={clearAllSelections}
                            className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                          >
                            Clear ({selectedArticles.size})
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Selected Articles Indicator */}
                    {selectedArticles.size > 0 && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-blue-700 font-medium flex items-center space-x-2 text-sm">
                          <MessageCircle className="h-4 w-4" />
                          <span>{selectedArticles.size} selected for AI chat</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <ChatBot 
            articles={articles} 
            selectedArticles={getSelectedArticlesData()}
          />
        )}
      </main>
    </div>
  );
}
