// ============================================
// 수정된 Home.jsx - 기존 컴포넌트들 활용 + React Router 네비게이션 + 모달 상태 관리
// ============================================
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';

// 기존 컴포넌트들 활용
import TopBar from '../components/TopBar';
import AppHeader from '../components/AppHeader';
import Hero from '../components/Hero';
import FeatureExplanation from '../components/FeatureExplanation'; // 기존 컴포넌트 사용
import Footer from '../components/Footer';

// 모달 컴포넌트들
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import MyPageModal from '../components/MyPageModal';

// 더미 데이터 및 유틸리티
import { storageUtils, authAPI } from '../services/api';
import NotificationModal from '../components/NotificationModal';

export default function Home() {
  // 🧭 React Router 네비게이션 훅
  const navigate = useNavigate();
  
  // 🔐 모달 상태 관리
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [isMyPageModalOpen, setIsMyPageModalOpen] = useState(false);
  
  // 👤 로그인 상태 관리
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 📢 알림 모달 상태
  const [notification, setNotification] = useState({
    isOpen: false,
    type: 'warning',
    title: '',
    message: '',
    showCancel: false,
    onConfirm: null
  });

  // 📤 업로드 페이지로 이동 함수 (로그인 체크 포함)
  const handleNavigateToUpload = () => {
    // 로그인 상태 확인
    if (!currentUser) {
      // 로그인이 안 되어 있으면 알림 표시 후 로그인 모달 열기
      setNotification({
        isOpen: true,
        type: 'warning',
        title: '로그인 필요',
        message: '로그인 후에 사용해주세요! 🔐'
      });
      setIsLoginModalOpen(true);
      return;
    }  
    
    // 로그인이 되어 있으면 업로드 페이지로 이동
    navigate('/upload');
  };

  // 🔐 로그인 모달 관리 함수들
  const handleOpenLogin = () => {
    setIsLoginModalOpen(true);
  };

  const handleCloseLogin = () => {
    setIsLoginModalOpen(false);
  };

  const handleOpenSignup = () => {
    setIsSignupModalOpen(true);
  };

  const handleCloseSignup = () => {
    setIsSignupModalOpen(false);
  };

  // 모달 간 전환 함수들
  const handleSwitchToSignup = () => {
    setIsLoginModalOpen(false);
    setIsSignupModalOpen(true);
  };

  const handleSwitchToLogin = () => {
    setIsSignupModalOpen(false);
    setIsLoginModalOpen(true);
  };

  // 👤 로그인 성공 핸들러
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsLoginModalOpen(false);
  };

  // 👥 회원가입 성공 핸들러
  const handleSignupSuccess = (user) => {
    setCurrentUser(user);
    setIsSignupModalOpen(false);
  };

  // 🚪 로그아웃 확인 모달 표시 (AppHeader에서 호출)
  const showLogoutConfirm = () => {
    setNotification({
      isOpen: true,
      type: 'warning',
      title: '로그아웃 확인',
      message: '정말 로그아웃 하시겠습니까?',
      showCancel: true,
      onConfirm: confirmLogout
    });
  };

  // 🚪 실제 로그아웃 실행
  const confirmLogout = () => {
    setCurrentUser(null);
    storageUtils.removeUserFromStorage();
    
    // 로그아웃 성공 모달
    setNotification({
      isOpen: true,
      type: 'success',
      title: '로그아웃 완료',
      message: '성공적으로 로그아웃되었습니다.\n이용해 주셔서 감사합니다!',
      showCancel: false,
      onConfirm: null
    });
  };

  // 📄 마이페이지 핸들러
  const handleOpenMyPage = () => {
    setIsMyPageModalOpen(true);
  };

  const handleCloseMyPage = () => {
    setIsMyPageModalOpen(false);
  };

  // 👤 사용자 정보 업데이트 핸들러
  const handleUserUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
  };

  useEffect(() => {
    // AOS 초기화
    AOS.init({
      duration: 600,
      easing: 'ease-out-cubic',
      once: true,
      offset: 50
    });

    // 로컬 스토리지에서 사용자 정보 확인
    const storedUser = storageUtils.getUserFromStorage();
    if (storedUser) {
      setCurrentUser(storedUser);
    }
    setIsLoading(false);

    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* 최상단 바 */}
      <TopBar />
      
      {/* 헤더 */}
      <AppHeader 
        currentUser={currentUser}
        onOpenLogin={handleOpenLogin}
        onOpenSignup={handleOpenSignup}
        onLogout={confirmLogout}
        onOpenMyPage={handleOpenMyPage}
        onShowLogoutConfirm={showLogoutConfirm}
      />

      {/* 메인 콘텐츠 */}
      <main>
        {/* 히어로 섹션 */}
        <Hero onNext={handleNavigateToUpload} />

        {/* 기능 설명 섹션 (기존 컴포넌트 재사용) */}
        <FeatureExplanation />

        {/* 체험 CTA */}
        <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              🚀 지금 바로 체험해보세요
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              실제 시험지를 업로드하여 AI 자동 채점의 
              <br className="hidden md:block" />
              놀라운 정확성을 직접 확인해보세요
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleNavigateToUpload}
              className="bg-white text-purple-600 px-10 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
            >
              <span className="flex items-center justify-center">
                채점 시작하기
                <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
              
              <button 
                onClick={() => navigate('/upload-test')}
                className="bg-transparent border-2 border-white text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-white hover:text-purple-600 transition-all duration-300 hover:scale-105 group"
              >
                <span className="flex items-center justify-center">
                  🧪 테스트 모드
                  <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
            </div>

            {/* 성능 지표 */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">99.8%</div>
                <div className="text-blue-200 text-sm">정확도</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">2.3초</div>
                <div className="text-blue-200 text-sm">처리시간</div>
              </div>
              <div className="text-center col-span-2 md:col-span-1">
                <div className="text-3xl font-bold mb-2">10K+</div>
                <div className="text-blue-200 text-sm">월 처리량</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 기존 푸터 사용 */}
      <Footer />

      {/* 모달 컴포넌트들 */}
      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={handleCloseLogin}
        onSwitchToSignup={handleSwitchToSignup}
        onLoginSuccess={handleLoginSuccess}
      />
      
      <SignupModal 
        isOpen={isSignupModalOpen}
        onClose={handleCloseSignup}
        onSwitchToLogin={handleSwitchToLogin}
        onSignupSuccess={handleSignupSuccess}
      />

      <MyPageModal 
        isOpen={isMyPageModalOpen}
        onClose={handleCloseMyPage}
        currentUser={currentUser}
        onUserUpdate={handleUserUpdate}
      />

      {/* 알림 모달 */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        showCancel={notification.showCancel}
        confirmText={notification.showCancel ? '로그아웃' : '확인'}
        cancelText="취소"
        onConfirm={notification.onConfirm || (() => setNotification({ ...notification, isOpen: false }))}
        onCancel={() => setNotification({ ...notification, isOpen: false })}
      />
    </div>
  );
}