import React, { useState } from 'react';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useAuth } from '../contexts/AuthContext';
import { X, ArrowLeft, ArrowRight, Check, Sun, Moon, Computer, MapPin, Calendar, LayoutDashboard, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { TOPICS } from '../utils/constants';

export default function Onboarding() {
  const { isOnboarding, currentStep, completeOnboarding, nextStep, previousStep, isUpdating: isOnboardingUpdating } = useOnboarding();
  const { userPreferences, updatePreferences } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

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
            src="/logo512.png" 
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
            {TOPICS.filter(t => t.value !== 'ALL').map(topic => (
              <button
                key={topic.value}
                onClick={async () => {
                  const current = userPreferences.pinnedTopics || [];
                  const updated = current.includes(topic.value)
                    ? current.filter(t => t !== topic.value)
                    : current.length < 3
                    ? [...current, topic.value]
                    : current;
                  await handlePreferenceUpdate({ pinnedTopics: updated });
                }}
                disabled={isUpdating}
                className={`p-3 rounded-lg border transition-all flex items-center space-x-2 ${
                  (userPreferences.pinnedTopics || []).includes(topic.value)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                }`}
              >
                <Tag className="w-4 h-4" />
                <span className="text-sm">{topic.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {3 - (userPreferences.pinnedTopics || []).length} selections remaining
          </p>
        </div>
      )
    },
    {
      title: "Enable Widgets",
      description: "Add useful widgets to your dashboard.",
      component: ({ userPreferences }) => (
        <div className="space-y-4">
          {[
            { key: 'showWeather', icon: MapPin, label: 'Weather Widget', description: 'Get local weather updates' },
            { key: 'calendarIntegration', icon: Calendar, label: 'Calendar Widget', description: 'View your daily schedule' },
            { key: 'showMarketWidget', icon: LayoutDashboard, label: 'Market Widget', description: 'Track stock markets' }
          ].map(({ key, icon: Icon, label, description }) => (
            <button
              key={key}
              onClick={async () => {
                await handlePreferenceUpdate({ [key]: !userPreferences[key] });
              }}
              disabled={isUpdating}
              className={`w-full p-4 rounded-lg border transition-all text-left flex items-start space-x-3 ${
                userPreferences[key]
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
              }`}
            >
              <Icon className="w-5 h-5 mt-0.5" />
              <div>
                <div className="font-medium">{label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>
              </div>
            </button>
          ))}
        </div>
      )
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
