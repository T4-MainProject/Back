import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const features = [
  { 
    icon: '⚡', 
    title: '빠른 처리 속도', 
    description: '평균 2.3초 내 채점 완료로 즉시 결과 확인',
    gradient: 'from-yellow-400 to-orange-500',
    bgGradient: 'from-yellow-50 to-orange-50'
  },
  { 
    icon: '🎯', 
    title: '높은 정확도', 
    description: '99.8% 정확도로 신뢰할 수 있는 채점 결과',
    gradient: 'from-green-400 to-blue-500',
    bgGradient: 'from-green-50 to-blue-50'
  },
  { 
    icon: '📊', 
    title: '상세한 분석', 
    description: '문제별 분석과 학습 패턴 리포트 제공',
    gradient: 'from-blue-400 to-purple-500',
    bgGradient: 'from-blue-50 to-purple-50'
  },
  { 
    icon: '🔒', 
    title: '안전한 보안', 
    description: '개인정보 보호와 데이터 암호화로 안전한 서비스',
    gradient: 'from-purple-400 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50'
  }
];

export default function FeatureList() {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // 카드들 스태거 애니메이션
      gsap.fromTo(cardsRef.current, 
        {
          y: 60,
          opacity: 0,
          scale: 0.8
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            end: 'bottom 20%',
            toggleActions: 'play none none reverse'
          }
        }
      );

      // 개별 카드 호버 애니메이션
      cardsRef.current.forEach((card) => {
        if (card) {
          card.addEventListener('mouseenter', () => {
            gsap.to(card, {
              y: -8,
              scale: 1.03,
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
    <section ref={sectionRef} className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        {/* 헤더 */}
        <div className="text-center mb-16" data-aos="fade-up">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-6 py-3 rounded-full text-sm font-bold mb-6 shadow-lg">
            <span>✨</span>
            <span>핵심 특징</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
            왜 
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"> LangCheck</span>을 
            <br className="hidden sm:block" />
            선택해야 할까요?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            최고의 기술력과 사용자 경험을 바탕으로 한 <br className="hidden md:block" />
            차별화된 자동 채점 서비스를 제공합니다
          </p>
        </div>

        {/* 기능 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              ref={el => cardsRef.current[index] = el}
              className={`relative group p-8 rounded-3xl bg-gradient-to-br ${feature.bgGradient} border border-white/50 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden`}
            >
              {/* 배경 글로우 효과 */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-3xl`}></div>
              
              {/* 아이콘 */}
              <div className="relative z-10 mb-6">
                <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl text-white text-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-12`}>
                  {feature.icon}
                </div>
              </div>
              
              {/* 콘텐츠 */}
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 text-sm leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                  {feature.description}
                </p>
              </div>

              {/* 호버 시 나타나는 액센트 */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
            </div>
          ))}
        </div>

        {/* 추가 통계 섹션 */}
        <div className="mt-20 pt-16 border-t border-gray-200" data-aos="fade-up" data-aos-delay="400">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">실시간</span> 
              서비스 현황
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: '50K+', label: '누적 채점수', icon: '📝', color: 'blue' },
              { number: '99.8%', label: '정확도', icon: '🎯', color: 'green' },
              { number: '2.3초', label: '평균 처리시간', icon: '⚡', color: 'yellow' },
              { number: '1,200+', label: '활성 사용자', icon: '👥', color: 'purple' }
            ].map((stat, index) => (
              <div key={index} className="text-center group">
                <div className={`inline-flex items-center justify-center w-12 h-12 bg-${stat.color}-100 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <span className="text-2xl">{stat.icon}</span>
                </div>
                <div className={`text-3xl font-black text-${stat.color}-600 mb-2 group-hover:scale-110 transition-transform duration-300`}>
                  {stat.number}
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}