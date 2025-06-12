'use client';

import { useState } from 'react';
import WeatherBackground from './WeatherBackground';

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

const weatherConditions: WeatherData[] = [
  {
    location: 'Demo - Sunny',
    temperature: 28,
    condition: 'clear sky',
    icon: '01d',
    humidity: 45,
    windSpeed: 8,
    visibility: 15,
    feelsLike: 30
  },
  {
    location: 'Demo - Rainy',
    temperature: 15,
    condition: 'heavy intensity rain',
    icon: '10d',
    humidity: 85,
    windSpeed: 20,
    visibility: 5,
    feelsLike: 13
  },
  {
    location: 'Demo - Snowy',
    temperature: -2,
    condition: 'snow',
    icon: '13d',
    humidity: 90,
    windSpeed: 15,
    visibility: 3,
    feelsLike: -5
  },
  {
    location: 'Demo - Cloudy',
    temperature: 20,
    condition: 'overcast clouds',
    icon: '04d',
    humidity: 70,
    windSpeed: 12,
    visibility: 8,
    feelsLike: 22
  },
  {
    location: 'Demo - Misty',
    temperature: 18,
    condition: 'mist',
    icon: '50d',
    humidity: 95,
    windSpeed: 5,
    visibility: 2,
    feelsLike: 19
  },
  {
    location: 'Demo - Stormy',
    temperature: 16,
    condition: 'thunderstorm with heavy rain',
    icon: '11d',
    humidity: 88,
    windSpeed: 35,
    visibility: 4,
    feelsLike: 14
  }
];

export default function WeatherDemo() {
  const [currentWeather, setCurrentWeather] = useState<WeatherData>(weatherConditions[0]);

  return (
    <div className="min-h-screen relative">
      <WeatherBackground weather={currentWeather} />
      
      <div className="relative z-10 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8 text-center drop-shadow-lg">
            Weather Background Demo
          </h1>
          
          <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-6 border border-white/30 shadow-2xl">
            <h2 className="text-2xl font-semibold text-white mb-4">Current Weather</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-white">
              <div>
                <p className="text-sm opacity-80">Location</p>
                <p className="font-bold">{currentWeather.location}</p>
              </div>
              <div>
                <p className="text-sm opacity-80">Temperature</p>
                <p className="font-bold">{currentWeather.temperature}°C</p>
              </div>
              <div>
                <p className="text-sm opacity-80">Condition</p>
                <p className="font-bold capitalize">{currentWeather.condition}</p>
              </div>
              <div>
                <p className="text-sm opacity-80">Wind Speed</p>
                <p className="font-bold">{currentWeather.windSpeed} km/h</p>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-4">Try Different Weather Conditions</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {weatherConditions.map((weather, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentWeather(weather)}
                  className={`p-3 rounded-xl border transition-all duration-300 ${
                    currentWeather.location === weather.location
                      ? 'bg-white/30 border-white/50 text-white shadow-lg'
                      : 'bg-white/10 border-white/20 text-white/90 hover:bg-white/20'
                  }`}
                >
                  <div className="font-medium text-sm">{weather.condition}</div>
                  <div className="text-xs opacity-80">{weather.temperature}°C</div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="mt-8 bg-white/20 backdrop-blur-lg rounded-2xl p-6 border border-white/30 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Animation Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/90 text-sm">
              <div>
                <h4 className="font-medium text-white mb-2">🌞 Sunny Weather</h4>
                <p>• Animated sun beams rotating around a central point</p>
                <p>• Floating light particles with gentle movement</p>
                <p>• Warm gradient background (yellow to blue)</p>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">🌧️ Rainy Weather</h4>
                <p>• 150 animated raindrops falling at different speeds</p>
                <p>• Cool blue gradient background</p>
                <p>• Continuous rain animation loop</p>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">❄️ Snowy Weather</h4>
                <p>• 100 animated snowflakes with rotation</p>
                <p>• Light blue/gray gradient background</p>
                <p>• Gentle falling and rotating motion</p>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">☁️ Cloudy Weather</h4>
                <p>• 5 large floating cloud shapes</p>
                <p>• Slow drifting animation</p>
                <p>• Gray gradient background</p>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">🌫️ Misty Weather</h4>
                <p>• 6 drifting mist layers</p>
                <p>• Horizontal movement with blur effect</p>
                <p>• Soft gray gradient background</p>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">⛈️ Stormy Weather</h4>
                <p>• Combination of rain and lightning effects</p>
                <p>• Dark storm gradient background</p>
                <p>• Intermittent lightning flashes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
