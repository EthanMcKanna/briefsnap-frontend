import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  useEffect(() => {
    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Initial setup
    document.documentElement.classList.toggle('dark', mediaQuery.matches);
    
    // Listen for changes
    const handler = (e) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return <>{children}</>;
}

export const useTheme = () => useContext(ThemeContext);