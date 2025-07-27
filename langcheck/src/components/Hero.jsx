// ============================================
// src/components/Hero.jsx - 수정된 버전 (onNext 추가)
// ============================================
import React, { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Hero({ onNext }) {
  const heroRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const buttonsRef = useRef(null);
  const bgRef = useRef(null);
  const particlesRef = useRef([]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // 배경 패럴랙스 효과
      gsap.to(bgRef.current, {
        yPercent: 30,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      });

      // 메인 텍스트 애니메이션
      const tl = gsap.timeline();
      
      tl.fromTo(titleRef.current, 
        { 
          y: 100, 
          opacity: 0, 
          scale: 0.8,
          rotationX: -90 
        },
        { 
          y: 0, 
          opacity: 1, 
          scale: 1,
          rotationX: 0,
          duration: 1.2, 
          ease: "power3.out" 
        }
      )
      .fromTo(subtitleRef.current,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" },
        "-=0.5"
      )
      .fromTo(buttonsRef.current,
        { y: 30, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" },
        "-=0.3"
      );

      // 파티클 애니메이션
      particlesRef.current.forEach((particle, index) => {
        if (particle) {
          gsap.to(particle, {
            y: "random(-20, 20)",
            x: "random(-20, 20)",
            rotation: "random(-180, 180)",
            duration: "random(2, 4)",
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: index * 0.1
          });
        }
      });

    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={heroRef}
      className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden flex items-center"
    >
      {/* 배경 요소들 */}
      <div ref={bgRef} className="absolute inset-0 overflow-hidden">
        {/* 그라데이션 블러 */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-400/10 to-cyan-400/10 rounded-full blur-3xl"></div>
        
        {/* 떠다니는 파티클들 */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            ref={el => particlesRef.current[i] = el}
            className={`absolute w-4 h-4 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full opacity-20 blur-sm`}
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
          ></div>
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center min-h-screen py-20">
          {/* 텍스트 콘텐츠 */}
          <div className="flex-1 lg:pr-12 text-center lg:text-left">
            {/* 배지 */}
            <div 
              data-aos="fade-down" 
              data-aos-delay="100"
              className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 text-blue-800 px-6 py-3 rounded-full text-sm font-semibold mb-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <div className="relative">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="absolute inset-0 w-2 h-2 bg-blue-500 rounded-full animate-ping opacity-75"></div>
              </div>
              <span>🤖 AI 자동 채점 시스템</span>
              <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                NEW
              </span>
            </div>
            
            {/* 메인 타이틀 */}
            <h1 
              ref={titleRef}
              className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-6"
            >
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-2xl">
                AI 기반
              </span>
              <br />
              <span className="text-gray-900">
                똑똑한 채점,
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                더 나은 교육
              </span>
            </h1>
            
            {/* 서브타이틀 */}
            <p 
              ref={subtitleRef}
              className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto lg:mx-0"
            >
              <span className="font-semibold text-blue-600">YOLO8 객체 인식</span>, 
              <span className="font-semibold text-purple-600"> OCR 텍스트 추출</span>, 
              <span className="font-semibold text-pink-600"> GPT 해설 생성</span>이 
              결합된 차세대 자동 채점 솔루션
            </p>

            {/* 버튼들 */}
            <div 
              ref={buttonsRef}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12"
            >
              <button 
                onClick={onNext}
                className="group bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-purple-700 relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center">
                  무료로 시작하기
                  <svg className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </button>
            </div>

            {/* 통계 */}
            <div 
              data-aos="fade-up" 
              data-aos-delay="400"
              className="grid grid-cols-3 gap-8 pt-8 border-t border-gray-200"
            >
              <div className="text-center group">
                <div className="text-3xl font-black bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                  99.8%
                </div>
                <div className="text-sm text-gray-600 font-medium">정확도</div>
              </div>
              <div className="text-center group">
                <div className="text-3xl font-black bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                  2.3초
                </div>
                <div className="text-sm text-gray-600 font-medium">평균 처리시간</div>
              </div>
              <div className="text-center group">
                <div className="text-3xl font-black bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                  10K+
                </div>
                <div className="text-sm text-gray-600 font-medium">월 처리량</div>
              </div>
            </div>
          </div>

          {/* 오른쪽 일러스트레이션 */}
          <div className="flex-1 lg:pl-12 mt-12 lg:mt-0">
            <div 
              data-aos="fade-left" 
              data-aos-delay="200"
              className="relative"
            >
              {/* 메인 카드 */}
              <div className="bg-white p-8 rounded-3xl shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-700 hover:scale-105 border border-gray-100 relative overflow-hidden">
                {/* 카드 내부 글로우 */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-3xl"></div>
                
                <div className="relative z-10">
                  {/* 브라우저 헤더 */}
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <div className="flex-1 bg-gray-100 h-6 rounded-full ml-4"></div>
                  </div>
                  
                  {/* 콘텐츠 */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-gradient-to-r from-blue-200 to-blue-300 rounded-lg w-3/4 animate-pulse"></div>
                      <div className="h-4 bg-gradient-to-r from-purple-200 to-purple-300 rounded-lg w-1/2 animate-pulse"></div>
                      <div className="h-4 bg-gradient-to-r from-pink-200 to-pink-300 rounded-lg w-2/3 animate-pulse"></div>
                    </div>
                    
                    {/* 결과 카드 */}
                    <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-2xl shadow-lg border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-green-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          채점 완료
                        </span>
                        <span className="text-xs text-gray-500">2.1초</span>
                      </div>
                      <div className="text-4xl font-black bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                        95점
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        20문제 중 19문제 정답
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 부유하는 요소들 */}
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl animate-bounce">
                <span className="text-white text-2xl">🎯</span>
              </div>
              
              <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl animate-pulse">
                <span className="text-white text-2xl">📝</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}