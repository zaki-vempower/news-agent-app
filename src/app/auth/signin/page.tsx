'use client';

import { signIn, getProviders } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Newspaper, LogIn, Mail, Github, Chrome, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Provider {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
}

export default function SignIn() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');

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
      case 'credentials':
      case 'email':
        return <Mail className="h-5 w-5" />;
      default:
        return <LogIn className="h-5 w-5" />;
    }
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password) {
      setError('Email and password are required');
      return;
    }
    
    setSigningIn(true);
    setError('');
    
    try {
      const result = await signIn('credentials', { 
        email: formData.email.trim(),
        password: formData.password,
        callbackUrl: '/',
        redirect: false
      });
      
      if (result?.error) {
        setError('Invalid email or password. Please try again.');
      } else if (result?.ok) {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Sign in failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleOAuthSignIn = async (providerId: string) => {
    setSigningIn(true);
    setError('');
    try {
      await signIn(providerId, { callbackUrl: '/' });
    } catch (error) {
      console.error('OAuth sign in error:', error);
      setError('Sign in failed. Please try again.');
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/25">
            <Newspaper className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Welcome to NewsBot</h1>
          <p className="text-gray-600 mt-3 text-lg">
            Sign in to save articles and chat with AI about the news
          </p>
        </div>

        {/* Sign In Card */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
          <div className="space-y-6">
            {/* Email/Password Sign In Form */}
            <form onSubmit={handleCredentialsSignIn} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your email address"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-black text-gray-900"
                  required
                  disabled={signingIn}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-black text-gray-900"
                    required
                    disabled={signingIn}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={signingIn || !formData.email.trim() || !formData.password}
                className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Mail className="h-5 w-5" />
                <span>{signingIn ? 'Signing in...' : 'Sign In'}</span>
              </button>
            </form>

            {/* OAuth Providers */}
            {providers && Object.values(providers).filter(p => p.id !== 'credentials').length > 0 && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {providers &&
                    Object.values(providers)
                      .filter(provider => provider.id !== 'credentials')
                      .map((provider) => (
                        <button
                          key={provider.name}
                          onClick={() => handleOAuthSignIn(provider.id)}
                          disabled={signingIn}
                          className="w-full flex items-center justify-center space-x-3 px-6 py-4 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 font-medium bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                          {getProviderIcon(provider.id)}
                          <span>Continue with {provider.name}</span>
                        </button>
                      ))}
                </div>
              </>
            )}

            {/* Sign Up Link */}
            <div className="text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <Link 
                  href="/auth/signup" 
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Why sign in?</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mt-2 shadow-lg"></div>
              <div>
                <h4 className="font-semibold text-gray-900">Persistent Chat Sessions</h4>
                <p className="text-gray-600 text-sm leading-relaxed">Save and continue AI conversations across browser sessions</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full mt-2 shadow-lg"></div>
              <div>
                <h4 className="font-semibold text-gray-900">Save Articles</h4>
                <p className="text-gray-600 text-sm leading-relaxed">Bookmark interesting articles to read later</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-3 h-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mt-2 shadow-lg"></div>
              <div>
                <h4 className="font-semibold text-gray-900">Personalized Experience</h4>
                <p className="text-gray-600 text-sm leading-relaxed">Get a customized news reading experience</p>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link 
            href="/" 
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to NewsBot</span>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
