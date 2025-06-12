'use client';

import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Eye, Droplets } from 'lucide-react';

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  feelsLike: number;
}

const WeatherIcon = ({ condition, className = "h-6 w-6" }: { condition: string; className?: string }) => {
  const iconProps = { className };
  
  if (condition.toLowerCase().includes('rain') || condition.toLowerCase().includes('drizzle')) {
    return <CloudRain {...iconProps} className={`${className} text-blue-500`} />;
  }
  if (condition.toLowerCase().includes('snow')) {
    return <CloudSnow {...iconProps} className={`${className} text-blue-200`} />;
  }
  if (condition.toLowerCase().includes('cloud')) {
    return <Cloud {...iconProps} className={`${className} text-gray-500`} />;
  }
  return <Sun {...iconProps} className={`${className} text-yellow-500`} />;
};

// Export the hook for use in other components
export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);

        // Get user's location
        if (!navigator.geolocation) {
          throw new Error('Geolocation is not supported by this browser');
        }

        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: false,
            maximumAge: 300000 // 5 minutes
          });
        });

        const { latitude, longitude } = position.coords;

        // Fetch weather data from OpenWeatherMap API (free tier)
        const API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY || 'demo'; // You'll need to get a free API key
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
        );

        if (!response.ok) {
          // Fallback to mock data for demo purposes
          setWeather({
            location: 'Current Location',
            temperature: 22,
            condition: 'Partly Cloudy',
            icon: '02d',
            humidity: 65,
            windSpeed: 12,
            visibility: 10,
            feelsLike: 24
          });
          return;
        }

        const data = await response.json();
        setWeather({
          location: data.name || 'Current Location',
          temperature: Math.round(data.main.temp),
          condition: data.weather[0].description,
          icon: data.weather[0].icon,
          humidity: data.main.humidity,
          windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
          visibility: Math.round(data.visibility / 1000), // Convert m to km
          feelsLike: Math.round(data.main.feels_like)
        });
      } catch (err) {
        console.error('Weather fetch error:', err);
        // Fallback to cycling demo weather data for demonstration
        const demoWeatherConditions = [
          {
            location: 'Demo - Sunny',
            temperature: 25,
            condition: 'clear sky',
            icon: '01d',
            humidity: 45,
            windSpeed: 8,
            visibility: 15,
            feelsLike: 27
          },
          {
            location: 'Demo - Rainy',
            temperature: 16,
            condition: 'light rain',
            icon: '10d',
            humidity: 80,
            windSpeed: 15,
            visibility: 8,
            feelsLike: 14
          },
          {
            location: 'Demo - Cloudy',
            temperature: 20,
            condition: 'scattered clouds',
            icon: '03d',
            humidity: 65,
            windSpeed: 12,
            visibility: 10,
            feelsLike: 22
          }
        ];
        
        // Cycle through demo conditions every 10 seconds
        const currentIndex = Math.floor(Date.now() / 10000) % demoWeatherConditions.length;
        setWeather(demoWeatherConditions[currentIndex]);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    // Refresh weather every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { weather, loading };
}

export default function Weather() {
  const { weather, loading } = useWeather();

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="text-sm">Loading weather...</span>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <Cloud className="h-4 w-4" />
        <span className="text-sm">Weather unavailable</span>
      </div>
    );
  }

  return (
    <div className="weather-widget relative">
      {/* Compact Display */}
      <div className="flex items-center justify-between p-3 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 relative overflow-hidden shadow-sm">
        {/* Animated Background Shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 animate-shimmer"></div>
        
        {/* Left side - Temperature & Condition */}
        <div className="flex items-center space-x-3 relative z-10">
          <div className="animate-bounce-slow relative">
            <WeatherIcon condition={weather.condition} className="h-8 w-8" />
            {/* Weather type indicator */}
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse" 
                 style={{
                   backgroundColor: weather.condition.toLowerCase().includes('rain') ? '#3b82f6' :
                                  weather.condition.toLowerCase().includes('snow') ? '#e5e7eb' :
                                  weather.condition.toLowerCase().includes('clear') ? '#fbbf24' :
                                  weather.condition.toLowerCase().includes('cloud') ? '#9ca3af' :
                                  '#6b7280'
                 }}>
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-gray-900 tabular-nums">{weather.temperature}°C</span>
              <span className="text-sm text-gray-600 tabular-nums">feels {weather.feelsLike}°C</span>
            </div>
            <div className="text-xs text-gray-500 capitalize leading-tight">{weather.condition}</div>
          </div>
        </div>
        
        {/* Right side - Weather Details */}
        <div className="flex flex-col space-y-1 text-xs text-gray-600 relative z-10">
          <div className="flex items-center space-x-1 justify-end">
            <Droplets className="h-3 w-3 text-blue-500" />
            <span className="tabular-nums">{weather.humidity}%</span>
          </div>
          <div className="flex items-center space-x-1 justify-end">
            <Wind className="h-3 w-3 text-gray-500" />
            <span className="tabular-nums">{weather.windSpeed} km/h</span>
          </div>
          <div className="flex items-center space-x-1 justify-end">
            <Eye className="h-3 w-3 text-indigo-500" />
            <span className="tabular-nums">{weather.visibility} km</span>
          </div>
        </div>
        
        {/* Location Badge */}
        <div className="absolute top-1 right-1 text-xs text-gray-400 bg-white/80 px-2 py-0.5 rounded-full z-10">
          📍 {weather.location}
        </div>
      </div>
      
      {/* Custom Styles */}
      <style jsx>{`
        .weather-widget {
          position: relative;
        }
        
        .animate-shimmer {
          animation: shimmer 4s ease-in-out infinite;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        
        @keyframes shimmer {
          0%, 100% { 
            transform: translateX(-100%);
            opacity: 0;
          }
          50% { 
            transform: translateX(0%);
            opacity: 0.3;
          }
        }
        
        @keyframes bounce-slow {
          0%, 100% { 
            transform: translateY(0);
          }
          50% { 
            transform: translateY(-2px);
          }
        }
        
        .tabular-nums {
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </div>
  );
}
