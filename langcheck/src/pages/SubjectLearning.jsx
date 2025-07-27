import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationModal from '../components/NotificationModal';

export default function SubjectLearning() {
  const navigate = useNavigate();
  const location = useLocation();
  const { subject } = location.state || {};
  
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [completedLessons, setCompletedLessons] = useState(new Set());

  // 알림 모달 상태
  const [notification, setNotification] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  // 뒤로가기
  const handleBackToAnalysis = () => {
    navigate('/learning-analysis');
  };

  // 과목별 학습 과정 데이터
  const learningData = {
    영어: {
      title: '영어 집중 학습',
      subtitle: '체계적인 영어 실력 향상을 위한 맞춤형 커리큘럼',
      color: 'from-green-500 to-emerald-600',
      bgColor: 'from-green-50 to-emerald-50',
      icon: '🇺🇸',
      courses: [
        {
          id: 'english-grammar',
          title: '어법/문법 마스터',
          description: '영어 문법의 핵심을 체계적으로 학습합니다',
          duration: '4주 과정',
          level: '중급',
          progress: 0,
          lessons: [
            { id: 1, title: '시제의 완벽 이해', duration: '45분', type: '이론' },
            { id: 2, title: '조동사 활용법', duration: '35분', type: '이론' },
            { id: 3, title: '가정법 정복하기', duration: '50분', type: '이론' },
            { id: 4, title: '관계대명사/관계부사', duration: '40분', type: '이론' },
            { id: 5, title: '실전 문제 풀이 1', duration: '60분', type: '실습' },
            { id: 6, title: '실전 문제 풀이 2', duration: '60분', type: '실습' }
          ],
          expectedImprovement: '+8점'
        },
        {
          id: 'english-reading',
          title: '독해 속도 향상',
          description: '빠르고 정확한 영어 독해 능력을 기릅니다',
          duration: '3주 과정',
          level: '고급',
          progress: 25,
          lessons: [
            { id: 1, title: 'Skimming & Scanning 기법', duration: '40분', type: '이론' },
            { id: 2, title: '주제문 찾기 전략', duration: '35분', type: '이론' },
            { id: 3, title: '빈칸추론 해결법', duration: '45분', type: '이론' },
            { id: 4, title: '실전 독해 연습 1', duration: '50분', type: '실습' },
            { id: 5, title: '실전 독해 연습 2', duration: '50분', type: '실습' }
          ],
          expectedImprovement: '+6점'
        },
        {
          id: 'english-vocabulary',
          title: '어휘력 집중 강화',
          description: '수능 빈출 어휘를 체계적으로 암기합니다',
          duration: '2주 과정',
          level: '초급',
          progress: 60,
          lessons: [
            { id: 1, title: '접두사/접미사 활용', duration: '30분', type: '이론' },
            { id: 2, title: '동의어/반의어 정리', duration: '40분', type: '이론' },
            { id: 3, title: '주제별 어휘 학습', duration: '45분', type: '이론' },
            { id: 4, title: '어휘 암기 테스트', duration: '30분', type: '테스트' }
          ],
          expectedImprovement: '+4점'
        }
      ]
    },
    국어: {
      title: '국어 집중 학습',
      subtitle: '언어의 아름다움을 탐구하며 실력을 향상시킵니다',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'from-blue-50 to-indigo-50',
      icon: '🇰🇷',
      courses: [
        {
          id: 'korean-literature',
          title: '문학 작품 심화 분석',
          description: '고전문학부터 현대문학까지 작품을 깊이 있게 분석합니다',
          duration: '5주 과정',
          level: '고급',
          progress: 80,
          lessons: [
            { id: 1, title: '고전 시가의 이해', duration: '50분', type: '이론' },
            { id: 2, title: '현대 소설 분석 기법', duration: '45분', type: '이론' },
            { id: 3, title: '극문학의 특성', duration: '40분', type: '이론' },
            { id: 4, title: '수필과 기행문', duration: '35분', type: '이론' },
            { id: 5, title: '문학 작품 실전 분석', duration: '60분', type: '실습' },
            { id: 6, title: '문학사 정리', duration: '40분', type: '이론' }
          ],
          expectedImprovement: '+10점'
        },
        {
          id: 'korean-nonfiction',
          title: '비문학 독해 전략',
          description: '다양한 비문학 지문을 효과적으로 분석하는 방법을 배웁니다',
          duration: '3주 과정',
          level: '중급',
          progress: 30,
          lessons: [
            { id: 1, title: '설명문 구조 파악', duration: '40분', type: '이론' },
            { id: 2, title: '논증문 논리 분석', duration: '45분', type: '이론' },
            { id: 3, title: '과학/기술 지문 공략', duration: '50분', type: '이론' },
            { id: 4, title: '인문/예술 지문 이해', duration: '45분', type: '이론' },
            { id: 5, title: '비문학 실전 연습', duration: '60분', type: '실습' }
          ],
          expectedImprovement: '+6점'
        },
        {
          id: 'korean-writing',
          title: '화법과 작문',
          description: '효과적인 의사소통과 글쓰기 능력을 기릅니다',
          duration: '4주 과정',
          level: '중급',
          progress: 0,
          lessons: [
            { id: 1, title: '화법의 기본 원리', duration: '35분', type: '이론' },
            { id: 2, title: '토론과 토의 전략', duration: '40분', type: '이론' },
            { id: 3, title: '설득적 글쓰기', duration: '45분', type: '이론' },
            { id: 4, title: '정보 전달 글쓰기', duration: '40분', type: '이론' },
            { id: 5, title: '실제 작문 연습', duration: '60분', type: '실습' }
          ],
          expectedImprovement: '+5점'
        }
      ]
    }
  };

  const currentSubjectData = learningData[subject];

  const getLevelColor = (level) => {
    switch(level) {
      case '초급': return 'bg-green-100 text-green-700';
      case '중급': return 'bg-yellow-100 text-yellow-700';
      case '고급': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case '이론': return '📚';
      case '실습': return '💻';
      case '테스트': return '📝';
      default: return '📄';
    }
  };

  const handleStartLesson = (courseId, lessonId) => {
    setCompletedLessons(prev => new Set([...prev, `${courseId}-${lessonId}`]));
    // 실제로는 학습 컨텐츠 페이지로 이동
    setNotification({
      isOpen: true,
      type: 'info',
      title: '학습 시작!',
      message: '학습이 시작됩니다! (실제로는 학습 컨텐츠로 이동)'
    });
  };

  const calculateCourseProgress = (course) => {
    const completedCount = course.lessons.filter(lesson => 
      completedLessons.has(`${course.id}-${lesson.id}`)
    ).length;
    return Math.round((completedCount / course.lessons.length) * 100);
  };

  if (!subject || !currentSubjectData) {
    navigate('/learning-analysis');
    return null;
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentSubjectData.bgColor}`}>
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={handleBackToAnalysis}
                className="text-gray-600 hover:text-gray-800 mr-4 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className={`text-2xl font-bold bg-gradient-to-r ${currentSubjectData.color} bg-clip-text text-transparent`}>
                {currentSubjectData.icon} {currentSubjectData.title}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          
          {/* 과목 소개 */}
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
            <div className="text-center">
              <div className="text-6xl mb-4">{currentSubjectData.icon}</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">{currentSubjectData.title}</h2>
              <p className="text-gray-600 text-lg">{currentSubjectData.subtitle}</p>
            </div>
          </div>

          {/* 학습 과정 목록 */}
          <div className="space-y-8">
            {currentSubjectData.courses.map((course) => {
              const courseProgress = calculateCourseProgress(course);
              
              return (
                <div key={course.id} className="bg-white rounded-3xl shadow-xl overflow-hidden">
                  {/* 코스 헤더 */}
                  <div className={`bg-gradient-to-r ${currentSubjectData.color} p-6 text-white`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-2">{course.title}</h3>
                        <p className="text-white/90 mb-4">{course.description}</p>
                        <div className="flex items-center space-x-6 text-sm">
                          <span>📅 {course.duration}</span>
                          <span className={`px-3 py-1 rounded-full ${getLevelColor(course.level)}`}>
                            {course.level}
                          </span>
                          <span>📈 예상 향상: {course.expectedImprovement}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold mb-1">{courseProgress}%</div>
                        <div className="text-white/80 text-sm">완료율</div>
                      </div>
                    </div>
                    
                    {/* 진행률 바 */}
                    <div className="mt-4 w-full bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-white h-2 rounded-full transition-all duration-500"
                        style={{ width: `${courseProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* 강의 목록 */}
                  <div className="p-6">
                    <div className="grid gap-4">
                      {course.lessons.map((lesson, index) => {
                        const isCompleted = completedLessons.has(`${course.id}-${lesson.id}`);
                        const isAccessible = index === 0 || completedLessons.has(`${course.id}-${course.lessons[index - 1].id}`);
                        
                        return (
                          <div 
                            key={lesson.id}
                            className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 ${
                              isCompleted 
                                ? 'border-green-500 bg-green-50' 
                                : isAccessible
                                ? 'border-gray-200 bg-white hover:border-gray-300'
                                : 'border-gray-100 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                isCompleted 
                                  ? 'bg-green-500 text-white' 
                                  : isAccessible
                                  ? 'bg-blue-100 text-blue-600'
                                  : 'bg-gray-200 text-gray-400'
                              }`}>
                                {isCompleted ? '✓' : lesson.id}
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-1">
                                  <h4 className={`font-semibold ${
                                    isAccessible ? 'text-gray-800' : 'text-gray-400'
                                  }`}>
                                    {getTypeIcon(lesson.type)} {lesson.title}
                                  </h4>
                                  <span className={`text-sm px-2 py-1 rounded-full ${
                                    lesson.type === '이론' ? 'bg-blue-100 text-blue-700' :
                                    lesson.type === '실습' ? 'bg-purple-100 text-purple-700' :
                                    'bg-orange-100 text-orange-700'
                                  }`}>
                                    {lesson.type}
                                  </span>
                                </div>
                                <p className={`text-sm ${
                                  isAccessible ? 'text-gray-600' : 'text-gray-400'
                                }`}>
                                  ⏱️ {lesson.duration}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              {isCompleted ? (
                                <span className="text-green-600 font-medium">완료</span>
                              ) : isAccessible ? (
                                <button
                                  onClick={() => handleStartLesson(course.id, lesson.id)}
                                  className={`px-6 py-2 rounded-xl font-medium transition-all duration-200 bg-gradient-to-r ${currentSubjectData.color} text-white hover:shadow-lg`}
                                >
                                  학습 시작
                                </button>
                              ) : (
                                <span className="text-gray-400 font-medium">잠금</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 학습 통계 */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl shadow-xl p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.168 18.477 18.582 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">
                {currentSubjectData.courses.length}
              </div>
              <div className="text-sm text-gray-600">총 학습 과정</div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">
                {completedLessons.size}
              </div>
              <div className="text-sm text-gray-600">완료한 강의</div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">
                +{currentSubjectData.courses.reduce((sum, course) => 
                  sum + parseInt(course.expectedImprovement.replace('+', '').replace('점', '')), 0
                )}점
              </div>
              <div className="text-sm text-gray-600">예상 총 향상</div>
            </div>
          </div>
        </div>
      </div>

      {/* 알림 모달 */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </div>
  );
} 