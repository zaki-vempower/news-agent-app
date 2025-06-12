import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

// Types
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

interface NewsResponse {
  articles: NewsArticle[];
  pagination: {
    page: number;
    pageSize: number;
    total?: number;
    hasMore: boolean;
  };
}

interface SavedArticle {
  id: string;
  article: NewsArticle;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date | string;
}

interface ChatSession {
  id: string;
  title: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  selectedArticles?: string; // JSON string of selected articles
}

// Query Keys
export const queryKeys = {
  news: {
    all: ['news'] as const,
    lists: () => [...queryKeys.news.all, 'list'] as const,
    list: (filters: { category?: string; search?: string; page?: number; pageSize?: number }) =>
      [...queryKeys.news.lists(), filters] as const,
    search: (query: string, page?: number, pageSize?: number) =>
      [...queryKeys.news.all, 'search', { query, page, pageSize }] as const,
  },
  savedArticles: {
    all: ['savedArticles'] as const,
    lists: () => [...queryKeys.savedArticles.all, 'list'] as const,
  },
  chatSessions: {
    all: ['chatSessions'] as const,
    lists: () => [...queryKeys.chatSessions.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.chatSessions.all, 'detail', id] as const,
  },
} as const;

// News API Hooks
export function useNews(params: {
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
} = {}) {
  const { category = 'all', search, page = 1, pageSize = 15, enabled = true } = params;

  return useQuery({
    queryKey: queryKeys.news.list({ category, search, page, pageSize }),
    queryFn: async (): Promise<NewsResponse> => {
      const searchParams = new URLSearchParams();
      if (category !== 'all') searchParams.append('category', category);
      if (search) searchParams.append('search', search);
      searchParams.append('page', page.toString());
      searchParams.append('pageSize', pageSize.toString());

      const response = await fetch(`/api/news?${searchParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.statusText}`);
      }
      return response.json();
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes for news
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useNewsSearch(query: string, page = 1, pageSize = 15) {
  return useQuery({
    queryKey: queryKeys.news.search(query, page, pageSize),
    queryFn: async (): Promise<NewsResponse> => {
      const searchParams = new URLSearchParams();
      searchParams.append('search', query);
      searchParams.append('page', page.toString());
      searchParams.append('pageSize', pageSize.toString());

      const response = await fetch(`/api/news?${searchParams}`);
      if (!response.ok) {
        throw new Error(`Failed to search news: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!query.trim(),
    staleTime: 5 * 60 * 1000, // 5 minutes for search results
  });
}

export function useRefreshNews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { category?: string; page?: number; pageSize?: number }) => {
      const { category = 'all', page = 1, pageSize = 15 } = params;
      
      const response = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh: true, category, page, pageSize }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refresh news: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Update the cache with fresh data
      const { category = 'all', page = 1, pageSize = 15 } = variables;
      queryClient.setQueryData(
        queryKeys.news.list({ category, page, pageSize }),
        data
      );
      
      // Invalidate all news queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.news.all });
    },
  });
}

// Saved Articles Hooks
export function useSavedArticles() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: queryKeys.savedArticles.lists(),
    queryFn: async (): Promise<SavedArticle[]> => {
      const response = await fetch('/api/saved-articles');
      if (!response.ok) {
        throw new Error(`Failed to fetch saved articles: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!session,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useSaveArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { articleId: string; articleData?: NewsArticle }) => {
      const response = await fetch('/api/saved-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: params.articleId,
          articleData: params.articleData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save article: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate saved articles to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.savedArticles.all });
    },
  });
}

export function useUnsaveArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (articleId: string) => {
      const response = await fetch(`/api/saved-articles?articleId=${articleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to unsave article: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate saved articles to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.savedArticles.all });
    },
  });
}

// Chat Sessions Hooks
export function useChatSessions() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: queryKeys.chatSessions.lists(),
    queryFn: async (): Promise<ChatSession[]> => {
      const response = await fetch('/api/chat-sessions');
      if (!response.ok) {
        throw new Error(`Failed to fetch chat sessions: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!session,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useChatSession(sessionId: string) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: queryKeys.chatSessions.detail(sessionId),
    queryFn: async (): Promise<ChatSession> => {
      const response = await fetch(`/api/chat-sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch chat session: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!session && !!sessionId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCreateChatSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { title: string; message: string; selectedArticles?: NewsArticle[] }) => {
      const response = await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to create chat session: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate chat sessions to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.chatSessions.all });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { sessionId: string; message: string; selectedArticles?: NewsArticle[] }) => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Update the specific chat session cache
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.chatSessions.detail(variables.sessionId) 
      });
      // Also invalidate the sessions list in case session was updated
      queryClient.invalidateQueries({ queryKey: queryKeys.chatSessions.lists() });
    },
  });
}

export function useUpdateChatSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { sessionId: string; title?: string; isActive?: boolean }) => {
      const response = await fetch(`/api/chat-sessions/${params.sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: params.title, isActive: params.isActive }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update chat session: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Update the specific session cache
      queryClient.setQueryData(
        queryKeys.chatSessions.detail(variables.sessionId),
        data
      );
      // Invalidate sessions list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.chatSessions.all });
    },
  });
}

export function useDeleteChatSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/chat-sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete chat session: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data, sessionId) => {
      // Remove the session from cache
      queryClient.removeQueries({ queryKey: queryKeys.chatSessions.detail(sessionId) });
      // Invalidate sessions list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.chatSessions.all });
    },
  });
}
