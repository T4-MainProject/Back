// ============================================
// src/components/ContentLeft.jsx
// ============================================
import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const updates = [
  {
    type: 'update',
    title: 'AI 모델 성능 대폭 향상',
    date: '2025.01.20',
    content: 'YOLO8 최신 버전 적용으로 객체 인식 정확도가 3.2% 향상되었습니다. 특히 손글씨 인식 능력이 크게 개선되었습니다.',
    icon: '🚀',
    color: 'blue',
    badge: 'NEW'
  },
  {
    type: 'feature',
    title: '배치 채점 기능 정식 출시',
    date: '2025.01.15',
    content: '여러 시험지를 한 번에 업로드하여 일괄 처리할 수 있는 배치 채점 기능이 추가되었습니다. 최대 100장까지 동시 처리 가능합니다.',
    icon: '✨',
    color: 'purple',
    badge: 'HOT'
  },
  {
    type: 'notice',
    title: '신규 해설 템플릿 추가',
    date: '2025.01.10',
    content: '수학, 과학, 언어 과목별 맞춤형 해설 템플릿이 추가되어 더욱 정확하고 상세한 피드백을 제공합니다.',
    icon: '📝',
    color: 'green',
    badge: null
  },
  {
    type: 'maintenance',
    title: '서버 성능 최적화 완료',
    date: '2025.01.05',
    content: '시스템 안정성 향상을 위한 서버 최적화 작업이 완료되어 처리 속도가 평균 15% 향상되었습니다.',
    icon: '⚡',
    color: 'orange',
    badge: null
  }
];

const quickLinks = [
  { title: '사용자 가이드', icon: '📚', desc: '기본 사용법 익히기' },
  { title: '튜토리얼 영상', icon: '🎥', desc: '동영상으로 배우기' },
  { title: '자주 묻는 질문', icon: '❓', desc: 'FAQ 확인하기' },
  { title: '기술 지원', icon: '🛠️', desc: '실시간 도움받기' }
];

export default function ContentLeft() {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);
  const linksRef = useRef([]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // 업데이트 카드들 순차 애니메이션
      gsap.fromTo(cardsRef.current,
        {
          x: -50,
          opacity: 0,
          scale: 0.95
        },
        {
          x: 0,
          opacity: 1,
          scale: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse"
          }
        }
      );

      // 퀵링크 애니메이션
      gsap.fromTo(linksRef.current,
        {
          y: 30,
          opacity: 0
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out",
          delay: 0.3,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse"
          }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
        border: 'border-l-blue-500',
        text: 'text-blue-700',
        badge: 'bg-blue-500'
      },
      purple: {
        bg: 'bg-gradient-to-r from-purple-50 to-pink-50',
        border: 'border-l-purple-500',
        text: 'text-purple-700',
        badge: 'bg-purple-500'
      },
      green: {
        bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
        border: 'border-l-green-500',
        text: 'text-green-700',
        badge: 'bg-green-500'
      },
      orange: {
        bg: 'bg-gradient-to-r from-orange-50 to-yellow-50',
        border: 'border-l-orange-500',
        text: 'text-orange-700',
        badge: 'bg-orange-500'
      }
    };
    return colors[color];
  };

  return (
    <section ref={sectionRef} className="flex-1">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden h-full">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">📢</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  최신 소식 & 업데이트
                </h2>
                <p className="text-gray-600 text-sm">
                  서비스 개선사항과 새로운 기능을 확인하세요
                </p>
              </div>
            </div>
            <button className="bg-white/80 hover:bg-white border border-gray-200 hover:border-blue-300 text-gray-600 hover:text-blue-600 px-4 py-2 rounded-xl font-medium transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md">
              전체보기
            </button>
          </div>
        </div>

        {/* 업데이트 목록 */}
        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          {updates.map((update, index) => {
            const colors = getColorClasses(update.color);
            return (
              <div 
                key={index}
                ref={el => cardsRef.current[index] = el}
                className={`
                  ${colors.bg} ${colors.border}
                  p-5 rounded-2xl border-l-4 hover:shadow-lg transition-all duration-300 
                  cursor-pointer group relative overflow-hidden
                `}
              >
                {/* 배경 호버 효과 */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="flex items-start space-x-4 relative z-10">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <span className="text-2xl">{update.icon}</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                          {update.title}
                        </h3>
                        {update.badge && (
                          <span className={`${colors.badge} text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse`}>
                            {update.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 flex-shrink-0">
                        {update.date}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed group-hover:text-gray-700 transition-colors duration-200">
                      {update.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 퀵 액세스 링크 */}
        <div className="p-6 bg-gray-50 border-t border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center">
            <span className="text-lg mr-2">🔗</span>
            빠른 바로가기
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((link, index) => (
              <button
                key={index}
                ref={el => linksRef.current[index] = el}
                className="flex items-center space-x-3 p-4 bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-xl transition-all duration-300 group border border-gray-200 hover:border-blue-300 hover:shadow-md"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
                  {link.icon}
                </span>
                <div className="text-left">
                  <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200 text-sm">
                    {link.title}
                  </div>
                  <div className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors duration-200">
                    {link.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}