// ============================================
// TopBar.jsx 수정 - 프로토 언급 제거
// ============================================
// src/components/TopBar.jsx

import React from 'react';

export default function TopBar() {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-100">
      <div className="container mx-auto px-4 py-2 text-center">
        <div className="flex items-center justify-center space-x-2 text-sm">
          <span className="animate-pulse">🎉</span>
          <span className="font-medium text-blue-700">
            신규 서비스 오픈! AI 자동 채점을 무료로 체험해보세요
          </span>
        </div>
      </div>
    </div>
  );
}
