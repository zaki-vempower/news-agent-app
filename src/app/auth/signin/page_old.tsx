'use client';

import { signIn, getProviders } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Newspaper, Sparkles, Zap, Star, ArrowRight, LogIn, Mail, Github, Chrome } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
}

export default function SignIn() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      const res = await getProviders();
      setProviders(res);
    };
    fetchProviders();
  }, []);

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'google':
        return <Chrome className="h-5 w-5" />;
      case 'github':
        return <Github className="h-5 w-5" />;
      case 'email':
        return <Mail className="h-5 w-5" />;
      default:
        return <LogIn className="h-5 w-5" />;
    }
  };

  const getProviderColor = (providerId: string) => {
    switch (providerId) {
      case 'google':
        return 'from-red-500 to-yellow-500 hover:from-red-600 hover:to-yellow-600';
      case 'github':
        return 'from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black';
      case 'email':
        return 'from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600';
      default:
        return 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-orange-50 flex items-center justify-center relative overflow-hidden">
      {/* Animated Background Elements - Light Retro Vibes */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-80 h-80 bg-gradient-to-r from-pink-200/40 to-purple-200/40 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-gradient-to-r from-orange-200/40 to-yellow-200/40 rounded-full blur-3xl animate-bounce"></div>
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-gradient-to-r from-green-200/30 to-blue-200/30 rounded-full blur-3xl animate-ping"></div>
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-r from-indigo-200/35 to-purple-200/35 rounded-full blur-2xl animate-pulse delay-500"></div>
        <div className="absolute bottom-1/3 left-1/4 w-24 h-24 bg-gradient-to-r from-pink-200/30 to-orange-200/30 rounded-full blur-xl animate-bounce delay-700"></div>
      </div>

      <div className="relative z-10 max-w-md w-full mx-4">
        {/* Main Login Card */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-8 border-2 border-purple-200/50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-r from-orange-300 via-pink-300 to-purple-300 rounded-3xl flex items-center justify-center shadow-lg transform rotate-6 animate-pulse border-4 border-white/60">
                  <Newspaper className="h-12 w-12 text-white" />
                </div>
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-full flex items-center justify-center animate-spin shadow-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -bottom-3 -left-3 w-8 h-8 bg-gradient-to-r from-green-300 to-blue-300 rounded-full flex items-center justify-center animate-bounce">
                  <Star className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 mb-4 tracking-tight">
              NewsBot AI ✨
            </h1>
            <p className="text-purple-700 text-2xl font-semibold mb-2">
              Welcome to beautiful stories 📖
            </p>
            <p className="text-pink-600 text-lg font-medium">
              Discover amazing news in a delightful way 🌸
            </p>
            <div className="flex items-center justify-center space-x-3 mt-6 bg-gradient-to-r from-orange-100/80 to-pink-100/80 rounded-2xl px-6 py-3 border-2 border-orange-200/50">
              <Zap className="h-5 w-5 text-orange-500 animate-pulse" />
              <span className="text-purple-700 font-semibold text-sm">
                AI-powered storytelling that inspires ✨
              </span>
              <Zap className="h-5 w-5 text-orange-500 animate-pulse" />
            </div>
          </div>

          {/* Sign In Options */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              Let&apos;s create something beautiful together ✨
            </h2>
            
            {providers ? (
              <div className="space-y-3">
                {Object.values(providers).map((provider) => (
                  <button
                    key={provider.name}
                    onClick={() => signIn(provider.id, { callbackUrl: '/' })}
                    className={`w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r ${getProviderColor(
                      provider.id
                    )} text-white rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl font-semibold border-2 border-white/40 backdrop-blur-sm`}
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                  >
                    {getProviderIcon(provider.id)}
                    <span className="text-lg">Continue with {provider.name} ✨</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Loading State */}
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-full h-14 bg-gradient-to-r from-gray-800/50 to-purple-800/50 rounded-2xl animate-pulse border-2 border-purple-400/30 backdrop-blur-sm"
                  ></div>
                ))}
              </div>
            )}
          </div>

          {/* Features Preview */}
          <div className="mt-8 pt-6 border-t-2 border-purple-200/50">
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-6 text-center">
              What awaits you ✨
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 text-purple-700 bg-gradient-to-r from-pink-100/80 to-purple-100/80 rounded-2xl p-4 border-2 border-pink-200/50 backdrop-blur-sm hover:scale-105 transition-all duration-300 shadow-md">
                <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-blue-400 rounded-full animate-pulse shadow-sm"></div>
                <span className="text-sm font-semibold">Beautiful real-time stories from trusted sources 📰✨</span>
              </div>
              <div className="flex items-center space-x-4 text-purple-700 bg-gradient-to-r from-orange-100/80 to-pink-100/80 rounded-2xl p-4 border-2 border-orange-200/50 backdrop-blur-sm hover:scale-105 transition-all duration-300 shadow-md">
                <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse delay-200 shadow-sm"></div>
                <span className="text-sm font-semibold">AI companion that understands and engages 🤖💭</span>
              </div>
              <div className="flex items-center space-x-4 text-purple-700 bg-gradient-to-r from-purple-100/80 to-pink-100/80 rounded-2xl p-4 border-2 border-purple-200/50 backdrop-blur-sm hover:scale-105 transition-all duration-300 shadow-md">
                <div className="w-3 h-3 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full animate-pulse delay-400 shadow-sm"></div>
                <span className="text-sm font-semibold">Save and cherish your favorite stories 💜📚</span>
              </div>
              <div className="flex items-center space-x-4 text-purple-700 bg-gradient-to-r from-blue-100/80 to-indigo-100/80 rounded-2xl p-4 border-2 border-blue-200/50 backdrop-blur-sm hover:scale-105 transition-all duration-300 shadow-md">
                <div className="w-3 h-3 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full animate-pulse delay-600 shadow-sm"></div>
                <span className="text-sm font-semibold">Personalized categories for every interest 🎨🌟</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border-2 border-cyan-400/30">
            <p className="text-cyan-300 font-bold text-sm">
              by signing in, you&apos;re agreeing to keep it 💯 with our terms fr
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}