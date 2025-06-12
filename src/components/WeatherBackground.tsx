'use client';

import { useEffect, useState } from 'react';

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

interface WeatherBackgroundProps {
  weather: WeatherData | null;
}

const RainAnimation = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 150 }, (_, i) => (
      <div
        key={i}
        className="absolute w-0.5 bg-gradient-to-b from-blue-400/60 to-blue-600/30 animate-rain"
        style={{
          left: `${Math.random() * 100}%`,
          height: `${Math.random() * 20 + 10}px`,
          animationDelay: `${Math.random() * 2}s`,
          animationDuration: `${Math.random() * 0.5 + 0.5}s`,
        }}
      />
    ))}
  </div>
);

const SnowAnimation = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 100 }, (_, i) => (
      <div
        key={i}
        className="absolute w-2 h-2 bg-white/80 rounded-full animate-snow"
        style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 3}s`,
          animationDuration: `${Math.random() * 2 + 3}s`,
        }}
      />
    ))}
  </div>
);

const CloudsAnimation = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 5 }, (_, i) => (
      <div
        key={i}
        className="absolute opacity-20"
        style={{
          left: `${Math.random() * 120 - 10}%`,
          top: `${Math.random() * 60}%`,
          animation: `float-cloud ${15 + Math.random() * 10}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 5}s`,
        }}
      >
        <div className="w-24 h-12 bg-white/40 rounded-full relative">
          <div className="absolute -top-2 left-3 w-16 h-8 bg-white/40 rounded-full"></div>
          <div className="absolute -top-1 right-2 w-12 h-6 bg-white/40 rounded-full"></div>
        </div>
      </div>
    ))}
  </div>
);

const SunBeamsAnimation = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Sun beams */}
    {Array.from({ length: 8 }, (_, i) => (
      <div
        key={i}
        className="absolute top-20 left-1/2 w-1 bg-gradient-to-b from-yellow-300/30 to-transparent animate-sun-beam"
        style={{
          height: '200px',
          transform: `translateX(-50%) rotate(${i * 45}deg)`,
          transformOrigin: 'top center',
          animationDelay: `${i * 0.2}s`,
        }}
      />
    ))}
    {/* Floating particles */}
    {Array.from({ length: 20 }, (_, i) => (
      <div
        key={`particle-${i}`}
        className="absolute w-1 h-1 bg-yellow-400/60 rounded-full animate-float-particle"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 4}s`,
          animationDuration: `${Math.random() * 2 + 3}s`,
        }}
      />
    ))}
  </div>
);

const MistAnimation = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 6 }, (_, i) => (
      <div
        key={i}
        className="absolute opacity-30"
        style={{
          left: `${Math.random() * 120 - 10}%`,
          top: `${Math.random() * 100}%`,
          animation: `drift-mist ${20 + Math.random() * 10}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 5}s`,
        }}
      >
        <div className="w-32 h-8 bg-gradient-to-r from-transparent via-gray-400/50 to-transparent rounded-full blur-sm"></div>
      </div>
    ))}
  </div>
);

const getWeatherType = (condition: string): string => {
  const cond = condition.toLowerCase();
  if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower')) return 'rain';
  if (cond.includes('snow') || cond.includes('blizzard')) return 'snow';
  if (cond.includes('clear') || cond.includes('sunny')) return 'sunny';
  if (cond.includes('cloud') || cond.includes('overcast')) return 'cloudy';
  if (cond.includes('mist') || cond.includes('fog') || cond.includes('haze')) return 'mist';
  if (cond.includes('storm') || cond.includes('thunder')) return 'storm';
  return 'cloudy'; // default
};

const getBackgroundGradient = (weatherType: string, temperature: number): string => {
  const isWarm = temperature > 20;
  const isCold = temperature < 5;
  
  switch (weatherType) {
    case 'rain':
      return isCold 
        ? 'bg-gradient-to-br from-slate-700 via-slate-600 to-blue-700'
        : 'bg-gradient-to-br from-slate-600 via-slate-500 to-blue-600';
    case 'snow':
      return 'bg-gradient-to-br from-slate-300 via-blue-100 to-blue-200';
    case 'sunny':
      return isWarm 
        ? 'bg-gradient-to-br from-yellow-200 via-orange-200 to-blue-300'
        : 'bg-gradient-to-br from-blue-200 via-cyan-200 to-blue-300';
    case 'cloudy':
      return isWarm
        ? 'bg-gradient-to-br from-gray-300 via-slate-300 to-blue-400'
        : 'bg-gradient-to-br from-gray-400 via-slate-400 to-slate-500';
    case 'mist':
      return 'bg-gradient-to-br from-gray-300 via-gray-200 to-slate-300';
    case 'storm':
      return 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900';
    default:
      return isWarm
        ? 'bg-gradient-to-br from-blue-300 via-blue-400 to-blue-500'
        : 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600';
  }
};

export default function WeatherBackground({ weather }: WeatherBackgroundProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !weather) {
    return (
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 transition-all duration-1000">
        <style jsx>{`
          @keyframes gentle-pulse {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 1; }
          }
          .animate-gentle-pulse {
            animation: gentle-pulse 4s ease-in-out infinite;
          }
        `}</style>
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent animate-gentle-pulse"></div>
      </div>
    );
  }

  const weatherType = getWeatherType(weather.condition);
  const backgroundGradient = getBackgroundGradient(weatherType, weather.temperature);
  
  // Adjust overlay intensity based on weather
  const getOverlayIntensity = (type: string) => {
    switch (type) {
      case 'storm': return 'from-black/40 via-black/20 to-black/10';
      case 'rain': return 'from-black/30 via-black/15 to-black/5';
      case 'snow': return 'from-white/20 via-transparent to-black/10';
      case 'mist': return 'from-gray-500/20 via-gray-300/10 to-transparent';
      case 'sunny': return 'from-yellow-200/20 via-transparent to-black/5';
      default: return 'from-black/20 via-transparent to-white/10';
    }
  };

  return (
    <>
      <div className={`fixed inset-0 -z-10 transition-all duration-1000 ${backgroundGradient}`}>
        {/* Dynamic atmospheric overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t transition-all duration-1000 ${getOverlayIntensity(weatherType)}`}></div>
        
        {/* Weather-specific animations */}
        {weatherType === 'rain' && <RainAnimation />}
        {weatherType === 'snow' && <SnowAnimation />}
        {weatherType === 'sunny' && <SunBeamsAnimation />}
        {weatherType === 'cloudy' && <CloudsAnimation />}
        {weatherType === 'mist' && <MistAnimation />}
        {weatherType === 'storm' && (
          <>
            <RainAnimation />
            <div className="absolute inset-0 animate-lightning"></div>
          </>
        )}
      </div>
      
      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes rain {
          to {
            transform: translateY(100vh);
          }
        }
        
        @keyframes snow {
          to {
            transform: translateY(100vh) rotate(360deg);
          }
        }
        
        @keyframes float-cloud {
          0%, 100% {
            transform: translateX(0) translateY(0);
          }
          25% {
            transform: translateX(10px) translateY(-5px);
          }
          50% {
            transform: translateX(-5px) translateY(-10px);
          }
          75% {
            transform: translateX(5px) translateY(-5px);
          }
        }
        
        @keyframes sun-beam {
          0%, 100% {
            opacity: 0.3;
            transform: translateX(-50%) rotate(var(--rotation)) scaleY(1);
          }
          50% {
            opacity: 0.6;
            transform: translateX(-50%) rotate(var(--rotation)) scaleY(1.1);
          }
        }
        
        @keyframes float-particle {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 1;
          }
        }
        
        @keyframes drift-mist {
          0% {
            transform: translateX(-10px);
            opacity: 0.1;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            transform: translateX(10px);
            opacity: 0.1;
          }
        }
        
        @keyframes lightning {
          0%, 90%, 100% {
            background: transparent;
          }
          92%, 94%, 96% {
            background: rgba(255, 255, 255, 0.1);
          }
        }
        
        .animate-rain {
          animation: rain linear infinite;
        }
        
        .animate-snow {
          animation: snow linear infinite;
        }
        
        .animate-sun-beam {
          animation: sun-beam 3s ease-in-out infinite;
        }
        
        .animate-float-particle {
          animation: float-particle ease-in-out infinite;
        }
        
        .animate-lightning {
          animation: lightning 8s infinite;
        }
      `}</style>
    </>
  );
}
