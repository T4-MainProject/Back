import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageUtils } from '../services/api';

export default function LearningAnalysis() {
  const navigate = useNavigate();
  const [selectedChartSubject, setSelectedChartSubject] = useState('과목 전체');
  const [currentUser, setCurrentUser] = useState(null);

  // 🎨 새로운 상태: 개별 과목 표시/숨김 토글
  const [visibleSubjects, setVisibleSubjects] = useState({
    korean: true,
    english: true,
    math: true
  });

  // 🎨 새로운 상태: 선택된 회차들 (오른쪽 바 차트용)
  const [selectedExams, setSelectedExams] = useState(new Set());
  
  // 🎨 새로운 상태: 툴팁 표시용
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // 현재 로그인한 사용자 정보 가져오기
  useEffect(() => {
    const user = storageUtils.getUserFromStorage();
    if (user) {
      setCurrentUser(user);
    } else {
      navigate('/');
    }
  }, [navigate]);

  // 과목 토글 함수
  const toggleSubject = (subject) => {
    setVisibleSubjects(prev => ({
      ...prev,
      [subject]: !prev[subject]
    }));
  };

     // 🎯 회차 선택 함수 (단일 선택)
   const toggleExam = (examIndex) => {
     setSelectedExams(prev => {
       // 이미 선택된 회차를 다시 클릭하면 선택 해제, 아니면 새로운 회차 선택
       if (prev.has(examIndex)) {
         return new Set(); // 선택 해제
       } else {
         return new Set([examIndex]); // 단일 선택
       }
     });
   };

  

  // 더미 성적 데이터
  const scoreData = currentUser?.examHistory?.detailedScores || [
    { exam: '1회', date: '2023-06', examName: '2023년 6월 모의고사', examDate: '2023.06.15', total: 65, korean: 62, english: 68, math: 65 },
    { exam: '2회', date: '2023-08', examName: '2023년 8월 모의고사', examDate: '2023.08.17', total: 68, korean: 65, english: 70, math: 69 },
    { exam: '3회', date: '2023-10', examName: '2023년 10월 모의고사', examDate: '2023.10.12', total: 71, korean: 67, english: 73, math: 73 },
    { exam: '4회', date: '2023-12', examName: '2023년 12월 모의고사', examDate: '2023.12.07', total: 74, korean: 70, english: 76, math: 76 },
    { exam: '5회', date: '2024-02', examName: '2024년 2월 모의고사', examDate: '2024.02.22', total: 78, korean: 75, english: 80, math: 79 },
    { exam: '6회', date: '2024-04', examName: '2024년 4월 모의고사', examDate: '2024.04.11', total: 83, korean: 85, english: 82, math: 82 },
    { exam: '7회', date: '2024-06', examName: '2024년 6월 모의고사', examDate: '2024.06.13', total: 89, korean: 92, english: 87, math: 88 }
  ];

  // 성적 개선 계산
  const calculateImprovement = (data) => {
    if (!data || data.length < 2) return 0;
    const firstScore = data[0].total;
    const lastScore = data[data.length - 1].total;
    return Math.floor(lastScore - firstScore);
  };

  // 최고 성과 과목 계산
  const getBestSubject = (data) => {
    if (!data || data.length === 0) return '국어';
    const latestScores = data[data.length - 1];
    const scores = {
      korean: latestScores.korean,
      english: latestScores.english,
      math: latestScores.math
    };
    
    const bestSubject = Object.keys(scores).reduce((a, b) => 
      scores[a] > scores[b] ? a : b
    );
    
    return bestSubject === 'korean' ? '국어' : 
           bestSubject === 'english' ? '영어' : '수학';
  };

  // 약점 과목 계산
  const getWeakestSubject = (data) => {
    if (!data || data.length === 0) return '영어';
    const latestScores = data[data.length - 1];
    const scores = {
      korean: latestScores.korean,
      english: latestScores.english,
      math: latestScores.math
    };
    
    const weakestSubject = Object.keys(scores).reduce((a, b) => 
      scores[a] < scores[b] ? a : b
    );
    
    return weakestSubject === 'korean' ? '국어' : 
           weakestSubject === 'english' ? '영어' : '수학';
  };

  // 일관성 점수 계산 (표준편차를 이용)
  const calculateConsistencyScore = (data) => {
    if (!data || data.length < 2) return 85;
    
    const totalScores = data.map(d => d.total);
    const mean = totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length;
    const variance = totalScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / totalScores.length;
    const stdDev = Math.sqrt(variance);
    
    // 표준편차가 낮을수록 일관성 점수가 높음 (100에서 표준편차의 2배를 뺀 값)
    return Math.floor(Math.max(60, Math.min(100, 100 - (stdDev * 2))));
  };

  // 사용자 데이터가 없는 경우 로딩 처리
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const currentData = scoreData;
  const maxScore = Math.max(...currentData.map(d => Math.max(d.total, d.korean, d.english, d.math)));
  const minScore = Math.min(...currentData.map(d => Math.min(d.total, d.korean, d.english, d.math)));

  // 회차별 회원 평균 데이터
  const sameExamAverageData = [
    { exam: '1회', korean: 59, english: 63, math: 62 },
    { exam: '2회', korean: 62, english: 65, math: 66 },
    { exam: '3회', korean: 64, english: 68, math: 70 },
    { exam: '4회', korean: 67, english: 71, math: 73 },
    { exam: '5회', korean: 72, english: 75, math: 76 },
    { exam: '6회', korean: 78, english: 78, math: 79 },
    { exam: '7회', korean: 86, english: 82, math: 85 }
  ];

  // 회차별 전국 평균 데이터
  const nationalAverageData = [
    { exam: '1회', korean: 57, english: 60, math: 59 },
    { exam: '2회', korean: 60, english: 62, math: 63 },
    { exam: '3회', korean: 62, english: 65, math: 67 },
    { exam: '4회', korean: 65, english: 68, math: 70 },
    { exam: '5회', korean: 70, english: 72, math: 73 },
    { exam: '6회', korean: 75, english: 75, math: 76 },
    { exam: '7회', korean: 83, english: 79, math: 82 }
  ];

  const currentSameExamAverage = sameExamAverageData;
  const currentNationalAverage = nationalAverageData;

  // 학습 분석 데이터
  const analysisData = {
    totalImprovement: calculateImprovement(scoreData),
    bestSubject: getBestSubject(scoreData),
    weakestSubject: getWeakestSubject(scoreData),
    consistencyScore: calculateConsistencyScore(scoreData),
    subjectFeedback: {
      korean: {
        strengths: [
          '문학 작품 분석 능력이 우수함',
          '시어와 화자의 정서 파악이 정확함',
          '문학 개념어 이해도가 높음',
          '문학 갈래별 특징 파악 능력 뛰어남'
        ],
        improvements: [
          '비문학 지문의 핵심 내용 파악 연습 필요',
          '어휘력 확장을 통한 독해 속도 향상',
          '문법 개념 정리 및 적용 연습 필요'
        ]
      },
      english: {
        strengths: [
          '독해 문제 해결 능력이 안정적임',
          '기본 어휘력이 탄탄함',
          '듣기 평가에서 일관된 성과를 보임',
          '글의 흐름과 빈칸 추론 문제 접근법이 개선됨'
        ],
        improvements: [
          '어법 문제 정답률 개선 필요 (현재 65%)',
          '복합 관계사 구문 이해 부족',
          '시제 일치 문제 반복 오답 발생'
        ]
      },
      math: {
        strengths: [
          '기본 개념 이해도가 매우 높음',
          '계산 실수가 현저히 줄어듦',
          '그래프 해석 능력이 우수함',
          '함수와 방정식 영역 성취도 높음'
        ],
        improvements: [
          '응용 문제 해결 시간 단축 필요',
          '확률과 통계 영역 추가 학습 필요',
          '기하 문제 접근 방법 개선 필요'
        ]
      }
    },
    recommendations: [
      {
        title: '영어 어법 집중 코스',
        description: '취약점으로 분석된 어법 영역을 체계적으로 학습',
        duration: '4주',
        expectedImprovement: '+8점'
      },
      {
        title: '수학 응용 문제 마스터',
        description: '기초는 탄탄하니 응용 문제 해결 능력 향상',
        duration: '6주',
        expectedImprovement: '+12점'
      },
      {
        title: '국어 비문학 독해 강화',
        description: '문학은 우수하므로 비문학 지문 분석 능력 향상',
        duration: '3주',
        expectedImprovement: '+6점'
      }
    ]
  };

  const renderLineChart = () => {
    const totalData = currentData.map(d => d.total);
    const koreanData = currentData.map(d => d.korean);
    const englishData = currentData.map(d => d.english);
    const mathData = currentData.map(d => d.math);
    
    const maxValue = 100;
    const minValue = 60;
    const range = maxValue - minValue;
    
    // SVG 크기 설정
    const width = 500;
    const height = 350;
    const padding = 50;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // 좌표 계산 함수
    const getX = (index) => padding + (index / (currentData.length - 1)) * chartWidth;
    const getY = (value) => padding + ((maxValue - value) / range) * chartHeight;
    
    // 선 경로 생성 함수
    const createPath = (data) => {
      return data.map((value, index) => 
        `${index === 0 ? 'M' : 'L'} ${getX(index)} ${getY(value)}`
      ).join(' ');
    };
    
    return (
      <div className="relative bg-white rounded-2xl">
         <h4 className="text-center font-bold text-gray-800 mb-4">📈 {currentUser?.name || '사용자'}의 성적 변화 추이 (클릭하여 비교분석)</h4>
        
        {/* 🎨 토글 가능한 범례 (상단으로 이동) */}
        <div className="flex justify-center space-x-4 mb-6">
                     <button
             onClick={() => toggleSubject('korean')}
             className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
               visibleSubjects.korean 
                 ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 shadow-sm border-2 border-blue-300' 
                 : 'bg-gray-100 text-gray-400 hover:bg-gray-200 border-2 border-gray-200'
             }`}
           >
             <div className={`w-3 h-3 rounded-full ${visibleSubjects.korean ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 'bg-gray-300'}`}></div>
             <span className="text-sm font-medium">국어</span>
            {visibleSubjects.korean ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          
                     <button
             onClick={() => toggleSubject('english')}
             className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
               visibleSubjects.english 
                 ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700 shadow-sm border-2 border-green-300' 
                 : 'bg-gray-100 text-gray-400 hover:bg-gray-200 border-2 border-gray-200'
             }`}
           >
             <div className={`w-3 h-3 rounded-full ${visibleSubjects.english ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gray-300'}`}></div>
             <span className="text-sm font-medium">영어</span>
            {visibleSubjects.english ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          
                     <button
             onClick={() => toggleSubject('math')}
             className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
               visibleSubjects.math 
                 ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 shadow-sm border-2 border-purple-300' 
                 : 'bg-gray-100 text-gray-400 hover:bg-gray-200 border-2 border-gray-200'
             }`}
           >
             <div className={`w-3 h-3 rounded-full ${visibleSubjects.math ? 'bg-gradient-to-r from-purple-400 to-purple-600' : 'bg-gray-300'}`}></div>
             <span className="text-sm font-medium">수학</span>
            {visibleSubjects.math ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        
        <svg width={width} height={height} className="h-auto">
           {/* 그라데이션 정의 */}
           <defs>
             {/* 국어 그라데이션 */}
             <linearGradient id="koreanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" stopColor="#60a5fa" />
               <stop offset="100%" stopColor="#3b82f6" />
             </linearGradient>
             
             {/* 영어 그라데이션 */}
             <linearGradient id="englishGradient" x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" stopColor="#34d399" />
               <stop offset="100%" stopColor="#10b981" />
             </linearGradient>
             
             {/* 수학 그라데이션 */}
             <linearGradient id="mathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" stopColor="#a78bfa" />
               <stop offset="100%" stopColor="#8b5cf6" />
             </linearGradient>
           </defs>
           
          {/* 그리드 라인 */}
          {[60, 70, 80, 90, 100].map((value) => (
            <g key={value}>
              <line
                x1={padding}
                y1={getY(value)}
                x2={width - padding}
                y2={getY(value)}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={padding - 15}
                y={getY(value) + 4}
                textAnchor="end"
                fontSize="12"
                fill="#64748b"
              >
                {value}
              </text>
            </g>
          ))}
          
          {/* X축 라벨 */}
          {currentData.map((item, index) => (
            <text
              key={index}
              x={getX(index)}
              y={height - 15}
              textAnchor="middle"
              fontSize="12"
              fill="#64748b"
            >
              {item.exam}
            </text>
          ))}
          
          {/* 선 그래프 */}
          {/* 국어 */}
           {visibleSubjects.korean && (
            <path
              d={createPath(koreanData)}
              fill="none"
               stroke="url(#koreanGradient)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {/* 영어 */}
           {visibleSubjects.english && (
            <path
              d={createPath(englishData)}
              fill="none"
               stroke="url(#englishGradient)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {/* 수학 */}
           {visibleSubjects.math && (
            <path
              d={createPath(mathData)}
              fill="none"
               stroke="url(#mathGradient)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {/* 데이터 포인트 - 국어 */}
           {visibleSubjects.korean && koreanData.map((value, index) => (
            <circle
              key={`korean-${index}`}
              cx={getX(index)}
              cy={getY(value)}
               r="8"
               fill="url(#koreanGradient)"
              stroke="#ffffff"
              strokeWidth="3"
               className="cursor-pointer hover:r-10 transition-all duration-200"
               onClick={() => toggleExam(index)}
               onMouseEnter={(e) => {
                 setHoveredPoint({ index, subject: 'korean', value });
                 setMousePosition({ x: e.clientX, y: e.clientY });
               }}
               onMouseLeave={() => setHoveredPoint(null)}
               opacity={selectedExams.has(index) ? "1" : "0.8"}
            />
          ))}
          
          {/* 데이터 포인트 - 영어 */}
           {visibleSubjects.english && englishData.map((value, index) => (
            <circle
              key={`english-${index}`}
              cx={getX(index)}
              cy={getY(value)}
               r="8"
               fill="url(#englishGradient)"
              stroke="#ffffff"
              strokeWidth="3"
               className="cursor-pointer hover:r-10 transition-all duration-200"
               onClick={() => toggleExam(index)}
               onMouseEnter={(e) => {
                 setHoveredPoint({ index, subject: 'english', value });
                 setMousePosition({ x: e.clientX, y: e.clientY });
               }}
               onMouseLeave={() => setHoveredPoint(null)}
               opacity={selectedExams.has(index) ? "1" : "0.8"}
            />
          ))}
          
          {/* 데이터 포인트 - 수학 */}
           {visibleSubjects.math && mathData.map((value, index) => (
            <circle
              key={`math-${index}`}
              cx={getX(index)}
              cy={getY(value)}
               r="8"
               fill="url(#mathGradient)"
              stroke="#ffffff"
              strokeWidth="3"
               className="cursor-pointer hover:r-10 transition-all duration-200"
               onClick={() => toggleExam(index)}
               onMouseEnter={(e) => {
                 setHoveredPoint({ index, subject: 'math', value });
                 setMousePosition({ x: e.clientX, y: e.clientY });
               }}
               onMouseLeave={() => setHoveredPoint(null)}
               opacity={selectedExams.has(index) ? "1" : "0.8"}
            />
          ))}
          
          {/* 점수 표시 */}
          {currentData.map((item, index) => (
            <g key={index}>
              {visibleSubjects.korean && (
                <text
                  x={getX(index)}
                                     y={getY(item.korean) - 15}
                  textAnchor="middle"
                  fontSize="12"
                   fill="url(#koreanGradient)"
                  fontWeight="600"
                   className="cursor-pointer"
                   onClick={() => toggleExam(index)}
                   onMouseEnter={(e) => {
                     setHoveredPoint({ index, subject: 'korean', value: item.korean });
                     setMousePosition({ x: e.clientX, y: e.clientY });
                   }}
                   onMouseLeave={() => setHoveredPoint(null)}
                >
                  {item.korean}
                </text>
              )}
              {visibleSubjects.english && (
                <text
                  x={getX(index)}
                                     y={getY(item.english) - 15}
                  textAnchor="middle"
                  fontSize="12"
                   fill="url(#englishGradient)"
                  fontWeight="600"
                   className="cursor-pointer"
                   onClick={() => toggleExam(index)}
                   onMouseEnter={(e) => {
                     setHoveredPoint({ index, subject: 'english', value: item.english });
                     setMousePosition({ x: e.clientX, y: e.clientY });
                   }}
                   onMouseLeave={() => setHoveredPoint(null)}
                >
                  {item.english}
                </text>
              )}
              {visibleSubjects.math && (
                <text
                  x={getX(index)}
                                     y={getY(item.math) + 25}
                  textAnchor="middle"
                  fontSize="12"
                   fill="url(#mathGradient)"
                  fontWeight="600"
                   className="cursor-pointer"
                   onClick={() => toggleExam(index)}
                   onMouseEnter={(e) => {
                     setHoveredPoint({ index, subject: 'math', value: item.math });
                     setMousePosition({ x: e.clientX, y: e.clientY });
                   }}
                   onMouseLeave={() => setHoveredPoint(null)}
                >
                  {item.math}
                </text>
              )}
            </g>
          ))}
        </svg>
        
                          {/* 🎯 회차 선택 상태 표시 */}
         <div className="mt-4 text-center">
           <p className="text-sm text-gray-600 mb-2">
             {selectedExams.size > 0 
               ? `${Array.from(selectedExams).map(i => currentData[i].exam)[0]} 회차 선택됨 - 오른쪽에서 상세 비교 확인`
                                  : '점수를 클릭하여 오른쪽 차트에서 해당 회차의 전국 평균과 회원 평균 비교'
             }
           </p>
           {selectedExams.size > 0 && (
             <button
               onClick={() => setSelectedExams(new Set())}
               className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors duration-200"
             >
               선택 해제
             </button>
           )}
         </div>
         
         {/* 툴팁 */}
         {hoveredPoint && (
           <div 
             className="fixed z-50 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm pointer-events-none"
             style={{
               left: `${mousePosition.x + 10}px`,
               top: `${mousePosition.y - 30}px`,
               transform: 'translate(-50%, -100%)'
             }}
           >
             <div className="font-semibold">
               {currentData[hoveredPoint.index].examName}
             </div>
             <div className="text-xs text-gray-300">
               {currentData[hoveredPoint.index].examDate}
             </div>
             <div className="text-xs">
               {hoveredPoint.subject === 'korean' ? '국어' : 
                hoveredPoint.subject === 'english' ? '영어' : '수학'}: {hoveredPoint.value}점
             </div>
           </div>
         )}
      </div>
    );
  };

        // 선택된 회차의 비교 차트 렌더링
   const renderSelectedExamComparison = () => {
     // 활성화된 과목들 확인
     const activeSubjects = Object.entries(visibleSubjects).filter(([key, value]) => value);
     
     if (activeSubjects.length === 0) {
       return (
         <div className="bg-white rounded-2xl p-6 text-center">
           <p className="text-gray-500">표시할 과목을 선택해주세요.</p>
         </div>
       );
     }

     // 선택된 회차 데이터 가져오기 (단일 회차)
     const selectedExamIndex = Array.from(selectedExams)[0];
     const selectedExamData = {
       exam: currentData[selectedExamIndex],
       sameExamAvg: currentSameExamAverage[selectedExamIndex],
       nationalAvg: currentNationalAverage[selectedExamIndex],
       examIndex: selectedExamIndex
     };

     const subjectMap = { korean: '국어', english: '영어', math: '수학' };
     
              // 서로 다른 색상으로 구분
         const scoreColors = {
           my: '#3b82f6',      // 내 점수: 파란색 (기본)
           same: '#f97316',    // 회원 평균: 주황색  
           national: '#6b7280' // 전국 평균: 회색
         };

         // 과목별 내 점수 색상 매핑
         const subjectColors = {
           korean: '#3b82f6',    // 국어: 파란색
           english: '#10b981',   // 영어: 초록색
           math: '#8b5cf6'       // 수학: 보라색
         };

     const width = 450;
     const height = 400;
     const padding = 60;
     const chartWidth = width - padding * 2;
     const chartHeight = height - padding * 2;
     
     // 과목당 그룹 너비
     const groupWidth = chartWidth / activeSubjects.length;
     const barWidth = Math.min(groupWidth / 4, 35); // 각 막대의 너비
      
             return (
         <div className="bg-white rounded-2xl">
           <h4 className="text-center font-bold text-gray-800 mb-4">
             📊 {selectedExamData.exam.exam} 회차 점수 비교
           </h4>
           
           {/* 선택된 회차 표시 */}
           <div className="text-center mb-6">
             <div className="inline-flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-full">
               <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
               <span className="text-sm text-blue-700 font-medium">
                 {selectedExamData.exam.exam} 회차 상세 분석
               </span>
             </div>
           </div>

                     <svg width={width} height={height} className="h-auto">
             {/* 그라데이션 정의 */}
             <defs>
               {/* 과목별 그라데이션 (성적 변화 추이와 동일) */}
               <linearGradient id="koreanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#60a5fa" />
                 <stop offset="100%" stopColor="#3b82f6" />
               </linearGradient>
               
               <linearGradient id="englishGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#34d399" />
                 <stop offset="100%" stopColor="#10b981" />
               </linearGradient>
               
               <linearGradient id="mathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#a78bfa" />
                 <stop offset="100%" stopColor="#8b5cf6" />
               </linearGradient>
               
               {/* 회원 평균 그라데이션 (주황색) */}
               <linearGradient id="sameExamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#fb923c" />
                 <stop offset="100%" stopColor="#f97316" />
               </linearGradient>
               
               {/* 전국 평균 그라데이션 (회색) */}
               <linearGradient id="nationalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#9ca3af" />
                 <stop offset="100%" stopColor="#6b7280" />
               </linearGradient>
             </defs>
           
            {/* Y축 눈금 */}
            {[60, 70, 80, 90, 100].map((value) => (
              <g key={value}>
                <line
                  x1={padding}
                 y1={padding + ((100 - value) / 40) * chartHeight}
                  x2={width - padding}
                 y2={padding + ((100 - value) / 40) * chartHeight}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x={padding - 15}
                 y={padding + ((100 - value) / 40) * chartHeight + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#64748b"
                >
                  {value}
                </text>
              </g>
            ))}
            
                        {/* 과목별 그룹 */}
             {activeSubjects.map(([subjectKey], subjectIndex) => {
               const groupX = padding + subjectIndex * groupWidth;
               const myScore = selectedExamData.exam[subjectKey];
               const sameExamScore = selectedExamData.sameExamAvg[subjectKey];
               const nationalScore = selectedExamData.nationalAvg[subjectKey];
               
               const barSpacing = Math.max((groupWidth - barWidth * 3) / 4, 8);
               
               return (
                 <g key={`subject-${subjectKey}`}>
                   {/* X축 라벨 (과목명) */}
                   <text
                     x={groupX + groupWidth / 2}
                     y={height - 15}
                     textAnchor="middle"
                     fontSize="14"
                     fill="#374151"
                     fontWeight="700"
                   >
                     {subjectMap[subjectKey]}
                   </text>

                   {/* 내 점수 (과목별 색상) */}
                   <rect
                     key={`my-${subjectKey}`}
                     x={groupX + barSpacing}
                     y={padding + ((100 - myScore) / 40) * chartHeight}
                     width={barWidth}
                     height={((myScore - 60) / 40) * chartHeight}
                     fill={`url(#${subjectKey}Gradient)`}
                     rx="4"
                   />
                   
                   {/* 회원 평균 (주황색) */}
                   <rect
                     key={`same-${subjectKey}`}
                     x={groupX + barSpacing + barWidth + barSpacing}
                     y={padding + ((100 - sameExamScore) / 40) * chartHeight}
                     width={barWidth}
                     height={((sameExamScore - 60) / 40) * chartHeight}
                     fill="url(#sameExamGradient)"
                     rx="4"
                   />
                   
                   {/* 전국 평균 (회색) */}
                   <rect
                     key={`national-${subjectKey}`}
                     x={groupX + barSpacing + barWidth * 2 + barSpacing * 2}
                     y={padding + ((100 - nationalScore) / 40) * chartHeight}
                     width={barWidth}
                     height={((nationalScore - 60) / 40) * chartHeight}
                     fill="url(#nationalGradient)"
                     rx="4"
                   />
                   
                   {/* 점수 표시 */}
                   <text
                     key={`my-score-${subjectKey}`}
                     x={groupX + barSpacing + barWidth / 2}
                     y={padding + ((100 - myScore) / 40) * chartHeight - 8}
                     textAnchor="middle"
                     fontSize="11"
                     fill={subjectColors[subjectKey]}
                     fontWeight="700"
                   >
                     {myScore}
                   </text>
                   
                   <text
                     key={`same-score-${subjectKey}`}
                     x={groupX + barSpacing + barWidth + barSpacing + barWidth / 2}
                     y={padding + ((100 - sameExamScore) / 40) * chartHeight - 8}
                     textAnchor="middle"
                     fontSize="11"
                     fill={scoreColors.same}
                     fontWeight="700"
                   >
                     {sameExamScore}
                   </text>
                   
                   <text
                     key={`national-score-${subjectKey}`}
                     x={groupX + barSpacing + barWidth * 2 + barSpacing * 2 + barWidth / 2}
                     y={padding + ((100 - nationalScore) / 40) * chartHeight - 8}
                     textAnchor="middle"
                     fontSize="11"
                     fill={scoreColors.national}
                     fontWeight="700"
                   >
                     {nationalScore}
                   </text>
                 </g>
               );
             })}
         </svg>

                    {/* 범례 */}
           <div className="flex justify-center space-x-6 mt-6 text-sm">
             {/* 내 점수 범례 - 활성화된 과목이 하나일 때는 해당 과목 색상, 여러 개일 때는 과목별 분리 */}
             {activeSubjects.length === 1 ? (
               <div className="flex items-center space-x-2">
                 <div className="w-4 h-4 rounded" style={{ backgroundColor: subjectColors[activeSubjects[0][0]] }}></div>
                 <span className="text-gray-700 font-medium">내 점수</span>
               </div>
             ) : (
               <div className="flex items-center space-x-2">
                 <div className="flex space-x-1">
                   {activeSubjects.map(([subjectKey], index) => (
                     <div key={subjectKey} className="w-3 h-3 rounded" style={{ backgroundColor: subjectColors[subjectKey] }}></div>
                   ))}
                 </div>
                 <span className="text-gray-700 font-medium">내 점수</span>
               </div>
             )}
             
             <div className="flex items-center space-x-2">
               <div className="w-4 h-4 rounded" style={{ backgroundColor: scoreColors.same }}></div>
               <span className="text-gray-700 font-medium">회원 평균</span>
             </div>
             <div className="flex items-center space-x-2">
               <div className="w-4 h-4 rounded" style={{ backgroundColor: scoreColors.national }}></div>
               <span className="text-gray-700 font-medium">전국 평균</span>
             </div>
           </div>

           {/* 시험 정보 표시 */}
           <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
             <h5 className="font-bold text-blue-800 mb-3 text-center flex items-center justify-center">
               <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                 <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
               </svg>
               시험 정보
             </h5>
             <div className="bg-white rounded-lg p-4 space-y-3">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                 <div className="flex items-center">
                   <span className="text-gray-600 w-20">시험명:</span>
                   <span className="font-semibold text-gray-800">
                     {selectedExamData.exam.examName}
                   </span>
                 </div>
                 <div className="flex items-center">
                   <span className="text-gray-600 w-20">시험일:</span>
                   <span className="font-semibold text-gray-800">
                     {selectedExamData.exam.examDate}
                   </span>
                 </div>
                 <div className="flex items-center">
                   <span className="text-gray-600 w-20">회차:</span>
                   <span className="font-semibold text-gray-800">
                     {selectedExamData.exam.exam}
                   </span>
                 </div>
                 <div className="flex items-center">
                   <span className="text-gray-600 w-20">총점:</span>
                   <span className="font-semibold text-blue-600">
                     {selectedExamData.exam.total}점
                   </span>
                 </div>
               </div>
             </div>
           </div>

         {/* 선택 해제 버튼 */}
         <div className="text-center mt-4">
           <button
             onClick={() => setSelectedExams(new Set())}
             className="text-sm px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
           >
             선택 해제 (누적 차트 보기)
           </button>
         </div>
       </div>
     );
   };

   const renderStackedBarChart = () => {
     // 선택된 회차가 있으면 해당 회차의 비교 차트, 없으면 최근 5회차 누적 차트
     if (selectedExams.size > 0) {
       return renderSelectedExamComparison();
     }
     
     // 기존 누적 차트 로직
     const displayData = currentData.slice(-5);
     
     // 🎯 활성화된 과목 확인
     const activeSubjects = Object.entries(visibleSubjects).filter(([key, value]) => value);
     const isOnlyOneSubject = activeSubjects.length === 1;
    
    // SVG 크기 설정 (가로형을 위해 너비/높이 조정)
    const width = 450;
    const height = 400;
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // 과목별 정보
    const subjects = ['국어', '영어', '수학'];
    const subjectKeys = ['korean', 'english', 'math'];
    const colors = ['#3b82f6', '#10b981', '#8b5cf6'];
    
    const barHeight = Math.min(chartHeight / displayData.length - 15, 40); // 바 높이
    
    return (
      <div className="bg-white rounded-2xl">
                 <h4 className="text-center font-bold text-gray-800 mb-4">
           📊 과목별 {isOnlyOneSubject ? activeSubjects[0][0] === 'korean' ? '국어' : activeSubjects[0][0] === 'english' ? '영어' : '수학' : '누적'} 점수 (최근 5회)
         </h4>
        
                 <svg width={width} height={height} className="h-auto">
           {/* 그라데이션 정의 */}
           <defs>
             {/* 국어 그라데이션 */}
             <linearGradient id="koreanBarGradient" x1="0%" y1="0%" x2="100%" y2="0%">
               <stop offset="0%" stopColor="#60a5fa" />
               <stop offset="100%" stopColor="#3b82f6" />
             </linearGradient>
             
             {/* 영어 그라데이션 */}
             <linearGradient id="englishBarGradient" x1="0%" y1="0%" x2="100%" y2="0%">
               <stop offset="0%" stopColor="#34d399" />
               <stop offset="100%" stopColor="#10b981" />
             </linearGradient>
             
             {/* 수학 그라데이션 */}
             <linearGradient id="mathBarGradient" x1="0%" y1="0%" x2="100%" y2="0%">
               <stop offset="0%" stopColor="#a78bfa" />
               <stop offset="100%" stopColor="#8b5cf6" />
             </linearGradient>
           </defs>
           
           {/* X축 눈금 (가로형) */}
           {isOnlyOneSubject ? (
            // 단일 과목일 때는 0-100 범위
            [0, 20, 40, 60, 80, 100].map((value) => (
              <g key={value}>
                <line
                  x1={padding + (value / 100) * chartWidth}
                  y1={padding}
                  x2={padding + (value / 100) * chartWidth}
                  y2={height - padding}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                   <text
                  x={padding + (value / 100) * chartWidth}
                  y={height - padding + 20}
                     textAnchor="middle"
                     fontSize="10"
                  fill="#64748b"
                   >
                  {value}
                   </text>
              </g>
            ))
          ) : (
            // 전체 과목일 때는 0-300 범위
            [0, 50, 100, 150, 200, 250, 300].map((value) => (
              <g key={value}>
                <line
                  x1={padding + (value / 300) * chartWidth}
                  y1={padding}
                  x2={padding + (value / 300) * chartWidth}
                  y2={height - padding}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                     <text
                  x={padding + (value / 300) * chartWidth}
                  y={height - padding + 20}
                       textAnchor="middle"
                       fontSize="10"
                  fill="#64748b"
                     >
                  {value}
                     </text>
              </g>
            ))
          )}
          
          {/* 가로 바 차트 */}
          {displayData.map((item, index) => {
            const y = padding + index * (barHeight + 15);
            let cumulativeWidth = 0;
            const originalIndex = currentData.findIndex(d => d.exam === item.exam);
            const isSelected = selectedExams.has(originalIndex);
            
            return (
                             <g key={`${item.exam}-${index}`}>
                 {/* Y축 라벨 (회차명) */}
                     <text
                   x={padding - 10}
                   y={y + barHeight / 2 + 4}
                   textAnchor="end"
                   fontSize="12"
                   fill="#64748b"
                       fontWeight="600"
                     >
                   {item.exam}
                     </text>
                 
                 {isOnlyOneSubject ? (
                   // 🎯 단일 과목 - 가로막대
                   (() => {
                     const subjectKey = activeSubjects[0][0];
                     const score = item[subjectKey];
                     const colorIndex = subjectKeys.indexOf(subjectKey);
                     const barWidth = (score / 100) * chartWidth;
                     const gradientId = subjectKey === 'korean' ? 'koreanBarGradient' : 
                                      subjectKey === 'english' ? 'englishBarGradient' : 'mathBarGradient';
                     
                     return [
                       <rect
                         key={`single-${subjectKey}-${index}`}
                         x={padding}
                         y={y}
                         width={barWidth}
                         height={barHeight}
                         fill={`url(#${gradientId})`}
                         opacity="0.9"
                         rx="4"
                       />,
                     <text
                         key={`single-text-${subjectKey}-${index}`}
                         x={padding + barWidth + 8}
                         y={y + barHeight / 2 + 4}
                         textAnchor="start"
                         fontSize="14"
                         fill={colors[colorIndex]}
                         fontWeight="700"
                       >
                         {score}점
                       </text>
                     ];
                   })()
                ) : (
                  // 🎯 전체 과목 - 누적 가로 스택
                  [
                    ...subjectKeys.map((key, subjectIndex) => {
                      if (!visibleSubjects[key]) return null;
                      
                                             const score = item[key];
                       const sectionWidth = (score / 300) * chartWidth;
                       const currentX = padding + cumulativeWidth;
                       const gradientId = key === 'korean' ? 'koreanBarGradient' : 
                                        key === 'english' ? 'englishBarGradient' : 'mathBarGradient';
                       
                       const elements = [];
                       
                       elements.push(
                         <rect
                           key={`${key}-${index}`}
                           x={currentX}
                           y={y}
                           width={sectionWidth}
                           height={barHeight}
                           fill={`url(#${gradientId})`}
                           opacity="0.9"
                           rx={subjectIndex === 0 ? "4 0 0 4" : subjectIndex === subjectKeys.length - 1 ? "0 4 4 0" : "0"}
                         />
                       );
                      
                      // 각 과목 점수를 바 위에 표시 (공간이 충분할 때)
                      if (sectionWidth > 25) {
                        elements.push(
                          <text
                            key={`text-${key}-${index}`}
                            x={currentX + sectionWidth / 2}
                            y={y + barHeight / 2 + 4}
                       textAnchor="middle"
                            fontSize="11"
                       fill="#ffffff"
                       fontWeight="600"
                     >
                            {score}
                     </text>
                        );
                      }
                      
                      cumulativeWidth += sectionWidth;
                      return elements;
                    }).filter(Boolean),
                    
                    // 총합 점수를 바 오른쪽에 표시
                    <text
                      key={`total-${index}`}
                      x={padding + cumulativeWidth + 8}
                      y={y + barHeight / 2 + 4}
                      textAnchor="start"
                      fontSize="14"
                      fill="#1f2937"
                      fontWeight="700"
                    >
                      {Object.entries(visibleSubjects)
                        .filter(([key, visible]) => visible)
                        .reduce((sum, [key]) => sum + item[key], 0)}점
                    </text>
                  ]
                   )}
                </g>
              );
            })}
          </svg>
          
          {/* 범례 */}
        <div className="flex justify-center space-x-4 mt-4 text-sm">
          {subjects.map((subject, index) => {
            const subjectKey = subjectKeys[index];
            if (!visibleSubjects[subjectKey]) return null;
            
            return (
              <div key={subject} className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: colors[index], opacity: 0.8 }}
                ></div>
                <span className="text-gray-700">{subject}</span>
            </div>
            );
          }).filter(Boolean)}
            </div>
        
        
            </div>
    );
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              📊 학습 분석
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          


          {/* 종합 통계 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-3xl shadow-xl p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">+{analysisData.totalImprovement}점</div>
              <div className="text-sm text-gray-600">총 향상도</div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{analysisData.bestSubject}</div>
              <div className="text-sm text-gray-600">최우수 과목</div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.5 0L5.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{analysisData.weakestSubject}</div>
              <div className="text-sm text-gray-600">집중 필요 과목</div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{analysisData.consistencyScore}%</div>
              <div className="text-sm text-gray-600">일관성 지수</div>
            </div>
          </div>

          {/* 성적 변화 그래프 */}
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-bold text-gray-800">📈 성적 변화 추이 & 비교 분석</h3>
            </div>
            
            {/* 그래프와 누적 바 차트를 나란히 배치 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 왼쪽: 토글 가능한 선 그래프 */}
              <div className="flex justify-center">
                {renderLineChart()}
              </div>
              
              {/* 오른쪽: 누적 바 차트 */}
              <div className="flex justify-center">
                {renderStackedBarChart()}
              </div>
            </div>
          </div>



          {/* 과목별 강점과 개선점 */}
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6">📊 과목별 피드백</h3>
            
            {/* 선택된 과목만 표시 */}
            {(() => {
              // 활성화된 과목들 필터링
              const activeSubjects = Object.entries(visibleSubjects).filter(([key, value]) => value);
              
              // 과목별 정보 매핑
              const subjectInfo = {
                korean: {
                  name: '국어',
                  shortName: '국',
                  bgClass: 'bg-gradient-to-br from-blue-50 to-blue-100',
                  borderClass: 'border-blue-200',
                  titleClass: 'text-blue-800',
                  iconClass: 'bg-blue-500',
                  textClass: 'text-blue-700',
                  feedbackBgClass: 'bg-blue-50'
                },
                english: {
                  name: '영어',
                  shortName: '영',
                  bgClass: 'bg-gradient-to-br from-green-50 to-green-100',
                  borderClass: 'border-green-200',
                  titleClass: 'text-green-800',
                  iconClass: 'bg-green-500',
                  textClass: 'text-green-700',
                  feedbackBgClass: 'bg-green-50'
                },
                math: {
                  name: '수학',
                  shortName: '수',
                  bgClass: 'bg-gradient-to-br from-purple-50 to-purple-100',
                  borderClass: 'border-purple-200',
                  titleClass: 'text-purple-800',
                  iconClass: 'bg-purple-500',
                  textClass: 'text-purple-700',
                  feedbackBgClass: 'bg-purple-50'
                }
              };

              if (activeSubjects.length === 0) {
                return (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-lg mb-2">📊</div>
                    <p className="text-gray-500">위쪽 그래프에서 과목을 선택해주세요.</p>
                  </div>
                );
              }

              // 그리드 클래스 동적 설정
              const getGridClass = (count) => {
                if (count === 1) return 'grid grid-cols-1 max-w-md mx-auto';
                if (count === 2) return 'grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto';
                return 'grid grid-cols-1 md:grid-cols-3 gap-6';
              };

              return (
                <div className={getGridClass(activeSubjects.length)}>
                  {activeSubjects.map(([subjectKey]) => {
                    const subject = subjectInfo[subjectKey];
                    const feedback = analysisData.subjectFeedback[subjectKey];
                    
                    return (
                      <div key={subjectKey} className={`${subject.bgClass} rounded-2xl p-6 border ${subject.borderClass}`}>
                        <h4 className={`text-lg font-bold ${subject.titleClass} mb-4 flex items-center`}>
                          <div className={`w-6 h-6 ${subject.iconClass} rounded-full flex items-center justify-center mr-2`}>
                            <span className="text-white text-sm font-bold">{subject.shortName}</span>
                          </div>
                          {subject.name}
                        </h4>
                        
                        {/* 강점 */}
                        <div className="mb-4">
                          <h5 className={`font-semibold ${subject.textClass} mb-2 flex items-center`}>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            강점
                          </h5>
                          <div className="space-y-2">
                            {feedback.strengths.map((strength, index) => (
                              <div key={index} className={`text-sm ${subject.textClass} ${subject.feedbackBgClass} p-2 rounded-lg`}>
                                • {strength}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* 개선점 */}
                        <div>
                          <h5 className={`font-semibold ${subject.textClass} mb-2 flex items-center`}>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.5 0L5.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            개선점
                          </h5>
                          <div className="space-y-2">
                            {feedback.improvements.map((improvement, index) => (
                              <div key={index} className={`text-sm ${subject.textClass} bg-orange-50 p-2 rounded-lg`}>
                                • {improvement}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* AI 맞춤 학습 추천 */}
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6">🤖 AI 맞춤 학습 추천</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {analysisData.recommendations.map((rec, index) => (
                <div key={index} className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-100">
                  <h4 className="font-bold text-gray-800 mb-3">{rec.title}</h4>
                  <p className="text-gray-600 text-sm mb-4">{rec.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">예상 기간:</span>
                      <span className="font-medium text-gray-700">{rec.duration}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">예상 향상:</span>
                      <span className="font-bold text-green-600">{rec.expectedImprovement}</span>
                    </div>
                  </div>
                  
                  <button className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-xl font-medium hover:from-purple-600 hover:to-blue-600 transition-all duration-300">
                    학습 시작하기
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 학습 목표 설정 */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl shadow-xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">🎯 다음 목표</h3>
                <p className="text-indigo-100 mb-4">
                  현재 추세로 학습하면 <span className="font-bold">3개월 후 95점</span> 달성 가능합니다!
                </p>
                <div className="flex space-x-4">
                  <button 
                    onClick={() => navigate('/upload')}
                    className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors duration-200"
                  >
                    다음 시험지 풀기
                  </button>
                  <button 
                    onClick={() => navigate('/wrong-answer-notes')}
                    className="bg-white/20 text-white border border-white/30 px-6 py-3 rounded-xl font-bold hover:bg-white/30 transition-colors duration-200"
                  >
                    오답 복습하기
                  </button>
                </div>
              </div>
              <div className="ml-8 text-6xl">
                📚
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 