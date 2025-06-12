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

interface DropdownWeatherBackgroundProps {
  weather: WeatherData | null;
}

const RainAnimationCompact = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 50 }, (_, i) => (
      <div
        key={i}
        className="absolute w-0.5 bg-gradient-to-b from-blue-400/40 to-blue-600/20 animate-rain"
        style={{
          left: `${Math.random() * 100}%`,
          height: `${Math.random() * 15 + 8}px`,
          animationDelay: `${Math.random() * 2}s`,
          animationDuration: `${Math.random() * 0.3 + 0.4}s`,
        }}
      />
    ))}
  </div>
);

const SnowAnimationCompact = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 30 }, (_, i) => (
      <div
        key={i}
        className="absolute w-1.5 h-1.5 bg-white/60 rounded-full animate-snow"
        style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 3}s`,
          animationDuration: `${Math.random() * 1.5 + 2}s`,
        }}
      />
    ))}
  </div>
);

const CloudsAnimationCompact = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 3 }, (_, i) => (
      <div
        key={i}
        className="absolute opacity-15"
        style={{
          left: `${Math.random() * 120 - 10}%`,
          top: `${Math.random() * 80}%`,
          animation: `float-cloud ${10 + Math.random() * 5}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 3}s`,
        }}
      >
        <div className="w-16 h-8 bg-white/30 rounded-full relative">
          <div className="absolute -top-1 left-2 w-10 h-5 bg-white/30 rounded-full"></div>
          <div className="absolute -top-0.5 right-1 w-8 h-4 bg-white/30 rounded-full"></div>
        </div>
      </div>
    ))}
  </div>
);

const SunBeamsAnimationCompact = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Compact sun beams */}
    {Array.from({ length: 6 }, (_, i) => (
      <div
        key={i}
        className="absolute top-1/4 left-1/2 w-0.5 bg-gradient-to-b from-yellow-300/20 to-transparent animate-sun-beam"
        style={{
          height: '60px',
          transform: `translateX(-50%) rotate(${i * 60}deg)`,
          transformOrigin: 'top center',
          animationDelay: `${i * 0.3}s`,
        }}
      />
    ))}
    {/* Floating particles */}
    {Array.from({ length: 12 }, (_, i) => (
      <div
        key={`particle-${i}`}
        className="absolute w-0.5 h-0.5 bg-yellow-400/50 rounded-full animate-float-particle"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 4}s`,
          animationDuration: `${Math.random() * 2 + 2}s`,
        }}
      />
    ))}
  </div>
);

const MistAnimationCompact = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 4 }, (_, i) => (
      <div
        key={i}
        className="absolute opacity-20"
        style={{
          left: `${Math.random() * 120 - 10}%`,
          top: `${Math.random() * 100}%`,
          animation: `drift-mist ${15 + Math.random() * 5}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 3}s`,
        }}
      >
        <div className="w-20 h-4 bg-gradient-to-r from-transparent via-gray-400/40 to-transparent rounded-full blur-sm"></div>
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
        ? 'bg-gradient-to-br from-slate-500/30 via-slate-400/20 to-blue-500/30'
        : 'bg-gradient-to-br from-slate-400/30 via-slate-300/20 to-blue-400/30';
    case 'snow':
      return 'bg-gradient-to-br from-slate-200/30 via-blue-100/20 to-blue-200/30';
    case 'sunny':
      return isWarm 
        ? 'bg-gradient-to-br from-yellow-200/30 via-orange-200/20 to-blue-300/30'
        : 'bg-gradient-to-br from-blue-200/30 via-cyan-200/20 to-blue-300/30';
    case 'cloudy':
      return isWarm
        ? 'bg-gradient-to-br from-gray-300/30 via-slate-300/20 to-blue-400/30'
        : 'bg-gradient-to-br from-gray-400/30 via-slate-400/20 to-slate-500/30';
    case 'mist':
      return 'bg-gradient-to-br from-gray-300/30 via-gray-200/20 to-slate-300/30';
    case 'storm':
      return 'bg-gradient-to-br from-slate-600/30 via-slate-500/20 to-slate-700/30';
    default:
      return isWarm
        ? 'bg-gradient-to-br from-blue-300/30 via-blue-400/20 to-blue-500/30'
        : 'bg-gradient-to-br from-blue-400/30 via-blue-500/20 to-blue-600/30';
  }
};

export default function DropdownWeatherBackground({ weather }: DropdownWeatherBackgroundProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !weather) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-blue-500/15 to-blue-600/20 transition-all duration-1000">
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent"></div>
      </div>
    );
  }

  const weatherType = getWeatherType(weather.condition);
  const backgroundGradient = getBackgroundGradient(weatherType, weather.temperature);

  return (
    <>
      <div className={`absolute inset-0 transition-all duration-1000 ${backgroundGradient}`}>
        {/* Subtle overlay with better opacity control */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10"></div>
        
        {/* Weather-specific animations */}
        {weatherType === 'rain' && <RainAnimationCompact />}
        {weatherType === 'snow' && <SnowAnimationCompact />}
        {weatherType === 'sunny' && <SunBeamsAnimationCompact />}
        {weatherType === 'cloudy' && <CloudsAnimationCompact />}
        {weatherType === 'mist' && <MistAnimationCompact />}
        {weatherType === 'storm' && (
          <>
            <RainAnimationCompact />
            <div className="absolute inset-0 animate-lightning-subtle"></div>
          </>
        )}
      </div>
      
      {/* Compact CSS Animations */}
      <style jsx global>{`
        @keyframes rain {
          to {
            transform: translateY(200px);
          }
        }
        
        @keyframes snow {
          to {
            transform: translateY(200px) rotate(360deg);
          }
        }
        
        @keyframes float-cloud {
          0%, 100% {
            transform: translateX(0) translateY(0);
          }
          50% {
            transform: translateX(5px) translateY(-3px);
          }
        }
        
        @keyframes sun-beam {
          0%, 100% {
            opacity: 0.2;
            transform: translateX(-50%) rotate(var(--rotation)) scaleY(1);
          }
          50% {
            opacity: 0.4;
            transform: translateX(-50%) rotate(var(--rotation)) scaleY(1.1);
          }
        }
        
        @keyframes float-particle {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-10px) rotate(180deg);
            opacity: 0.6;
          }
        }
        
        @keyframes drift-mist {
          0% {
            transform: translateX(-5px);
            opacity: 0.1;
          }
          50% {
            opacity: 0.2;
          }
          100% {
            transform: translateX(5px);
            opacity: 0.1;
          }
        }
        
        @keyframes lightning-subtle {
          0%, 95%, 100% {
            background: transparent;
          }
          97% {
            background: rgba(255, 255, 255, 0.05);
          }
        }
        
        .animate-rain {
          animation: rain linear infinite;
        }
        
        .animate-snow {
          animation: snow linear infinite;
        }
        
        .animate-sun-beam {
          animation: sun-beam 2s ease-in-out infinite;
        }
        
        .animate-float-particle {
          animation: float-particle ease-in-out infinite;
        }
        
        .animate-lightning-subtle {
          animation: lightning-subtle 12s infinite;
        }
      `}</style>
    </>
  );
}
