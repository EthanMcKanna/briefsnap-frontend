import React, { useEffect, useState } from 'react';
import { Cloud, CloudRain, Sun, Wind, CloudSnow, Cloudy, CloudLightning, Droplets, Thermometer, Umbrella } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { useCache } from '../contexts/CacheContext';

const WeatherIcon = ({ code }) => {
  // Tomorrow.io weather codes mapping
  switch (code) {
    case 1000: // Clear, Sunny
      return <Sun className="w-6 h-6" />;
    case 1100: case 1101: case 1102: // Mostly Clear, Partly Cloudy
      return <Cloudy className="w-6 h-6" />;
    case 1001: // Cloudy
      return <Cloud className="w-6 h-6" />;
    case 4000: case 4001: case 4200: case 4201: // Rain
      return <CloudRain className="w-6 h-6" />;
    case 5000: case 5001: case 5100: case 5101: // Snow
      return <CloudSnow className="w-6 h-6" />;
    case 8000: // Thunderstorm
      return <CloudLightning className="w-6 h-6" />;
    default:
      return <Wind className="w-6 h-6" />;
  }
};

const celsiusToFahrenheit = (celsius) => {
  return (celsius * 9/5) + 32;
};

const getDayName = (date) => {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
};

const formatTime = (time) => {
  return new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export default function Weather({ location }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current');
  const { cacheWeather, getCachedWeather } = useCache();

  useEffect(() => {
    const fetchWeather = async () => {
      if (!location) return;
      
      try {
        setLoading(true);

        const cachedData = getCachedWeather(location);
        if (cachedData) {
          setWeather(cachedData);
          setLoading(false);
          return;
        }

        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
        );
        const geoData = await geoResponse.json();
        
        if (geoData && geoData[0]) {
          const { lat, lon } = geoData[0];
          
          const response = await fetch(
            `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lon}&apikey=yJ2NVjACvteaFBRz1DgcnjK3vJk33naR`
          );
          const data = await response.json();
          
          cacheWeather(location, data);
          setWeather(data);
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [location, cacheWeather, getCachedWeather]);

  if (!location || loading || !weather) return null;

  const current = weather.timelines.minutely[0];
  const hourly = weather.timelines.hourly.slice(0, 24);
  const daily = weather.timelines.daily.slice(0, 5);
  const tempF = Math.round(celsiusToFahrenheit(current.values.temperature));
  const feelsLikeF = Math.round(celsiusToFahrenheit(current.values.temperatureApparent));

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {location}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center space-x-2">
              <WeatherIcon code={current.values.weatherCode} />
              <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {tempF}°F
              </span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Feels like {feelsLikeF}°F
            </span>
          </div>
        </div>

        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'current'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Current
          </button>
          <button
            onClick={() => setActiveTab('hourly')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'hourly'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Hourly
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'daily'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            5-Day
          </button>
        </div>

        {activeTab === 'current' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <Thermometer className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">High/Low</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {Math.round(celsiusToFahrenheit(daily[0].values.temperatureMax))}°/
                  {Math.round(celsiusToFahrenheit(daily[0].values.temperatureMin))}°
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <Droplets className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Humidity</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {Math.round(current.values.humidity)}%
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <Wind className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Wind</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {Math.round(current.values.windSpeed)} mph
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <Umbrella className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Precipitation</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {Math.round(current.values.precipitationProbability)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hourly' && (
          <div className="space-y-2 mt-2">
            <div className="flex overflow-x-auto pb-2 -mx-4 px-4">
              <div className="flex space-x-4">
                {hourly.map((hour) => (
                  <div key={hour.time} className="flex flex-col items-center min-w-[60px]">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(hour.time)}
                    </span>
                    <WeatherIcon code={hour.values.weatherCode} />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {Math.round(celsiusToFahrenheit(hour.values.temperature))}°
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'daily' && (
          <div className="space-y-2 mt-2">
            {daily.map((day) => (
              <div 
                key={day.time}
                className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-20">
                  {getDayName(day.time)}
                </span>
                <div className="flex items-center flex-1 justify-center">
                  <WeatherIcon code={day.values.weatherCode} />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {Math.round(celsiusToFahrenheit(day.values.temperatureMax))}°
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {Math.round(celsiusToFahrenheit(day.values.temperatureMin))}°
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}