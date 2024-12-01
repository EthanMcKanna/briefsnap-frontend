import React, { useEffect, useState } from 'react';
import { Cloud, CloudRain, Sun, Wind, CloudSnow, Cloudy, CloudLightning, Droplets, Thermometer, Umbrella } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { useCache } from '../contexts/CacheContext';

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

const WeatherSkeleton = () => (
  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
    <CardContent className="p-4">
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex flex-col items-end">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-24 mt-1" />
        </div>
      </div>

      <div className="flex space-x-4 mb-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <Skeleton className="w-5 h-5" />
            <div className="flex-1">
              <Skeleton className="h-3 w-16 mb-1" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const WeatherIcon = ({ code }) => {
  const iconClasses = "w-6 h-6 text-gray-700 dark:text-gray-300";
  
  // NWS weather codes mapping
  switch (code) {
    case 'skc': case 'few': case 'clear': case 'sunny': case 'mostly_clear':
      return <Sun className={iconClasses} />;
    case 'sct': case 'bkn': case 'partly_cloudy': case 'mostly_cloudy':
      return <Cloudy className={iconClasses} />;
    case 'ovc': case 'cloudy': case 'overcast':
      return <Cloud className={iconClasses} />;
    case 'rain': case 'rain_showers': case 'rain_sleet': case 'chance_rain': 
    case 'slight_chance_rain': case 'likely_rain': case 'chance_rain_showers':
    case 'slight_chance_rain_showers':
      return <CloudRain className={iconClasses} />;
    case 'snow': case 'snow_sleet': case 'blizzard': case 'chance_snow': 
    case 'slight_chance_snow': case 'chance_snow_showers': case 'light_snow_likely':
      return <CloudSnow className={iconClasses} />;
    case 'rain_and_snow_likely': case 'rain_and_snow':
      return <CloudRain className={iconClasses} />;
    case 'tsra': case 'tsra_sct': case 'tsra_hi': case 'thunderstorms': 
    case 'scattered_thunderstorms':
      return <CloudLightning className={iconClasses} />;
    default:
      return <Wind className={iconClasses} />;
  }
};

const getDayName = (date) => {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
};

const formatTime = (time) => {
  return new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const RETRY_DELAY = 5000;
const MAX_RETRIES = 3;

export default function Weather({ location }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('current');
  const { cacheWeather, getCachedWeather } = useCache();
  const [retryCount, setRetryCount] = useState(0);
  const fetchWeatherRef = React.useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchWeather = async (attempt = 0) => {
      if (!location?.lat || !location?.lon) return;
      
      try {
        setLoading(true);
        setError(null);

        const cachedData = getCachedWeather(`${location.lat},${location.lon}`);
        if (cachedData) {
          setWeather(cachedData);
          setLoading(false);
          return;
        }

        const pointsResponse = await fetch(
          `https://api.weather.gov/points/${location.lat},${location.lon}`,
          { 
            signal: controller.signal,
            headers: { 'User-Agent': 'BriefSnap Weather Widget' }
          }
        );
        
        if (!pointsResponse.ok) throw new Error('Weather service points lookup failed');
        
        const points = await pointsResponse.json();
        
        const [forecastResponse, hourlyResponse] = await Promise.all([
          fetch(points.properties.forecast, { 
            signal: controller.signal,
            headers: { 'User-Agent': 'BriefSnap Weather App' }
          }),
          fetch(points.properties.forecastHourly, {
            signal: controller.signal,
            headers: { 'User-Agent': 'BriefSnap Weather App' }
          })
        ]);

        if (!forecastResponse.ok || !hourlyResponse.ok) {
          throw new Error('Weather service unavailable');
        }

        const [forecast, hourly] = await Promise.all([
          forecastResponse.json(),
          hourlyResponse.json()
        ]);

        const transformedData = {
          timelines: {
            minutely: [{
              time: new Date().toISOString(),
              values: {
                temperature: hourly.properties.periods[0].temperature,
                temperatureApparent: hourly.properties.periods[0].temperature,
                weatherCode: hourly.properties.periods[0].shortForecast.toLowerCase().replace(/\s+/g, '_'),
                humidity: hourly.properties.periods[0].relativeHumidity?.value || 0,
                windSpeed: hourly.properties.periods[0].windSpeed.split(' ')[0],
                precipitationProbability: forecast.properties.periods[0].probabilityOfPrecipitation?.value || 0
              }
            }],
            hourly: hourly.properties.periods.map(period => ({
              time: period.startTime,
              values: {
                temperature: period.temperature,
                weatherCode: period.shortForecast.toLowerCase().replace(/\s+/g, '_')
              }
            })),
            daily: forecast.properties.periods
              .filter((_, i) => i % 2 === 0)
              .map(period => ({
                time: period.startTime,
                values: {
                  temperatureMax: period.temperature,
                  temperatureMin: forecast.properties.periods[forecast.properties.periods.findIndex(p => p.startTime === period.startTime) + 1]?.temperature || period.temperature,
                  weatherCode: period.shortForecast.toLowerCase().replace(/\s+/g, '_')
                }
              }))
          }
        };

        cacheWeather(`${location.lat},${location.lon}`, transformedData);
        setWeather(transformedData);
        setRetryCount(0);

      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Error fetching weather:', error);
        setError(error.message);
        setRetryCount(attempt);
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherRef.current = fetchWeather;
    fetchWeather();

    return () => {
      controller.abort();
    };
  }, [location, cacheWeather, getCachedWeather]);

  if (!location) return null;
  
  if (loading) {
    return <WeatherSkeleton />;
  }

  if (error) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-red-500 dark:text-red-400">
            <span className="text-sm">{error}</span>
            {retryCount > 0 && (
              <button
                onClick={() => fetchWeatherRef.current?.(0)}
                className="text-sm underline hover:no-underline"
              >
                Try again
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weather) return null;

  const current = weather.timelines.minutely[0];
  const hourly = weather.timelines.hourly.slice(0, 24);
  const daily = weather.timelines.daily.slice(0, 5);
  const tempF = Math.round(current.values.temperature);
  const feelsLikeF = Math.round(current.values.temperatureApparent);

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {location.name}
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
              <Thermometer className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">High/Low</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {Math.round(daily[0].values.temperatureMax)}°/
                  {Math.round(daily[0].values.temperatureMin)}°
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <Droplets className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Humidity</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {Math.round(current.values.humidity)}%
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <Wind className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Wind</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {Math.round(current.values.windSpeed)} mph
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <Umbrella className="w-5 h-5 text-blue-500 dark:text-blue-400" />
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
                      {Math.round(hour.values.temperature)}°
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
                    {Math.round(day.values.temperatureMax)}°
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {Math.round(day.values.temperatureMin)}°
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