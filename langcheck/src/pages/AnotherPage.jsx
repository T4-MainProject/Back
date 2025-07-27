// ============================================
// pages/AnotherPage.jsx
// ============================================
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function AnotherPage({ onBack }) {
  const containerRef = useRef(null);
  const iconRef = useRef(null);
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const buttonsRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline();

    // 페이지 진입 애니메이션
    tl.fromTo(containerRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.5 }
    )
    .fromTo(iconRef.current,
      { 
        scale: 0,
        rotation: -180,
        opacity: 0 
      },
      { 
        scale: 1,
        rotation: 0,
        opacity: 1,
        duration: 0.8,
        ease: "back.out(1.7)"
      }
    )
    .fromTo(titleRef.current,
      { 
        y: 50,
        opacity: 0 
      },
      { 
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: "power2.out"
      },
      "-=0.3"
    )
    .fromTo(descRef.current,
      { 
        y: 30,
        opacity: 0 
      },
      { 
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: "power2.out"
      },
      "-=0.2"
    )
    .fromTo(buttonsRef.current,
      { 
        y: 20,
        opacity: 0 
      },
      { 
        y: 0,
        opacity: 1,
        duration: 0.5,
        ease: "power2.out"
      },
      "-=0.1"
    );

    // 아이콘 무한 애니메이션
    gsap.to(iconRef.current, {
      y: -10,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut"
    });

  }, []);

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4 relative overflow-hidden"
    >
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-xl"></div>
      </div>

      {/* 떠다니는 파티클들 */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full opacity-30 animate-pulse"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        ></div>
      ))}

      <div className="text-center max-w-2xl relative z-10">
        {/* 아이콘 */}
        <div 
          ref={iconRef}
          className="relative inline-block mb-8"
        >
          <div className="w-32 h-32 bg-gradient-to-br from-orange-400 via-red-500 to-pink-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl relative overflow-hidden group">
            <span className="text-white text-6xl relative z-10">🚧</span>
            
            {/* 글로우 효과 */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-300 via-red-400 to-pink-500 rounded-3xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
            
            {/* 반짝이는 효과 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full animate-pulse"></div>
          </div>
          
          {/* 주변 장식 */}
          <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full animate-bounce"></div>
          <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-green-400 rounded-full animate-ping"></div>
        </div>
        
        {/* 제목 */}
        <h1 
          ref={titleRef}
          className="text-4xl md:text-5xl font-black text-gray-900 mb-6"
        >
          <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            준비 중인
          </span>
          <br />
          <span className="text-gray-700">페이지입니다</span>
        </h1>
        
        {/* 설명 */}
        <div ref={descRef}>
          <p className="text-xl text-gray-600 mb-4 leading-relaxed">
            더 나은 사용자 경험을 위해 
            <span className="font-semibold text-blue-600"> 열심히 개발</span> 중입니다.
          </p>
          <p className="text-lg text-gray-500 mb-8">
            곧 만나뵐 수 있도록 최선을 다하겠습니다! 🎯
          </p>
        </div>
        
        {/* 버튼들 */}
        <div ref={buttonsRef} className="space-y-4">
          <button 
            onClick={onBack}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group mb-4"
          >
            <span className="flex items-center justify-center">
              <svg className="mr-2 w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              홈으로 돌아가기
            </span>
          </button>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:border-blue-400 hover:text-blue-600 transition-all duration-300 hover:scale-105 group">
              <span className="flex items-center justify-center">
                <span className="mr-2 text-lg">📧</span>
                업데이트 알림 받기
                <svg className="ml-1 w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
            
            <button className="bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:border-green-400 hover:text-green-600 transition-all duration-300 hover:scale-105 group">
              <span className="flex items-center justify-center">
                <span className="mr-2 text-lg">💬</span>
                문의하기
                <svg className="ml-1 w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.012 8.012 0 01-2.282-.323l-4.367 1.46 1.46-4.367A8.012 8.012 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                </svg>
              </span>
            </button>
          </div>
        </div>

        {/* 진행률 표시 */}
        <div className="mt-12 p-6 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4">개발 진행률</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">UI/UX 디자인</span>
              <span className="text-sm font-bold text-green-600">100%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full" style={{width: '100%'}}></div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">백엔드 개발</span>
              <span className="text-sm font-bold text-blue-600">75%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full" style={{width: '75%'}}></div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">테스트 & 최적화</span>
              <span className="text-sm font-bold text-orange-600">40%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full" style={{width: '40%'}}></div>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mt-4 text-center">
            예상 완료일: <span className="font-semibold text-blue-600">2025년 3월</span>
          </p>
        </div>
      </div>
    </div>
  );
}