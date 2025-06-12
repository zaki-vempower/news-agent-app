'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Bot, User, Loader, MessageCircle, Tag, Plus, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { 
  useChatSessions, 
  useChatSession, 
  useCreateChatSession, 
  useSendMessage,
  useUpdateChatSession,
  useDeleteChatSession
} from '../hooks/useApi';

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

interface ChatBotProps {
  articles: NewsArticle[];
  selectedArticles?: NewsArticle[];
}

export default function ChatBot({ articles, selectedArticles = [] }: ChatBotProps) {
  const { data: session } = useSession();
  
  // React Query hooks
  const { data: sessions = [], isLoading: loadingSessions } = useChatSessions();
  const createChatSessionMutation = useCreateChatSession();
  const sendMessageMutation = useSendMessage();
  const updateChatSessionMutation = useUpdateChatSession();
  const deleteChatSessionMutation = useDeleteChatSession();
  
  // Local state
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionSelectedArticles, setSessionSelectedArticles] = useState<NewsArticle[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get active session data
  const { data: activeSessionData } = useChatSession(activeSessionId || '');
  const activeSession = activeSessionData || null;
  const messages = useMemo(() => {
    if (!activeSession?.messages) return [];
    return activeSession.messages.map(msg => ({
      ...msg,
      timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
    }));
  }, [activeSession?.messages]);
  const loading = sendMessageMutation.isPending || createChatSessionMutation.isPending || 
                 updateChatSessionMutation.isPending || deleteChatSessionMutation.isPending;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set active session from sessions data
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId) {
      const activeSessionInList = sessions.find(s => s.isActive);
      if (activeSessionInList) {
        setActiveSessionId(activeSessionInList.id);
        // Parse and set session's selected articles
        const storedSelectedArticles = activeSessionInList.selectedArticles 
          ? JSON.parse(activeSessionInList.selectedArticles) 
          : [];
        setSessionSelectedArticles(storedSelectedArticles);
      }
    }
  }, [sessions, activeSessionId]);

  const createNewSession = () => {
    if (!session?.user) return;

    // Generate a more descriptive title
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString();
    
    createChatSessionMutation.mutate({
      title: `Chat Session - ${dateStr} ${timeStr}`,
      message: '', // Will be filled in by the welcome message
      selectedArticles: selectedArticles.length > 0 ? selectedArticles : undefined
    }, {
      onSuccess: (newSession) => {
        setActiveSessionId(newSession.id);
        setSessionSelectedArticles(selectedArticles);
      }
    });
  };

  const switchToSession = (sessionId: string) => {
    if (!session?.user || sessionId === activeSessionId) return;

    updateChatSessionMutation.mutate({
      sessionId,
      isActive: true
    }, {
      onSuccess: (sessionData) => {
        setActiveSessionId(sessionId);
        // Parse and set session's selected articles
        const storedSelectedArticles = sessionData.selectedArticles 
          ? JSON.parse(sessionData.selectedArticles) 
          : [];
        setSessionSelectedArticles(storedSelectedArticles);
      }
    });
  };

  const deleteSession = (sessionIdToDelete: string) => {
    if (!session?.user) return;

    deleteChatSessionMutation.mutate(sessionIdToDelete, {
      onSuccess: () => {
        // If we're deleting the active session, clear it and switch to most recent
        if (sessionIdToDelete === activeSessionId) {
          const remainingSessions = sessions.filter(s => s.id !== sessionIdToDelete);
          if (remainingSessions.length > 0) {
            const mostRecent = remainingSessions.sort((a, b) => 
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            )[0];
            // Switch to most recent session
            setTimeout(() => switchToSession(mostRecent.id), 100);
          } else {
            // No more sessions, clear active session
            setActiveSessionId(null);
            setSessionSelectedArticles([]);
          }
        }
      }
    });
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    if (activeSessionId) {
      // Send message to existing session
      sendMessageMutation.mutate({
        sessionId: activeSessionId,
        message: userMessage,
        selectedArticles: sessionSelectedArticles.length > 0 ? sessionSelectedArticles : undefined,
      });
    } else if (session?.user) {
      // Create new session with the message
      createChatSessionMutation.mutate({
        title: `Chat ${new Date().toLocaleDateString()}`,
        message: userMessage,
        selectedArticles: sessionSelectedArticles.length > 0 ? sessionSelectedArticles : undefined
      }, {
        onSuccess: (newSession) => {
          setActiveSessionId(newSession.id);
          setSessionSelectedArticles(selectedArticles);
        }
      });
    } else {
      // Guest user - would need separate handling or redirect to sign in
      console.log('Guest users need to sign in to chat');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-7xl mx-auto bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
      <div className="flex h-[700px]">
        {/* Left Sidebar - Session Tabs for authenticated users */}
        {session?.user && (
          <div className="w-80 bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-200 flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Chat Sessions</h3>
              <button
                onClick={createNewSession}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105"
              >
                <Plus className="h-4 w-4" />
                <span>New Chat Session</span>
              </button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-3">
                    <Loader className="h-5 w-5 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-600">Loading sessions...</span>
                  </div>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No chat sessions yet</p>
                  <p className="text-xs text-gray-400 mt-1">Click &quot;New Chat Session&quot; to start</p>
                </div>
              ) : (
                sessions
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  .map((sessionItem) => (
                  <div
                    key={sessionItem.id}
                    className={`group relative p-3 rounded-xl border transition-all duration-200 ${
                      sessionItem.isActive
                        ? 'bg-white border-blue-200 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-gray-50/50 border-gray-200 hover:bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <button
                      onClick={() => switchToSession(sessionItem.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-6">
                          <h4 className={`font-medium text-sm truncate ${
                            sessionItem.isActive ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {sessionItem.title}
                          </h4>
                          <p className={`text-xs mt-1 ${
                            sessionItem.isActive ? 'text-blue-600' : 'text-gray-500'
                          }`}>
                            {new Date(sessionItem.updatedAt).toLocaleDateString()} at{' '}
                            {new Date(sessionItem.updatedAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                          {sessionItem.isActive && (
                            <div className="flex items-center mt-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                              <span className="text-xs text-blue-600 font-medium">Active Session</span>
                            </div>
                          )}
                          {/* Show selected articles indicator */}
                          {sessionItem.selectedArticles && (
                            <div className="flex items-center mt-1">
                              <Tag className="h-3 w-3 text-amber-600 mr-1" />
                              <span className="text-xs text-amber-600">
                                {JSON.parse(sessionItem.selectedArticles).length} articles
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                    
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(sessionItem.id);
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title="Delete session"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Session Stats */}
            <div className="p-4 border-t border-gray-200 bg-gray-50/50">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
                <span>Auto-saved</span>
              </div>
            </div>
          </div>
        )}

        {/* Right Side - Chat Area */}
        <div className={`flex-1 flex flex-col ${session?.user ? '' : 'w-full'}`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/50 p-6">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Bot className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  AI Chat Assistant
                  {activeSession && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      - {activeSession.title}
                    </span>
                  )}
                </h2>
                <p className="text-gray-600">
                  {sessionSelectedArticles.length > 0 
                    ? `Discussing ${sessionSelectedArticles.length} selected article${sessionSelectedArticles.length !== 1 ? 's' : ''}`
                    : `Ready to discuss ${articles.length} articles`
                  }
                  {session?.user && (
                    <span className="ml-2 text-blue-600">• Sessions saved</span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Selected Articles Preview */}
            {sessionSelectedArticles.length > 0 && (
              <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                  <Tag className="h-4 w-4 mr-2" />
                  Selected Articles (Frozen for this session)
                </h3>
                <div className="space-y-2">
                  {sessionSelectedArticles.slice(0, 3).map((article, index) => (
                    <div key={article.id} className="text-sm text-blue-800 bg-white rounded px-3 py-2">
                      {index + 1}. {article.title} ({article.source})
                    </div>
                  ))}
                  {sessionSelectedArticles.length > 3 && (
                    <div className="text-sm text-blue-600 text-center py-1">
                      +{sessionSelectedArticles.length - 3} more articles
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Messages Container */}
          <div className="flex-1 bg-gradient-to-b from-gray-50/50 to-white/50 overflow-y-auto p-6 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex space-x-4 max-w-xs lg:max-w-md ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                    message.isUser 
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/25' 
                      : 'bg-gradient-to-br from-gray-600 to-gray-700 shadow-gray-500/25'
                  }`}>
                    {message.isUser ? (
                      <User className="h-5 w-5 text-white" />
                    ) : (
                      <Bot className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div
                    className={`px-5 py-3 rounded-2xl shadow-sm ${
                      message.isUser
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-white text-gray-900 border border-gray-100 shadow-lg'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    <p className={`text-xs mt-2 ${message.isUser ? 'text-blue-100' : 'text-gray-500'}`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="flex space-x-4 max-w-xs lg:max-w-md">
                  <div className="bg-gradient-to-br from-gray-600 to-gray-700 w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-gray-500/25">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="bg-white border border-gray-100 px-5 py-3 rounded-2xl shadow-lg">
                    <div className="flex items-center space-x-2">
                      <Loader className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 p-6">
            <div className="flex space-x-4">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  sessionSelectedArticles.length > 0 
                    ? `Ask about the ${sessionSelectedArticles.length} selected articles for this session...`
                    : "Ask me about the news..."
                }
                className="flex-1 resize-none border border-gray-200 rounded-xl px-5 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder-gray-500 bg-white/80 backdrop-blur-sm shadow-sm"
                rows={2}
                disabled={loading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105 disabled:transform-none"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
            {sessionSelectedArticles.length > 0 && (
              <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl px-5 py-3 border border-blue-100">
                <p className="text-sm text-blue-700 flex items-center">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  I can help you analyze, compare, or answer questions about the articles selected for this session.
                </p>
              </div>
            )}
            {!session?.user && (
              <div className="mt-4 bg-yellow-50 rounded-xl px-5 py-3 border border-yellow-200">
                <p className="text-sm text-yellow-700">
                  💡 Sign in to save your chat sessions and continue conversations later!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
