'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, Sparkles, Tag } from 'lucide-react';

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
  const [messages, setMessages] = useState<Array<{
    id: string;
    content: string;
    isUser: boolean;
    timestamp: Date;
  }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message when component mounts or when selected articles change
    const welcomeMessage = selectedArticles.length > 0 
      ? `Hello! I'm NewsBot, your AI assistant. You have ${selectedArticles.length} article${selectedArticles.length !== 1 ? 's' : ''} selected for focused discussion:

${selectedArticles.map((article, index) => `${index + 1}. "${article.title}" (${article.source})`).join('\n')}

I can answer specific questions about these selected articles, summarize them, compare different perspectives, or discuss any topics they cover. What would you like to know?`
      : `Hello! I'm NewsBot, your AI assistant for the latest news. I can answer questions about all ${articles.length} current news articles, or you can select specific articles from the news tab to focus our conversation.

Try asking me about:
• Climate change and environmental news
• Technology and AI developments  
• Economic and trade updates
• Space exploration missions
• Or any other news topics you're curious about!

What would you like to know?`;

    if (messages.length === 0) {
      setMessages([{
        id: Date.now().toString(),
        content: welcomeMessage,
        isUser: false,
        timestamp: new Date()
      }]);
    }
  }, [articles.length, selectedArticles, messages.length]);

  const handleSendMessage = async () => {
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
          selectedArticles: selectedArticles.length > 0 ? selectedArticles : undefined
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
    <div className="max-w-4xl mx-auto bg-gradient-to-br from-white/80 via-pink-50/60 to-purple-50/60 rounded-3xl shadow-lg overflow-hidden border-2 border-purple-200/50 relative backdrop-blur-sm">
      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-100/20 via-purple-100/20 to-orange-100/20 rounded-3xl blur-sm"></div>
      
      {/* Header */}
      <div className="relative z-10 bg-gradient-to-r from-orange-200 via-pink-200 to-purple-200 text-purple-700 p-8 overflow-hidden">
        <div className="absolute inset-0 bg-white/20"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-6">
            <div className="relative hover:scale-110 transition-transform duration-500">
              <div className="w-20 h-20 bg-gradient-to-r from-orange-300 via-pink-300 to-purple-300 rounded-3xl flex items-center justify-center shadow-lg transform rotate-6 animate-pulse">
                <Bot className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center animate-spin">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full animate-bounce"></div>
            </div>
            <div>
              <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 mb-2 tracking-tight">
                Chat with NewsBot ✨
              </h2>
              <p className="text-purple-600 text-lg font-semibold mb-1">
                {selectedArticles.length > 0 
                  ? `Discussing ${selectedArticles.length} beautiful stories 📖`
                  : `Ready to explore ${articles.length} amazing stories 🌸`
                }
              </p>
              <p className="text-pink-600 text-sm font-medium">
                Your friendly AI companion for news and stories ✨
              </p>
            </div>
          </div>
          
          {/* Selected Articles Preview */}
          {selectedArticles.length > 0 && (
            <div className="mt-6 bg-white/40 backdrop-blur-sm rounded-2xl p-6 border-2 border-purple-200/50 shadow-lg">
              <h3 className="text-lg font-bold text-purple-700 mb-4 flex items-center">
                <Tag className="h-5 w-5 mr-3 text-purple-500" />
                Beautiful Stories We&apos;re Exploring ✨
              </h3>
              <div className="space-y-3">
                {selectedArticles.slice(0, 3).map((article, index) => (
                  <div key={article.id} className="text-sm text-purple-700 bg-gradient-to-r from-pink-100/80 to-purple-100/80 rounded-xl px-4 py-3 backdrop-blur-sm border border-purple-200/50 font-semibold">
                    {index + 1}. {article.title} ({article.source}) 🌸
                  </div>
                ))}
                {selectedArticles.length > 3 && (
                  <div className="text-sm text-orange-600 text-center py-2 font-semibold">
                    +{selectedArticles.length - 3} more wonderful stories 📚
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="bg-gradient-to-br from-pink-50/80 via-purple-50/80 to-orange-50/80 relative" style={{ height: '500px' }}>
        {/* Animated background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-64 h-64 bg-gradient-to-r from-pink-200/20 to-purple-200/20 rounded-full blur-3xl -top-32 -left-32 animate-pulse"></div>
          <div className="absolute w-96 h-96 bg-gradient-to-r from-orange-200/20 to-pink-200/20 rounded-full blur-3xl -bottom-48 -right-48 animate-bounce"></div>
        </div>
        
        <div className="relative z-10 h-full overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex space-x-4 max-w-xs lg:max-w-md ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border-2 transform hover:scale-110 transition-all duration-300 ${
                  message.isUser 
                    ? 'bg-gradient-to-r from-pink-300 via-purple-300 to-orange-300 border-pink-200 shadow-pink-200/50' 
                    : 'bg-gradient-to-r from-orange-300 via-pink-300 to-purple-300 border-purple-200 shadow-purple-200/50'
                }`}>
                  {message.isUser ? (
                    <User className="h-6 w-6 text-white font-bold" />
                  ) : (
                    <Bot className="h-6 w-6 text-white font-bold" />
                  )}
                </div>
                <div
                  className={`px-6 py-4 rounded-2xl shadow-lg backdrop-blur-sm border-2 transform hover:scale-105 transition-all duration-300 ${
                    message.isUser
                      ? 'bg-gradient-to-r from-pink-100/90 via-purple-100/90 to-orange-100/90 text-purple-800 border-pink-200/70 shadow-pink-200/30'
                      : 'bg-gradient-to-r from-white/90 via-pink-50/90 to-purple-50/90 text-purple-700 border-purple-200/70 shadow-purple-200/30'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">{message.content}</p>
                  <p className={`text-xs mt-3 font-semibold ${message.isUser ? 'text-pink-600' : 'text-purple-500'}`}>
                    {message.timestamp.toLocaleTimeString()} {message.isUser ? '✨' : '🌸'}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="flex space-x-4 max-w-xs lg:max-w-md">
                <div className="bg-gradient-to-r from-orange-300 via-pink-300 to-purple-300 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border-2 border-purple-200 shadow-purple-200/50 animate-pulse">
                  <Bot className="h-6 w-6 text-white font-bold" />
                </div>
                <div className="bg-gradient-to-r from-white/90 via-pink-50/90 to-purple-50/90 px-6 py-4 rounded-2xl shadow-lg backdrop-blur-sm border-2 border-purple-200/70 shadow-purple-200/30">
                  <div className="flex items-center space-x-3">
                    <Loader className="h-5 w-5 animate-spin text-purple-500 font-bold" />
                    <span className="text-sm text-purple-600 font-semibold">Crafting a beautiful response... ✨</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-gradient-to-r from-pink-50/90 via-purple-50/90 to-orange-50/90 border-t-2 border-purple-200/50 p-6 relative overflow-hidden">
        {/* Animated background effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-pink-100/20 via-purple-100/20 to-orange-100/20 animate-pulse"></div>
        <div className="absolute w-32 h-32 bg-gradient-to-r from-purple-200/30 to-pink-200/30 rounded-full blur-2xl -top-16 left-1/4 animate-bounce"></div>
        
        <div className="relative z-10 flex space-x-4">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              selectedArticles.length > 0 
                ? `Ask about the ${selectedArticles.length} selected stories... ✨`
                : "What beautiful stories would you like to explore? 📖✨"
            }
            className="flex-1 resize-none border-2 border-purple-200/70 rounded-2xl px-6 py-4 text-sm text-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-300/50 focus:border-purple-300 bg-gradient-to-r from-white/90 via-pink-50/90 to-purple-50/90 backdrop-blur-sm shadow-lg shadow-purple-200/20 placeholder-purple-400 font-medium transform hover:scale-105 transition-all duration-300"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || loading}
            className="bg-gradient-to-r from-pink-300 via-purple-300 to-orange-300 text-white px-8 py-4 rounded-2xl hover:from-pink-400 hover:via-purple-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-purple-300/50 transition-all duration-300 transform hover:scale-110 shadow-lg shadow-purple-200/30 flex items-center space-x-3 font-bold border-2 border-purple-200/50"
          >
            <Send className="h-6 w-6" />
            <span className="hidden sm:inline">Send ✨</span>
          </button>
        </div>
        {selectedArticles.length > 0 && (
          <div className="relative z-10 mt-4 bg-gradient-to-r from-purple-100/80 via-pink-100/80 to-orange-100/80 rounded-2xl px-6 py-4 border-2 border-purple-200/70 backdrop-blur-sm shadow-lg shadow-purple-200/30 transform hover:scale-105 transition-all duration-300">
            <p className="text-sm text-purple-600 flex items-center font-semibold">
              <Sparkles className="h-4 w-4 mr-2 text-orange-400 animate-spin" />
              I can explore these beautiful stories together, share insights, or answer your questions about them ✨📖
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
