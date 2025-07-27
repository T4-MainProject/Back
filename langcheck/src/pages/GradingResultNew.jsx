import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { examAPI } from '../services/api';

export default function GradingResult() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // resultData를 상태로 관리
  const [resultData, setResultData] = useState(location.state);

  // 현재 시험지 페이지 상태 관리
  const [currentPage, setCurrentPage] = useState(0);
  
  // 이미지 확대/축소 모달 상태 관리
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [modalImageAlt, setModalImageAlt] = useState('');
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 고정된 데이터 상태 관리 (한 번만 생성되고 변경되지 않음)
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 결과 데이터가 없으면 홈으로 리다이렉트 (로딩이 완료된 후에만)
  useEffect(() => {
    if (!loading && !resultData) {
      navigate('/');
    }
  }, [loading, resultData, navigate]);


  // 📷 API 응답에서 시험지 이미지 URL을 가져오는 함수
  const getExamImages = () => {
    // 새로운 데이터 구조에서는 vision_results의 crop_path를 사용
    if (resultData && resultData.vision_results && resultData.vision_results.length > 0) {
      const API_BASE_URL = 'http://localhost:8000';
      return resultData.vision_results.map((result, index) => ({
        id: index + 1,
        url: `${API_BASE_URL}/${result.crop_path.replace(/\\/g, '/')}`,
        alt: `채점된 시험지 ${index + 1}페이지 - 문제 ${result.question_number}`,
        isUploaded: true,
        fileType: result.crop_path.split('.').pop().toLowerCase(),
      }));
    }
    
    // 기존 구조 호환성 유지
    if (resultData && resultData.upload_info && resultData.upload_info.image_urls) {
      const API_BASE_URL = 'http://localhost:8000';
      return resultData.upload_info.image_urls.map((url, index) => ({
        id: index + 1,
        url: `${API_BASE_URL}${url}`,
        alt: `채점된 시험지 ${index + 1}페이지`,
        isUploaded: true,
        fileType: url.split('.').pop().toLowerCase(),
      }));
    }
    
    return []; // 이미지가 없는 경우 빈 배열 반환
  };



  // 데이터 fetching을 위한 useEffect
  useEffect(() => {
    const fetchResult = async () => {
      // 1. resultData가 이미 있으면 (location.state에서 초기화됨) 로딩 완료
      if (resultData) {
        console.log('resultData가 이미 설정되어 있습니다.', resultData);
        setLoading(false);
        return;
      }

      // 2. localStorage에서 결과 확인
      const cachedResult = localStorage.getItem('gradingResult');
      if (cachedResult) {
        try {
          const parsedResult = JSON.parse(cachedResult);
          console.log('localStorage에서 채점 결과를 불러왔습니다.', parsedResult);
          // 백엔드에서 반환된 에러가 있는지 확인
          if (parsedResult.error) {
            console.error('localStorage에 저장된 결과에 오류가 있습니다:', parsedResult.error);
            setError(`분석 중 오류가 발생했습니다: ${parsedResult.error}`);
            setLoading(false);
          } else {
            setResultData(parsedResult);
            setLoading(false);
          }
          localStorage.removeItem('gradingResult');
          return; // API 호출 방지
        } catch (e) {
          console.error('localStorage 파싱 오류:', e);
          // 파싱 오류 시 캐시를 지우고 API 호출로 넘어감
          localStorage.removeItem('gradingResult');
        }
      }

      // 3. API 호출 (fallback) - upload_id가 있는 경우에만
      if (location.state && location.state.upload_id) {
        console.log('API를 호출하여 결과를 가져옵니다.');
        try {
          setLoading(true);
          const data = await examAPI.getAnalysisResult(location.state.upload_id);
          setResultData(data);
          console.log('API로부터 받은 채점 결과:', data);
        } catch (error) {
          console.error('API 호출 실패:', error);
          setError(`결과를 불러올 수 없습니다: ${error.message}`);
        } finally {
          setLoading(false);
        }
      } else {
        setError('채점 결과 데이터를 찾을 수 없습니다.');
        setLoading(false);
      }
    };

    fetchResult();
  }, [location.state]);

  // 실제 Vision/YOLO 결과 기반 userData 생성
  useEffect(() => {
    if (!resultData) return;

    // 디버깅을 위해 resultData 구조 확인
    console.log('🔍 resultData 구조 확인:', resultData);
    console.log('🔍 vision_results:', resultData.vision_results);
    console.log('🔍 vision_results 길이:', resultData.vision_results?.length);

    // 사용자 정보 가져오기 (여러 소스에서 확인)
    let userName = '김학생'; // 기본값
    
    // 1. 백엔드에서 받은 사용자 정보 확인
    if (resultData.user_name) {
      userName = resultData.user_name;
    } else if (resultData.userName) {
      userName = resultData.userName;
    } else if (resultData.uploadData?.userName) {
      userName = resultData.uploadData.userName;
    }
    
    // 2. 로컬 스토리지에서 로그인된 사용자 정보 확인
    const storedUserStr = localStorage.getItem('user');
    const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
    if (storedUser && storedUser.name) {
      userName = storedUser.name;
    }
    
    console.log('👤 사용자 정보:', {
      이름: userName,
      이메일: resultData.user_email || storedUser?.email,
      ID: resultData.user_id || storedUser?.id,
      로그인상태: !!(localStorage.getItem('authToken') && storedUser)
    });

    // Vision 결과가 있으면 실제 데이터로 변환
    if (resultData.vision_results && Array.isArray(resultData.vision_results) && resultData.vision_results.length > 0) {
      console.log(`🎯 총 ${resultData.vision_results.length}개의 문제 답을 찾았습니다!`);
      
      // 문제번호 순서로 정렬
      const sortedResults = [...resultData.vision_results].sort((a, b) => {
        const aNum = parseInt(a.question_number) || 0;
        const bNum = parseInt(b.question_number) || 0;
        return aNum - bNum;
      });
      
      console.log('📝 찾은 문제들 (정렬됨):', sortedResults.map(q => ({
        번호: q.question_number,
        내답: q.detected_answer,
        정답: q.correct_answer,
        정답여부: q.is_correct,
        신뢰도: q.confidence
      })));
      
      // 문제번호별 정답 매칭 확인
      const answerMatching = sortedResults.map(q => {
        const questionNum = q.question_number;
        const studentAnswer = q.detected_answer;
        const correctAnswer = q.correct_answer;
        const isCorrect = q.is_correct;
        
        console.log(`🔍 문제 ${questionNum}번 매칭 확인: 학생답='${studentAnswer}' vs 정답='${correctAnswer}' → ${isCorrect ? '✅' : '❌'}`);
        
        return {
          questionNum,
          studentAnswer,
          correctAnswer,
          isCorrect,
          matching: studentAnswer === correctAnswer
        };
      });
      
      console.log('📊 전체 매칭 결과:', answerMatching);
      
      const questions = sortedResults.map((q, idx) => {
        const questionNumber = q.question_number || idx + 1;
        // 실제 배점 로직: 1~30:2점, 31~40:3점, 41~45:2점
        let score = 0;
        if (questionNumber >= 1 && questionNumber <= 30) score = 2;
        else if (questionNumber >= 31 && questionNumber <= 40) score = 3;
        else if (questionNumber >= 41 && questionNumber <= 45) score = 2;
        return {
          id: questionNumber,
          isCorrect: q.is_correct,
          userAnswer: q.detected_answer,
          correctAnswer: q.correct_answer,
          score,
          earnedScore: q.is_correct ? score : 0
        };
      });
      setUserData({
        name: userName,
        examInfo: {
          name: resultData.exam_title || '모의고사',
          date: resultData.examDate || new Date().toISOString().split('T')[0],
          subject: resultData.subject || '영어'
        },
        questions,
        examImages: [], // 이미지 처리 필요시 추가
        subjectScores: [],
        recentExams: [],
        recommendations: [],
        examCount: 1,
        currentScore: questions.reduce((sum, q) => sum + q.earnedScore, 0),
        improvement: '+0',
        streak: 0
      });
    } else {
      console.log('❌ vision_results가 없거나 비어있습니다.');
      console.log('🔍 resultData의 모든 키들:', Object.keys(resultData));
      console.log('🔍 upload_info:', resultData.upload_info);
      console.log('🔍 processing_summary:', JSON.stringify(resultData.processing_summary, null, 2));
      console.log('🔍 uploadData:', resultData.uploadData);
      setUserData(null); // 문항 없음 처리
    }
  }, [resultData]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isImageModalOpen) {
        closeImageModal();
      }
    };

    if (isImageModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isImageModalOpen]);

  // 컴포넌트 언마운트 시 정리 작업을 위한 useEffect
  useEffect(() => {
    return () => {
      console.log('GradingResult 컴포넌트 언마운트');
    };
  }, []);

  // 이미지 모달 관련 핸들러들
  const openImageModal = (url, alt) => {
    setModalImageUrl(url);
    setModalImageAlt(alt);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    // 모달이 닫힐 때 줌과 위치 초기화
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };

  // 🏠 홈으로 돌아가기
  const handleBackToHome = () => {
    navigate('/');
  };

  // 📚 오답노트 보기
  const handleWrongAnswers = () => {
    navigate('/wrong-answer-note');
  };

  // 📊 학습 분석
  const handleAnalysis = () => {
    navigate('/learning-analysis');
  };

  // 📝 새 시험지 업로드
  const handleNewExam = () => {
    navigate('/exam-upload');
  };

  // 📄 페이지 내비게이션 함수
  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min((userData?.examImages?.length || 1) - 1, prev + 1));
  };

  const handleZoomIn = () => {
    setImageScale(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setImageScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleResetZoom = () => {
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      const maxOffset = 500;
      const boundedX = Math.max(-maxOffset, Math.min(maxOffset, newX));
      const boundedY = Math.max(-maxOffset, Math.min(maxOffset, newY));
      
      setImagePosition({
        x: boundedX,
        y: boundedY
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - imagePosition.x,
        y: e.touches[0].clientY - imagePosition.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging && e.touches.length === 1) {
      e.preventDefault();
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      
      const maxOffset = 500;
      const boundedX = Math.max(-maxOffset, Math.min(maxOffset, newX));
      const boundedY = Math.max(-maxOffset, Math.min(maxOffset, newY));
      
      setImagePosition({
        x: boundedX,
        y: boundedY
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    setImagePosition({ x: 0, y: 0 });
    setImageScale(1);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setImageScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  // 데이터 없음 무한로딩 방지 타임아웃
  useEffect(() => {
    if (!loading && (!resultData || !userData)) {
      const timeout = setTimeout(() => {
        setError('데이터를 불러오지 못했습니다. 다시 시도해 주세요.');
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [loading, resultData, userData]);

  // --- 렌더링 로직 ---
  if (loading) {
    console.log('로딩 중... resultData:', resultData, 'userData:', userData);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">채점 결과 로딩 중...</h2>
          <p className="text-gray-600">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('에러 발생:', error, 'resultData:', resultData, 'userData:', userData);
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={handleBackToHome}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // userData가 없으면 안내 메시지
  if (!userData) {
    const totalQuestions = resultData?.processing_summary?.total_questions || 0;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 text-center max-w-md">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">문제를 인식하지 못했습니다</h2>
          <p className="text-gray-600 mb-4">
            AI가 시험지에서 문제를 찾지 못했습니다.<br/>
            <span className="font-semibold text-blue-600">인식된 문제: {totalQuestions}개</span>
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-yellow-800 mb-2">💡 해결 방법:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 시험지 이미지가 선명한지 확인</li>
              <li>• 문제 번호가 명확히 보이는지 확인</li>
              <li>• 이미지가 너무 작거나 흐리지 않은지 확인</li>
              <li>• 다른 시험지로 다시 시도해보세요</li>
            </ul>
          </div>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/exam-upload')} 
              className="w-full bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors duration-200"
            >
              📝 새 시험지 업로드
            </button>
            <button 
              onClick={() => navigate('/')} 
              className="w-full bg-gray-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-600 transition-colors duration-200"
            >
              🏠 홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 이하 코드는 resultData와 userData가 확실히 존재할 때 실행됨 ---

  // 📊 채점 통계 계산 (userData가 로드된 후에만 계산)
  const totalQuestions = userData?.questions?.length || 0;
  const correctAnswers = userData?.questions?.filter(q => q.isCorrect).length || 0;
  const wrongAnswers = totalQuestions - correctAnswers;
  
  // 📊 점수 통계 계산 
  const totalPossibleScore = userData?.questions?.reduce((sum, q) => sum + q.score, 0) || 0;
  const earnedScore = userData?.questions?.reduce((sum, q) => sum + q.earnedScore, 0) || 0;
  const scorePercentage = totalPossibleScore > 0 ? Math.round((earnedScore / totalPossibleScore) * 100) : 0;

  // 📊 토큰 절약 정보 (새로운 데이터 구조에서)
  const tokenOptimization = resultData?.processing_summary?.token_optimization || {};



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={handleBackToHome}
                className="text-gray-600 hover:text-gray-800 mr-4 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI 채점 결과
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* 인사말 섹션 */}
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                안녕하세요, {userData.name}님! 👋
              </h2>
              <p className="text-gray-600 text-lg">
                오늘도 목표를 향해 한 걸음 더 나아가세요
              </p>
            </div>
          </div>

          {/* 채점 상세 내역 */}
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">📝 채점 상세 내역</h3>
              
              {/* 시험 정보 및 통계 */}
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  {/* 시험 정보 (좌측) */}
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-lg">{userData.subject?.charAt(0) || '영'}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-lg">{userData.subject} {userData.grade} 모의고사</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span>📅 {userData.examInfo.date}</span>
                        <span>📚 {userData.examInfo.subject}</span>
                        <span>🎓 {userData.grade}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 통계 정보 (우측) */}
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">전체</div>
                      <div className="font-bold text-gray-800">{totalQuestions}문항</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">정답</div>
                      <div className="font-bold text-green-600">{correctAnswers}문항</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">오답</div>
                      <div className="font-bold text-red-600">{wrongAnswers}문항</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">점수</div>
                      <div className="font-bold text-purple-600">{earnedScore}/{totalPossibleScore}점 ({scorePercentage}%)</div>
                    </div>
                  </div>
                </div>
                

              </div>
            </div>

            {/* 문항별 결과 (15개씩 3줄) */}
            <div className="space-y-4">
              {Array.from({ length: 3 }, (_, rowIndex) => (
                <div key={rowIndex}>
                  <div className="flex justify-center items-center gap-1 w-full overflow-x-auto px-2">
                    {userData.questions.slice(rowIndex * 15, (rowIndex + 1) * 15).map((question, colIndex) => (
                      <div
                        key={question.id}
                        className={`relative flex-shrink-0 w-12 h-16 sm:w-14 sm:h-16 lg:w-16 lg:h-20 rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all duration-200 hover:scale-110 cursor-pointer ${
                          question.isCorrect
                            ? 'bg-green-100 text-green-700 border-2 border-green-300'
                            : 'bg-red-100 text-red-700 border-2 border-red-300'
                        }`}
                        title={`문항 ${question.id}: ${question.isCorrect ? '정답' : '오답'} (내 답: ${question.userAnswer}, 정답: ${question.correctAnswer}) - 배점: ${question.score}점, 획득: ${question.earnedScore}점`}
                      >
                        {/* 문항 번호 */}
                        <div className="text-xs sm:text-sm font-bold mb-1">{question.id}</div>
                        
                        {/* 답변 정보 */}
                        <div className="text-[8px] sm:text-[10px] leading-tight text-center">
                          <div className="text-gray-600">내답: {question.userAnswer}</div>
                          <div className={question.isCorrect ? 'text-green-600' : 'text-red-600'}>
                            정답: {question.correctAnswer}
                          </div>
                          <div className="text-blue-600 font-bold mt-1">
                            {question.earnedScore}/{question.score}점
                          </div>
                        </div>

                        {/* 정답/오답 아이콘 */}
                        {question.isCorrect ? (
                          <svg className="absolute -top-1 -right-1 w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="absolute -top-1 -right-1 w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 범례 */}
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              <div className="flex items-center justify-center space-x-8">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
                  <span className="text-sm text-gray-600">정답</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
                  <span className="text-sm text-gray-600">오답</span>
                </div>
              </div>
              
              {/* 점수 분배 안내 */}
              <div className="text-center text-sm text-gray-600">
                <div className="font-semibold mb-2">📊 한국 고등학교 표준 점수 분배</div>
                <div className="flex justify-center space-x-6">
                  <div className="flex items-center space-x-1">
                    <span className="font-medium text-blue-600">1~30번:</span>
                    <span>각 2점</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="font-medium text-purple-600">31~40번:</span>
                    <span>각 3점</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="font-medium text-orange-600">41~45번:</span>
                    <span>각 2점</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="font-bold text-gray-800">총점:</span>
                    <span>{totalPossibleScore}점</span>
                  </div>
                </div>
              </div>
            </div>
          </div>



          {/* 주요 통계 (더미 데이터) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">5회</div>
              <div className="text-sm text-gray-600">모의고사 횟수</div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{earnedScore}점</div>
              <div className="text-sm text-gray-600">AI 채점 점수</div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">
                <span className="text-green-500">+12</span>점
              </div>
              <div className="text-sm text-gray-600">향상도</div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">7일</div>
              <div className="text-sm text-gray-600">학습 스트릭</div>
            </div>
          </div>

          {/* 과목별 성취도와 최근 응시 모의고사 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 과목별 성취도 */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">과목별 성취도</h3>
                <button className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors duration-200">
                  자세히 보기 →
                </button>
              </div>
              
              <div className="space-y-6">
                {[
                  { subject: '국어', score: 92, color: 'from-blue-500 to-blue-600' },
                  { subject: '영어', score: 85, color: 'from-green-500 to-green-600' },
                  { subject: '수학', score: 78, color: 'from-purple-500 to-purple-600' }
                ].map((subject, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">{subject.subject}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-gray-800">{subject.score}점</span>
                        <span className="text-sm text-gray-500">~ 상승</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`bg-gradient-to-r ${subject.color} h-3 rounded-full transition-all duration-1000 relative overflow-hidden`}
                        style={{ width: `${subject.score}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 최근 응시한 모의고사 */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">최근 응시한 모의고사</h3>
                <button className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors duration-200">
                  전체 보기 →
                </button>
              </div>
              
              <div className="space-y-4">
                {[
                  { subject: '국어', title: '2024 수능 모의고사 3회', date: '2024-03-25', score: 94, percent: 91 },
                  { subject: '영어', title: '2024 3월 전국연합', date: '2024-03-22', score: 88, percent: 83 },
                  { subject: '수학', title: '실전 모의고사 1회', date: '2024-03-20', score: 82, percent: 76 }
                ].map((exam, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors duration-200">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${
                      exam.subject === '국어' ? 'bg-blue-500' : 
                      exam.subject === '영어' ? 'bg-green-500' : 'bg-purple-500'
                    }`}>
                      {exam.subject.charAt(0)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{exam.title}</div>
                      <div className="text-sm text-gray-500">{exam.date}</div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-800">{exam.score}점</div>
                      <div className="text-sm text-gray-500">{exam.percent}% 정답률</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 바로가기와 AI 추천 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 바로가기 */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-6">바로가기</h3>
              
              <div className="space-y-4">
                <button 
                  onClick={handleNewExam}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-2xl font-semibold text-left hover:from-blue-600 hover:to-purple-600 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg">📝 새 시험지 업로드</div>
                    </div>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <button 
                  onClick={handleWrongAnswers}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 p-4 rounded-2xl font-semibold text-left transition-all duration-300 hover:scale-105"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg">📚 오답노트 보기</div>
                    </div>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <button 
                  onClick={handleAnalysis}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 p-4 rounded-2xl font-semibold text-left transition-all duration-300 hover:scale-105"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg">📊 학습 분석</div>
                    </div>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>

            {/* AI 추천 모의고사 */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center space-x-2 mb-6">
                <span className="text-xl font-bold text-gray-800">🤖 AI 추천 모의고사</span>
              </div>
              
              <div className="space-y-4">
                {[
                  { title: '취약점 집중 모의고사', desc: '작품과 문학 영역을 특별 집중', level: '수능' },
                  { title: '실전 어법 모의고사', desc: '어법 문법 영역을 특별 집중', level: '70분' }
                ].map((rec, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 mb-1">{rec.title}</div>
                        <div className="text-sm text-gray-600 mb-2">{rec.desc}</div>
                        <span className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                          {rec.level}
                        </span>
                      </div>
                    </div>
                    <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300 mt-3">
                      시작하기
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 이번 주 우수 달성 */}
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl shadow-xl p-8 text-white">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">🏆</span>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-1">이번 주 우수 달성!</h3>
                <p className="text-yellow-100 mb-1">1등 클래스에 오셨습니다</p>
                <div className="flex items-center space-x-4 text-sm">
                  <span>📊 학습 목표까지</span>
                  <span className="font-bold">3회 남음</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}