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
    <div className={`group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 ${
      isSelected ? 'ring-2 ring-blue-500 border-blue-200 shadow-lg shadow-blue-500/20' : ''
    }`}>
      {/* Selection Indicator */}
      {onToggleSelection && (
        <button
          onClick={onToggleSelection}
          className={`absolute top-4 left-4 z-10 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 backdrop-blur-sm ${
            isSelected 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-600 text-white shadow-lg shadow-blue-500/40' 
              : 'bg-white/90 border-gray-300 hover:border-blue-400 hover:shadow-md'
          }`}
        >
          {isSelected && <Check className="h-4 w-4" />}
        </button>
      )}

      {/* Image */}
      <div className="relative overflow-hidden">
        {article.imageUrl ? (
          <img 
            src={article.imageUrl} 
            alt={article.title}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <Globe className="h-12 w-12 text-gray-400" />
          </div>
        )}
        
        {/* Category Badge */}
        {article.category && (
          <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-lg backdrop-blur-sm">
            {article.category}
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-gray-900 text-lg mb-3 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
          {article.title}
        </h3>
        
        {article.summary && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
            {article.summary}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-5">
          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-1.5">
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
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 text-sm font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105"
          >
            <span>Read Article</span>
            <ExternalLink className="h-3 w-3" />
          </button>

          {/* Save Button */}
          {session && onSaveToggle && (
            <button
              onClick={handleSaveToggle}
              disabled={isSaving}
              className={`p-3 rounded-xl transition-all duration-200 ${
                isSaved 
                  ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-600 hover:from-amber-200 hover:to-orange-200 shadow-lg shadow-amber-500/25' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-110'}`}
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
