// ============================================
// src/components/Footer.jsx
// ============================================
import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const footerSections = [
  {
    title: '서비스',
    links: [
      { name: 'AI 자동 채점', href: '#' },
      { name: '배치 처리', href: '#' },
      { name: 'API 서비스', href: '#' },
      { name: '교육기관 솔루션', href: '#' }
    ]
  },
  {
    title: '지원',
    links: [
      { name: '사용자 가이드', href: '#' },
      { name: '자주 묻는 질문', href: '#' },
      { name: '기술 지원', href: '#' },
      { name: '문의하기', href: '#' }
    ]
  },
  {
    title: '회사',
    links: [
      { name: '회사 소개', href: '#' },
      { name: '채용 정보', href: '#' },
      { name: '보도자료', href: '#' },
      { name: '파트너십', href: '#' }
    ]
  }
];

const socialLinks = [
  { name: 'Twitter', icon: '🐦', href: '#', color: 'hover:bg-blue-500' },
  { name: 'Facebook', icon: '📘', href: '#', color: 'hover:bg-blue-600' },
  { name: 'Instagram', icon: '📷', href: '#', color: 'hover:bg-pink-500' },
  { name: 'LinkedIn', icon: '💼', href: '#', color: 'hover:bg-blue-700' },
  { name: 'YouTube', icon: '📺', href: '#', color: 'hover:bg-red-500' }
];

export default function Footer() {
  const footerRef = useRef(null);
  const sectionsRef = useRef([]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // 푸터 섹션들 애니메이션
      gsap.fromTo(sectionsRef.current,
        {
          y: 50,
          opacity: 0
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 90%",
            toggleActions: "play none none reverse"
          }
        }
      );
    }, footerRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer ref={footerRef} className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* 회사 정보 */}
          <div 
            ref={el => sectionsRef.current[0] = el}
            className="lg:col-span-2"
          >
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative group">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                  <span className="text-white font-bold text-2xl">L</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  LangCheck
                </h3>
                <p className="text-gray-400 text-sm font-medium tracking-wide">
                  AI POWERED GRADING SYSTEM
                </p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6 leading-relaxed max-w-md">
              첨단 AI 기술로 교육의 미래를 만들어가는 LangCheck. 
              정확하고 빠른 자동 채점으로 더 나은 학습 경험을 제공합니다.
            </p>
            
            {/* 소셜 미디어 */}
            <div className="flex space-x-3 mb-8">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className={`w-12 h-12 bg-gray-700/50 backdrop-blur-sm ${social.color} rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/20 group border border-gray-600 hover:border-transparent`}
                  title={social.name}
                >
                  <span className="text-xl group-hover:scale-110 transition-transform duration-200">
                    {social.icon}
                  </span>
                </a>
              ))}
            </div>

            {/* 연락처 정보 */}
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex items-center space-x-3 group">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-200">
                  <span>📧</span>
                </div>
                <div>
                  <p className="text-gray-300 font-medium">support@langcheck.co.kr</p>
                  <p className="text-xs text-gray-500">고객 지원 이메일</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 group">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center group-hover:bg-green-600 transition-colors duration-200">
                  <span>📞</span>
                </div>
                <div>
                  <p className="text-gray-300 font-medium">02-1234-5678</p>
                  <p className="text-xs text-gray-500">평일 09:00 - 18:00</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 group">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center group-hover:bg-purple-600 transition-colors duration-200">
                  <span>📍</span>
                </div>
                <div>
                  <p className="text-gray-300 font-medium">서울특별시 강남구 테헤란로 123</p>
                  <p className="text-xs text-gray-500">LangCheck 본사</p>
                </div>
              </div>
            </div>
          </div>

          {/* 링크 섹션들 */}
          {footerSections.map((section, index) => (
            <div 
              key={index}
              ref={el => sectionsRef.current[index + 1] = el}
              className="lg:col-span-1"
            >
              <h4 className="text-lg font-bold mb-6 text-white relative">
                {section.title}
                <div className="absolute bottom-0 left-0 w-8 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
              </h4>
              <ul className="space-y-4">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a 
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-all duration-200 hover:translate-x-2 transform inline-block relative group py-1"
                    >
                      <span className="relative z-10">{link.name}</span>
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300"></span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 구분선 */}
        <div className="my-12">
          <div className="h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
        </div>
        
        {/* 하단 정보 */}
        <div 
          ref={el => sectionsRef.current[4] = el}
          className="flex flex-col lg:flex-row justify-between items-center text-sm text-gray-400"
        >
          <div className="space-y-2 lg:space-y-0 text-center lg:text-left mb-6 lg:mb-0">
            <p className="font-medium">© 2025 LangCheck Co., Ltd. All rights reserved.</p>
            <p className="text-xs">
              사업자등록번호: 123-45-67890 | 대표: 김대표 | 통신판매업신고: 2024-서울강남-1234
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center lg:justify-end gap-6">
            <a href="#" className="hover:text-white transition-colors duration-200 relative group">
              <span>이용약관</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400 group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="#" className="hover:text-white transition-colors duration-200 relative group font-semibold">
              <span>개인정보처리방침</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-400 group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="#" className="hover:text-white transition-colors duration-200 relative group">
              <span>쿠키정책</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-green-400 group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="#" className="hover:text-white transition-colors duration-200 relative group">
              <span>사이트맵</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-400 group-hover:w-full transition-all duration-300"></span>
            </a>
          </div>
        </div>

        {/* 인증 마크들 */}
        <div 
          ref={el => sectionsRef.current[5] = el}
          className="mt-12 pt-8 border-t border-gray-700/50 flex flex-wrap justify-center lg:justify-start items-center gap-4 text-xs text-gray-500"
        >
          <div className="flex items-center space-x-2 bg-gray-800/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-700 hover:border-green-500 transition-colors duration-200 group">
            <span className="group-hover:scale-110 transition-transform duration-200">🔒</span>
            <span className="text-gray-300">SSL 보안인증</span>
          </div>
          <div className="flex items-center space-x-2 bg-gray-800/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-700 hover:border-blue-500 transition-colors duration-200 group">
            <span className="group-hover:scale-110 transition-transform duration-200">✅</span>
            <span className="text-gray-300">개인정보보호 인증</span>
          </div>
          <div className="flex items-center space-x-2 bg-gray-800/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-700 hover:border-purple-500 transition-colors duration-200 group">
            <span className="group-hover:scale-110 transition-transform duration-200">🏆</span>
            <span className="text-gray-300">ISO 27001 인증</span>
          </div>
          <div className="flex items-center space-x-2 bg-gray-800/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-700 hover:border-yellow-500 transition-colors duration-200 group">
            <span className="group-hover:scale-110 transition-transform duration-200">🛡️</span>
            <span className="text-gray-300">GDPR 준수</span>
          </div>
        </div>

        {/* 추가 정보 */}
        <div 
          ref={el => sectionsRef.current[6] = el}
          className="mt-8 text-center"
        >
          <p className="text-xs text-gray-500 leading-relaxed max-w-2xl mx-auto">
            LangCheck는 교육 기술의 혁신을 통해 더 나은 학습 환경을 만들어가고 있습니다. 
            우리의 AI 기술이 전 세계 교육자와 학습자들에게 도움이 되기를 바랍니다.
          </p>
          
          <div className="mt-6 flex justify-center items-center space-x-2 text-xs text-gray-600">
            <span>Made with</span>
            <span className="text-red-400 animate-pulse">❤️</span>
            <span>in Seoul, Korea</span>
          </div>
        </div>
      </div>
    </footer>
  );
}