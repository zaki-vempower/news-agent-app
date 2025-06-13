'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Newspaper, MessageCircle, Clock, LogIn, Search, TrendingUp, Zap, Globe, Calendar, ExternalLink, Bookmark, BookmarkCheck } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
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

  // Helper function to get category badge class
  const getCategoryBadgeClass = (category: string) => {
    const categoryLower = category?.toLowerCase() || '';
    const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide transition-all';
    
    switch (categoryLower) {
      case 'technology': return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'business': return `${baseClasses} bg-green-100 text-green-800`;
      case 'politics': return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'sports': return `${baseClasses} bg-pink-100 text-pink-800`;
      case 'health': return `${baseClasses} bg-emerald-100 text-emerald-800`;
      case 'science': return `${baseClasses} bg-indigo-100 text-indigo-800`;
      case 'environment': return `${baseClasses} bg-green-100 text-green-700`;
      case 'economy': return `${baseClasses} bg-orange-100 text-orange-800`;
      default: return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (loading && articles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Newspaper className="h-8 w-8 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading News</h2>
          <p className="text-gray-600">Getting the latest stories for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Navigation Header */}
      <header className="bg-white/95 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Newspaper className="h-6 w-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">NewsHub</h1>
                <p className="text-xs text-gray-500">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => setActiveTab('news')}
                className={`text-sm font-medium transition-colors ${
                  activeTab === 'news' 
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-1' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Latest News
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`text-sm font-medium transition-colors relative ${
                  activeTab === 'chat' 
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-1' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                AI Analysis
                {selectedArticles.size > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {selectedArticles.size}
                  </span>
                )}
              </button>
            </nav>

            {/* Search and Auth */}
            <div className="flex items-center space-x-4">
              <div className="relative hidden sm:block">
                <input
                  type="text"
                  placeholder="Search news..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
                  className="w-64 px-4 py-2 pl-10 pr-4 bg-gray-100 border-0 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>

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
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden pb-4">
            <div className="flex space-x-4 mb-3">
              <button
                onClick={() => setActiveTab('news')}
                className={`flex-1 py-2 text-sm font-medium text-center rounded-lg transition-colors ${
                  activeTab === 'news'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                News
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 text-sm font-medium text-center rounded-lg transition-colors relative ${
                  activeTab === 'chat'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                AI Chat
                {selectedArticles.size > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {selectedArticles.size}
                  </span>
                )}
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 bg-gray-100 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </header>

      {/* Category Filter Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-6 py-3 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => handleCategoryChange(category.value)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category.value
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'news' ? (
          <div>
            {filteredArticles.length > 0 ? (
              <>
                {/* Breaking News Banner */}
                {enrichedArticles.some(article => article.isBreaking) && (
                  <div className="mb-8 p-4 bg-red-600 text-white w-full">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-5 w-5 animate-pulse" />
                      <span className="font-bold text-sm uppercase tracking-wide">Breaking News</span>
                    </div>
                    <h2 className="text-lg font-semibold mt-2">
                      {enrichedArticles.find(article => article.isBreaking)?.title}
                    </h2>
                  </div>
                )}

                {/* Full Width Hero Section */}
                <div className="mb-12 w-full">
                  {enrichedArticles.slice(0, 1).map((article) => (
                    <article key={article.id} className="bg-gradient-to-r from-blue-50 via-white to-purple-50 border-b-2 border-blue-100 pb-8 mb-8 w-full">
                      <div className="w-full">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center space-x-3">
                            {article.category && (
                              <span className={getCategoryBadgeClass(article.category)}>
                                {article.category}
                              </span>
                            )}
                            {article.isBreaking && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-red-100 text-red-700 animate-pulse">
                                Breaking
                              </span>
                            )}
                            {article.isTrending && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-orange-100 text-orange-700">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Trending
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => toggleArticleSelection(article.id)}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                              selectedArticles.has(article.id)
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-gray-300 hover:border-blue-400'
                            }`}
                          >
                            {selectedArticles.has(article.id) && <span className="text-xs">✓</span>}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
                          {article.imageUrl && (
                            <div className="relative overflow-hidden">
                              <img 
                                src={article.imageUrl} 
                                alt={article.title}
                                className="w-full h-96 object-cover hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            </div>
                          )}

                          <div className="flex flex-col justify-center">
                            <h1 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-6 hover:text-blue-600 transition-colors leading-tight">
                              {article.title}
                            </h1>

                            {article.summary && (
                              <p className="text-gray-600 text-xl leading-relaxed mb-8">
                                {article.summary}
                              </p>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-6 text-sm text-gray-500">
                                <div className="flex items-center space-x-2">
                                  <Globe className="h-4 w-4" />
                                  <span className="font-medium">{article.source}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Clock className="h-4 w-4" />
                                  <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => window.open(article.url, '_blank')}
                                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
                              >
                                <span>Read Full Article</span>
                                <ExternalLink className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Full Width News Grid */}
                <section className="mb-12 w-full">
                  <div className="flex items-center justify-between mb-8 w-full">
                    <h2 className="text-3xl font-bold text-gray-900">Latest Headlines</h2>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                        <span>{enrichedArticles.filter(a => a.isTrending).length} Trending</span>
                      </div>
                      <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <Clock className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Full Width Grid Layout */}
                  <div className="w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full">
                      {enrichedArticles.slice(1).map((article, index) => (
                        <article key={article.id} className="bg-white border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group">
                          {/* Article Selection */}
                          <button
                            onClick={() => toggleArticleSelection(article.id)}
                            className={`absolute top-3 left-3 z-10 w-5 h-5 rounded border flex items-center justify-center text-xs transition-all ${
                              selectedArticles.has(article.id)
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white/90 border-gray-300 hover:border-blue-400'
                            }`}
                          >
                            {selectedArticles.has(article.id) && '✓'}
                          </button>

                          {/* Article Number */}
                          <div className="absolute top-3 right-3 z-10 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {String(index + 1).padStart(2, '0')}
                          </div>

                          {/* Article Image */}
                          <div className="relative overflow-hidden">
                            {article.imageUrl ? (
                              <img 
                                src={article.imageUrl} 
                                alt={article.title}
                                className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                <Globe className="h-12 w-12 text-gray-400" />
                              </div>
                            )}
                            
                            {/* Category Badge on Image */}
                            {article.category && (
                              <div className="absolute bottom-3 left-3">
                                <span className={getCategoryBadgeClass(article.category)}>
                                  {article.category}
                                </span>
                              </div>
                            )}

                            {/* Breaking/Trending Badges */}
                            <div className="absolute top-12 left-3 space-y-2">
                              {article.isBreaking && (
                                <span className="block bg-red-600 text-white text-xs px-2 py-1 rounded animate-pulse">
                                  Breaking
                                </span>
                              )}
                              {article.isTrending && (
                                <span className="flex items-center bg-orange-600 text-white text-xs px-2 py-1 rounded">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  Trending
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Article Content */}
                          <div className="p-4">
                            <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer leading-tight">
                              {article.title}
                            </h3>

                            {article.summary && (
                              <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
                                {article.summary}
                              </p>
                            )}

                            {/* Metadata */}
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                              <div className="flex items-center space-x-1">
                                <Globe className="h-3 w-3" />
                                <span className="font-medium truncate">{article.source}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span className="truncate">{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => window.open(article.url, '_blank')}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs font-medium"
                              >
                                <span>Read</span>
                                <ExternalLink className="h-3 w-3" />
                              </button>

                              {/* Save Button */}
                              {session && (
                                <button
                                  onClick={() => handleSaveToggle(article.id, !savedArticles.has(article.id))}
                                  className={`p-1.5 transition-all ${
                                    savedArticles.has(article.id)
                                      ? 'text-amber-600 hover:text-amber-700' 
                                      : 'text-gray-400 hover:text-gray-600'
                                  }`}
                                  title={savedArticles.has(article.id) ? 'Remove from saved' : 'Save article'}
                                >
                                  {savedArticles.has(article.id) ? (
                                    <BookmarkCheck className="h-4 w-4" />
                                  ) : (
                                    <Bookmark className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Load More */}
                {loadingMore && (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center space-x-3 px-6 py-3 bg-white border border-gray-200">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                      <span className="text-gray-600">Loading more articles...</span>
                    </div>
                  </div>
                )}

                {!hasMore && !loadingMore && filteredArticles.length > 0 && (
                  <div className="text-center py-12">
                    <div className="max-w-md mx-auto">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Newspaper className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">You&apos;re all caught up!</h3>
                      <p className="text-gray-600 mb-6">Check back later for more stories</p>
                      <button
                        onClick={handleRefresh}
                        className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                      >
                        Refresh News
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Newspaper className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">No articles found</h3>
                  <p className="text-gray-600 mb-8">
                    {selectedCategory === 'all'
                      ? 'Try refreshing to load the latest news'
                      : `No articles found in ${categories.find(c => c.value === selectedCategory)?.label}`
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
          </div>
        ) : (
          <ChatBot 
            articles={articles} 
            selectedArticles={getSelectedArticlesData()}
          />
        )}
      </main>

      {/* Floating Action Button for Selection */}
      {selectedArticles.size > 0 && (
        <button
          onClick={() => setActiveTab('chat')}
          className="fixed bottom-8 right-8 z-50 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all"
          title={`Analyze ${selectedArticles.size} selected articles`}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
