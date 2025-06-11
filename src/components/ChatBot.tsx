'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, MessageCircle, Tag } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/50 p-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Bot className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">AI Chat Assistant</h2>
            <p className="text-gray-600">
              {selectedArticles.length > 0 
                ? `Discussing ${selectedArticles.length} selected article${selectedArticles.length !== 1 ? 's' : ''}`
                : `Ready to discuss ${articles.length} articles`
              }
            </p>
          </div>
        </div>
        
        {/* Selected Articles Preview */}
        {selectedArticles.length > 0 && (
          <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
              <Tag className="h-4 w-4 mr-2" />
              Selected Articles
            </h3>
            <div className="space-y-2">
              {selectedArticles.slice(0, 3).map((article, index) => (
                <div key={article.id} className="text-sm text-blue-800 bg-white rounded px-3 py-2">
                  {index + 1}. {article.title} ({article.source})
                </div>
              ))}
              {selectedArticles.length > 3 && (
                <div className="text-sm text-blue-600 text-center py-1">
                  +{selectedArticles.length - 3} more articles
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div className="bg-gradient-to-b from-gray-50/50 to-white/50" style={{ height: '500px' }}>
        <div className="h-full overflow-y-auto p-6 space-y-6">
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
      </div>

      {/* Input Area */}
      <div className="bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 p-6">
        <div className="flex space-x-4">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              selectedArticles.length > 0 
                ? `Ask about the ${selectedArticles.length} selected articles...`
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
        {selectedArticles.length > 0 && (
          <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl px-5 py-3 border border-blue-100">
            <p className="text-sm text-blue-700 flex items-center">
              <MessageCircle className="h-4 w-4 mr-2" />
              I can help you analyze, compare, or answer questions about the selected articles.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
