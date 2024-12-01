import React, { useState, useCallback } from 'react';
import { Search, MapPin, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCombobox } from 'downshift';
import { debounce } from 'lodash';

export function LocationSearch({ initialLocation, onLocationSelect, className }) {
  const [inputValue, setInputValue] = useState(initialLocation?.name || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [error, setError] = useState(null);

  const parseLocationName = (address) => {
    const city = address.city || address.town || address.village || address.suburb;
    if (city) return city;

    if (address.municipality) return address.municipality;
    
    const parts = [];
    if (address.city_district) parts.push(address.city_district);
    if (address.suburb) parts.push(address.suburb);
    if (address.county) parts.push(address.county);
    if (address.state) parts.push(address.state);
    
    return parts[0] || address.display_name.split(',')[0];
  };

  const searchLocations = useCallback(
    debounce(async (query) => {
      if (!query?.trim() || query.trim().length < 2) {
        setSuggestions([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=en`
        );
        
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        
        if (data.length === 0) {
          setSuggestions([]);
          setIsLoading(false);
          return;
        }
        
        const processedSuggestions = data
          .map(item => {
            const name = parseLocationName(item.address);
            const displayParts = [];
            if (item.address.state) displayParts.push(item.address.state);
            if (item.address.country) displayParts.push(item.address.country);
            const displayLocation = displayParts.join(', ');

            return name ? {
              name: name,
              lat: item.lat,
              lon: item.lon,
              full: displayLocation
            } : null;
          })
          .filter(Boolean);
        setSuggestions(processedSuggestions);
      } catch (err) {
        if (query.trim().length >= 2) {
          setError('Failed to fetch location suggestions');
        }
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  const {
    isOpen,
    getMenuProps,
    getInputProps,
    getItemProps,
    highlightedIndex
  } = useCombobox({
    items: suggestions,
    inputValue,
    onInputValueChange: ({ inputValue }) => {
      setInputValue(inputValue);
      searchLocations(inputValue);
    },
    itemToString: item => item?.name || '',
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) {
        onLocationSelect(selectedItem);
      }
    }
  });

  const getCurrentLocation = async () => {
    setGeolocating(true);
    setError(null);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 0,
          enableHighAccuracy: true
        });
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&addressdetails=1&zoom=18`
      );
      
      if (!response.ok) throw new Error('Location lookup failed');
      
      const data = await response.json();
      const locationName = parseLocationName(data.address);
      
      if (!locationName) {
        throw new Error('Could not determine city name from coordinates');
      }

      const location = {
        name: locationName,
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        full: data.display_name
      };

      setInputValue(location.name);
      onLocationSelect(location);
    } catch (err) {
      setError(err.code === 1 
        ? 'Location permission denied. Please enable location access.'
        : 'Could not determine your location. Please try entering it manually.'
      );
    } finally {
      setGeolocating(false);
    }
  };

  return (
    <div className={`relative isolate ${className}`}>
      <div className="relative flex items-center">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            {...getInputProps()}
            placeholder="Enter city name"
            className="flex-1 appearance-none bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg pl-10 pr-4 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          {isLoading && (
            <div className="absolute inset-y-0 right-10 flex items-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader className="w-4 h-4 text-gray-400" />
              </motion.div>
            </div>
          )}
        </div>
        <button
          onClick={getCurrentLocation}
          disabled={geolocating}
          className="ml-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Use current location"
        >
          {geolocating ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader className="w-5 h-5" />
            </motion.div>
          ) : (
            <MapPin className="w-5 h-5" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute mt-2 text-sm text-red-500 dark:text-red-400"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        {...getMenuProps()}
        className="absolute left-0 right-0 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-36 overflow-auto"
        style={{
          zIndex: 9999,
          isolation: 'isolate'
        }}
      >
        {isOpen && suggestions.length > 0 && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {suggestions.map((item, index) => (
                <div
                  {...getItemProps({ item, index })}
                  key={`${item.lat}-${item.lon}`}
                  className={`px-3 py-1.5 cursor-pointer ${
                    highlightedIndex === index
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {item.full}
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}