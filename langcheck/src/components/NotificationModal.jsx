import React, { useEffect } from 'react';

export default function NotificationModal({ 
  isOpen, 
  onClose, 
  type = 'success', // 'success', 'error', 'warning', 'info'
  title, 
  message, 
  confirmText = '확인',
  showCancel = false,
  cancelText = '취소',
  onConfirm,
  onCancel,
  showEmailResend = false,
  userEmail = '',
  onEmailResend
}) {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 타입별 스타일 및 아이콘
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-50',
          iconColor: 'text-green-500',
          icon: '✅',
          titleColor: 'text-green-800',
          buttonColor: 'bg-green-600 hover:bg-green-700'
        };
      case 'error':
        return {
          bgColor: 'bg-red-50',
          iconColor: 'text-red-500',
          icon: '❌',
          titleColor: 'text-red-800',
          buttonColor: 'bg-red-600 hover:bg-red-700'
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-50',
          iconColor: 'text-yellow-500',
          icon: '⚠️',
          titleColor: 'text-yellow-800',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
        };
      case 'info':
        return {
          bgColor: 'bg-blue-50',
          iconColor: 'text-blue-500',
          icon: 'ℹ️',
          titleColor: 'text-blue-800',
          buttonColor: 'bg-blue-600 hover:bg-blue-700'
        };
      default:
        return {
          bgColor: 'bg-gray-50',
          iconColor: 'text-gray-500',
          icon: '📢',
          titleColor: 'text-gray-800',
          buttonColor: 'bg-gray-600 hover:bg-gray-700'
        };
    }
  };

  const styles = getTypeStyles();

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
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
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-95">
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 모달 헤더 */}
          <div className={`${styles.bgColor} px-6 py-8 rounded-t-2xl text-center`}>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg">
                <span className="text-3xl">{styles.icon}</span>
              </div>
            </div>
            
            {title && (
              <h3 className={`text-xl font-bold ${styles.titleColor} mb-2`}>
                {title}
              </h3>
            )}
          </div>

          {/* 모달 바디 */}
          <div className="px-6 py-6">
            {message && (
              <p className="text-gray-600 text-center leading-relaxed mb-6 whitespace-pre-line">
                {message}
              </p>
            )}

            {/* 버튼 영역 */}
            <div className="flex gap-3">
              {showCancel && (
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition-colors duration-200"
                >
                  {cancelText}
                </button>
              )}
              
              {showEmailResend && (
                <button
                  onClick={() => onEmailResend && onEmailResend(userEmail)}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors duration-200"
                >
                  이메일 재전송
                </button>
              )}
              
              <button
                onClick={handleConfirm}
                className={`${showCancel || showEmailResend ? 'flex-1' : 'w-full'} px-4 py-3 ${styles.buttonColor} text-white rounded-xl font-medium transition-colors duration-200`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 