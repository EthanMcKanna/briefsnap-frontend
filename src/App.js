import React from 'react';
import BriefSnap from './components/BriefSnap';
import FullArticle from './components/FullArticle';
import BookmarksPage from './components/BookmarksPage';
import UserSettings from './components/UserSettings';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BookmarkProvider } from './contexts/BookmarkContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BookmarkProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<BriefSnap />} />
              <Route path="/article/:articleId" element={<FullArticle />} />
              <Route path="/bookmarks" element={<BookmarksPage />} />
              <Route path="/settings" element={<UserSettings />} />
            </Routes>
          </BrowserRouter>
        </BookmarkProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
