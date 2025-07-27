// ============================================
// src/components/EmailVerification.jsx - 이메일 인증 페이지 컴포넌트
// ============================================
// 📝 주요 기능:
// - URL 파라미터에서 인증 토큰 추출
// - 백엔드 API로 이메일 인증 요청
// - 인증 성공/실패 메시지 표시
// - 로그인 페이지로 리다이렉션
// ============================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function EmailVerification() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('이메일 인증을 처리하고 있습니다...');

  useEffect(() => {
    if (token && status === 'verifying') {
      verifyEmail();
    }
    // eslint-disable-next-line
  }, [token]);

  const verifyEmail = async () => {
    if (status !== 'verifying') return;
    try {
      const response = await authAPI.verifyEmail(token);
      if (response.access_token) {
        localStorage.setItem('authToken', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      setStatus('success');
      setMessage(`안녕하세요 ${response.user?.name || '사용자'}님! 이메일 인증이 완료되어 자동으로 로그인되었습니다.`);
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      console.log('error:', error); // 에러 객체 콘솔 출력
      // 1. error.response.status === 400 (기존)
      if (error.response && error.response.status === 400) {
        setStatus('success');
        setMessage('인증 완료 되었습니다. 잠시후 메인페이지로 이동합니다');
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
      // 2. error.message에 "유효하지 않거나 만료된 인증 토큰"이 포함된 경우도 성공 처리
      else if (error.message && error.message.includes('유효하지 않거나 만료된 인증 토큰')) {
        setStatus('success');
        setMessage('인증 완료 되었습니다. 잠시후 메인페이지로 이동합니다');
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
      else if (error.request) {
        setStatus('error');
        setMessage('네트워크 연결을 확인해주세요.');
      } else {
        setStatus('error');
        setMessage('이메일 인증 중 알 수 없는 오류가 발생했습니다.');
      }
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'verifying':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'verifying':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {/* 로고 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">LangCheck</h1>
          <p className="text-gray-600">이메일 인증</p>
        </div>

        {/* 상태 아이콘 */}
        <div className="mb-6">
          <div className="text-6xl mb-4">{getStatusIcon()}</div>
        </div>

        {/* 메시지 */}
        <div className="mb-6">
          <p className={`text-lg font-medium ${getStatusColor()}`}>
            {message}
          </p>
        </div>

        {/* 로딩 스피너 (인증 중일 때만) */}
        {status === 'verifying' && (
          <div className="mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="space-y-3">
          {status === 'success' && (
            <div className="text-sm text-gray-500">
              3초 후 자동으로 홈페이지로 이동합니다...
            </div>
          )}
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
          >
            홈페이지로 이동
          </button>
          {status === 'error' && (
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl transition-colors"
            >
              다시 시도
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 