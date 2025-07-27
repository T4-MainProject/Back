// ============================================
// src/components/FeatureExplanation.jsx
// ============================================
import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const features = [
  { 
    icon: '🎯', 
    title: 'YOLO8 객체 인식', 
    description: '시험지에서 문제/정답란 영역 자동 탐지로 정확한 영역 분석', 
    accent: 'from-green-400 to-blue-500',
    bgColor: 'from-green-50 to-blue-50'
  },
  { 
    icon: '🔤', 
    title: 'OCR 텍스트 추출', 
    description: 'Vision OCR로 답안 텍스트 정확히 추출하여 디지털화', 
    accent: 'from-blue-400 to-purple-500',
    bgColor: 'from-blue-50 to-purple-50'
  },
  { 
    icon: '🧠', 
    title: 'GPT 해설 생성', 
    description: '오답 단계별 해설 및 개인 맞춤형 피드백 자동 제공', 
    accent: 'from-purple-400 to-pink-500',
    bgColor: 'from-purple-50 to-pink-50'
  },
];

export default function FeatureExplanation() {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // 카드들 순차 애니메이션
      cardsRef.current.forEach((card, index) => {
        if (card) {
          gsap.fromTo(card, 
            { 
              y: 100, 
              opacity: 0, 
              scale: 0.8,
              rotationY: -45
            },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              rotationY: 0,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: {
                trigger: card,
                start: "top 80%",
                end: "bottom 20%",
                toggleActions: "play none none reverse"
              },
              delay: index * 0.2
            }
          );

          // 호버 애니메이션
          card.addEventListener('mouseenter', () => {
            gsap.to(card, {
              y: -10,
              scale: 1.05,
              duration: 0.3,
              ease: "power2.out"
            });
          });

          card.addEventListener('mouseleave', () => {
            gsap.to(card, {
              y: 0,
              scale: 1,
              duration: 0.3,
              ease: "power2.out"
            });
          });
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        {/* 헤더 */}
        <div className="text-center mb-16" data-aos="fade-up">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-6 py-3 rounded-full text-sm font-bold mb-6 shadow-lg">
            <span>🚀</span>
            <span>핵심 기술</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
            AI 기술의 
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> 완벽한 조합</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            최첨단 인공지능 기술들이 유기적으로 결합되어 <br className="hidden md:block" />
            정확하고 빠른 자동 채점 서비스를 제공합니다
          </p>
        </div>

        {/* 기능 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <div 
              key={index}
              ref={el => cardsRef.current[index] = el}
              data-aos="fade-up" 
              data-aos-delay={index * 200}
              className={`relative group p-8 rounded-3xl bg-gradient-to-br ${feature.bgColor} border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden`}
            >
              {/* 배경 글로우 */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-3xl`}></div>
              
              {/* 아이콘 */}
              <div className="relative z-10 text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <span className="text-4xl">{feature.icon}</span>
                </div>
              </div>
              
              {/* 콘텐츠 */}
              <div className="relative z-10 text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                  {feature.description}
                </p>
              </div>

              {/* 하단 액센트 */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.accent} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>
            </div>
          ))}
        </div>

        {/* 프로세스 플로우 */}
        <div className="mt-20 pt-16 border-t border-gray-100" data-aos="fade-up" data-aos-delay="600">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">3단계</span> 
              처리 과정
            </h3>
            <p className="text-gray-600 text-lg">간단하고 빠른 자동 채점 프로세스</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-center space-y-8 md:space-y-0 md:space-x-12">
            {[
              { step: 1, title: '이미지 업로드', desc: '시험지 사진 촬영', icon: '📤', color: 'green' },
              { step: 2, title: 'AI 분석', desc: '자동 인식 및 채점', icon: '🤖', color: 'blue' },
              { step: 3, title: '결과 제공', desc: '점수 및 해설 확인', icon: '📊', color: 'purple' }
            ].map((process, index) => (
              <div key={index} className="flex flex-col items-center relative">
                <div className={`w-16 h-16 bg-gradient-to-br from-${process.color}-400 to-${process.color}-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl mb-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110`}>
                  {process.step}
                </div>
                
                <div className="text-center mb-4">
                  <div className="text-3xl mb-2">{process.icon}</div>
                  <h4 className="font-bold text-gray-900 text-lg">{process.title}</h4>
                  <p className="text-gray-600 text-sm">{process.desc}</p>
                </div>

                {/* 화살표 (마지막 제외) */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-full text-gray-300 transform translate-x-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
