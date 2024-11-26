import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Header from './Header';
import { Card, CardHeader, CardContent, CardTitle } from './ui/Card';
import { Settings, Bell, Monitor, ChevronDown, Tag, PlusCircle, XCircle, MapPin, Calendar, TrendingUp, Plus, X, Layout, Search, Pencil, GripVertical } from 'lucide-react';
import { debounce } from 'lodash';
import { StrictMode } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const TOPICS = [
  { value: 'BUSINESS', label: 'Business' },
  { value: 'TECHNOLOGY', label: 'Technology' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'WORLD', label: 'World' },
  { value: 'NATION', label: 'Nation' },
  { value: 'ENTERTAINMENT', label: 'Entertainment' },
  { value: 'SCIENCE', label: 'Science' },
  { value: 'HEALTH', label: 'Health' },
];

const DEFAULT_MARKET_TABS = [
  {
    name: "Tech",
    stocks: [
      { ticker: "NASDAQ:AAPL", name: "Apple" },
      { ticker: "NASDAQ:MSFT", name: "Microsoft" },
      { ticker: "NASDAQ:GOOGL", name: "Google" }
    ]
  },
  {
    name: "Market Index",
    stocks: [
      { ticker: "FOREXCOM:SPXUSD", name: "S&P 500" },
      { ticker: "FOREXCOM:NSXUSD", name: "Nasdaq" },
      { ticker: "FOREXCOM:DJI", name: "Dow Jones" }
    ]
  }
];

const EXCHANGE_MAP = {
  'NMS': 'NASDAQ',
  'NYQ': 'NYSE',
  'PCX': 'NYSE',
  'NGM': 'NASDAQ',
  'NYS': 'NYSE',
};

const DEFAULT_WIDGET_ORDER = ['weather', 'calendar', 'market'];
const WIDGET_LABELS = {
  weather: 'Weather Widget',
  calendar: 'Calendar Widget',
  market: 'Market Widget'
};

const SortableWidgetOrderItem = ({ id }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-move select-none"
    >
      <GripVertical className="w-4 h-4 text-gray-500 mr-2" />
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {WIDGET_LABELS[id]}
      </span>
    </div>
  );
};

const SortablePinnedTopic = ({ topic, onUnpin }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: topic.value });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg cursor-move select-none"
    >
      <div className="flex items-center" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4 text-gray-500 mr-2" />
        <span className="text-sm text-blue-700 dark:text-blue-300">{topic.label}</span>
      </div>
      <button
        type="button"
        onClick={() => onUnpin(topic.value)}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
      >
        <XCircle className="w-5 h-5" />
      </button>
    </div>
  );
};

const BetaTag = () => (
  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
    Beta
  </span>
);

export default function UserSettings() {
  const { user, userPreferences, updatePreferences, userCalendars, calendarVisibility, updateCalendarVisibility } = useAuth();
  const { setTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [newStock, setNewStock] = useState({ ticker: '', name: '' });
  const [newTabName, setNewTabName] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingTab, setEditingTab] = useState(null);
  const [editedTabName, setEditedTabName] = useState('');

  const handlePreferenceChange = async (key, value) => {
    setIsSaving(true);
    await updatePreferences({ [key]: value });
    if (key === 'theme') {
      setTheme(value);
    }
    setIsSaving(false);
  };

  const handleTopicPin = async (topic) => {
    const currentPinnedTopics = userPreferences.pinnedTopics || [];
    let newPinnedTopics;
    
    if (currentPinnedTopics.includes(topic)) {
      newPinnedTopics = currentPinnedTopics.filter(t => t !== topic);
    } else if (currentPinnedTopics.length < 3) {
      newPinnedTopics = [...currentPinnedTopics, topic];
    } else {
      return;
    }
    
    await handlePreferenceChange('pinnedTopics', newPinnedTopics);
  };

  const debouncedLocationUpdate = useCallback(
    debounce((value) => handlePreferenceChange('location', value), 500),
    [handlePreferenceChange]
  );

  const searchStocks = async (query) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://corsproxy.io/?${encodeURIComponent(
          `https://query1.finance.yahoo.com/v1/finance/search?q=${query}&quotesCount=10&newsCount=0`
        )}`
      );
      const data = await response.json();
      const stocks = data.quotes
        .filter(quote => quote.quoteType === "EQUITY" || quote.quoteType === "INDEX")
        .map(quote => {
          let ticker = quote.symbol;
          if (quote.quoteType === "EQUITY") {
            const normalizedExchange = EXCHANGE_MAP[quote.exchange] || quote.exchange;
            ticker = `${normalizedExchange}:${quote.symbol}`;
          } else if (quote.quoteType === "INDEX") {
            ticker = `FOREXCOM:${quote.symbol}USD`;
          }
          return {
            ticker: ticker,
            name: quote.shortname || quote.longname
          };
        });
      setSearchResults(stocks);
    } catch (error) {
      console.error('Error searching stocks:', error);
    }
    setIsSearching(false);
  };

  const debouncedSearch = useCallback(
    debounce((query) => searchStocks(query), 300),
    []
  );

  const handleAddStock = async () => {
    if (!newStock.ticker || !newStock.name) return;
    const currentTabs = userPreferences.marketTabs || DEFAULT_MARKET_TABS;
    const newTabs = currentTabs.map((tab, index) => {
      if (index === selectedTab) {
        return {
          ...tab,
          stocks: [...tab.stocks, newStock]
        };
      }
      return tab;
    });
    await handlePreferenceChange('marketTabs', newTabs);
    setNewStock({ ticker: '', name: '' });
    setSearchResults([]);
  };

  const handleRemoveStock = async (stockIndex) => {
    const currentTabs = userPreferences.marketTabs || DEFAULT_MARKET_TABS;
    const newTabs = currentTabs.map((tab, index) => {
      if (index === selectedTab) {
        return {
          ...tab,
          stocks: tab.stocks.filter((_, i) => i !== stockIndex)
        };
      }
      return tab;
    });
    await handlePreferenceChange('marketTabs', newTabs);
  };

  const handleAddTab = async () => {
    if (!newTabName) return;
    const currentTabs = userPreferences.marketTabs || [...DEFAULT_MARKET_TABS];
    await handlePreferenceChange('marketTabs', [...currentTabs, { name: newTabName, stocks: [] }]);
    setNewTabName('');
  };

  const handleRemoveTab = async (index) => {
    const currentTabs = userPreferences.marketTabs || DEFAULT_MARKET_TABS;
    const newTabs = currentTabs.filter((_, i) => i !== index);
    await handlePreferenceChange('marketTabs', newTabs);
    if (selectedTab >= newTabs.length) {
      setSelectedTab(Math.max(0, newTabs.length - 1));
    }
  };

  const handleRenameTab = async (index) => {
    if (!editedTabName.trim()) {
      setEditingTab(null);
      return;
    }
    
    const currentTabs = userPreferences.marketTabs || DEFAULT_MARKET_TABS;
    const newTabs = currentTabs.map((tab, i) => {
      if (i === index) {
        return { ...tab, name: editedTabName.trim() };
      }
      return tab;
    });
    
    await handlePreferenceChange('marketTabs', newTabs);
    setEditingTab(null);
    setEditedTabName('');
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const currentOrder = userPreferences.widgetOrder || DEFAULT_WIDGET_ORDER;
      const oldIndex = currentOrder.indexOf(active.id);
      const newIndex = currentOrder.indexOf(over.id);
      
      const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
      handlePreferenceChange('widgetOrder', newOrder);
    }
  };

  const handleTopicReorder = async (result) => {
    if (!result.destination) return;
    
    const currentTopics = userPreferences.pinnedTopics || [];
    const newTopics = Array.from(currentTopics);
    const [reorderedItem] = newTopics.splice(result.source.index, 1);
    newTopics.splice(result.destination.index, 0, reorderedItem);
    
    await handlePreferenceChange('pinnedTopics', newTopics);
  };

  return (
    <StrictMode>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto p-4">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-gray-100">
                <Settings className="w-5 h-5 mr-2 text-gray-700 dark:text-gray-300" />
                User Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Profile Section */}
              <div className="border-b dark:border-gray-700 pb-4">
                <div className="flex items-center mb-4">
                  <img
                    src={user?.photoURL}
                    alt={user?.displayName}
                    className="w-16 h-16 rounded-full mr-4"
                  />
                  <div>
                    <h3 className="font-medium text-lg dark:text-gray-100">{user?.displayName}</h3>
                    <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* General Settings Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">General Settings</h3>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Email Notifications
                    </label>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={userPreferences.emailNotifications}
                      onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                      disabled={isSaving}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Monitor className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Theme Preference
                    </label>
                  </div>
                  <div className="relative">
                    <select
                      value={userPreferences.theme}
                      onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                      disabled={isSaving}
                      className="appearance-none bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="system">System</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Home Page Settings Section */}
              <div className="space-y-4 border-t dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Home Page Settings</h3>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Weather Widget
                    </label>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={userPreferences.showWeather}
                        onChange={(e) => handlePreferenceChange('showWeather', e.target.checked)}
                        disabled={isSaving}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {userPreferences.showWeather && (
                  <div className="flex items-center justify-between ml-7">
                    <div className="flex items-center space-x-2 flex-1">
                      <input
                        type="text"
                        placeholder="Enter city name"
                        defaultValue={userPreferences.location || ''}
                        onChange={(e) => debouncedLocationUpdate(e.target.value)}
                        className="flex-1 appearance-none bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={async () => {
                          if (navigator.geolocation) {
                            try {
                              const position = await new Promise((resolve, reject) => {
                                navigator.geolocation.getCurrentPosition(resolve, reject);
                              });
                              
                              const response = await fetch(
                                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
                              );
                              const data = await response.json();
                              handlePreferenceChange('location', data.address.city || data.address.town);
                            } catch (error) {
                              console.error('Error getting location:', error);
                            }
                          }
                        }}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <MapPin className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Calendar Widget Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        Calendar Widget
                        <BetaTag />
                      </label>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={userPreferences.calendarIntegration}
                        onChange={(e) => handlePreferenceChange('calendarIntegration', e.target.checked)}
                        disabled={isSaving}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {userPreferences.calendarIntegration && userCalendars.length > 0 && (
                    <div className="ml-7 space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Select calendars to display:
                      </p>
                      <div className="space-y-2 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        {userCalendars.map(calendar => (
                          <div key={calendar.id} className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id={calendar.id}
                              checked={calendarVisibility[calendar.id] !== false}
                              onChange={(e) => updateCalendarVisibility(calendar.id, e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={calendar.id} className="flex items-center space-x-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: calendar.backgroundColor }}
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {calendar.summary}
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Market Widget
                    </label>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={userPreferences.showMarketWidget}
                      onChange={(e) => handlePreferenceChange('showMarketWidget', e.target.checked)}
                      disabled={isSaving}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {userPreferences.showMarketWidget && (
                  <div className="ml-7 space-y-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Organize your market tabs
                        </p>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder="New Tab Name"
                            value={newTabName}
                            onChange={(e) => setNewTabName(e.target.value)}
                            className="text-sm px-2 py-1 rounded border dark:bg-gray-700 dark:border-gray-600"
                          />
                          <button
                            onClick={handleAddTab}
                            className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex space-x-2 mb-4 overflow-x-auto">
                        {(userPreferences.marketTabs || DEFAULT_MARKET_TABS).map((tab, index) => (
                          <div key={index} className="relative flex items-center">
                            {editingTab === index ? (
                              <div className="flex items-center">
                                <input
                                  type="text"
                                  value={editedTabName}
                                  onChange={(e) => setEditedTabName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleRenameTab(index);
                                    } else if (e.key === 'Escape') {
                                      setEditingTab(null);
                                      setEditedTabName('');
                                    }
                                  }}
                                  onBlur={() => handleRenameTab(index)}
                                  autoFocus
                                  className="px-2 py-1 text-sm rounded-lg border dark:bg-gray-700 dark:border-gray-600 w-24"
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => setSelectedTab(index)}
                                className={`px-3 py-1 rounded-lg text-sm ${
                                  selectedTab === index
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                } flex items-center space-x-2 group`}
                              >
                                <Layout className="w-4 h-4" />
                                <span>{tab.name}</span>
                                <Pencil
                                  className="w-3 h-3 opacity-0 group-hover:opacity-60 hover:!opacity-100 ml-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTab(index);
                                    setEditedTabName(tab.name);
                                  }}
                                />
                                {index !== 0 && (
                                  <X 
                                    className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-60 hover:!opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveTab(index);
                                    }}
                                  />
                                )}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="relative">
                        <div className="flex items-center space-x-2">
                          <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              placeholder="Search for a stock (e.g., Apple, AAPL)"
                              value={newStock.ticker}
                              onChange={(e) => {
                                setNewStock(prev => ({ ...prev, ticker: e.target.value }));
                                debouncedSearch(e.target.value);
                              }}
                              className="flex-1 appearance-none bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg pl-10 pr-4 py-2 text-sm w-full"
                            />
                          </div>
                        </div>

                        {searchResults.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg max-h-60 overflow-auto">
                            {searchResults.map((result, index) => (
                              <button
                                key={index}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                                onClick={async () => {
                                  const stockToAdd = { ticker: result.ticker, name: result.name };
                                  const currentTabs = userPreferences.marketTabs || DEFAULT_MARKET_TABS;
                                  const newTabs = currentTabs.map((tab, index) => {
                                    if (index === selectedTab) {
                                      return {
                                        ...tab,
                                        stocks: [...tab.stocks, stockToAdd]
                                      };
                                    }
                                    return tab;
                                  });
                                  await handlePreferenceChange('marketTabs', newTabs);
                                  setNewStock({ ticker: '', name: '' });
                                  setSearchResults([]);
                                }}
                              >
                                <div className="font-medium text-gray-900 dark:text-gray-100">{result.name}</div>
                                <div className="text-gray-500 dark:text-gray-400">{result.ticker}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(userPreferences.marketTabs || DEFAULT_MARKET_TABS)[selectedTab]?.stocks.map((stock, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {stock.name} ({stock.ticker})
                          </span>
                          <button
                            onClick={() => handleRemoveStock(index)}
                            className="text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Tag className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Pinned Topics
                    </label>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      (up to 3)
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {TOPICS.map((topic) => {
                      const isPinned = (userPreferences.pinnedTopics || []).includes(topic.value);
                      if (!isPinned) {
                        return (
                          <button
                            key={topic.value}
                            onClick={() => handleTopicPin(topic.value)}
                            disabled={isSaving}
                            className="flex items-center justify-between p-3 rounded-lg border transition-colors bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                          >
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {topic.label}
                            </span>
                            <PlusCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                          </button>
                        );
                      }
                      return null;
                    })}
                  </div>

                  {(userPreferences.pinnedTopics || []).length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Drag to reorder your pinned topics:
                      </p>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={({ active, over }) => {
                          if (!over || active.id === over.id) return;
                          
                          const oldIndex = userPreferences.pinnedTopics.indexOf(active.id);
                          const newIndex = userPreferences.pinnedTopics.indexOf(over.id);
                          
                          const newTopics = Array.from(userPreferences.pinnedTopics);
                          newTopics.splice(oldIndex, 1);
                          newTopics.splice(newIndex, 0, active.id);
                          
                          handlePreferenceChange('pinnedTopics', newTopics);
                        }}
                      >
                        <SortableContext
                          items={userPreferences.pinnedTopics || []}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {(userPreferences.pinnedTopics || []).map((topicValue) => {
                              const topic = TOPICS.find(t => t.value === topicValue);
                              if (!topic) return null;
                              return (
                                <SortablePinnedTopic 
                                  key={topic.value}
                                  topic={topic}
                                  onUnpin={handleTopicPin}
                                />
                              );
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Widget Order</h3>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={userPreferences.widgetOrder || DEFAULT_WIDGET_ORDER}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {(userPreferences.widgetOrder || DEFAULT_WIDGET_ORDER)
                        .filter(widgetId => {
                          switch (widgetId) {
                            case 'weather': return userPreferences.showWeather;
                            case 'calendar': return userPreferences.calendarIntegration;
                            case 'market': return userPreferences.showMarketWidget;
                            default: return false;
                          }
                        })
                        .map((widgetId) => (
                          <SortableWidgetOrderItem key={widgetId} id={widgetId} />
                        ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </StrictMode>
  );
}