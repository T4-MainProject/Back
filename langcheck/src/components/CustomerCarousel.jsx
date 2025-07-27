// ============================================
// src/components/CustomerCarousel.jsx
// ============================================
import React, { useLayoutEffect, useRef } from 'react';
import Slider from 'react-slick';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

gsap.registerPlugin(ScrollTrigger);

const customers = [
  {
    name: '서울대학교',
    logo: 'https://via.placeholder.com/200x80/3B82F6/FFFFFF?text=서울대학교',
    category: '대학교',
    testimonial: '정확한 채점으로 교수님들의 업무 효율성이 크게 향상되었습니다.',
    usage: '월 15,000장 처리',
    satisfaction: '98%'
  },
  {
    name: '강남구청 교육지원청',
    logo: 'https://via.placeholder.com/200x80/10B981/FFFFFF?text=강남구청',
    category: '교육청',
    testimonial: '지역 내 모든 학교에서 만족스럽게 사용하고 있습니다.',
    usage: '월 25,000장 처리',
    satisfaction: '96%'
  },
  {
    name: '메가스터디 교육',
    logo: 'https://via.placeholder.com/200x80/8B5CF6/FFFFFF?text=메가스터디',
    category: '교육기업',
    testimonial: '학생들의 학습 효과를 극대화할 수 있는 최고의 도구입니다.',
    usage: '월 40,000장 처리',
    satisfaction: '99%'
  },
  {
    name: '와이즈만 영재교육',
    logo: 'https://via.placeholder.com/200x80/F59E0B/FFFFFF?text=와이즈만',
    category: '영재교육',
    testimonial: '복잡한 수학 문제도 정확하게 채점해주어 매우 만족합니다.',
    usage: '월 8,500장 처리',
    satisfaction: '97%'
  },
  {
    name: '대치동 수학학원',
    logo: 'https://via.placeholder.com/200x80/EF4444/FFFFFF?text=대치학원',
    category: '학원',
    testimonial: '선생님들의 채점 부담이 줄어 수업 준비에 더 집중할 수 있습니다.',
    usage: '월 12,000장 처리',
    satisfaction: '95%'
  },
  {
    name: '경기도교육청',
    logo: 'https://via.placeholder.com/200x80/06B6D4/FFFFFF?text=경기교육청',
    category: '교육청',
    testimonial: '도내 전체 학교의 평가 시스템이 한층 업그레이드되었습니다.',
    usage: '월 60,000장 처리',
    satisfaction: '98%'
  }
];

// 커스텀 화살표 컴포넌트
const CustomArrow = ({ className, style, onClick, direction }) => (
  <div
    className={`${className} !w-12 !h-12 !bg-white !rounded-full !shadow-lg hover:!shadow-xl !flex !items-center !justify-center !transition-all !duration-300 hover:!scale-110 !z-10 border-2 border-gray-200 hover:border-blue-400`}
    style={{ ...style, display: 'flex' }}
    onClick={onClick}
  >
    <svg 
      className="w-6 h-6 text-gray-600 hover:text-blue-600 transition-colors duration-200" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      {direction === 'next' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      )}
    </svg>
  </div>
);

export default function CustomerCarousel() {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const carouselRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // 제목 애니메이션
      gsap.fromTo(titleRef.current,
        {
          y: 50,
          opacity: 0
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            toggleActions: "play none none reverse"
          }
        }
      );

      // 캐러셀 애니메이션
      gsap.fromTo(carouselRef.current,
        {
          y: 30,
          opacity: 0
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
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

  const settings = {
    dots: true,
    infinite: true,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    pauseOnHover: true,
    nextArrow: <CustomArrow direction="next" />,
    prevArrow: <CustomArrow direction="prev" />,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          arrows: false
        }
      }
    ],
    customPaging: (i) => (
      <div className="w-3 h-3 bg-gray-300 rounded-full hover:bg-blue-500 transition-colors duration-200 mt-4"></div>
    ),
    dotsClass: "slick-dots !flex !justify-center !space-x-2"
  };

  const getCategoryColor = (category) => {
    const colors = {
      '대학교': 'bg-blue-100 text-blue-700',
      '교육청': 'bg-green-100 text-green-700',
      '교육기업': 'bg-purple-100 text-purple-700',
      '영재교육': 'bg-orange-100 text-orange-700',
      '학원': 'bg-red-100 text-red-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <section ref={sectionRef} className="py-20 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      <div className="container mx-auto px-4">
        {/* 헤더 */}
        <div ref={titleRef} className="text-center mb-16" data-aos="fade-up">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 px-6 py-3 rounded-full text-sm font-bold mb-6 shadow-lg">
            <span>🏆</span>
            <span>신뢰받는 파트너</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
            <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">1,000+</span> 
            교육기관이
            <br className="hidden sm:block" />
            LangCheck을 선택한 이유
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            전국의 학교, 학원, 교육청에서 검증된 AI 자동 채점 시스템으로 
            <br className="hidden md:block" />
            교육의 질을 한층 더 높이고 있습니다
          </p>
        </div>

        {/* 고객사 캐러셀 */}
        <div ref={carouselRef} className="relative">
          <Slider {...settings}>
            {customers.map((customer, index) => (
              <div key={index} className="px-4">
                <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100 group cursor-pointer h-full">
                  {/* 카테고리 배지 */}
                  <div className="flex justify-between items-start mb-6">
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${getCategoryColor(customer.category)}`}>
                      {customer.category}
                    </span>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">만족도</div>
                      <div className="text-2xl font-bold text-green-600">{customer.satisfaction}</div>
                    </div>
                  </div>

                  {/* 로고 */}
                  <div className="text-center mb-6">
                    <div className="relative inline-block group-hover:scale-105 transition-transform duration-300">
                      <img 
                        src={customer.logo} 
                        alt={customer.name}
                        className="h-16 mx-auto rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  </div>

                  {/* 기관명 */}
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-4 group-hover:text-blue-600 transition-colors duration-300">
                    {customer.name}
                  </h3>

                  {/* 사용량 */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 mb-6 border border-blue-200">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-2xl">📊</span>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">처리량</div>
                        <div className="font-bold text-blue-600">{customer.usage}</div>
                      </div>
                    </div>
                  </div>

                  {/* 고객 후기 */}
                  <blockquote className="text-gray-600 text-center italic leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                    "{customer.testimonial}"
                  </blockquote>

                  {/* 별점 표시 */}
                  <div className="flex justify-center mt-6 space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-lg">⭐</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </Slider>
        </div>

        {/* 통계 요약 */}
        <div className="mt-16 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-8 md:p-12 border border-blue-200" data-aos="fade-up" data-aos-delay="400">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              📈 <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">누적 성과</span>
            </h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: '1,247', label: '파트너 교육기관', icon: '🏫', color: 'blue' },
              { number: '2.5M+', label: '누적 채점 수', icon: '📝', color: 'green' },
              { number: '97.8%', label: '평균 만족도', icon: '😊', color: 'purple' },
              { number: '50%', label: '업무 효율 증가', icon: '⚡', color: 'orange' }
            ].map((stat, index) => (
              <div key={index} className="text-center group">
                <div className={`inline-flex items-center justify-center w-16 h-16 bg-${stat.color}-100 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md group-hover:shadow-lg`}>
                  <span className="text-3xl">{stat.icon}</span>
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

        {/* CTA */}
        <div className="text-center mt-12" data-aos="fade-up" data-aos-delay="600">
          <p className="text-gray-600 mb-6">
            당신의 교육기관도 LangCheck과 함께 혁신을 시작해보세요
          </p>
          <button className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <span className="flex items-center justify-center">
              무료 상담 신청
              <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}