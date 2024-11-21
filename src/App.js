import React from 'react';
import BriefSnap from './components/BriefSnap';
import FullArticle from './components/FullArticle';
import BookmarksPage from './components/BookmarksPage';
import UserSettings from './components/UserSettings';
import ArticlesPage from './components/ArticlesPage';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BookmarkProvider } from './contexts/BookmarkContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { HelmetProvider } from 'react-helmet-async';

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <BookmarkProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<BriefSnap />} />
                <Route path="/article/:slug" element={<FullArticle />} />
                <Route path="/bookmarks" element={<BookmarksPage />} />
                <Route path="/settings" element={<UserSettings />} />
                <Route path="/articles" element={<ArticlesPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
              </Routes>
            </BrowserRouter>
          </BookmarkProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
