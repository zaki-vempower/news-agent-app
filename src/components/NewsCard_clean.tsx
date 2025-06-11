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

  const timeAgo = formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true });

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md ${
      isSelected ? 'ring-2 ring-blue-500 border-blue-200' : ''
    }`}>
      {/* Selection Indicator */}
      {onToggleSelection && (
        <button
          onClick={onToggleSelection}
          className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected 
              ? 'bg-blue-600 border-blue-600 text-white' 
              : 'bg-white border-gray-300 hover:border-blue-400'
          }`}
        >
          {isSelected && <Check className="h-3 w-3" />}
        </button>
      )}

      {/* Image */}
      <div className="relative">
        {article.imageUrl ? (
          <img 
            src={article.imageUrl} 
            alt={article.title}
            className="w-full h-48 object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
            <Globe className="h-12 w-12 text-gray-400" />
          </div>
        )}
        
        {/* Category Badge */}
        {article.category && (
          <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
            {article.category}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2 leading-tight">
          {article.title}
        </h3>
        
        {article.summary && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-3">
            {article.summary}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <div className="flex items-center space-x-2">
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
            <span>Read Article</span>
            <ExternalLink className="h-3 w-3" />
          </button>

          {/* Save Button */}
          {session && onSaveToggle && (
            <button
              onClick={handleSaveToggle}
              disabled={isSaving}
              className={`p-2 rounded-lg transition-colors ${
                isSaved 
                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
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
    </div>
  );
}
