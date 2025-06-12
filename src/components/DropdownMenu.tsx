'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Settings, Info, Bookmark, User, LogOut, RefreshCw, Cloud } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Weather, { useWeather } from './Weather';
import DropdownWeatherBackground from './DropdownWeatherBackground';

interface DropdownMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  savedArticlesCount: number;
  onRefresh: () => void;
  refreshing: boolean;
}

export default function DropdownMenu({ user, savedArticlesCount, onRefresh, refreshing }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { weather } = useWeather(); // Add weather hook

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm"
      >
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {user?.name?.split(' ')[0] || 'Menu'}
          </span>
        </div>
        <ChevronDown 
          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          {/* Menu Content */}
          <div className="absolute right-0 mt-2 w-96 sm:w-[28rem] bg-white/95 backdrop-blur-lg border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Combined User Info & Weather Section with Animated Background */}
            <div className="relative overflow-hidden min-h-[140px] rounded-t-2xl">
              {/* Weather Background Animation */}
              <div className="absolute inset-0 opacity-40">
                <DropdownWeatherBackground weather={weather} />
              </div>
              
              <div className="relative z-10 p-5 bg-gradient-to-br from-blue-50/70 via-sky-50/70 to-indigo-50/70 backdrop-blur-sm border-b border-gray-100">
                {/* User Info Row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 truncate text-base drop-shadow-sm">
                        {user?.name || 'User'}
                      </div>
                      <div className="text-sm text-gray-700 truncate drop-shadow-sm">
                        {user?.email}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 bg-white/90 px-2 py-1 rounded-full backdrop-blur-sm border border-white/50 shadow-sm">
                    🌤️ Live Weather
                  </div>
                </div>
                
                {/* Weather Component */}
                <div className="mt-3">
                  <Weather />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-3">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => handleMenuClick(() => router.push('/saved'))}
                  className="flex flex-col items-center space-y-2 p-3 bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 rounded-xl transition-all duration-200 border border-amber-200/50 group"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Bookmark className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">Saved</div>
                    <div className="text-xs text-gray-600">{savedArticlesCount} articles</div>
                  </div>
                </button>

                <button
                  onClick={() => handleMenuClick(onRefresh)}
                  disabled={refreshing}
                  className="flex flex-col items-center space-y-2 p-3 bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl transition-all duration-200 border border-green-200/50 group disabled:opacity-50"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <RefreshCw className={`h-5 w-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">Refresh</div>
                    <div className="text-xs text-gray-600">
                      {refreshing ? 'Updating...' : 'Get latest'}
                    </div>
                  </div>
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleMenuClick(() => router.push('/weather-demo'))}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-sky-50 rounded-xl transition-all duration-200 group border border-transparent hover:border-blue-200/50"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-sky-100 rounded-lg flex items-center justify-center group-hover:from-blue-200 group-hover:to-sky-200 transition-all duration-200">
                    <Cloud className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">Weather Demo</div>
                    <div className="text-xs text-gray-500">See background animations</div>
                  </div>
                </button>

                <button
                  onClick={() => handleMenuClick(() => {})}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors group"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Settings className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">Settings</div>
                    <div className="text-xs text-gray-500">Customize experience</div>
                  </div>
                </button>

                <button
                  onClick={() => handleMenuClick(() => {})}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors group"
                >
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                    <Info className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">About NewsBot</div>
                    <div className="text-xs text-gray-500">Version 1.0</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Sign Out */}
            <div className="p-2 border-t border-gray-100">
              <button
                onClick={() => handleMenuClick(() => signOut())}
                className="w-full flex items-center space-x-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <LogOut className="h-4 w-4 text-red-600" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">Sign Out</div>
                  <div className="text-xs text-red-500">End your session</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
