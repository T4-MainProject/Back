// src/components/NotificationCenter.jsx - 실시간 알림 시스템
import React, { useState, useEffect, useRef } from 'react';
import { notificationAPI, websocketAPI } from '../services/api';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // 컴포넌트 마운트 시 WebSocket 연결 및 알림 로드 (일시적으로 비활성화)
  useEffect(() => {
    // loadNotifications();
    // loadUnreadCount();
    // connectWebSocket();

    // 컴포넌트 언마운트 시 WebSocket 연결 해제
    return () => {
      // websocketAPI.disconnect();
    };
  }, []);

  // 클릭 외부 감지
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 알림 목록 로드
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationAPI.getNotifications(1, 20);
      console.log('알림 API 응답:', response); // 디버깅용
      
      const notificationsData = response.notifications || response.data || [];
      console.log('알림 데이터:', notificationsData); // 디버깅용
      
      // ID가 있는 알림만 필터링
      const validNotifications = notificationsData.filter(notification => 
        notification && (notification.id || notification._id || notification.notification_id)
      );
      
      console.log('유효한 알림:', validNotifications); // 디버깅용
      setNotifications(validNotifications);
    } catch (error) {
      console.error('알림 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 읽지 않은 알림 개수 로드
  const loadUnreadCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      setUnreadCount(response.count || 0);
    } catch (error) {
      console.error('읽지 않은 알림 개수 로드 실패:', error);
    }
  };

  // WebSocket 연결 및 실시간 알림 수신
  const connectWebSocket = () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      websocketAPI.connect();
      websocketAPI.onNotification((notification) => {
        console.log('실시간 알림 수신:', notification);
        
        // 새 알림을 목록에 추가
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // 브라우저 알림 표시
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
            tag: notification.id
          });
        }
      });
    } catch (error) {
      console.error('WebSocket 연결 실패:', error);
    }
  };

  // 알림 읽음 처리
  const handleMarkAsRead = async (notificationId) => {
    // ID 유효성 검사
    if (!notificationId || notificationId === 'undefined') {
      console.error('유효하지 않은 알림 ID:', notificationId);
      return;
    }
    
    try {
      await notificationAPI.markAsRead(notificationId);
      
      // 로컬 상태 업데이트
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      // 읽지 않은 개수 업데이트
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
    }
  };

  // 모든 알림 읽음 처리
  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      
      // 로컬 상태 업데이트
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('모든 알림 읽음 처리 실패:', error);
    }
  };

  // 알림 삭제
  const handleDeleteNotification = async (notificationId) => {
    // ID 유효성 검사
    if (!notificationId || notificationId === 'undefined') {
      console.error('유효하지 않은 알림 ID:', notificationId);
      return;
    }
    
    try {
      await notificationAPI.deleteNotification(notificationId);
      
      // 로컬 상태 업데이트
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // 읽지 않은 알림이었다면 개수 감소
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('알림 삭제 실패:', error);
    }
  };

  // 알림 유형에 따른 아이콘
  const getNotificationIcon = (type) => {
    const icons = {
      'success': '✅',
      'info': 'ℹ️',
      'warning': '⚠️',
      'error': '❌',
      'analysis_complete': '🎯',
      'grading_complete': '📊',
      'wrong_answer_generated': '📝',
      'similar_question_generated': '🧠'
    };
    return icons[type] || 'ℹ️';
  };

  // 알림 유형에 따른 색상
  const getNotificationColor = (type) => {
    const colors = {
      'success': 'text-green-600 bg-green-50 border-green-200',
      'info': 'text-blue-600 bg-blue-50 border-blue-200',
      'warning': 'text-yellow-600 bg-yellow-50 border-yellow-200',
      'error': 'text-red-600 bg-red-50 border-red-200',
      'analysis_complete': 'text-purple-600 bg-purple-50 border-purple-200',
      'grading_complete': 'text-indigo-600 bg-indigo-50 border-indigo-200',
      'wrong_answer_generated': 'text-orange-600 bg-orange-50 border-orange-200',
      'similar_question_generated': 'text-cyan-600 bg-cyan-50 border-cyan-200'
    };
    return colors[type] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  // 시간 포맷팅
  const formatTime = (timestamp) => {
    if (!timestamp) return '시간 정보 없음';
    
    const now = new Date();
    const time = new Date(timestamp);
    
    // Invalid Date 체크
    if (isNaN(time.getTime())) return '시간 정보 오류';
    
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
    return time.toLocaleDateString();
  };

  // 브라우저 알림 권한 요청
  const requestNotificationPermission = async () => {
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('알림 권한이 허용되었습니다.');
      }
    }
  };

  // 컴포넌트 마운트 시 알림 권한 확인
  useEffect(() => {
    if ('Notification' in window) {
      requestNotificationPermission();
    }
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 알림 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors duration-200"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* 읽지 않은 알림 배지 */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 드롭다운 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* 헤더 */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">알림</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
                  >
                    모두 읽음
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* 알림 목록 */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">알림을 불러오는 중...</span>
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {notifications.filter(notification => notification && notification.id).map((notification) => (
                  <div
                    key={notification.id || `temp-${Math.random()}`}
                    className={`p-4 hover:bg-gray-50 transition-colors duration-200 ${
                      !notification.is_read ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* 알림 아이콘 */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* 알림 내용 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-medium truncate ${
                            !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {formatTime(notification.created_at)}
                          </span>
                          <div className="flex items-center space-x-2">
                            {!notification.is_read && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="text-xs text-blue-600 hover:text-blue-800 transition-colors duration-200"
                              >
                                읽음
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteNotification(notification.id)}
                              className="text-xs text-red-600 hover:text-red-800 transition-colors duration-200"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-gray-600">알림이 없습니다</p>
              </div>
            )}
          </div>

          {/* 푸터 */}
          {notifications.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // 알림 설정 페이지로 이동하거나 모달 열기
                }}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200 w-full text-center"
              >
                알림 설정
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 