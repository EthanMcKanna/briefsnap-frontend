import React, { useState, useCallback } from 'react';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useAuth } from '../contexts/AuthContext';
import { X, ArrowLeft, ArrowRight, Check, Sun, Moon, Computer, MapPin, Calendar, LayoutDashboard, Tag, Newspaper, BookmarkCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { TOPICS } from '../utils/constants';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { debounce } from 'lodash';

const BetaTag = () => (
  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
    Beta
  </span>
);

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
      className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between"
    >
      <div className="flex items-center" {...attributes} {...listeners}>
        <Tag className="w-4 h-4 mr-2 text-blue-700 dark:text-blue-300" />
        <span className="text-sm text-blue-700 dark:text-blue-300">{topic.label}</span>
      </div>
      <button
        onClick={() => onUnpin(topic.value)}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const SortableWidgetOrderItem = ({ widget }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: isDragging ? 'relative' : 'static',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };

  const Icon = widget.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`w-full p-4 rounded-lg border transition-colors duration-200 text-left flex items-start space-x-3 cursor-move
        ${isDragging ? 'shadow-lg scale-[1.02] bg-white dark:bg-gray-800' : ''}
        ${widget.enabled
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-white'
          : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
        }`}
    >
      <Icon className="w-5 h-5 mt-0.5" />
      <div>
        <div className="font-medium flex items-center">
          {widget.label}
          {widget.isBeta && <BetaTag />}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {widget.description}
        </div>
      </div>
    </div>
  );
};

export default function Onboarding() {
  const { isOnboarding, currentStep, completeOnboarding, nextStep, previousStep, isUpdating: isOnboardingUpdating } = useOnboarding();
  const { userPreferences, updatePreferences } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!isOnboarding) return null;

  const handlePreferenceUpdate = async (updates) => {
    if (isUpdating || isOnboardingUpdating) {
      console.log('Update in progress, skipping...', updates);
      return;
    }
    
    setIsUpdating(true);
    console.log('Updating preferences:', updates);
    
    try {
      await updatePreferences(updates);
      console.log('Preferences updated successfully:', updates);
      // Wait a bit before allowing next step
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error updating preferences:', error, updates);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOptionClick = async (key, value) => {
    if (isUpdating) return;
    await handlePreferenceUpdate({ [key]: value });
  };

  const handleTopicToggle = async (topicValue) => {
    console.log('Toggling topic:', topicValue);
    console.log('Current topics:', userPreferences.pinnedTopics);
    
    if (isUpdating) {
      console.log('Update in progress, skipping topic toggle');
      return;
    }
    
    const current = userPreferences.pinnedTopics || [];
    const updated = current.includes(topicValue)
      ? current.filter(t => t !== topicValue)
      : current.length < 3
      ? [...current, topicValue]
      : current;
    
    console.log('Updated topics:', updated);
    await handlePreferenceUpdate({ pinnedTopics: updated });
  };

  const handleButtonClick = (action) => async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUpdating || isOnboardingUpdating) {
      console.log('Update in progress, skipping button action');
      return;
    }
    // Remove the artificial delay
    await action();
  };

  const steps = [
    {
      title: "Welcome to BriefSnap! 👋",
      description: "Your AI-powered news companion that keeps you informed with concise, personalized news summaries.",
      component: ({ userPreferences }) => (
        <div className="space-y-6">
          <div className="flex justify-center">
            <Newspaper className="w-32 h-32 text-black dark:text-white animate-float" />
          </div>
          <div className="space-y-4 text-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">AI-Powered Summaries</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">Get quick, accurate summaries of the day's most important news</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">Personalized Feed</h3>
                <p className="text-sm text-green-700 dark:text-green-300">Customize your news feed with topics that matter to you</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-2">Smart Widgets</h3>
                <p className="text-sm text-purple-700 dark:text-purple-300">Add useful widgets like weather, calendar, and market updates</p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                <h3 className="font-medium text-orange-900 dark:text-orange-100 mb-2">Save for Later</h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">Bookmark articles and access them anytime</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Customize Your News Feed",
      description: "Pin up to 3 topics to your home page for quick access to news that matters most to you.",
      component: ({ userPreferences, updatePreferences }) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {TOPICS.filter(topic => 
              topic.value !== 'TOP_NEWS' &&
              !(userPreferences.pinnedTopics || []).includes(topic.value)
            ).map(topic => (
              <button
                key={topic.value}
                onClick={() => handleTopicToggle(topic.value)}
                disabled={isUpdating}
                className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 text-gray-900 dark:text-white transition-all flex items-center space-x-2"
              >
                <Tag className="w-4 h-4" />
                <span className="text-sm">{topic.label}</span>
              </button>
            ))}
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
                  
                  const newTopics = arrayMove(userPreferences.pinnedTopics, oldIndex, newIndex);
                  handlePreferenceUpdate({ pinnedTopics: newTopics });
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
                          onUnpin={handleTopicToggle}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          <p className="text-xs text-gray-600 dark:text-gray-300">
            {3 - (userPreferences.pinnedTopics || []).length} selections remaining
          </p>
        </div>
      )
    },
    {
      title: "Enhance Your Dashboard",
      description: "Add useful widgets to make BriefSnap your personalized news hub.",
      component: ({ userPreferences }) => {
        const widgets = [
          { 
            key: 'weather',
            icon: MapPin, 
            label: 'Weather Widget', 
            description: 'Get local weather updates',
            isBeta: false,
            enabled: userPreferences.showWeather
          },
          { 
            key: 'calendar',
            icon: Calendar, 
            label: 'Calendar Widget', 
            description: 'View your daily schedule',
            isBeta: true,
            enabled: userPreferences.calendarIntegration
          },
          { 
            key: 'market',
            icon: LayoutDashboard, 
            label: 'Market Widget', 
            description: 'Track stock markets',
            isBeta: false,
            enabled: userPreferences.showMarketWidget
          }
        ];

        const enabledWidgets = widgets.filter(w => w.enabled);
        const [localWidgetOrder, setLocalWidgetOrder] = useState(
          userPreferences.widgetOrder || ['weather', 'calendar', 'market']
        );

        const [locationInput, setLocationInput] = useState(userPreferences.location || '');

        // Add the debounced update function
        const debouncedLocationUpdate = useCallback(
          debounce((value) => handlePreferenceUpdate({ location: value }), 500),
          []
        );

        // Sort enabled widgets based on the localWidgetOrder
        const sortedEnabledWidgets = [...enabledWidgets].sort((a, b) => {
          const aIndex = localWidgetOrder.indexOf(a.key);
          const bIndex = localWidgetOrder.indexOf(b.key);
          return aIndex - bIndex;
        });

        return (
          <div className="space-y-6">
            <div className="space-y-4">
              {widgets.map((widget) => (
                <button
                  key={widget.key}
                  onClick={async () => {
                    if (widget.key === 'calendar') {
                      await handlePreferenceUpdate({ 
                        calendarIntegration: !widget.enabled,
                        calendarAccess: !widget.enabled
                      });
                    } else {
                      const key = widget.key === 'weather' ? 'showWeather' : 
                                widget.key === 'market' ? 'showMarketWidget' : widget.key;
                      await handlePreferenceUpdate({ [key]: !widget.enabled });
                    }
                  }}
                  disabled={isUpdating}
                  className={`w-full p-4 rounded-lg border transition-all text-left flex items-start space-x-3 ${
                    widget.enabled
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-white'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 text-gray-900 dark:text-white'
                  }`}
                >
                  <widget.icon className="w-5 h-5 mt-0.5" />
                  <div>
                    <div className="font-medium flex items-center">
                      {widget.label}
                      {widget.isBeta && <BetaTag />}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {widget.description}
                    </div>
                  </div>
                </button>
              ))}
              {userPreferences.showWeather && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Set your location for weather updates:
                  </p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Enter city name"
                      value={locationInput}
                      onChange={(e) => {
                        setLocationInput(e.target.value);
                        debouncedLocationUpdate(e.target.value);
                      }}
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
                            handlePreferenceUpdate({ location: data.address.city || data.address.town });
                          } catch (error) {
                            console.error('Error getting location:', error);
                          }
                        }
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                    >
                      <MapPin className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {enabledWidgets.length > 1 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Drag to reorder your widgets:
                </p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={() => {
                    if (window.navigator.vibrate) {
                      window.navigator.vibrate(50);
                    }
                  }}
                  modifiers={[]} // Remove any restrictive modifiers
                  onDragEnd={({ active, over }) => {
                    if (!over || active.id === over.id) return;
                    
                    const oldIndex = localWidgetOrder.indexOf(active.id);
                    const newIndex = localWidgetOrder.indexOf(over.id);
                    
                    const newOrder = arrayMove(localWidgetOrder, oldIndex, newIndex);
                    setLocalWidgetOrder(newOrder);
                    handlePreferenceUpdate({ widgetOrder: newOrder });
                  }}
                >
                  <SortableContext
                    items={sortedEnabledWidgets.map(w => w.key)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {sortedEnabledWidgets.map(widget => (
                        <SortableWidgetOrderItem
                          key={widget.key}
                          widget={widget}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: "Making the Most of BriefSnap",
      description: "Here are some tips to get the best experience.",
      component: () => (
        <div className="space-y-6">
          <div className="grid gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                <Newspaper className="w-4 h-4 mr-2" />
                Daily Summaries
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Check your home page for AI-generated summaries of the day's most important news, updated throughout the day.
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                <Tag className="w-4 h-4 mr-2" />
                Topic Deep Dives
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Filter by topic from the articles page to see a focused feed of news and summaries for that category.
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                <BookmarkCheck className="w-4 h-4 mr-2" />
                Bookmarks
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Save articles to read later by clicking the bookmark icon. Access them anytime from the bookmark page.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "You're All Set! 🎉",
      description: "Your personalized news experience awaits.",
      component: () => (
        <div className="text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <p className="text-gray-600 dark:text-gray-300">
            You can always adjust these settings later in your preferences by clicking your profile, then settings in the dropdown.
          </p>
        </div>
      )
    }
  ];

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 relative"
      >
        <button
          onClick={handleButtonClick(completeOnboarding)}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-8">
          <div className="flex justify-center mb-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 w-16 mx-1 rounded ${
                  index <= currentStep 
                    ? 'bg-blue-600' 
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
          <h2 className="text-2xl font-bold mb-2 dark:text-white">
            {steps[currentStep].title}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {steps[currentStep].description}
          </p>
        </div>

        <div className="mb-8">
          <CurrentStepComponent 
            userPreferences={userPreferences}
            updatePreferences={updatePreferences}
          />
        </div>

        <div className="flex justify-between">
          <button
            onClick={handleButtonClick(previousStep)}
            className={`flex items-center ${
              currentStep === 0 ? 'invisible' : ''
            } text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white`}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <button
            onClick={handleButtonClick(currentStep === steps.length - 1 ? completeOnboarding : nextStep)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
            {currentStep === steps.length - 1 ? (
              <Check className="w-4 h-4 ml-2" />
            ) : (
              <ArrowRight className="w-4 h-4 ml-2" />
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
