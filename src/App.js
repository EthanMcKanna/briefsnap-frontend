import React from 'react';
import BriefSnap from './components/BriefSnap';
import FullArticle from './components/FullArticle';
import BookmarksPage from './components/BookmarksPage';
import UserSettings from './components/UserSettings';
import ArticlesPage from './components/ArticlesPage';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import SitemapXML from './components/SitemapXML';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BookmarkProvider } from './contexts/BookmarkContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { HelmetProvider } from 'react-helmet-async';
import { CacheProvider } from './contexts/CacheContext';
import PrivateRoute from './components/PrivateRoute';
import { OnboardingProvider } from './contexts/OnboardingContext';
import Onboarding from './components/Onboarding';

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <OnboardingProvider>
            <CacheProvider>
              <BookmarkProvider>
                <BrowserRouter>
                  <Onboarding />
                  <Routes>
                    <Route path="/" element={<BriefSnap />} />
                    <Route path="/article/:slug" element={<FullArticle />} />
                    <Route 
                      path="/bookmarks" 
                      element={
                        <PrivateRoute>
                          <BookmarksPage />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="/settings" 
                      element={
                        <PrivateRoute>
                          <UserSettings />
                        </PrivateRoute>
                      } 
                    />
                    <Route path="/articles" element={<ArticlesPage />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms-of-service" element={<TermsOfService />} />
                    <Route path="/sitemap.xml" element={<SitemapXML />} />
                  </Routes>
                </BrowserRouter>
              </BookmarkProvider>
            </CacheProvider>
          </OnboardingProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
