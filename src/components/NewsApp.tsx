'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Newspaper, MessageCircle, Clock, Filter, LogIn, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import NewsCard from './NewsCard';
import FeaturedNewsCard from './FeaturedNewsCard';
import ChatBot from './ChatBotWithSessions';
import DropdownMenu from './DropdownMenu';
import { useDebounce } from '../hooks/useDebounce';

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
  // Local news location state
  const [selectedLocation, setSelectedLocation] = useState<'siena' | 'hyderabad'>('siena');
  const [statsCollapsed, setStatsCollapsed] = useState(false);

  // Debounce search query to prevent excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

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

  // Filter articles by category - memoized to prevent unnecessary re-calculations
  const filteredAndSearchedArticles = useMemo(() => {
    let filtered = articles;
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(article => 
        article.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    
    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(query) ||
        article.summary?.toLowerCase().includes(query) ||
        article.content.toLowerCase().includes(query) ||
        article.source.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [articles, selectedCategory, debouncedSearchQuery]);

  // Update filtered articles when the memoized result changes
  useEffect(() => {
    setFilteredArticles(filteredAndSearchedArticles);
  }, [filteredAndSearchedArticles]);

  // Handle category change - optimized to prevent stuttering
  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    setHasMore(true);
    setSearchQuery(''); // Clear search when changing category
  }, []);

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
    const allIds = new Set(enrichedArticles.map(article => article.id));
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

  // Determine featured articles (breaking news, trending)
  const getFeaturedArticles = useCallback(() => {
    const breakingKeywords = ['breaking', 'urgent', 'alert', 'developing', 'live', 'just in'];
    const trendingKeywords = ['viral', 'trending', 'popular', 'major', 'massive', 'unprecedented'];
    
    return filteredArticles.map(article => {
      const titleLower = article.title.toLowerCase();
      const summaryLower = article.summary?.toLowerCase() || '';
      const contentLower = article.content.toLowerCase();
      
      const isBreaking = breakingKeywords.some(keyword => 
        titleLower.includes(keyword) || summaryLower.includes(keyword)
      );
      
      const isTrending = trendingKeywords.some(keyword => 
        titleLower.includes(keyword) || summaryLower.includes(keyword) || contentLower.includes(keyword)
      );
      
      // Also consider recent articles from major sources as potentially breaking
      const isRecent = new Date(article.publishedAt) > new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours
      const majorSources = ['reuters', 'ap', 'bbc', 'cnn', 'npr', 'politico'];
      const isMajorSource = majorSources.some(source => 
        article.source.toLowerCase().includes(source)
      );
      
      return {
        ...article,
        isBreaking: isBreaking || (isRecent && isMajorSource && titleLower.includes('trump')),
        isTrending: isTrending && !isBreaking
      };
    });
  }, [filteredArticles]);

  const enrichedArticles = getFeaturedArticles();

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

    // Optimized fetchNews function with better error handling
  const fetchNews = useCallback(async (forceRefresh = false, category = selectedCategory, page = 1, append = false) => {
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      const searchParams = new URLSearchParams();
      if (category !== 'all') searchParams.append('category', category);
      searchParams.append('page', page.toString());
      searchParams.append('pageSize', '15');
      if (debouncedSearchQuery) searchParams.append('search', debouncedSearchQuery);

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
  }, [selectedCategory, debouncedSearchQuery]);

  const loadMoreNews = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    await fetchNews(false, selectedCategory, currentPage + 1, true);
  }, [hasMore, loadingMore, selectedCategory, currentPage, fetchNews]);

  const handleSearchSubmit = useCallback(() => {
    setCurrentPage(1);
    setHasMore(true);
    fetchNews(false, selectedCategory, 1, false);
  }, [selectedCategory, fetchNews]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);
    await fetchNews(true, selectedCategory, 1, false);
  };

  // Effect to trigger search when debounced query changes
  useEffect(() => {
    // Fetch when debounced search changes, but avoid initial fetch if empty
    if (debouncedSearchQuery.trim()) {
      setCurrentPage(1);
      setHasMore(true);
      fetchNews(false, selectedCategory, 1, false);
    }
  }, [debouncedSearchQuery, selectedCategory, fetchNews]);

  // Effect to fetch news when category changes
  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    fetchNews(false, selectedCategory, 1, false);
  }, [selectedCategory, fetchNews]);

  // Infinite scroll detection with throttling
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const scrollPosition = window.innerHeight + document.documentElement.scrollTop;
        const documentHeight = document.documentElement.offsetHeight;
        const threshold = documentHeight - 1000;
        
        if (
          scrollPosition >= threshold
          && hasMore && !loadingMore && !loading
        ) {
          loadMoreNews();
        }
      }, 100); // Throttle scroll events
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [hasMore, loadingMore, loading, loadMoreNews]);

  // Initial load effect - only run once on mount
  useEffect(() => {
    const initialFetch = async () => {
      try {
        setLoading(true);
        const searchParams = new URLSearchParams();
        searchParams.append('page', '1');
        searchParams.append('pageSize', '15');

        const response = await fetch(`/api/news?${searchParams}`);
        if (response.ok) {
          const result = await response.json();
          setArticles(result.articles || []);
          setHasMore(result.pagination?.hasMore || false);
          setCurrentPage(1);
        }
      } catch (error) {
        console.error('Error in initial fetch:', error);
      } finally {
        setLoading(false);
      }
    };

    initialFetch();
  }, []); // Empty dependency array for initial load only

  // Fetch saved articles when session changes
  useEffect(() => {
    fetchSavedArticles();
  }, [fetchSavedArticles]);

  if (loading && articles.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/25">
              <Newspaper className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-pulse shadow-lg"></div>
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">NewsBot</h2>
            <p className="text-gray-600 text-lg mb-1">Loading latest news</p>
            <p className="text-gray-500">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/25">
                <Newspaper className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">NewsBot</h1>
                <p className="text-gray-600 text-xs sm:text-sm">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Category Dropdown - Hidden on mobile, shown in dropdown */}
              <div className="hidden lg:block relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="appearance-none bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              
              {/* Search Bar - Responsive */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
                  className="w-32 sm:w-48 lg:w-64 px-3 sm:px-4 py-2 sm:py-2.5 pl-8 sm:pl-10 pr-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl text-sm placeholder-gray-500 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm"
                />
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                {searchQuery && (
                  <button
                    onClick={handleSearchSubmit}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    Go
                  </button>
                )}
              </div>

              {/* Authentication UI */}
              {status === 'loading' ? (
                <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
              ) : session ? (
                <DropdownMenu 
                  user={session.user || null}
                  savedArticlesCount={savedArticles.size}
                  onRefresh={handleRefresh}
                  refreshing={refreshing}
                />
              ) : (
                <button
                  onClick={() => signIn()}
                  className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Category Filter - Only visible on smaller screens */}
          <div className="lg:hidden pb-4">
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full appearance-none bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm"
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl p-1.5 shadow-inner">
            <button
              onClick={() => setActiveTab('news')}
              className={`py-2.5 px-5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'news'
                  ? 'bg-white text-blue-600 shadow-lg shadow-blue-500/10 transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Newspaper className="h-4 w-4" />
                <span>News</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-2.5 px-5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'chat'
                  ? 'bg-white text-blue-600 shadow-lg shadow-blue-500/10 transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-4 w-4" />
                <span>AI Chat</span>
                {selectedArticles.size > 0 && (
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs px-2 py-0.5 rounded-full shadow-lg">
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
            {/* Your briefing header */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Your briefing</h1>
              <p className="text-gray-600 text-lg">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  day: 'numeric',
                  month: 'long'
                })}
              </p>
            </div>

            {/* Google News Style Layout */}
            {filteredArticles.length > 0 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Main Content - Left Side */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Top Stories Section */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                          <span className="w-1 h-8 bg-gradient-to-b from-red-500 to-red-600 rounded-full mr-3"></span>
                          Top stories
                          <span className="ml-2 text-blue-600">›</span>
                        </h2>
                        <button 
                          onClick={handleRefresh}
                          disabled={refreshing}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50 flex items-center space-x-1"
                        >
                          {refreshing ? (
                            <>
                              <div className="animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full"></div>
                              <span>Refreshing...</span>
                            </>
                          ) : (
                            <span>Full coverage</span>
                          )}
                        </button>
                      </div>
                      
                      {/* Main Featured Story */}
                      {enrichedArticles
                        .filter(article => article.isBreaking || article.isTrending)
                        .slice(0, 1)
                        .map((article) => (
                          <div key={article.id} className="mb-6">
                            <FeaturedNewsCard 
                              article={article}
                              isSelected={selectedArticles.has(article.id)}
                              onToggleSelection={() => toggleArticleSelection(article.id)}
                              isSaved={savedArticles.has(article.id)}
                              onSaveToggle={handleSaveToggle}
                              isBreaking={article.isBreaking}
                              isTrending={article.isTrending}
                            />
                          </div>
                        ))
                      }
                      
                      {/* Secondary Stories */}
                      <div className="grid gap-4">
                        {enrichedArticles
                          .filter(article => !article.isBreaking && !article.isTrending)
                          .slice(0, 3)
                          .map((article) => (
                            <div key={article.id} className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-xl transition-colors">
                              <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-200">
                                {article.imageUrl ? (
                                  <img 
                                    src={article.imageUrl} 
                                    alt={article.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200"></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {article.source}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                                  </span>
                                </div>
                                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600">
                                  {article.title}
                                </h3>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                    
                    {/* More News Section */}
                    <div className="space-y-6">
                      <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <span className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full mr-3"></span>
                        More News
                      </h2>
                      <div className="grid gap-6 md:grid-cols-2">
                        {enrichedArticles
                          .filter(article => !article.isBreaking && !article.isTrending)
                          .slice(3)
                          .map((article) => (
                            <NewsCard 
                              key={article.id} 
                              article={article}
                              isSelected={selectedArticles.has(article.id)}
                              onToggleSelection={() => toggleArticleSelection(article.id)}
                              isSaved={savedArticles.has(article.id)}
                              onSaveToggle={handleSaveToggle}
                            />
                          ))
                        }
                      </div>
                    </div>
                  </div>
                  
                  {/* Sidebar - Right Side */}
                  <div className="space-y-8">
                    {/* Weather Widget */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Today&apos;s Weather</h3>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">29°C</div>
                          <div className="text-sm text-gray-600">Hyderabad</div>
                        </div>
                      </div>
                      <div className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer">Google Weather</div>
                    </div>
                    
                    {/* Local News Section */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          Local news
                          <span className="ml-2 text-blue-600">›</span>
                        </h3>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => setSelectedLocation('siena')}
                            className={`px-3 py-1 text-sm rounded-full transition-colors ${
                              selectedLocation === 'siena' 
                                ? 'bg-gray-800 text-white' 
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            Siena
                          </button>
                          <button 
                            onClick={() => setSelectedLocation('hyderabad')}
                            className={`px-3 py-1 text-sm rounded-full transition-colors ${
                              selectedLocation === 'hyderabad' 
                                ? 'bg-gray-800 text-white' 
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            Hyderabad
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {enrichedArticles
                          .filter(article => {
                            const text = `${article.title} ${article.summary || ''} ${article.source}`.toLowerCase();
                            if (selectedLocation === 'siena') {
                              return text.includes('siena') || text.includes('italy') || text.includes('tuscany');
                            } else {
                              return text.includes('hyderabad') || text.includes('india') || text.includes('telangana');
                            }
                          })
                          .slice(0, 4)
                          .map((article) => (
                            <div key={article.id} className="flex items-start space-x-3">
                              <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
                                {article.imageUrl ? (
                                  <img 
                                    src={article.imageUrl} 
                                    alt={article.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200"></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {article.source}
                                  </span>
                                </div>
                                <h4 className="text-sm font-medium text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600">
                                  {article.title}
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                    
                    {/* Category Navigation */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Browse by Category</h3>
                      <div className="space-y-2">
                        {categories.slice(1).map((category) => (
                          <button
                            key={category.value}
                            onClick={() => handleCategoryChange(category.value)}
                            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                              selectedCategory === category.value
                                ? 'bg-blue-100 text-blue-800 font-medium'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {category.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Load More Indicator */}
                {loadingMore && (
                  <div className="flex justify-center items-center py-8">
                    <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 flex items-center space-x-4">
                      <div className="animate-spin h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full"></div>
                      <div>
                        <span className="font-semibold text-gray-900">Loading more articles...</span>
                        <p className="text-gray-600 text-sm">Please wait</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* End of articles message */}
                {!hasMore && !loadingMore && filteredArticles.length > 0 && (
                  <div className="text-center py-8">
                    <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 max-w-md mx-auto">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Newspaper className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">All caught up!</h3>
                      <p className="text-gray-600 mb-6">You&apos;ve seen all available articles</p>
                      <button
                        onClick={handleRefresh}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105"
                      >
                        Refresh for more
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-12 max-w-lg mx-auto">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-8">
                    <Newspaper className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
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
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105"
                  >
                    Load News
                  </button>
                </div>
              </div>
            )}

            {/* Collapsible Stats Panel - Bottom Right */}
            <div className="fixed bottom-6 right-6 z-50">
              <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 max-w-sm">
                {/* Collapsible Header */}
                <button
                  onClick={() => setStatsCollapsed(!statsCollapsed)}
                  className="w-full flex items-center justify-between p-5 hover:bg-white/50 transition-all duration-200 rounded-2xl"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full animate-pulse shadow-lg"></div>
                      <span className="text-sm font-semibold text-gray-900">Live Feed</span>
                    </div>
                  </div>
                  {statsCollapsed ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>

                {/* Collapsible Content */}
                {!statsCollapsed && (
                  <div className="px-5 pb-5 space-y-4 border-t border-gray-100/50">
                    {/* Stats */}
                    <div className="flex items-center space-x-3 text-gray-600 text-sm bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-xl p-4 border border-gray-100/50">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>
                        {enrichedArticles.length} article{enrichedArticles.length !== 1 ? 's' : ''} • 
                        {articles.length > 0 
                          ? ` Updated ${new Date(articles[0].scrapedAt).toLocaleTimeString()}`
                          : ' Never updated'
                        }
                      </span>
                    </div>
                    
                    {/* Controls */}
                    {enrichedArticles.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={selectAllArticles}
                          className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                        >
                          Select All
                        </button>
                        {selectedArticles.size > 0 && (
                          <button
                            onClick={clearAllSelections}
                            className="px-4 py-2 text-sm bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                          >
                            Clear ({selectedArticles.size})
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Selected Articles Indicator */}
                    {selectedArticles.size > 0 && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100/50">
                        <p className="text-blue-700 font-semibold flex items-center space-x-2 text-sm">
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
