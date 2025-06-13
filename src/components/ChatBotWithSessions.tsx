'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader, MessageCircle, Tag, Plus, X, Search } from 'lucide-react';
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

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  isActive: boolean;
  updatedAt: string;
  messages: ChatMessage[];
  selectedArticles?: string; // JSON string of selected articles
}

interface ChatBotProps {
  articles: NewsArticle[];
  selectedArticles?: NewsArticle[];
}

export default function ChatBot({ articles, selectedArticles = [] }: ChatBotProps) {
  const { data: session } = useSession();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [sessionSelectedArticles, setSessionSelectedArticles] = useState<NewsArticle[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat sessions for authenticated users
  const loadChatSessions = useCallback(async () => {
    if (!session?.user) return;
    
    setLoadingSessions(true);
    try {
      const response = await fetch('/api/chat-sessions');
      if (response.ok) {
        const sessionsData = await response.json();
        setSessions(sessionsData);
        
        // Load active session if exists
        const activeSessionData = sessionsData.find((s: ChatSession) => s.isActive);
        if (activeSessionData) {
          setActiveSession(activeSessionData);
          
          // Parse and set session's selected articles
          const storedSelectedArticles = activeSessionData.selectedArticles 
            ? JSON.parse(activeSessionData.selectedArticles) 
            : [];
          setSessionSelectedArticles(storedSelectedArticles);
          
          setMessages(activeSessionData.messages.map((msg: ChatMessage) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
        }
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  }, [session?.user]);

  useEffect(() => {
    loadChatSessions();
  }, [loadChatSessions]);

  // Set welcome message for new sessions
  useEffect(() => {
    if (!activeSession && messages.length === 0) {
      const articlesForChat = sessionSelectedArticles.length > 0 ? sessionSelectedArticles : [];
      const welcomeMessage = articlesForChat.length > 0 
        ? `Hello! I'm NewsBot, your AI assistant. You have ${articlesForChat.length} article${articlesForChat.length !== 1 ? 's' : ''} selected for focused discussion:

${articlesForChat.map((article, index) => `${index + 1}. "${article.title}" (${article.source})`).join('\n')}

I can answer specific questions about these selected articles, summarize them, compare different perspectives, or discuss any topics they cover. What would you like to know?`
        : `Hello! I'm NewsBot, your AI assistant for the latest news. I can answer questions about all ${articles.length} current news articles, or you can select specific articles from the news tab to focus our conversation.

Try asking me about:
• Climate change and environmental news
• Technology and AI developments  
• Economic and trade updates
• Space exploration missions
• Or any other news topics you're curious about!

What would you like to know?`;

      setMessages([{
        id: Date.now().toString(),
        content: welcomeMessage,
        isUser: false,
        timestamp: new Date()
      }]);
    }
  }, [articles.length, sessionSelectedArticles, activeSession, messages.length]);

  const createNewSession = async () => {
    if (!session?.user) return;

    try {
      // Generate a more descriptive title
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString();
      
      const response = await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Chat Session - ${dateStr} ${timeStr}`,
          selectedArticles: selectedArticles.length > 0 ? selectedArticles : null
        })
      });

      if (response.ok) {
        const newSession = await response.json();
        // Clear current session first, then set new one as active
        setSessions(prev => [newSession, ...prev.map(s => ({ ...s, isActive: false }))]);
        setActiveSession(newSession);
        setSessionSelectedArticles(selectedArticles); // Set current selection for new session
        setMessages([]); // Clear messages to start fresh
      }
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  };

  const switchToSession = async (sessionId: string) => {
    if (!session?.user || sessionId === activeSession?.id) return;

    try {
      // Set session as active
      const response = await fetch(`/api/chat-sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true })
      });

      if (response.ok) {
        // Load session with messages
        const sessionResponse = await fetch(`/api/chat-sessions/${sessionId}`);
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          
          // Clear current messages first to prevent mixing
          setMessages([]);
          
          // Parse and set session's selected articles
          const storedSelectedArticles = sessionData.selectedArticles 
            ? JSON.parse(sessionData.selectedArticles) 
            : [];
          setSessionSelectedArticles(storedSelectedArticles);
          
          // Set new active session and its messages
          setActiveSession(sessionData);
          setMessages(sessionData.messages.map((msg: ChatMessage) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
          
          // Update sessions list to reflect active state
          setSessions(prev => prev.map(s => ({ 
            ...s, 
            isActive: s.id === sessionId 
          })));
        }
      }
    } catch (error) {
      console.error('Error switching session:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!session?.user) return;

    try {
      const response = await fetch(`/api/chat-sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove session from list
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        
        // If we're deleting the active session, clear it and messages
        if (activeSession?.id === sessionId) {
          setActiveSession(null);
          setMessages([]);
          setSessionSelectedArticles([]);
          
          // If there are other sessions, optionally activate the most recent one
          const remainingSessions = sessions.filter(s => s.id !== sessionId);
          if (remainingSessions.length > 0) {
            const mostRecent = remainingSessions.sort((a, b) => 
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            )[0];
            // Auto-switch to most recent session
            setTimeout(() => switchToSession(mostRecent.id), 100);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const handleSendMessage = async (isWebSearch = false) => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    const userMessageObj = {
      id: Date.now().toString(),
      content: userMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessageObj]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userMessage,
          selectedArticles: sessionSelectedArticles.length > 0 ? sessionSelectedArticles : undefined,
          sessionId: activeSession?.id,
          isWebSearch // Include web search flag
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const botMessageObj = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessageObj]);

        // If a new session was created, update our state
        if (data.sessionId && !activeSession) {
          const newSession: ChatSession = {
            id: data.sessionId,
            title: `Chat ${new Date().toLocaleDateString()}`,
            isActive: true,
            updatedAt: new Date().toISOString(),
            messages: []
          };
          setActiveSession(newSession);
          setSessions(prev => [newSession, ...prev]);
        }

        // Update session in the sessions list with new message count
        if (activeSession || data.sessionId) {
          const sessionId = activeSession?.id || data.sessionId;
          setSessions(prev => prev.map(s => 
            s.id === sessionId 
              ? { ...s, updatedAt: new Date().toISOString() }
              : s
          ));
        }
      } else {
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          content: "Sorry, I'm having trouble responding right now. Please try again later.",
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error. Please try again.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
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
                    : "Ask me about the news or search the internet..."
                }
                className="flex-1 resize-none border border-gray-200 rounded-xl px-5 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder-gray-500 bg-white/80 backdrop-blur-sm shadow-sm"
                rows={2}
                disabled={loading}
              />
              
              {/* Internet Search Button */}
              <button
                onClick={() => handleSendMessage(true)}
                disabled={!inputMessage.trim() || loading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transform hover:scale-105 disabled:transform-none"
                title="Search Internet"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Web</span>
              </button>

              {/* Regular Send Button */}
              <button
                onClick={() => handleSendMessage(false)}
                disabled={!inputMessage.trim() || loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105 disabled:transform-none"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
            
            {/* Help Text */}
            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <span>💬 Send: Chat with news articles</span>
                <span>🌐 Web: Search internet for real-time info</span>
              </div>
              <span>Enter to send • Shift+Enter for new line</span>
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
