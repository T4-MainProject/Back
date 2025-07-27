// ============================================
// src/components/LoginModal.jsx - 로그인 모달 컴포넌트
// ============================================
// 📝 주요 기능:
// - 모달 형태의 로그인 폼
// - 이메일/비밀번호 입력
// - 로그인, 회원가입, 비밀번호 찾기 버튼
// - 반응형 디자인 및 애니메이션
// ============================================

import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import ForgotPasswordModal from './ForgotPasswordModal';
import NotificationModal from './NotificationModal';

export default function LoginModal({ isOpen, onClose, onSwitchToSignup, onLoginSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // 알림 모달 상태
  const [notification, setNotification] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // 모달이 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.keyCode === 27) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // 로그인 모달이 닫힐 때 비밀번호 찾기 모달도 닫기
  useEffect(() => {
    if (!isOpen) {
      setShowForgotPassword(false);
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 에러 메시지 클리어
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // 이메일 검증
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.';
    }

    // 비밀번호 검증
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      // 실제 API 호출
      const result = await authAPI.login(formData.email, formData.password);
      
      // 로그인 성공 시
      // 토큰과 사용자 정보는 authAPI.login에서 자동으로 저장됨
      
      // 성공 모달 표시 (부모 호출은 모달에서 확인을 눌렀을 때)
      setNotification({
        isOpen: true,
        type: 'success',
        title: '로그인 완료!',
        message: `환영합니다, ${result.user.name}님!\n로그인이 성공적으로 완료되었습니다.`,
        userData: result.user // 사용자 데이터 저장
      });
      
    } catch (error) {
      console.error('로그인 오류:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: '로그인 실패',
        message: error.message || '이메일 또는 비밀번호가 올바르지 않습니다.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
  };

  const handleForgotPasswordClose = () => {
    setShowForgotPassword(false);
  };

  const handleForgotPasswordSuccess = () => {
    setShowForgotPassword(false);
    // 비밀번호 재설정 성공 후 로그인 모달로 돌아가기
    setNotification({
      isOpen: true,
      type: 'success',
      title: '비밀번호 변경 완료!',
      message: '비밀번호가 성공적으로 변경되었습니다.\n새 비밀번호로 로그인해주세요.'
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* 배경 오버레이 */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
          onClick={onClose}
        />
        
        {/* 모달 컨테이너 */}
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 modal-enter">
            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 헤더 */}
            <div className="px-8 pt-8 pb-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인</h2>
              <p className="text-gray-600">LangCheck에 오신 것을 환영합니다</p>
            </div>

            {/* 폼 */}
            <form onSubmit={handleSubmit} className="px-8 pb-8">
              {/* 전체 에러 메시지 */}
              {errors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                  {errors.general}
                </div>
              )}

              {/* 이메일 입력 */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="example@email.com"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    errors.email 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* 비밀번호 입력 */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="비밀번호를 입력하세요"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    errors.password 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* 로그인 버튼 */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-300 mb-4 ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:scale-105'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    로그인 중...
                  </div>
                ) : (
                  '로그인'
                )}
              </button>

              {/* 비밀번호 찾기 */}
              <button
                type="button"
                onClick={handleForgotPassword}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200 mb-4"
              >
                비밀번호를 잊으셨나요?
              </button>

              {/* 구분선 */}
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">또는</span>
                </div>
              </div>

              {/* 회원가입 버튼 */}
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="w-full py-3 px-4 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                계정이 없으신가요? 회원가입
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 비밀번호 찾기 모달 */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={handleForgotPasswordClose}
        onSuccess={handleForgotPasswordSuccess}
      />

      {/* 알림 모달 */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => {
          if (notification.type === 'success' && notification.userData) {
            // 성공 시 부모 컴포넌트에 알림 후 모달 닫기
            onLoginSuccess(notification.userData);
            onClose();
          }
          setNotification({ ...notification, isOpen: false });
        }}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </>
  );
} 