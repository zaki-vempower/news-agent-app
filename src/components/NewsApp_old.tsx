'use client';

import { useState, useEffect, useCallback } from 'react';
import { Newspaper, MessageCircle, RefreshCw, Clock, Filter, User, LogIn, LogOut, Bookmark, Search, Sparkles } from 'lucide-react';
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
        const response = await fetch('/api/saved-articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId }),
        });
        if (response.ok) {
          setSavedArticles(prev => new Set(prev).add(articleId));
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
        scrollPosition >= threshold // Load more when 1000px from bottom
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
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center relative overflow-hidden">
        {/* Animated Background - Retro Vibes */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-pink-200/30 to-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-orange-200/30 to-yellow-200/30 rounded-full blur-3xl animate-bounce"></div>
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-gradient-to-r from-green-200/20 to-blue-200/20 rounded-full blur-3xl animate-ping"></div>
          <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-r from-indigo-200/25 to-purple-200/25 rounded-full blur-2xl animate-pulse delay-500"></div>
        </div>
        
        <div className="flex flex-col items-center space-y-8 relative z-10">
          <div className="relative hover:scale-110 transition-transform duration-500">
            <div className="w-28 h-28 bg-gradient-to-r from-orange-300 via-pink-300 to-purple-300 rounded-3xl flex items-center justify-center shadow-xl animate-bounce border-4 border-white/60 backdrop-blur-sm">
              <Newspaper className="h-14 w-14 text-white" />
            </div>
            <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-full flex items-center justify-center animate-spin shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-gradient-to-r from-green-300 to-blue-300 rounded-full animate-ping"></div>
          </div>
          <div className="text-center backdrop-blur-sm bg-white/40 rounded-3xl px-12 py-8 border-2 border-purple-200/50 shadow-xl">
            <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 mb-4 tracking-tight">
              NewsBot AI ✨
            </h2>
            <p className="text-purple-700 text-2xl font-semibold mb-2">Loading your daily stories 📰</p>
            <p className="text-pink-600 text-lg font-medium">Creating something beautiful for you ✨</p>
          </div>
          <div className="flex space-x-3">
            <div className="w-4 h-4 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full animate-bounce shadow-md"></div>
            <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-bounce delay-100 shadow-md"></div>
            <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-green-400 rounded-full animate-bounce delay-200 shadow-md"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements - Retro Aesthetic */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-r from-pink-200 to-yellow-200 rounded-full opacity-40 animate-pulse blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-purple-200 to-blue-200 rounded-full opacity-30 animate-pulse blur-3xl delay-1000"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-r from-green-200 to-orange-200 rounded-full opacity-25 animate-ping blur-2xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-gradient-to-r from-indigo-200 to-pink-200 rounded-full opacity-35 animate-bounce blur-xl"></div>
      </div>
      
      {/* Header */}
      <header className="relative z-10 backdrop-blur-sm bg-white/60 shadow-lg border-b border-purple-200/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="relative hover:scale-110 transition-transform duration-500">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-300 via-pink-300 to-purple-300 rounded-3xl flex items-center justify-center shadow-lg transform rotate-6 animate-pulse">
                  <Newspaper className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-full flex items-center justify-center animate-spin">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-gradient-to-r from-green-300 to-blue-300 rounded-full animate-bounce"></div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 tracking-tight">
                  NewsBot AI ✨
                </h1>
                <p className="text-purple-600 text-lg font-medium tracking-wide">
                  Beautiful stories, beautifully told 🌸
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Category Dropdown */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="appearance-none bg-gradient-to-r from-pink-100 to-purple-100 backdrop-blur-sm border-2 border-pink-200 rounded-2xl px-6 py-3 pr-10 text-sm font-semibold text-purple-700 placeholder-purple-400 hover:from-pink-200 hover:to-purple-200 focus:outline-none focus:ring-4 focus:ring-purple-300/50 shadow-lg transition-all duration-300 hover:scale-105"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value} className="bg-white text-purple-700">
                      {category.label}
                    </option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-500 pointer-events-none" />
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search beautiful stories... 🌺"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                  className="w-72 px-6 py-3 pl-12 pr-6 bg-gradient-to-r from-orange-100 to-pink-100 backdrop-blur-sm border-2 border-orange-200 rounded-2xl text-sm font-semibold text-orange-700 placeholder-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-300/50 shadow-lg transition-all duration-300 hover:from-orange-200 hover:to-pink-200 hover:scale-105"
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-orange-500" />
                {searchQuery && (
                  <button
                    onClick={() => handleSearch(searchQuery)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 px-3 py-1.5 bg-gradient-to-r from-yellow-300 to-orange-300 text-white text-xs font-bold rounded-xl hover:from-yellow-400 hover:to-orange-400 transition-all duration-200 hover:scale-110 shadow-md"
                  >
                    Search ✨
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-4">
                {/* Authentication UI */}
                {status === 'loading' ? (
                  <div className="animate-spin h-8 w-8 border-4 border-purple-300 border-t-transparent rounded-full" />
                ) : session ? (
                  <div className="flex items-center space-x-4">
                    {/* Saved Articles Button */}
                    <button
                      onClick={() => router.push('/saved')}
                      className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-pink-200 to-purple-200 text-purple-700 hover:from-pink-300 hover:to-purple-300 transition-all duration-300 rounded-2xl shadow-lg border-2 border-pink-200 hover:scale-110 font-semibold"
                      title="Your beautiful saved stories 💖"
                    >
                      <Bookmark className="h-5 w-5" />
                      <span className="text-sm">Saved ({savedArticles.size}) 💜</span>
                    </button>
                    
                    {/* User Menu */}
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-blue-200 to-indigo-200 text-blue-700 rounded-2xl shadow-lg border-2 border-blue-200 font-semibold">
                        <User className="h-5 w-5" />
                        <span className="text-sm">{session.user?.name || session.user?.email} ✨</span>
                      </div>
                      <button
                        onClick={() => signOut()}
                        className="flex items-center space-x-1 px-4 py-3 bg-gradient-to-r from-red-200 to-pink-200 text-red-700 hover:from-red-300 hover:to-pink-300 transition-all duration-300 rounded-2xl shadow-lg border-2 border-red-200 hover:scale-110 font-semibold"
                        title="See you later! 👋"
                      >
                        <LogOut className="h-5 w-5" />
                        <span className="text-sm">Sign Out 👋</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => signIn()}
                    className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-yellow-200 via-orange-200 to-red-200 text-red-700 rounded-2xl hover:from-yellow-300 hover:via-orange-300 hover:to-red-300 transition-all duration-300 shadow-lg hover:scale-110 font-bold text-lg border-2 border-yellow-200"
                  >
                    <LogIn className="h-5 w-5" />
                    <span>Let&apos;s Begin! ✨</span>
                  </button>
                )}
              </div>
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 text-green-700 rounded-2xl hover:from-green-300 hover:via-blue-300 hover:to-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:scale-110 font-bold text-lg border-2 border-green-200"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh ✨'}</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-2 bg-white/50 backdrop-blur-sm rounded-b-3xl p-4 border-t border-purple-200/50">
            <button
              onClick={() => setActiveTab('news')}
              className={`py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-500 ${
                activeTab === 'news'
                  ? 'bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300 text-white shadow-lg scale-105 border-2 border-purple-300'
                  : 'text-purple-600 hover:bg-gradient-to-r hover:from-pink-100 hover:to-purple-100 hover:text-purple-700 hover:scale-105 border-2 border-transparent hover:border-purple-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Newspaper className="h-6 w-6" />
                <span>Beautiful Stories 📖</span>
                {activeTab === 'news' && <Sparkles className="h-5 w-5 animate-pulse" />}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-500 ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-orange-300 via-pink-300 to-purple-300 text-white shadow-lg scale-105 border-2 border-pink-300'
                  : 'text-orange-600 hover:bg-gradient-to-r hover:from-orange-100 hover:to-pink-100 hover:text-orange-700 hover:scale-105 border-2 border-transparent hover:border-orange-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <MessageCircle className="h-6 w-6" />
                <span>Chat with AI 💭</span>
                {activeTab === 'chat' && selectedArticles.size > 0 && (
                  <div className="bg-gradient-to-r from-yellow-300 to-orange-300 text-white text-xs px-3 py-1 rounded-full font-bold animate-pulse">
                    {selectedArticles.size}
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      </header>      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
        {activeTab === 'news' ? (
          <div className="relative">
            {/* News Grid */}
            {filteredArticles.length > 0 ? (
              <>
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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
                  <div className="flex justify-center items-center py-12 relative">
                    {/* Animated background effects */}
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="absolute w-32 h-32 bg-gradient-to-r from-pink-500/30 to-purple-500/30 rounded-full blur-2xl animate-pulse"></div>
                      <div className="absolute w-48 h-48 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-bounce"></div>
                    </div>
                    
                    <div className="relative z-10 bg-gradient-to-br from-white/90 via-pink-50/90 to-purple-50/90 rounded-3xl shadow-lg p-8 border-2 border-purple-200/50 backdrop-blur-sm">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="animate-spin h-10 w-10 border-4 border-purple-300 border-t-transparent rounded-full shadow-lg"></div>
                          <div className="absolute inset-0 animate-ping h-10 w-10 border-2 border-pink-300 border-t-transparent rounded-full"></div>
                        </div>
                        <div>
                          <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Loading more beautiful stories... ✨
                          </span>
                          <p className="text-purple-500 font-semibold text-sm mt-1">Discovering wonderful content for you 📖</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* End of articles message */}
                {!hasMore && !loadingMore && filteredArticles.length > 0 && (
                  <div className="text-center py-12 relative">
                    {/* Animated background effects */}
                    <div className="absolute inset-0 overflow-hidden rounded-3xl">
                      <div className="absolute w-48 h-48 bg-gradient-to-r from-pink-200/30 to-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
                      <div className="absolute w-64 h-64 bg-gradient-to-r from-orange-200/30 to-pink-200/30 rounded-full blur-3xl animate-bounce"></div>
                    </div>
                    
                    <div className="relative z-10 bg-gradient-to-br from-white/90 via-pink-50/90 to-purple-50/90 rounded-3xl shadow-lg p-8 border-2 border-purple-200/50 max-w-md mx-auto backdrop-blur-sm">
                      <div className="relative">
                        <Sparkles className="h-16 w-16 text-purple-400 mx-auto mb-4 animate-pulse" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-pink-300 to-purple-300 rounded-full animate-ping"></div>
                      </div>
                      <p className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
                        That&apos;s all the beautiful stories for now! ✨
                      </p>
                      <p className="text-purple-500 font-semibold mb-6">You&apos;ve explored all our wonderful content 📚</p>
                      <button
                        onClick={handleRefresh}
                        className="px-8 py-4 bg-gradient-to-r from-pink-300 via-purple-300 to-orange-300 text-white rounded-2xl hover:from-pink-400 hover:via-purple-400 hover:to-orange-400 transition-all duration-300 transform hover:scale-110 shadow-lg shadow-purple-200/50 font-bold border-2 border-purple-200/50"
                      >
                        Discover More Stories ✨
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 relative">
                {/* Animated background effects */}
                <div className="absolute inset-0 overflow-hidden rounded-3xl">
                  <div className="absolute w-64 h-64 bg-gradient-to-r from-pink-200/30 to-purple-200/30 rounded-full blur-3xl -top-32 left-1/4 animate-pulse"></div>
                  <div className="absolute w-80 h-80 bg-gradient-to-r from-orange-200/30 to-pink-200/30 rounded-full blur-3xl -bottom-40 right-1/4 animate-bounce"></div>
                </div>
                
                <div className="relative z-10 bg-gradient-to-br from-white/90 via-pink-50/90 to-purple-50/90 rounded-3xl shadow-lg p-12 border-2 border-purple-200/50 max-w-lg mx-auto backdrop-blur-sm">
                  <div className="relative">
                    <Newspaper className="h-20 w-20 text-purple-400 mx-auto mb-6 animate-pulse" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-pink-300 to-purple-300 rounded-full animate-ping"></div>
                  </div>
                  <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
                    {selectedCategory === 'all' 
                      ? 'No stories found yet 📖' 
                      : `No ${categories.find(c => c.value === selectedCategory)?.label} stories available ✨`
                    }
                  </h3>
                  <p className="text-purple-500 mb-8 text-lg font-semibold">
                    {selectedCategory === 'all'
                      ? 'Refresh to discover beautiful new content 🌸'
                      : `Try a different category or refresh for more amazing stories 📚`
                    }
                  </p>
                  <button
                    onClick={handleRefresh}
                    className="px-8 py-4 bg-gradient-to-r from-pink-300 via-purple-300 to-orange-300 text-white rounded-2xl hover:from-pink-400 hover:via-purple-400 hover:to-orange-400 transition-all duration-300 transform hover:scale-110 shadow-lg shadow-purple-200/50 font-bold text-lg border-2 border-purple-200/50"
                  >
                    Discover Stories ✨
                  </button>
                </div>
              </div>
            )}

            {/* Floating Stats Panel - Bottom Right */}
            <div className="fixed bottom-8 right-8 z-50 transform hover:scale-105 transition-all duration-300">
              <div className="bg-gradient-to-br from-white/90 via-pink-50/90 to-purple-50/90 backdrop-blur-sm rounded-3xl shadow-lg p-6 border-2 border-purple-200/50 max-w-sm">
                <div className="space-y-4">
                  {/* Title and Live Indicator */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                      {selectedCategory === 'all' ? 'Stories Feed ✨' : `${categories.find(c => c.value === selectedCategory)?.label} Stories 📖`}
                    </h3>
                    <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-green-300 to-blue-300 rounded-full border-2 border-green-200 shadow-md animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                      <span className="text-xs font-bold text-white">LIVE 🌸</span>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center space-x-2 text-purple-700 text-sm bg-white/60 rounded-2xl p-3 border border-purple-200/50">
                    <Clock className="h-4 w-4 text-purple-500 animate-pulse" />
                    <span className="font-semibold">
                      {filteredArticles.length} beautiful story{filteredArticles.length !== 1 ? 'ies' : 'y'} • {articles.length > 0 
                        ? new Date(articles[0].scrapedAt).toLocaleString() 
                        : 'Never'}
                    </span>
                  </div>
                  
                  {/* Controls */}
                  {filteredArticles.length > 0 && (
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={selectAllArticles}
                        className="px-4 py-2 text-sm bg-gradient-to-r from-blue-300 to-purple-300 text-white rounded-2xl hover:from-blue-400 hover:to-purple-400 transition-all duration-300 transform hover:scale-110 shadow-lg font-bold border-2 border-blue-200"
                      >
                        Select All ✨
                      </button>
                      {selectedArticles.size > 0 && (
                        <button
                          onClick={clearAllSelections}
                          className="px-4 py-2 text-sm bg-gradient-to-r from-pink-300 to-red-300 text-white rounded-2xl hover:from-pink-400 hover:to-red-400 transition-all duration-300 transform hover:scale-110 shadow-lg font-bold border-2 border-pink-200"
                        >
                          Clear ({selectedArticles.size}) 🗂️
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Selected Articles Indicator */}
                  {selectedArticles.size > 0 && (
                    <div className="bg-gradient-to-r from-purple-200 to-pink-200 rounded-2xl px-4 py-3 border-2 border-purple-200 shadow-md">
                      <p className="text-purple-700 font-bold flex items-center space-x-2 text-sm">
                        <Sparkles className="h-4 w-4 animate-spin" />
                        <span>{selectedArticles.size} selected for AI chat! 💬</span>
                      </p>
                    </div>
                  )}
                </div>
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