'use client';

import { useState } from 'react';
import { ExternalLink, Calendar, Globe, Check, Bookmark, BookmarkCheck, TrendingUp, AlertCircle } from 'lucide-react';
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

interface FeaturedNewsCardProps {
  article: NewsArticle;
  isSelected?: boolean;
  onToggleSelection?: () => void;
  isSaved?: boolean;
  onSaveToggle?: (articleId: string, isSaved: boolean) => void;
  isBreaking?: boolean;
  isTrending?: boolean;
}

export default function FeaturedNewsCard({ 
  article, 
  isSelected = false, 
  onToggleSelection, 
  isSaved = false, 
  onSaveToggle,
  isBreaking = false,
  isTrending = false
}: FeaturedNewsCardProps) {
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
    <div className={`group bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 relative ${
      isSelected ? 'ring-2 ring-blue-500 border-blue-200 shadow-xl shadow-blue-500/20' : ''
    }`}>
      
      {/* Breaking/Trending Badge */}
      {(isBreaking || isTrending) && (
        <div className={`absolute top-6 left-6 z-20 flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-sm shadow-lg ${
          isBreaking 
            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white animate-pulse' 
            : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
        }`}>
          {isBreaking ? (
            <>
              <AlertCircle className="h-4 w-4" />
              <span>BREAKING</span>
            </>
          ) : (
            <>
              <TrendingUp className="h-4 w-4" />
              <span>TRENDING</span>
            </>
          )}
        </div>
      )}

      {/* Selection Indicator */}
      {onToggleSelection && (
        <button
          onClick={onToggleSelection}
          className={`absolute top-6 right-6 z-20 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 backdrop-blur-sm ${
            isSelected 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-600 text-white shadow-lg shadow-blue-500/40' 
              : 'bg-white/90 border-gray-300 hover:border-blue-400 hover:shadow-md'
          }`}
        >
          {isSelected && <Check className="h-4 w-4" />}
        </button>
      )}

      <div className="lg:flex lg:h-80">
        {/* Image Section */}
        <div className="relative lg:w-1/2 h-64 lg:h-full overflow-hidden">
          {article.imageUrl ? (
            <img 
              src={article.imageUrl} 
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <Globe className="h-16 w-16 text-gray-400" />
            </div>
          )}
          
          {/* Category Badge */}
          {article.category && (
            <div className="absolute bottom-4 left-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm px-4 py-2 rounded-full font-medium shadow-lg backdrop-blur-sm">
              {article.category}
            </div>
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>

        {/* Content Section */}
        <div className="lg:w-1/2 p-8 flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-2xl lg:text-3xl mb-4 leading-tight group-hover:text-blue-600 transition-colors">
              {article.title}
            </h2>
            
            {article.summary && (
              <p className="text-gray-600 text-base lg:text-lg mb-6 line-clamp-4 leading-relaxed">
                {article.summary}
              </p>
            )}

            {/* Metadata */}
            <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
              <div className="flex items-center space-x-3 bg-gray-50 rounded-xl px-4 py-2">
                <Globe className="h-4 w-4" />
                <span className="font-medium">{article.source}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>{timeAgo}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleReadMore}
              className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 text-base font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105"
            >
              <span>Read Full Article</span>
              <ExternalLink className="h-4 w-4" />
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
                  <BookmarkCheck className="h-5 w-5" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
