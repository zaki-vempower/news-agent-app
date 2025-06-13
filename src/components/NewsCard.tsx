'use client';

import { useState } from 'react';
import { ExternalLink, Calendar, Globe, Check, Bookmark, BookmarkCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSession } from 'next-auth/react';

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

interface NewsCardProps {
  article: NewsArticle;
  isSelected?: boolean;
  onToggleSelection?: () => void;
  isSaved?: boolean;
  onSaveToggle?: (articleId: string, isSaved: boolean) => void;
}

export default function NewsCard({ article, isSelected = false, onToggleSelection, isSaved = false, onSaveToggle }: NewsCardProps) {
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);

  const handleReadMore = () => {
    window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  const handleSaveToggle = async () => {
    if (!session || !onSaveToggle) return;
    
    setIsSaving(true);
    try {
      onSaveToggle(article.id, !isSaved);
    } catch (error) {
      console.error('Failed to toggle save:', error);
    } finally {
      setIsSaving(false);
    }
  };

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

  const timeAgo = formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true });

  return (
    <article className={`bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${
      isSelected ? 'ring-2 ring-blue-500 border-blue-200' : ''
    }`}>
      {/* Image */}
      <div className="relative">
        {article.imageUrl ? (
          <img 
            src={article.imageUrl} 
            alt={article.title}
            className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <Globe className="h-12 w-12 text-gray-400" />
          </div>
        )}
        
        {/* Selection checkbox */}
        {onToggleSelection && (
          <button
            onClick={onToggleSelection}
            className={`absolute top-3 left-3 w-6 h-6 rounded border-2 flex items-center justify-center transition-all backdrop-blur-sm ${
              isSelected 
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                : 'bg-white/90 border-gray-300 hover:border-blue-400'
            }`}
          >
            {isSelected && <Check className="h-3 w-3" />}
          </button>
        )}

        {/* Category badge */}
        {article.category && (
          <div className="absolute top-3 right-3">
            <span className={getCategoryBadgeClass(article.category)}>
              {article.category}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer leading-tight">
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
            <span className="font-medium">{article.source}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>{timeAgo}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleReadMore}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <span>Read More</span>
            <ExternalLink className="h-3 w-3" />
          </button>

          {/* Save Button */}
          {session && onSaveToggle && (
            <button
              onClick={handleSaveToggle}
              disabled={isSaving}
              className={`p-2 rounded-lg transition-all ${
                isSaved 
                  ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isSaved ? 'Remove from saved' : 'Save article'}
            >
              {isSaved ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
