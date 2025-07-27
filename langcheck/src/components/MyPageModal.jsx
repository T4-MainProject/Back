// ============================================
// src/components/MyPageModal.jsx - 마이페이지 모달
// ============================================
// 📱 주요 기능:
// - 사용자 정보 표시
// - 프로필 편집
// - 통계 정보 표시
// - 반응형 디자인
// ============================================

import React, { useState, useEffect } from 'react';
import { userAPI, storageUtils } from '../services/api';
import NotificationModal from './NotificationModal';
import Avatar from './Avatar';

// 더미 데이터 (임시로 유지)
const userRoles = {
  student: {
    name: '학생',
    color: 'blue'
  },
  teacher: {
    name: '선생님',
    color: 'green'
  },
  parent: {
    name: '학부모',
    color: 'purple'
  },
  admin: {
    name: '관리자',
    color: 'red'
  }
};

const memberTiers = {
  basic: { 
    name: 'Basic', 
    color: '#6B7280',
    dailyUploads: 3,
    features: ['기본 채점', '오답노트'],
    price: '무료'
  },
  pro: { 
    name: 'Pro', 
    color: '#3B82F6',
    dailyUploads: 20,
    features: ['고급 분석', '유사문제', '통계', 'AI 튜터'],
    price: '월 9,900원'
  },
  ultra: { 
    name: 'Ultra', 
    color: '#8B5CF6',
    dailyUploads: 999,
    features: ['모든 기능', '우선 지원', '개인 컨설팅'],
    price: '월 19,900원'
  },
  admin: {
    name: 'Admin',
    color: '#FF0000',
    dailyUploads: 999,
    features: ['관리자 권한'],
    price: '관리자'
  }
};

// 포인트 시스템 제거 - 등급은 구독으로 관리
const calculateUserTier = (user) => {
  // 사용자의 등급 정보가 있으면 사용, 없으면 기본값
  return user.tier || 'basic';
};

const checkProfileCompletion = (user) => {
  const requiredFields = ['name', 'phone', 'address'];
  return requiredFields.every(field => user[field] && user[field].trim() !== '');
};

const grantProfileCompletionReward = (user) => {
  return { ...user, points: (user.points || 0) + pointsSystem.PROFILE_COMPLETE };
};

export default function MyPageModal({ isOpen, onClose, currentUser, onUserUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [internalUser, setInternalUser] = useState(currentUser); // 내부 상태로 사용자 정보 관리
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    school: '',
    birthDate: ''
  });

  // 알림 모달 상태
  const [notification, setNotification] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // 비밀번호 변경 모달 상태
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 회원탈퇴 확인 모달 상태
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // 모달이 열릴 때 사용자 정보로 초기화
  useEffect(() => {
    if (currentUser) {
      setInternalUser(currentUser); // 내부 상태 업데이트
      setFormData({
        name: currentUser.name || '',
        phone: currentUser.phone || '',
        address: currentUser.address || '',
        school: currentUser.school || '',
        birthDate: currentUser.birth_date || ''
      });
    }
  }, [currentUser]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // 원래 데이터로 복원
    setFormData({
      name: internalUser.name || '',
      phone: internalUser.phone || '',
      address: internalUser.address || '',
      school: internalUser.school || '',
      birthDate: internalUser.birth_date || ''
    });
  };

  const handleSave = async () => {
    try {
      const updatedUserData = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        birth_date: formData.birthDate || null,
        school: formData.school || null
      };
      
      // 실제 API 호출
      const result = await userAPI.updateProfile(updatedUserData);
      
      const updatedUser = {
        ...internalUser,
        ...result
      };
      
      // 로컬 스토리지 업데이트
      storageUtils.saveUserToStorage(updatedUser, localStorage.getItem('authToken'));
      
      // 부모 컴포넌트에 업데이트 알림
      onUserUpdate(updatedUser);
      
      // 내부 상태 업데이트
      setInternalUser(updatedUser);
      
      setIsEditing(false);
      
      setNotification({
        isOpen: true,
        type: 'success',
        title: '프로필 업데이트 완료!',
        message: '프로필이 성공적으로 업데이트되었습니다.'
      });
      
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: '업데이트 실패',
        message: '프로필 업데이트 중 오류가 발생했습니다.'
      });
    }
  };

  const handleUpgrade = () => {
    // 현재 사용자 정보로 프로필 완성 상태 체크
    const profileStatus = checkProfileCompletion(internalUser);
    
    if (!profileStatus.isComplete) {
      setNotification({
        isOpen: true,
        type: 'warning',
        title: '프로필 미완성',
        message: '개인정보를 먼저 완성해주세요!\n\n전화번호, 주소, 학교 정보를 모두 입력해야 합니다.'
      });
      return;
    }

    if (internalUser.profileCompletionRewardReceived) {
      setNotification({
        isOpen: true,
        type: 'info',
        title: '보상 수령 완료',
        message: '이미 프로필 완성 보상을 받으셨습니다.'
      });
      return;
    }

    // 프로필 완성 보상 지급
    const rewardResult = grantProfileCompletionReward(internalUser.id);
    
    if (rewardResult.success) {
      // 보상 지급 성공 시 업데이트된 사용자 정보로 업데이트
      const rewardedUser = {
        ...internalUser,
        points: rewardResult.newPoints,
        tier: rewardResult.newTier,
        profileCompletionRewardReceived: true
      };
      
      storageUtils.saveUserToStorage(rewardedUser, localStorage.getItem('authToken'));
      onUserUpdate(rewardedUser);
      setInternalUser(rewardedUser); // 내부 상태도 업데이트
      
      // 등급 업그레이드 성공 알림
      if (rewardResult.tierUpgraded) {
        const tierNames = {
          basic: 'Basic',
          pro: 'Pro',
          ultra: 'Ultra'
        };
        
        setNotification({
          isOpen: true,
          type: 'success',
          title: '🎉 등급 업그레이드 완료!',
          message: `축하합니다! 등급 업그레이드 완료!\n\n보상 내용:\n• ${rewardResult.pointsAwarded}포인트 지급\n• ${tierNames[rewardResult.previousTier]} → ${tierNames[rewardResult.newTier]} 승급\n\nPro 등급 혜택을 즐기세요!`
        });
      } else {
        setNotification({
          isOpen: true,
          type: 'success',
          title: '✅ 프로필 완성 보상!',
          message: `프로필 완성 보상으로 ${rewardResult.pointsAwarded}포인트를 획득했습니다!`
        });
      }
    } else {
      setNotification({
        isOpen: true,
        type: 'error',
        title: '업그레이드 실패',
        message: '업그레이드 처리 중 오류가 발생했습니다. 다시 시도해주세요.'
      });
    }
  };

  // 비밀번호 변경 핸들러
  const handlePasswordChange = async () => {
    try {
      // 유효성 검사
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        setNotification({
          isOpen: true,
          type: 'error',
          title: '입력 오류',
          message: '모든 필드를 입력해주세요.'
        });
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setNotification({
          isOpen: true,
          type: 'error',
          title: '비밀번호 불일치',
          message: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다.'
        });
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setNotification({
          isOpen: true,
          type: 'error',
          title: '비밀번호 길이',
          message: '새 비밀번호는 최소 6자 이상이어야 합니다.'
        });
        return;
      }

      // API 호출
      await userAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
      
      // 성공 시 모달 닫기 및 알림
      setIsPasswordModalOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      setNotification({
        isOpen: true,
        type: 'success',
        title: '비밀번호 변경 완료',
        message: '비밀번호가 성공적으로 변경되었습니다.'
      });
      
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: '비밀번호 변경 실패',
        message: error.message || '비밀번호 변경 중 오류가 발생했습니다.'
      });
    }
  };

  // 회원탈퇴 핸들러
  const handleDeleteAccount = async () => {
    try {
      if (deleteConfirmText !== '탈퇴') {
        setNotification({
          isOpen: true,
          type: 'error',
          title: '확인 텍스트 오류',
          message: '정확히 "탈퇴"를 입력해주세요.'
        });
        return;
      }

      // API 호출
      await userAPI.deleteAccount();
      
      // 성공 시 로그아웃 처리
      storageUtils.removeUserFromStorage();
      onUserUpdate(null);
      onClose();
      
      setNotification({
        isOpen: true,
        type: 'success',
        title: '회원탈퇴 완료',
        message: '회원탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.'
      });
      
    } catch (error) {
      console.error('회원탈퇴 오류:', error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: '회원탈퇴 실패',
        message: error.message || '회원탈퇴 중 오류가 발생했습니다.'
      });
    }
  };

  if (!isOpen || !internalUser) return null;

  const roleInfo = userRoles[internalUser.role || 'student'] || userRoles.student;
  const joinDate = (() => {
    if (!internalUser.created_at) return new Date().toLocaleDateString('ko-KR');
    const date = new Date(internalUser.created_at);
    return isNaN(date.getTime()) ? new Date().toLocaleDateString('ko-KR') : date.toLocaleDateString('ko-KR');
  })();
  
  // 회원등급 정보
  const currentTier = internalUser.role === 'admin' ? 'admin' : (internalUser.tier || calculateUserTier(internalUser));
  const tierInfo = memberTiers[currentTier] || memberTiers.basic;
  const nextTier = currentTier === 'basic' ? 'pro' : 
                   currentTier === 'pro' ? 'ultra' : null;
  const nextTierInfo = nextTier ? memberTiers[nextTier] : null;

  // 일일 업로드 사용량 체크
  const today = new Date().toDateString();
  const hasResetToday = (internalUser.dailyUploadsReset || '') === today;
  const dailyUploadsUsed = hasResetToday ? (internalUser.dailyUploadsUsed || 0) : 0;
  const dailyUploadsRemaining = Math.max(0, (tierInfo?.dailyUploads || 3) - dailyUploadsUsed);

  // 개인정보 완성 상태 체크
  const profileStatus = checkProfileCompletion(internalUser);
  const canGetReward = profileStatus && !internalUser.profileCompletionRewardReceived;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 배경 오버레이 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* 모달 컨테이너 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 modal-enter">
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 헤더 */}
          <div className="px-8 pt-8 pb-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 shadow-lg ring-4 ring-blue-100">
                <Avatar 
                  src={internalUser.avatar} 
                  name={internalUser.name}
                  size={80}
                />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{internalUser.name}</h2>
              <div className="flex items-center justify-center space-x-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  roleInfo.color === 'red' ? 'bg-red-100 text-red-600' :
                  roleInfo.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                  roleInfo.color === 'green' ? 'bg-green-100 text-green-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {roleInfo.name}
                </span>
                <span className="text-gray-500 text-sm">가입일: {joinDate}</span>
              </div>
            </div>

            {/* 회원등급 정보 */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold`} 
                       style={{ backgroundColor: tierInfo.color }}>
                    {tierInfo.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{tierInfo.name}</h3>
                    <p className="text-sm text-gray-600">회원등급</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{tierInfo.price}</div>
                  <div className="text-sm text-gray-600">구독료</div>
                </div>
              </div>

              {/* 일일 업로드 제한 */}
              <div className="flex items-center justify-between text-sm mb-4">
                <span className="text-gray-600">일일 업로드</span>
                <span className={`font-medium ${dailyUploadsRemaining > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {dailyUploadsRemaining > 999 ? '무제한' : `${dailyUploadsRemaining}회 남음`}
                </span>
              </div>

              {/* 등급 업그레이드 버튼 */}
              {nextTierInfo && currentTier !== 'admin' && (
                <button
                  onClick={() => {
                    setNotification({
                      isOpen: true,
                      type: 'info',
                      title: '등급 업그레이드',
                      message: `${nextTierInfo.name} 등급으로 업그레이드하시겠습니까?\n\n가격: ${nextTierInfo.price}\n혜택: ${nextTierInfo.features.join(', ')}`
                    });
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <span className="text-lg">🚀</span>
                  <span>{nextTierInfo.name} 등급으로 업그레이드</span>
                  <span className="text-lg">⭐</span>
                </button>
              )}
            </div>
          </div>

          {/* 회원등급 혜택 */}
          <div className="px-8 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🎁 {tierInfo.name} 등급 혜택</h3>
            <div className="bg-white border rounded-xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">현재 혜택</h4>
                  <ul className="space-y-2">
                    {tierInfo.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {nextTierInfo && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">
                      {nextTierInfo.name} 등급 승급시 추가 혜택
                    </h4>
                    <ul className="space-y-2">
                      {nextTierInfo.features.filter(f => !tierInfo.features.includes(f)).map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">{nextTierInfo.price}</span>로 업그레이드하세요!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 사용자 정보 */}
          <div className="px-8 pb-8">
            {/* 개인정보 완성 상태 */}
            {internalUser.tier === 'basic' && (
              <div className="mb-6">
                <div className={`rounded-xl p-4 border-2 ${
                  canGetReward 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800">
                      {canGetReward ? '🎁 개인정보 완료 보상' : '📝 개인정보 완성도'}
                    </h4>
                    <span className="text-sm font-medium text-gray-600">
                      {profileStatus.completedFields.length}/{profileStatus.totalFields}
                    </span>
                  </div>
                  
                  {/* 프로그래스 바 */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        canGetReward ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${(profileStatus.completedFields.length / profileStatus.totalFields) * 100}%` }}
                    ></div>
                  </div>
                  
                  {canGetReward ? (
                    <div className="text-sm text-green-700">
                      <p className="font-medium">✅ 개인정보 입력이 완료되었습니다!</p>
                      <p className="text-xs mt-1 mb-4">개인정보를 완성하고 <span className="font-bold">Pro 등급</span>으로 업그레이드하세요!</p>
                      
                      {/* 등급 업그레이드 버튼 */}
                      <button
                        onClick={handleUpgrade}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                      >
                        <span className="text-lg">🚀</span>
                        <span>Pro 등급으로 업그레이드</span>
                        <span className="text-lg">⭐</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">개인정보를 완성하고 PRO 등급으로 업그레이드하세요!</p>
                      <p className="text-xs mt-1">전화번호, 주소, 학교 정보를 모두 입력하면 <span className="font-bold">Pro 등급</span>으로 업그레이드할 수 있습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">👤 개인정보</h3>
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  편집
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleCancel}
                    className="text-gray-600 hover:text-gray-800 font-medium text-sm px-3 py-1 rounded border"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    className="bg-blue-600 text-white font-medium text-sm px-3 py-1 rounded hover:bg-blue-700"
                  >
                    저장
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 이메일 (읽기 전용) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  value={internalUser.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                />
              </div>

              {/* 이름 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 ${
                    isEditing 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>

              {/* 전화번호 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center">
                  전화번호
                    {internalUser.tier === 'individual' && (
                      <span className="ml-2">
                        {formData.phone && formData.phone.trim() !== '' ? (
                          <span className="text-green-500 text-xs">✓</span>
                        ) : (
                          <span className="text-red-500 text-xs">*</span>
                        )}
                      </span>
                    )}
                  </div>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder={isEditing ? "전화번호를 입력하세요" : ""}
                  className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 ${
                    isEditing 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>

              {/* 학교 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center">
                  학교
                    {internalUser.tier === 'individual' && (
                      <span className="ml-2">
                        {formData.school && formData.school.trim() !== '' ? (
                          <span className="text-green-500 text-xs">✓</span>
                        ) : (
                          <span className="text-red-500 text-xs">*</span>
                        )}
                      </span>
                    )}
                  </div>
                </label>
                <input
                  type="text"
                  name="school"
                  value={formData.school}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder={isEditing ? "학교명을 입력하세요" : ""}
                  className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 ${
                    isEditing 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>

              {/* 주소 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center">
                  주소
                    {internalUser.tier === 'individual' && (
                      <span className="ml-2">
                        {formData.address && formData.address.trim() !== '' ? (
                          <span className="text-green-500 text-xs">✓</span>
                        ) : (
                          <span className="text-red-500 text-xs">*</span>
                        )}
                      </span>
                    )}
                  </div>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder={isEditing ? "주소를 입력하세요" : ""}
                  className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 ${
                    isEditing 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>

              {/* 생년월일 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  생년월일
                </label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 ${
                    isEditing 
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>

              {/* 역할 (읽기 전용) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  역할
                </label>
                <input
                  type="text"
                  value={roleInfo.name}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                />
              </div>
            </div>

            {/* 계정 관리 버튼들 */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">🔐 계정 관리</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-3 px-4 rounded-xl border border-blue-200 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <span>비밀번호 변경</span>
                </button>
                
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-medium py-3 px-4 rounded-xl border border-red-200 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>회원탈퇴</span>
                </button>
              </div>
            </div>
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

      {/* 비밀번호 변경 모달 */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">🔐 비밀번호 변경</h3>
              <button
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  현재 비밀번호
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="현재 비밀번호를 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="새 비밀번호를 입력하세요 (6자 이상)"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="새 비밀번호를 다시 입력하세요"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-all duration-200"
              >
                취소
              </button>
              <button
                onClick={handlePasswordChange}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200"
              >
                변경하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 회원탈퇴 확인 모달 */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">⚠️ 회원탈퇴</h3>
              <p className="text-gray-600 text-sm">
                회원탈퇴를 진행하시겠습니까?<br />
                이 작업은 되돌릴 수 없습니다.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                확인을 위해 "탈퇴"를 입력하세요
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="탈퇴"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-all duration-200"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== '탈퇴'}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-all duration-200"
              >
                탈퇴하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 