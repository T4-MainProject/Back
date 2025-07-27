import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const links = [
  { name: '서비스 소개', icon: '🚀', href: '#' },
  { name: '공지사항', icon: '📢', href: '#' },
  { name: '사용자 게시판', icon: '💬', href: '#' },
  { name: '서비스 문의', icon: '📞', href: '#' }
];

export default function NavBar() {
  const [activeLink, setActiveLink] = useState(0);
  const navRef = useRef(null);
  const linksRef = useRef([]);

  useEffect(() => {
    // 네비게이션 바 전체 애니메이션
    gsap.fromTo(navRef.current,
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.2 }
    );

    // 링크들 순차 애니메이션
    gsap.fromTo(linksRef.current,
      { y: 50, opacity: 0, scale: 0.8 },
      { 
        y: 0, 
        opacity: 1, 
        scale: 1,
        duration: 0.6,
        stagger: 0.1,
        ease: "back.out(1.7)",
        delay: 0.5
      }
    );
  }, []);

  const handleLinkClick = (index) => {
    setActiveLink(index);
    
    // 클릭 애니메이션
    gsap.to(linksRef.current[index], {
      scale: 1.1,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut"
    });
  };

  return (
    <nav 
      ref={navRef}
      className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-16 z-40 shadow-sm"
    >
      <div className="container mx-auto px-4">
        <div className="flex space-x-2 py-3 overflow-x-auto scrollbar-hide">
          {links.map((link, index) => (
            <button
              key={link.name}
              ref={el => linksRef.current[index] = el}
              onClick={() => handleLinkClick(index)}
              className={`
                relative flex items-center space-x-3 px-6 py-3 rounded-2xl font-medium 
                transition-all duration-300 whitespace-nowrap group min-w-fit
                ${activeLink === index 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25 transform scale-105' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:shadow-md'
                }
              `}
            >
              <span className={`text-xl transition-all duration-300 ${
                activeLink === index ? 'scale-110 drop-shadow-lg' : 'group-hover:scale-110'
              }`}>
                {link.icon}
              </span>
              <span className="font-semibold">{link.name}</span>
              
              {/* 활성 상태 글로우 효과 */}
              {activeLink === index && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-30 -z-10 animate-pulse"></div>
              )}

              {/* 호버 파티클 효과 */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ${
                  activeLink !== index ? 'opacity-100' : 'opacity-0'
                }`}></div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}