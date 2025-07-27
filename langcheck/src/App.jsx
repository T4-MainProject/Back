// ============================================
// src/App.jsx - 메인 앱 컴포넌트 (React Router 기반 라우팅)
// ============================================
// 🔄 URL 라우팅:
// - "/" : Home 페이지 (메인 랜딩 페이지)
// - "/upload" : ExamUpload 페이지 (시험지 업로드)
// - "/grading-progress" : GradingProgress 페이지 (채점 대기)
// - "/grading-result/:resultId" : GradingResultNew 페이지 (채점 결과)
// - "/wrong-answer-note" : WrongAnswerNote 페이지 (오답노트)
// - "/similar-problems" : SimilarProblems 페이지 (유사 기출문제)
// - "/learning-analysis" : LearningAnalysis 페이지 (학습 분석)
// - "/verify-email/:token" : EmailVerification 페이지 (이메일 인증)
// ============================================

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ExamUpload from './pages/ExamUpload';
import GradingProgress from './pages/GradingProgress';
import GradingResultNew from './pages/GradingResultNew';
import WrongAnswerNote from './pages/WrongAnswerNote';
import LearningAnalysis from './pages/LearningAnalysis';
import SimilarProblems from './pages/SimilarProblems';
import EmailVerification from './components/EmailVerification';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* 🏠 메인 홈 페이지 (/) */}
        <Route path="/" element={<Home />} />
        
        {/* 📤 시험지 업로드 페이지 (/upload) */}
        <Route path="/upload" element={<ExamUpload />} />
        
        {/* 📊 채점 진행 페이지 (/grading-progress) */}
        <Route path="/grading-progress" element={<GradingProgress />} />
        
        {/* 🎯 채점 결과 페이지 (/grading-result/:resultId) - 통일된 경로 */}
        <Route path="/grading-result/:resultId" element={<GradingResultNew />} />
        
        {/* 📚 오답노트 페이지 (/wrong-answer-note) */}
        <Route path="/wrong-answer-note" element={<WrongAnswerNote />} />
        
        {/* 🔍 유사 기출문제 페이지 (/similar-problems) */}
        <Route path="/similar-problems" element={<SimilarProblems />} />
        
        {/* 📈 학습 분석 페이지 (/learning-analysis) */}
        <Route path="/learning-analysis" element={<LearningAnalysis />} />
        
        {/* ✉️ 이메일 인증 페이지 (/verify-email/:token) */}
        <Route path="/verify-email/:token" element={<EmailVerification />} />
      </Routes>
    </Router>
  );
}