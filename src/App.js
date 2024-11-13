import React from 'react';
import BriefSnap from './components/BriefSnap';
import FullArticle from './components/FullArticle';
import BookmarksPage from './components/BookmarksPage';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BookmarkProvider } from './contexts/BookmarkContext';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <BookmarkProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<BriefSnap />} />
            <Route path="/article/:articleId" element={<FullArticle />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
          </Routes>
        </BrowserRouter>
      </BookmarkProvider>
    </ThemeProvider>
  );
}

export default App;
