// src/components/PricingTable.jsx
import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const plans = [
  { 
    name: 'Individual', 
    price: '무료', 
    period: '/월',
    originalPrice: null,
    features: [
      '일일 시험지 채점 3회',
      '기본 채점 서비스',
      '이메일 지원',
      '제한된 기능 사용'
    ],
    popular: false,
    color: 'amber',
    description: '개인 사용자를 위한 기본 플랜'
  },
  { 
    name: 'PRO', 
    price: '19,900원', 
    period: '/월',
    originalPrice: '29,900원',
    features: [
      '일일 시험지 채점 5회',
      '상세 채점 서비스',
      '오답노트 기능',
      '우선 고객 지원',
      '기타 기능 제한'
    ],
    popular: false,
    color: 'gray',
    description: '학생과 학부모를 위한 프로 플랜'
  },
  { 
    name: 'PRO+', 
    price: '39,900원', 
    period: '/월',
    originalPrice: '49,900원',
    features: [
      '일일 시험지 채점 10회',
      '프리미엄 채점 서비스',
      '오답노트 기능',
      '학습 분석 기능',
      '고급 분석 리포트',
      '기타 기능 제한'
    ],
    popular: true,
    color: 'yellow',
    description: '교사와 소규모 학원을 위한 프로 플러스 플랜'
  },
  { 
    name: 'ULTRA', 
    price: '79,900원', 
    period: '/월',
    originalPrice: '99,900원',
    features: [
      '무제한 시험지 채점',
      'AI 맞춤 분석',
      '오답노트 기능',
      '학습 분석 기능',
      '모든 기능 사용 가능',
      '24/7 전화 지원',
      '전담 계정 매니저'
    ],
    popular: false,
    color: 'blue',
    description: '대규모 교육기관을 위한 울트라 솔루션'
  }
];

export default function PricingTable() {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      cardsRef.current.forEach((card, index) => {
        if (!card) return;

        // 스크롤 트리거 애니메이션
        gsap.fromTo(card,
          { y: 80, opacity: 0, scale: 0.9 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: 'power3.out',
            delay: index * 0.2,
            scrollTrigger: {
              trigger: card,
              start: 'top 90%',
              toggleActions: 'play none none reverse',
            },
          }
        );

        // 호버 애니메이션
        card.addEventListener('mouseenter', () => {
          gsap.to(card, {
            y: -8,
            scale: 1.02,
            duration: 0.3,
            ease: 'power2.out',
          });
        });
        card.addEventListener('mouseleave', () => {
          gsap.to(card, {
            y: 0,
            scale: 1,
            duration: 0.3,
            ease: 'power2.out',
          });
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-16 bg-white">
      <div className="container mx-auto px-4 text-center mb-8">
        <h2 className="text-3xl font-bold">요금제</h2>
        <p className="text-gray-600 mt-2">필요에 맞는 플랜을 선택하세요</p>
      </div>
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, i) => (
          <div
            key={i}
            ref={el => (cardsRef.current[i] = el)}
            className={`bg-white p-6 rounded-lg shadow-md flex flex-col border-t-4 border-${plan.color}-500`}
          >
            {plan.popular && (
              <p className="text-center text-sm text-gray-500 mb-2">
                ✨ 7일 무료 체험 가능
              </p>
            )}
            <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
            <p className="text-2xl font-bold mb-4">
              {plan.price}
              <span className="text-base font-normal">{plan.period}</span>
            </p>
            {plan.originalPrice && (
              <p className="text-sm text-gray-500 line-through mb-4">
                {plan.originalPrice}
              </p>
            )}
            <p className="text-gray-600 mb-4">{plan.description}</p>
            <ul className="mb-6 space-y-2 flex-1">
              {plan.features.map((feat, j) => (
                <li key={j} className="flex items-start space-x-2">
                  <span className="text-primary">•</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
            <button className="mt-auto btn-primary py-2 rounded-md">
              {plan.popular ? '시작하기' : '선택하기'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
