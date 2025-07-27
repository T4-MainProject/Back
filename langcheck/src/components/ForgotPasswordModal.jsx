// ============================================
// src/components/ForgotPasswordModal.jsx - 비밀번호 찾기 모달 컴포넌트
// ============================================
// 📝 주요 기능:
// - 이메일 입력 및 인증 코드 전송
// - 인증 코드 입력 및 검증
// - 새 비밀번호 설정
// - 3단계 진행 과정 UI
// ============================================

import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import NotificationModal from './NotificationModal';

export default function ForgotPasswordModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: 이메일 입력, 2: 코드 입력, 3: 새 비밀번호 설정
  const [formData, setFormData] = useState({
    email: '',
    verificationCode: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [sentCode, setSentCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  // 알림 모달 상태
  const [notification, setNotification] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // 카운트다운 타이머
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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

  // 모달 초기화
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFormData({
        email: '',
        verificationCode: '',
        newPassword: '',
        confirmPassword: ''
      });
      setErrors({});
      setSentCode('');
      setCountdown(0);
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

  const handleBackToLogin = () => {
    onClose();
  };

  // 1단계: 이메일 입력 및 인증 코드 전송
  const handleSendCode = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      setErrors({ email: '이메일을 입력해주세요.' });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setErrors({ email: '올바른 이메일 형식이 아닙니다.' });
      return;
    }

    setIsLoading(true);
    
    try {
      // 실제 API 호출 - 비밀번호 재설정 이메일 전송
      const result = await authAPI.forgotPassword(formData.email);
      
      // 성공 시 다음 단계로 이동
      setStep(2);
      setCountdown(600); // 10분 카운트다운 (600초)
      setNotification({
        isOpen: true,
        type: 'success',
        title: '인증 코드 전송 완료!',
        message: `6자리 인증 코드가 ${formData.email}으로 전송되었습니다.`
      });

    } catch (error) {
      console.error('비밀번호 재설정 요청 오류:', error);
      if (error.message.includes('not found') || error.message.includes('존재하지 않는')) {
        setErrors({ email: '등록되지 않은 이메일입니다.' });
      } else {
        setErrors({ general: error.message || '비밀번호 재설정 요청 중 오류가 발생했습니다.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 임시 비밀번호 발송
  const handleSendTemporaryPassword = async () => {
    if (!formData.email) {
      setErrors({ email: '이메일을 입력해주세요.' });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setErrors({ email: '올바른 이메일 형식이 아닙니다.' });
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await authAPI.sendTemporaryPassword(formData.email);
      
      setNotification({
        isOpen: true,
        type: 'success',
        title: '임시 비밀번호 발송 완료!',
        message: `임시 비밀번호가 ${formData.email}으로 발송되었습니다.\n이메일을 확인하여 로그인해주세요.`
      });

    } catch (error) {
      console.error('임시 비밀번호 발송 오류:', error);
      if (error.message.includes('not found') || error.message.includes('존재하지 않는')) {
        setErrors({ email: '등록되지 않은 이메일입니다.' });
      } else {
        setErrors({ general: error.message || '임시 비밀번호 발송 중 오류가 발생했습니다.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2단계: 인증 코드 입력 (검증은 3단계에서)
  const handleVerifyCode = (e) => {
    e.preventDefault();
    
    if (!formData.verificationCode) {
      setErrors({ verificationCode: '6자리 인증 코드를 입력해주세요.' });
      return;
    }

    if (formData.verificationCode.length !== 6 || !/^\d{6}$/.test(formData.verificationCode)) {
      setErrors({ verificationCode: '6자리 숫자 코드를 입력해주세요.' });
      return;
    }

    setStep(3);
    setErrors({});
  };

  // 3단계: 새 비밀번호 설정
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    const newErrors = {};

    if (!formData.newPassword) {
      newErrors.newPassword = '새 비밀번호를 입력해주세요.';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = '비밀번호는 8자 이상이어야 합니다.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    
    try {
      // 6자리 코드 방식 비밀번호 재설정
      await authAPI.resetPasswordWithCode(
        formData.email, 
        formData.verificationCode, 
        formData.newPassword, 
        formData.confirmPassword
      );
      
      setNotification({
        isOpen: true,
        type: 'success',
        title: '비밀번호 변경 완료!',
        message: '비밀번호가 성공적으로 변경되었습니다.'
      });
      onSuccess();

    } catch (error) {
      console.error('비밀번호 재설정 오류:', error);
      setErrors({ general: error.message || '비밀번호 재설정 중 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  // 코드 재전송
  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    setIsLoading(true);
    
    try {
      // 새 인증 코드 생성
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);

      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`인증 코드 재전송 시뮬레이션: ${formData.email}로 코드 ${code} 전송`);

      setCountdown(180);
      setNotification({
        isOpen: true,
        type: 'info',
        title: '코드 재전송 완료!',
        message: `인증 코드가 다시 전송되었습니다.\n(개발 환경에서는 콘솔에서 확인 가능: ${code})`
      });

    } catch (error) {
      console.error('인증 코드 재전송 오류:', error);
      setErrors({ general: '인증 코드 재전송 중 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
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
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">비밀번호 찾기</h2>
            <p className="text-gray-600">
              {step === 1 && '등록된 이메일 주소를 입력해주세요'}
              {step === 2 && '이메일로 전송된 인증 코드를 입력해주세요'}
              {step === 3 && '새로운 비밀번호를 설정해주세요'}
            </p>
          </div>

          {/* 진행 단계 표시 */}
          <div className="px-8 mb-6">
            <div className="flex items-center justify-center space-x-2">
              {[1, 2, 3].map((num) => (
                <React.Fragment key={num}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    num === step ? 'bg-blue-600 text-white' : 
                    num < step ? 'bg-green-500 text-white' : 
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {num < step ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : num}
                  </div>
                  {num < 3 && (
                    <div className={`w-8 h-0.5 ${
                      num < step ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>이메일 입력</span>
              <span>코드 입력</span>
              <span>비밀번호 설정</span>
            </div>
          </div>

          {/* 폼 */}
          <div className="px-8 pb-8">
            {/* 전체 에러 메시지 */}
            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {errors.general}
              </div>
            )}

            {/* 1단계: 이메일 입력 */}
            {step === 1 && (
              <form onSubmit={handleSendCode}>
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    등록된 이메일 주소
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

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-300 mb-3 ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-red-500 to-orange-500 hover:shadow-lg hover:scale-105'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      인증 코드 전송 중...
                    </div>
                  ) : (
                    '인증 코드 전송'
                  )}
                </button>

                {/* 구분선 */}
                <div className="relative mb-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">또는</span>
                  </div>
                </div>

                {/* 임시 비밀번호 발송 버튼 */}
                <button
                  type="button"
                  onClick={handleSendTemporaryPassword}
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-300 mb-4 ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg hover:scale-105'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      임시 비밀번호 발송 중...
                    </div>
                  ) : (
                    '임시 비밀번호 발송'
                  )}
                </button>
              </form>
            )}

            {/* 2단계: 인증 코드 입력 */}
            {step === 2 && (
              <form onSubmit={handleVerifyCode}>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    인증 코드
                  </label>
                  <input
                    type="text"
                    name="verificationCode"
                    value={formData.verificationCode}
                    onChange={handleInputChange}
                    placeholder="6자리 인증 코드"
                    maxLength="6"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 text-center text-lg tracking-wider ${
                      errors.verificationCode 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {errors.verificationCode && (
                    <p className="mt-1 text-sm text-red-600">{errors.verificationCode}</p>
                  )}
                </div>

                <div className="text-center mb-6">
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">{formData.email}</span>로 전송된 코드를 입력해주세요
                  </p>
                  {countdown > 0 ? (
                    <p className="text-sm text-blue-600">
                      남은 시간: {formatTime(countdown)}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={isLoading}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      인증 코드 재전송
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg hover:scale-105 transition-all duration-300 mb-4"
                >
                  인증 코드 확인
                </button>
              </form>
            )}

            {/* 3단계: 새 비밀번호 설정 */}
            {step === 3 && (
              <form onSubmit={handleResetPassword}>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    새 비밀번호
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    placeholder="새 비밀번호 (8자 이상)"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      errors.newPassword 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {errors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    비밀번호 확인
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="비밀번호를 다시 입력해주세요"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      errors.confirmPassword 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-300 mb-4 ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-lg hover:scale-105'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      비밀번호 변경 중...
                    </div>
                  ) : (
                    '비밀번호 변경'
                  )}
                </button>
              </form>
            )}

            {/* 로그인으로 돌아가기 버튼 */}
            <button
              type="button"
              onClick={handleBackToLogin}
              className="w-full py-3 px-4 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              로그인으로 돌아가기
            </button>
          </div>
        </div>
      </div>

      {/* 알림 모달 */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </div>
  );
} 