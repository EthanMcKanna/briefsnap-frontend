import React, { useState } from 'react';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useAuth } from '../contexts/AuthContext';
import { X, ArrowLeft, ArrowRight, Check, Sun, Moon, Computer, MapPin, Calendar, LayoutDashboard, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { TOPICS } from '../utils/constants';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
        <Tag className="w-4 h-4 mr-2" />
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
  } = useSortable({ id: widget.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
      className={`w-full p-4 rounded-lg border transition-all text-left flex items-start space-x-3 cursor-move
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
    await action();
  };

  const steps = [
    {
      title: "Welcome to BriefSnap! 👋",
      description: "Let's personalize your news experience in just a few steps.",
      component: ({ userPreferences }) => (
        <div className="flex justify-center">
          <img 
            src="/logo192.png" 
            alt="BriefSnap Logo" 
            className="w-32 h-32 animate-float"
          />
        </div>
      )
    },
    {
      title: "Pick Your Topics",
      description: "Choose up to 3 topics to pin to your home page.",
      component: ({ userPreferences, updatePreferences }) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {TOPICS.filter(topic => !(userPreferences.pinnedTopics || []).includes(topic.value)).map(topic => (
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
      title: "Enable Widgets",
      description: "Add useful widgets to your dashboard.",
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
            </div>

            {enabledWidgets.length > 1 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Drag to reorder your widgets:
                </p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={({ active, over }) => {
                    if (!over || active.id === over.id) return;
                    
                    const currentOrder = userPreferences.widgetOrder || ['weather', 'calendar', 'market'];
                    const oldIndex = currentOrder.indexOf(active.id);
                    const newIndex = currentOrder.indexOf(over.id);
                    
                    const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
                    handlePreferenceUpdate({ widgetOrder: newOrder });
                  }}
                >
                  <SortableContext
                    items={enabledWidgets.map(w => w.key)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {enabledWidgets.map(widget => (
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
      title: "All Set!",
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
