// ============================================
// 간소화된 Footer.jsx
// ============================================
import React from 'react';

export default function SimpleFooter() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between">
          {/* 로고 */}
          <div className="flex items-center space-x-3 mb-6 md:mb-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <div>
              <h3 className="text-xl font-bold">LangCheck</h3>
              <p className="text-gray-400 text-sm">AI 자동 채점 시스템</p>
            </div>
          </div>

          {/* 간단한 정보 */}
          <div className="text-center md:text-right">
            <p className="text-gray-400 text-sm mb-2">
              © 2025 LangCheck. All rights reserved.
            </p>
            <div className="flex items-center justify-center md:justify-end space-x-4 text-xs text-gray-500">
              <span>서비스 문의</span>
              <span>•</span>
              <span>support@langcheck.co.kr</span>
            </div>
          </div>
        </div>
        
        {/* 기술 스택 */}
        <div className="mt-8 pt-8 border-t border-gray-700 text-center">
          <p className="text-gray-400 text-sm">
            Powered by <span className="text-blue-400 font-semibold">YOLO8</span> • 
            <span className="text-purple-400 font-semibold"> OCR</span> • 
            <span className="text-pink-400 font-semibold"> GPT</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
