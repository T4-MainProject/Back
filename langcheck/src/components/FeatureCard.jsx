// ============================================
// src/components/FeatureCard.jsx
// ============================================
import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

export default function FeatureCard({ 
  icon, 
  title, 
  description, 
  gradient = 'from-blue-400 to-purple-500',
  bgGradient = 'from-blue-50 to-purple-50',
  className = '',
  delay = 0,
  ...props 
}) {
  const cardRef = useRef(null);
  const iconRef = useRef(null);

  useEffect(() => {
    const card = cardRef.current;
    const iconEl = iconRef.current;

    if (!card || !iconEl) return;

    // 초기 진입 애니메이션
    gsap.fromTo(card, 
      { 
        y: 50, 
        opacity: 0, 
        scale: 0.9 
      },
      { 
        y: 0, 
        opacity: 1, 
        scale: 1, 
        duration: 0.8, 
        ease: "power3.out",
        delay: delay 
      }
    );

    // 호버 애니메이션 설정
    const handleMouseEnter = () => {
      gsap.to(card, {
        y: -8,
        scale: 1.03,
        duration: 0.3,
        ease: "power2.out"
      });

      gsap.to(iconEl, {
        scale: 1.15,
        rotation: 8,
        duration: 0.3,
        ease: "back.out(1.7)"
      });
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        y: 0,
        scale: 1,
        duration: 0.3,
        ease: "power2.out"
      });

      gsap.to(iconEl, {
        scale: 1,
        rotation: 0,
        duration: 0.3,
        ease: "power2.out"
      });
    };

    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [delay]);

  return (
    <div 
      ref={cardRef}
      className={`
        bg-gradient-to-br ${bgGradient} p-8 rounded-3xl shadow-lg hover:shadow-2xl 
        border border-white/50 transition-all duration-500 cursor-pointer group 
        relative overflow-hidden ${className}
      `}
      {...props}
    >
      {/* 배경 호버 효과 */}
      <div className={`
        absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 
        group-hover:opacity-10 transition-opacity duration-500 rounded-3xl
      `}></div>
      
      {/* 떠다니는 파티클들 */}
      <div className="absolute top-4 right-4 w-2 h-2 bg-blue-300/30 rounded-full animate-pulse"></div>
      <div className="absolute bottom-6 left-6 w-1 h-1 bg-purple-300/50 rounded-full animate-ping"></div>
      <div className="absolute top-1/2 right-8 w-1.5 h-1.5 bg-pink-300/40 rounded-full animate-bounce"></div>
      
      {/* 아이콘 */}
      <div className="relative z-10 text-center mb-6">
        <div className="relative inline-block">
          <div 
            ref={iconRef}
            className={`
              inline-flex items-center justify-center w-20 h-20 
              bg-white rounded-2xl shadow-lg group-hover:shadow-xl 
              transition-all duration-300 relative z-10
            `}
          >
            <span className="text-4xl">{icon}</span>
          </div>
          
          {/* 아이콘 글로우 효과 */}
          <div className={`
            absolute inset-0 bg-gradient-to-br ${gradient} rounded-2xl 
            blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300
          `}></div>
        </div>
      </div>
      
      {/* 콘텐츠 */}
      <div className="relative z-10 text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">
          {title}
        </h3>
        <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
          {description}
        </p>
      </div>

      {/* 하단 액센트 라인 */}
      <div className={`
        absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} 
        transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 
        origin-left rounded-b-3xl
      `}></div>

      {/* 코너 장식 */}
      <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden rounded-tr-3xl">
        <div className={`
          absolute -top-8 -right-8 w-16 h-16 bg-gradient-to-br ${gradient} 
          rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-300
        `}></div>
      </div>
    </div>
  );
}