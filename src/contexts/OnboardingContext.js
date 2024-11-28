import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';

const OnboardingContext = createContext();

export function OnboardingProvider({ children }) {
  const { user, userPreferences, updatePreferences } = useAuth();
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (userPreferences?.onboardingCompleted) {
      setIsOnboarding(false);
      setCurrentStep(0);
    }
  }, [userPreferences?.onboardingCompleted]);

  const startOnboarding = () => {
    if (isUpdating || isOnboarding) {
      console.log('Onboarding already in progress or update in progress');
      return;
    }
    console.log('Starting onboarding flow');
    setIsOnboarding(true);
    setCurrentStep(0);
  };

  const completeOnboarding = async () => {
    console.log('Completing onboarding flow');
    if (isUpdating) {
      console.log('Update in progress, deferring completion');
      return;
    }
    
    setIsOnboarding(false);
    setCurrentStep(0);
    
    setIsUpdating(true);
    try {
      await updatePreferences({ onboardingCompleted: true });
      console.log('Onboarding preferences saved successfully');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const nextStep = async () => {
    if (isUpdating) {
      console.log('Update in progress, deferring step navigation');
      return;
    }
    const nextStepIndex = currentStep + 1;
    console.log('Moving to next step:', nextStepIndex);
    setCurrentStep(nextStepIndex);
  };

  const previousStep = () => {
    if (isUpdating) {
      console.log('Update in progress, deferring step navigation');
      return;
    }
    const prevStepIndex = Math.max(0, currentStep - 1);
    console.log('Moving to previous step:', prevStepIndex);
    setCurrentStep(prevStepIndex);
  };

  return (
    <OnboardingContext.Provider value={{
      isOnboarding,
      currentStep,
      startOnboarding,
      completeOnboarding,
      nextStep,
      previousStep,
      isUpdating
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => useContext(OnboardingContext);