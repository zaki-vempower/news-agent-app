'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { BookmarkX, MessageCircle, ExternalLink, Calendar, User, ArrowLeft } from 'lucide-react';

interface SavedArticle {
  id: string;
  savedAt: string;
  notes?: string;
  article: {
    id: string;
    title: string;
    summary?: string;
    content: string;
    url: string;
    imageUrl?: string;
    source: string;
    category?: string;
    publishedAt: string;
  };
}

export default function SavedArticlesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    fetchSavedArticles();
  }, [session, status, router]);

  const fetchSavedArticles = async () => {
    try {
      const response = await fetch('/api/saved-articles');
      if (!response.ok) {
        throw new Error('Failed to fetch saved articles');
      }
      const data = await response.json();
      setSavedArticles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved articles');
    } finally {
      setLoading(false);
    }
  };

  const removeSavedArticle = async (articleId: string) => {
    try {
      const response = await fetch(`/api/saved-articles?articleId=${articleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove article');
      }

      setSavedArticles(prev => prev.filter(saved => saved.article.id !== articleId));
    } catch (err) {
      console.error('Error removing saved article:', err);
      setError('Failed to remove article');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your saved articles...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to sign in
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to News
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-gray-600" />
            <span className="text-gray-900 font-medium">{session.user?.name || session.user?.email}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Saved Articles</h1>
          <p className="text-gray-600">
            {savedArticles.length === 0 
              ? "You haven't saved any articles yet. Start reading and save interesting articles for later!"
              : `You have ${savedArticles.length} saved article${savedArticles.length === 1 ? '' : 's'}`
            }
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Saved Articles List */}
        {savedArticles.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No saved articles yet</h3>
            <p className="text-gray-600 mb-6">
              When you find interesting articles, click the bookmark icon to save them here.
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse News Articles
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {savedArticles.map((savedArticle) => (
              <div
                key={savedArticle.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {savedArticle.article.source}
                      </span>
                      {savedArticle.article.category && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {savedArticle.article.category}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 mb-3 leading-tight">
                      {savedArticle.article.title}
                    </h3>

                    {savedArticle.article.summary && (
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {savedArticle.article.summary}
                      </p>
                    )}

                    {savedArticle.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-yellow-800">
                          <strong>Your notes:</strong> {savedArticle.notes}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Published {formatDistanceToNow(new Date(savedArticle.article.publishedAt), { addSuffix: true })}
                      </div>
                      <div>
                        Saved {formatDistanceToNow(new Date(savedArticle.savedAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>

                  {savedArticle.article.imageUrl && (
                    <div className="ml-6">
                      <img
                        src={savedArticle.article.imageUrl}
                        alt={savedArticle.article.title}
                        className="w-32 h-24 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div className="flex space-x-3">
                    <a
                      href={savedArticle.article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Read Full Article
                    </a>
                  </div>

                  <button
                    onClick={() => removeSavedArticle(savedArticle.article.id)}
                    className="inline-flex items-center text-red-600 hover:text-red-700 transition-colors"
                    title="Remove from saved articles"
                  >
                    <BookmarkX className="w-4 h-4 mr-1" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
