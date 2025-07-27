// ============================================
// src/components/AppHeader.jsx - 실시간 알림 시스템 추가 버전
// ============================================
import React, { useState, useEffect } from 'react';
import NotificationCenter from './NotificationCenter';

export default function AppHeader({ currentUser, onOpenLogin, onOpenSignup, onLogout, onOpenMyPage, onShowLogoutConfirm }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // 🎨 활성 버튼 상태 관리 (어떤 모달이 열려있는지)
  const [activeButton, setActiveButton] = useState(null); // 'login' | 'signup' | null
  
  // 🎨 버튼 클릭 상태 관리 (클릭 애니메이션용)
  const [clickedButtons, setClickedButtons] = useState({
    login: false,
    signup: false,
    mypage: false
  });



  const handleLogin = () => {
    // 클릭 효과 적용
    setClickedButtons(prev => ({ ...prev, login: true }));
    setTimeout(() => {
      setClickedButtons(prev => ({ ...prev, login: false }));
    }, 200);
    
    // 활성 버튼 설정
    setActiveButton('login');
    
    // 로그인 모달 열기
    if (onOpenLogin) {
      onOpenLogin();
    }
  };

  const handleSignup = () => {
    // 클릭 효과 적용
    setClickedButtons(prev => ({ ...prev, signup: true }));
    setTimeout(() => {
      setClickedButtons(prev => ({ ...prev, signup: false }));
    }, 200);
    
    // 활성 버튼 설정
    setActiveButton('signup');
    
    // 회원가입 모달 열기
    if (onOpenSignup) {
      onOpenSignup();
    }
  };

  const handleLogout = () => {
    // 로그아웃 확인 모달 표시 (부모 컴포넌트에서 처리)
    setActiveButton(null); // 활성 상태 초기화
    if (onShowLogoutConfirm) {
      onShowLogoutConfirm();
    }
  };

  const handleMyPage = () => {
    // 클릭 효과 적용
    setClickedButtons(prev => ({ ...prev, mypage: true }));
    setTimeout(() => {
      setClickedButtons(prev => ({ ...prev, mypage: false }));
    }, 200);
    
    // 마이페이지 열기
    if (onOpenMyPage) {
      onOpenMyPage();
    }
  };

  // 모달이 닫힐 때 활성 상태 해제를 위한 효과
  useEffect(() => {
    // 로그인 상태가 변경되면 활성 버튼 초기화
    if (currentUser) {
      setActiveButton(null);
    }
  }, [currentUser]);

  // 기본 아바타 이미지 처리
  const getAvatarSrc = (avatar) => {
    if (!avatar) {
      return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM5Q0E0QUIiLz4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxMiIgcj0iNiIgZmlsbD0iI0ZGRkZGRiIvPgo8cGF0aCBkPSJNNCAxNmMwIDYuNjI3IDUuMzczIDEyIDEyIDEyczEyLTUuMzczIDEyLTEyYzAtMS4xMDQtLjE1LTIuMTcyLS40MzItMy4xODNDMjUuNDggMTguNDk1IDIxLjI0NiAyMiAxNiAyMnMtOS40OC0zLjUwNS0xMS41NjgtOC4xODNBMTEuOTI1IDExLjkyNSAwIDAgMCA0IDE2eiIgZmlsbD0iI0ZGRkZGRiIvPgo8L3N2Zz4K";
    }
    return avatar;
  };

  // 사용자 역할 텍스트 변환
  const getRoleText = (role) => {
    switch(role) {
      case 'admin': return '관리자';
      case 'teacher': return '선생님';
      case 'student': return '학생';
      case 'parent': return '학부모';
      default: return '사용자';
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between py-4 px-4 lg:px-6">
        {/* 로고 영역 */}
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
          </div>
          
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              LangCheck
            </h1>
            <p className="text-xs text-gray-500 font-medium tracking-wide">
              AI 자동 채점 시스템
            </p>
          </div>
        </div>

        {/* 우측 상태 표시기 - 데스크탑 */}
        <div className="hidden lg:flex items-center space-x-6 flex-1 justify-end mr-8">
          <div className="flex items-center space-x-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 px-4 py-2 rounded-full">
            <div className="relative">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-40"></div>
            </div>
            <span className="text-sm font-medium text-green-700">서비스 운영중</span>
          </div>
          
          <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
            <span className="font-medium">정확도</span>
            <span className="ml-2 text-blue-600 font-bold">99.8%</span>
          </div>
        </div>

        {/* 우측 버튼들 */}
        <div className="flex items-center space-x-4">
          {/* 데스크탑 버튼들 */}
          <div className="hidden md:flex items-center space-x-3">
            {currentUser ? (
              // 로그인된 상태
              <>
                {/* 실시간 알림 센터 */}
                <NotificationCenter />

                {/* 사용자 정보 */}
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200">
                    <img 
                      src={getAvatarSrc(currentUser.avatar)} 
                      alt={currentUser.name || '사용자'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM5Q0E0QUIiLz4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxMiIgcj0iNiIgZmlsbD0iI0ZGRkZGRiIvPgo8cGF0aCBkPSJNNCAxNmMwIDYuNjI3IDUuMzczIDEyIDEyIDEyczEyLTUuMzczIDEyLTEyYzAtMS4xMDQtLjE1LTIuMTcyLS40MzItMy4xODNDMjUuNDggMTguNDk1IDIxLjI0NiAyMiAxNiAyMnMtOS40OC0zLjUwNS0xMS41NjgtOC4xODNBMTEuOTI1IDExLjkyNSAwIDAgMCA0IDE2eiIgZmlsbD0iI0ZGRkZGRiIvPgo8L3N2Zz4K";
                      }}
                    />
                  </div>
                  <div className="text-gray-700">
                    <span className="font-medium">{currentUser.name || '사용자'}</span>
                    <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                      {getRoleText(currentUser.role)}
                    </span>
                  </div>
                </div>

                {/* 마이페이지 버튼 */}
                <button
                  onClick={handleMyPage}
                  className={`font-medium px-4 py-2 rounded-lg transition-all duration-200 relative group ${
                    clickedButtons.mypage 
                      ? 'text-purple-800 bg-purple-200 transform scale-95' 
                      : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                >
                  마이페이지
                  <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-purple-600 group-hover:w-full transition-all duration-300"></span>
                </button>
                
                {/* 로그아웃 버튼 */}
                <button
                  onClick={handleLogout}
                  className="bg-gradient-to-r from-gray-600 to-gray-700 text-white font-medium px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 relative overflow-hidden group"
                >
                  <span className="relative z-10">로그아웃</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                </button>
              </>
            ) : (
              // 로그인되지 않은 상태
              <>
                <button
                  onClick={handleLogin}
                  className={`font-medium px-6 py-3 rounded-xl transition-all duration-300 border-2 relative overflow-hidden ${
                    activeButton === 'login'
                      ? 'bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 border-purple-500 text-white shadow-lg shadow-purple-500/30'
                      : clickedButtons.login 
                      ? 'bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 border-purple-500 text-white transform scale-95 shadow-lg shadow-purple-500/30'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gradient-to-r hover:from-purple-600 hover:via-violet-600 hover:to-indigo-600 hover:border-purple-500 hover:text-white hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30'
                  }`}
                >
                  {(activeButton === 'login' || clickedButtons.login) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 via-violet-400/20 to-indigo-400/20 animate-pulse"></div>
                  )}
                  <span className="relative z-10">로그인</span>
                </button>
                
                <button
                  onClick={handleSignup}
                  className={`font-medium px-6 py-3 rounded-xl transition-all duration-300 border-2 relative overflow-hidden ${
                    activeButton === 'signup'
                      ? 'bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 border-purple-500 text-white shadow-lg shadow-purple-500/30'
                      : clickedButtons.signup 
                      ? 'bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 border-purple-500 text-white transform scale-95 shadow-lg shadow-purple-500/30'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gradient-to-r hover:from-purple-600 hover:via-violet-600 hover:to-indigo-600 hover:border-purple-500 hover:text-white hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30'
                  }`}
                >
                  {(activeButton === 'signup' || clickedButtons.signup) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 via-violet-400/20 to-indigo-400/20 animate-pulse"></div>
                  )}
                  <span className="relative z-10">회원가입</span>
                </button>
              </>
            )}
          </div>

          {/* 모바일 메뉴 버튼 */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            aria-label="메뉴 토글"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-4 px-4 shadow-lg">
          {/* 모바일 상태 표시 */}
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg mb-4">
            <div className="relative">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-30"></div>
            </div>
            <span className="text-sm text-green-700 font-medium">서비스 운영중</span>
            <span className="text-xs text-gray-500 ml-auto">정확도 99.8%</span>
          </div>
          
          {currentUser ? (
            // 로그인된 상태 - 모바일
            <div className="space-y-4">
              {/* 모바일 알림 센터 */}
              <div className="flex justify-center">
                <NotificationCenter />
              </div>

              {/* 사용자 정보 */}
              <div className="flex items-center space-x-3 bg-gray-50 px-4 py-3 rounded-lg">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
                  <img 
                    src={getAvatarSrc(currentUser.avatar)} 
                    alt={currentUser.name || '사용자'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM5Q0E0QUIiLz4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxMiIgcj0iNiIgZmlsbD0iI0ZGRkZGRiIvPgo8cGF0aCBkPSJNNCAxNmMwIDYuNjI3IDUuMzczIDEyIDEyIDEyczEyLTUuMzczIDEyLTEyYzAtMS4xMDQtLjE1LTIuMTcyLS40MzItMy4xODNDMjUuNDggMTguNDk1IDIxLjI0NiAyMiAxNiAyMnMtOS40OC0zLjUwNS0xMS41NjgtOC4xODNBMTEuOTI1IDExLjkyNSAwIDAgMCA0IDE2eiIgZmlsbD0iI0ZGRkZGRiIvPgo8L3N2Zz4K";
                    }}
                  />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{currentUser.name || '사용자'}</div>
                  <div className="text-sm text-gray-500">
                    {getRoleText(currentUser.role)}
                  </div>
                </div>
              </div>

              {/* 모바일 버튼들 */}
              <div className="space-y-3">
                <button
                  onClick={handleMyPage}
                  className={`w-full text-left font-medium py-3 px-4 rounded-lg transition-all duration-200 ${
                    clickedButtons.mypage 
                      ? 'text-purple-800 bg-purple-200 transform scale-95' 
                      : 'text-gray-700 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                >
                  마이페이지
                </button>
                
                <button
                  onClick={handleLogout}
                  className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white font-medium py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                >
                  로그아웃
                </button>
              </div>
            </div>
          ) : (
            // 로그인되지 않은 상태 - 모바일
            <div className="space-y-3">
              <button
                onClick={handleLogin}
                className={`w-full font-medium py-3 px-4 rounded-xl transition-all duration-300 border-2 relative overflow-hidden ${
                  activeButton === 'login'
                    ? 'bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 border-purple-500 text-white shadow-lg shadow-purple-500/30'
                    : clickedButtons.login 
                    ? 'bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 border-purple-500 text-white transform scale-95 shadow-lg shadow-purple-500/30'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gradient-to-r hover:from-purple-600 hover:via-violet-600 hover:to-indigo-600 hover:border-purple-500 hover:text-white hover:shadow-lg hover:shadow-purple-500/30'
                }`}
              >
                {(activeButton === 'login' || clickedButtons.login) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 via-violet-400/20 to-indigo-400/20 animate-pulse"></div>
                )}
                <span className="relative z-10">로그인</span>
              </button>
              
              <button
                onClick={handleSignup}
                className={`w-full font-medium py-3 px-4 rounded-xl transition-all duration-300 border-2 relative overflow-hidden ${
                  activeButton === 'signup'
                    ? 'bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 border-purple-500 text-white shadow-lg shadow-purple-500/30'
                    : clickedButtons.signup 
                    ? 'bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 border-purple-500 text-white transform scale-95 shadow-lg shadow-purple-500/30'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gradient-to-r hover:from-purple-600 hover:via-violet-600 hover:to-indigo-600 hover:border-purple-500 hover:text-white hover:shadow-lg hover:shadow-purple-500/30'
                }`}
              >
                {(activeButton === 'signup' || clickedButtons.signup) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 via-violet-400/20 to-indigo-400/20 animate-pulse"></div>
                )}
                <span className="relative z-10">회원가입</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}