import React from 'react';
import BriefSnap from './components/BriefSnap';
import FullArticle from './components/FullArticle';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BriefSnap />} />
        <Route path="/article/:articleId" element={<FullArticle />} />
      </Routes>
    </Router>
  );
}

export default App;
