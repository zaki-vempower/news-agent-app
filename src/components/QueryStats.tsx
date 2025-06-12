'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

interface CacheStats {
  totalQueries: number;
  activeQueries: number;
  staleQueries: number;
  fetchingQueries: number;
  cacheSize: string;
}

export default function QueryStats() {
  const queryClient = useQueryClient();
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      const activeQueries = queries.filter(q => q.getObserversCount() > 0).length;
      const staleQueries = queries.filter(q => q.isStale()).length;
      const fetchingQueries = queries.filter(q => q.state.fetchStatus === 'fetching').length;
      
      // Estimate cache size (rough calculation)
      const cacheSize = `${Math.round(queries.length * 0.1)}KB`;
      
      setStats({
        totalQueries: queries.length,
        activeQueries,
        staleQueries,
        fetchingQueries,
        cacheSize,
      });
    };

    // Update stats immediately
    updateStats();

    // Update stats every 2 seconds
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, [queryClient]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Show React Query Stats"
      >
        📊 RQ
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg text-xs z-50 min-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">React Query Stats</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>
      
      {stats && (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Queries:</span>
            <span className="font-mono">{stats.totalQueries}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Active:</span>
            <span className="font-mono text-green-600">{stats.activeQueries}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Stale:</span>
            <span className="font-mono text-yellow-600">{stats.staleQueries}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Fetching:</span>
            <span className="font-mono text-blue-600">{stats.fetchingQueries}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Cache Size:</span>
            <span className="font-mono">{stats.cacheSize}</span>
          </div>
          
          <div className="pt-2 mt-2 border-t border-gray-200">
            <button
              onClick={() => {
                queryClient.invalidateQueries();
                queryClient.refetchQueries();
              }}
              className="w-full bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
            >
              Refresh All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
