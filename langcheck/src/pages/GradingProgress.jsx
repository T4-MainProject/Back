// 📁 GradingProgress.jsx 오류 수정 버전

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function GradingProgress() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const uploadData = location.state?.uploadData;

  // 📊 상태 관리 (WebSocket용)
  const [status, setStatus] = useState('연결중');
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [message, setMessage] = useState('서버에 연결하고 있습니다...');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [gradingResults, setGradingResults] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [isGradingCompleted, setIsGradingCompleted] = useState(false); // 채점 완료 상태 추가

  // 🎯 학습법 및 활용팁 슬라이드 데이터
  const serviceSlides = [
    {
      title: "📚 효과적인 학습 전략",
      description: "체계적인 학습 계획으로 성적을 향상시키는 방법을 알아보세요",
      features: [
        "주기적인 모의고사 활용",
        "취약점 집중 보완",
        "학습 진도 체크리스트 작성"
      ],
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "📝 오답노트 활용법",
      description: "틀린 문제를 체계적으로 정리하여 실력을 키우는 방법입니다",
      features: [
        "오답 원인 분석하기",
        "유사 문제 반복 학습",
        "정기적인 복습 스케줄"
      ],
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "🔄 반복학습 전략",
      description: "과학적인 반복 학습으로 장기 기억을 강화하는 방법입니다",
      features: [
        "망각 곡선 활용한 복습",
        "단계별 난이도 조절",
        "성취도 기반 학습량 조정"
      ],
      color: "from-green-500 to-teal-500"
    },
    {
      title: "📊 성취도 추적 관리",
      description: "학습 성과를 시각화하여 동기부여와 목표 달성을 도와드립니다",
      features: [
        "성적 변화 그래프 분석",
        "과목별 강약점 파악",
        "학습 목표 설정과 달성"
      ],
      color: "from-orange-500 to-red-500"
    }
  ];

  // 🌐 WebSocket 연결 및 실시간 업데이트
  useEffect(() => {
    if (!uploadData) {
      navigate('/');
      return;
    }

    // 고유 클라이언트 ID 생성
    const newClientId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setClientId(newClientId);

    const connectWebSocket = () => {
      console.log('🔗 WebSocket 연결 시도:', newClientId);
      
      // 채점이 이미 완료된 경우 연결하지 않음
      if (isGradingCompleted) {
        console.log('✅ 채점이 이미 완료되어 WebSocket 연결을 건너뜁니다.');
        return () => {};
      }
      
      // WebSocket 연결
      const ws = new WebSocket(`ws://localhost:8000/ws/grading/${newClientId}`);
      
      ws.onopen = () => {
        console.log('🔗 WebSocket 연결됨');
        setWsConnected(true);
        setStatus('대기중');
        setMessage('채점 서버에 연결되었습니다.');
        setConnectionAttempts(0);
        
        // 채점이 완료되지 않은 경우에만 시작
        if (!isGradingCompleted) {
          setTimeout(() => {
            startGrading(newClientId);
          }, 500); // 0.5초 대기 후 시작
        }
      };

      ws.onmessage = (event) => {
        try {
          // pong 메시지인지 먼저 확인
          if (event.data === 'pong') {
            console.log('🏓 pong 메시지 수신');
            return;
          }
          
          const data = JSON.parse(event.data);
          console.log('📊 서버에서 받은 데이터:', data);
          
          // 진행률 업데이트
          if (data.progress !== undefined) {
            setProgress(data.progress);
          }
          if (data.status) {
            setStatus(data.status);
          }
          if (data.message) {
            setMessage(data.message);
          }
          if (data.estimated_time !== undefined) {
            setTimeLeft(data.estimated_time);
          }
          
          // 채점 완료 처리
          if (data.status === '채점 완료' && data.results) {
            console.log('🎉 채점 완료! 결과 데이터:', data.results);
            setGradingResults(data.results);
            setIsGradingCompleted(true);
            // 자동 이동(setTimeout(handleViewResults, 2000)) 제거
            // 사용자가 버튼을 눌러야만 이동
          }
          
          // 완료 메시지 처리 (서버에서 보내는 완료 알림)
          if (data.completed || data.status === '채점 완료') {
            console.log('✅ 채점 완료 메시지 수신');
            setIsGradingCompleted(true);
            
            // WebSocket 연결 종료
            setTimeout(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.close(1000, 'Grading completed');
              }
            }, 2000);
          }
          
        } catch (error) {
          console.error('❌ WebSocket 메시지 파싱 오류:', error);
          console.log('📄 원본 메시지:', event.data);
        }
      };

      ws.onclose = (event) => {
        console.log('❌ WebSocket 연결 해제됨:', event.code, event.reason);
        setWsConnected(false);
        
        // 채점이 완료되었거나 정상 종료인 경우 재연결하지 않음
        if (isGradingCompleted || event.code === 1000) {
          console.log('✅ 채점 완료 또는 정상 종료로 재연결하지 않습니다.');
          return;
        }
        
        // 정상 종료가 아닌 경우에만 재연결 시도
        if (event.code !== 1000 && status !== '채점 완료' && connectionAttempts < 3) {
          const nextAttempt = connectionAttempts + 1;
          setConnectionAttempts(nextAttempt);
          
          const waitTime = Math.min(2000 * nextAttempt, 10000); // 최대 10초
          console.log(`🔄 재연결 시도 ${nextAttempt}/3 (${waitTime}ms 후)`);
          
          setTimeout(() => {
            setMessage(`연결이 끊어졌습니다. 재연결 시도 중... (${nextAttempt}/3)`);
            connectWebSocket();
          }, waitTime);
        } else if (status !== '채점 완료') {
          setStatus('연결 실패');
          setMessage('서버 연결에 실패했습니다. 페이지를 새로고침해주세요.');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket 오류:', error);
        setWsConnected(false);
        if (status !== '채점 완료' && !isGradingCompleted) {
          setStatus('연결 오류');
          setMessage('서버 연결에 문제가 발생했습니다.');
        }
      };

      // 연결 상태 모니터링 (30초마다 ping)
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN && !isGradingCompleted) {
          ws.send('ping');
        }
      }, 30000);

      // cleanup 함수 반환
      return () => {
        clearInterval(pingInterval);
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'Component unmounting');
        }
      };
    };

    const cleanup = connectWebSocket();
    
    // 컴포넌트 언마운트시 정리
    return cleanup;
  }, []); // 빈 의존성 배열로 한 번만 실행

  // 🚀 실제 채점 시작 함수
  const startGrading = async (clientId) => {
    // 채점이 이미 완료된 경우 시작하지 않음
    if (isGradingCompleted) {
      console.log('✅ 채점이 이미 완료되어 시작하지 않습니다.');
      return;
    }
    
    try {
      console.log('🚀 채점 시작 요청:', {
        clientId,
        uploadData: uploadData
      });

      // 실제 파일이 없는 경우 오류 처리
      if (!uploadData.files || uploadData.files.length === 0) {
        console.error('❌ 업로드할 파일이 없습니다.');
        setStatus('오류');
        setMessage('업로드할 파일이 없습니다. 다시 시도해주세요.');
        return;
      }

      // FormData 생성
      const formData = new FormData();
      
      // 기본 정보 추가
      formData.append('subject', uploadData.subject || '영어');
      formData.append('grade', uploadData.grade || '고3');
      formData.append('exam_type', uploadData.examType || '모의고사');
      formData.append('client_id', clientId);
      
      // 실제 파일들 추가
      uploadData.files.forEach((file, index) => {
        if (file instanceof File) {
          formData.append('files', file);
          console.log(`📁 파일 ${index + 1} 추가:`, file.name);
        }
      });

      // 추가 파일들
      if (uploadData.answerSheet && uploadData.answerSheet instanceof File) {
        formData.append('answer_sheet', uploadData.answerSheet);
        console.log('📄 답안지 추가:', uploadData.answerSheet.name);
      }
      
      if (uploadData.listeningScript && uploadData.listeningScript instanceof File) {
        formData.append('listening_script', uploadData.listeningScript);
        console.log('📝 듣기 대본 추가:', uploadData.listeningScript.name);
      }

      console.log('📤 백엔드 API 호출 시작...');
      const response = await fetch('/api/grade-exam', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API 응답 오류:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ 채점 요청 성공:', result);
      
      // WebSocket을 통해 진행률을 받으므로 여기서는 성공 로그만 출력
      console.log('🔄 WebSocket을 통해 진행률을 받는 중...');
      
    } catch (error) {
      console.error('❌ 채점 시작 실패:', error);
      setStatus('오류');
      setMessage(`채점을 시작할 수 없습니다: ${error.message}`);
      
      // 오류 발생 시 WebSocket 연결 해제
      if (wsConnected) {
        setWsConnected(false);
      }
    }
  };



  // 🎠 슬라이드 자동 전환
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % serviceSlides.length);
    }, 4000);

    return () => clearInterval(slideTimer);
  }, [serviceSlides.length]);

  // 🏠 홈으로 돌아가기
  const handleBackToHome = () => {
    navigate('/');
  };

  // 📊 결과 보기
  const handleViewResults = () => {
    if (gradingResults) {
      console.log('📊 실제 채점 결과:', gradingResults);
      
      // 백엔드에서 반환된 upload_id를 우선 사용 (여러 가능한 필드에서 찾기)
      const resultId = gradingResults.upload_id || 
                      gradingResults.exam_upload_id ||
                      gradingResults.id ||
                      (gradingResults.upload_info && gradingResults.upload_info.id) ||
                      Date.now().toString();
      
      console.log('🔎 결과 페이지로 이동:', resultId);
      
      // 실제 채점 결과를 결과 페이지로 전달
      navigate(`/grading-result/${resultId}`, { 
        state: {
          ...gradingResults,
          // 추가 정보 포함
          uploadData: uploadData,
          processingTime: timeLeft,
          // 결과 페이지에서 사용할 수 있도록 명시적으로 설정
          upload_id: resultId
        }
      });
      
      // 디버깅용: 토큰 사용량 로그 (화면에는 표시하지 않음)
      if (gradingResults.processing_summary?.token_usage) {
        console.log('🔍 디버깅 - 토큰 사용량:', gradingResults.processing_summary.token_usage);
      }
    } else {
      console.error('❌ 채점 결과가 없습니다.');
      setStatus('오류');
      setMessage('채점 결과를 찾을 수 없습니다. 다시 시도해주세요.');
    }
  };

  // 업로드 데이터가 없으면 홈으로 리다이렉트
  if (!uploadData) {
    return null; // useEffect에서 이미 navigate 처리
  }

  // ⏰ 시간 포맷팅
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 📊 상태별 아이콘
  const getStatusIcon = () => {
    switch (status) {
      case '연결중':
      case '대기중':
        return (
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case '처리중':
      case '거의 완료':
        return (
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-purple-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        );
      case '채점 완료':
        return (
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case '연결 오류':
      case '연결 실패':
      case '오류':
        return (
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI 채점 진행 중
              </h1>
            </div>
            
            {/* 진행률 표시 */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                진행률: <span className="font-bold text-blue-600">{Math.round(progress)}%</span>
              </div>
              <div className="text-sm text-gray-600">
                남은 시간: <span className="font-bold text-purple-600">{formatTime(timeLeft)}</span>
              </div>
              {/* WebSocket 연결 상태 */}
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-500">
                  {wsConnected ? '실시간 연결' : '연결 끊김'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 왼쪽: 진행 상황 */}
            <div className="space-y-6">
              {/* 과목/학년 정보 카드 */}
              <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">시험 정보</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-gray-600 text-sm">과목:</span>
                    <span className="font-medium text-gray-800 ml-2">{uploadData.subject}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-gray-600 text-sm">학년:</span>
                    <span className="font-medium text-gray-800 ml-2">{uploadData.grade}</span>
                  </div>
                  {uploadData.examType && (
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                      <span className="text-gray-600 text-sm">시험 유형:</span>
                      <span className="font-medium text-gray-800 ml-2">{uploadData.examType}</span>
                    </div>
                  )}
                  {clientId && (
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                      <span className="text-gray-600 text-sm">세션 ID:</span>
                      <span className="font-mono text-xs text-gray-600 ml-2">{clientId.slice(0, 8)}...</span>
                    </div>
                  )}
                  {/* 토큰 절약 정보 */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center mb-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                      <span className="text-gray-600 text-sm font-semibold">토큰 절약 모드</span>
                    </div>
                    <div className="ml-6 space-y-1 text-xs text-gray-500">
                      <div className={uploadData.answerSheet ? "text-green-600" : "text-gray-400"}>
                        {uploadData.answerSheet ? "✅ 답안지 제공 (50-70% 절약)" : "❌ 답안지 미제공"}
                      </div>
                      <div className={uploadData.listeningScript ? "text-green-600" : "text-gray-400"}>
                        {uploadData.listeningScript ? "✅ 대본 제공 (추가 20% 절약)" : "❌ 대본 미제공"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 채점 진행 상황 통합 카드 */}
              <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">채점 진행 상황</h3>
                
                <div className="space-y-6">
                  {/* 상태 섹션 */}
                  <div className="text-center border-b border-gray-100 pb-6">
                    <div className="flex justify-center mb-4">
                      {getStatusIcon()}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      {status}
                    </h2>
                    <p className="text-gray-600">
                      {message}
                    </p>
                  </div>

                  {/* 시간 & 진행률 */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <h4 className="text-sm font-semibold text-gray-600 mb-2">남은 시간</h4>
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {formatTime(timeLeft)}
                      </div>
                      <p className="text-gray-500 text-xs mt-1">예상 완료시간</p>
                    </div>

                    <div className="text-center">
                      <h4 className="text-sm font-semibold text-gray-600 mb-2">진행률</h4>
                      <div className="text-3xl font-bold text-blue-600">
                        {Math.round(progress)}%
                      </div>
                      <p className="text-gray-500 text-xs mt-1">처리 완료도</p>
                    </div>
                  </div>

                  {/* 진행률 바 */}
                  <div className="pt-4">
                    <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-1000 relative overflow-hidden"
                        style={{ width: `${progress}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 animate-pulse"></div>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                        status === '오류' || status === '연결 오류' || status === '연결 실패'
                          ? 'bg-red-100 text-red-700'
                          : status === '채점 완료'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {message || '처리 중입니다...'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 완료 버튼 */}
              {status === '채점 완료' && (
                <div className="text-center">
                  <button
                    onClick={handleViewResults}
                    className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                  >
                    📊 채점 결과 보기
                  </button>
                </div>
              )}

              {/* 재시도 버튼 */}
              {(status === '연결 실패' || status === '오류') && (
                <div className="text-center space-y-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    🔄 페이지 새로고침
                  </button>
                  <p className="text-gray-500 text-sm">
                    문제가 지속되면 관리자에게 문의해주세요.
                  </p>
                </div>
              )}
            </div>

            {/* 오른쪽: 서비스 소개 슬라이드 */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-800">
                  학습법 및 활용팁
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  효과적인 학습 전략과 성적 향상 방법을 알아보세요
                </p>
              </div>

              <div className="relative h-96 overflow-hidden">
                {serviceSlides.map((slide, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
                      index === currentSlide ? 'translate-x-0' : 
                      index < currentSlide ? '-translate-x-full' : 'translate-x-full'
                    }`}
                  >
                    <div className={`h-full bg-gradient-to-br ${slide.color} p-8 text-white`}>
                      <div className="flex flex-col justify-center h-full">
                        <h4 className="text-2xl font-bold mb-4">{slide.title}</h4>
                        <p className="text-lg mb-6 text-white/90">{slide.description}</p>
                        
                        <div className="space-y-3">
                          {slide.features.map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex items-center">
                              <div className="w-2 h-2 bg-white/80 rounded-full mr-3"></div>
                              <span className="text-white/90">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 슬라이드 인디케이터 */}
              <div className="flex justify-center space-x-2 p-4 bg-gray-50">
                {serviceSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      index === currentSlide ? 'bg-blue-500' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 하단 업로드 정보 */}
          <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">업로드된 파일 정보</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">파일명:</span>
                <p className="font-medium truncate">{uploadData.fileName || 'exam_paper.jpg'}</p>
              </div>
              <div>
                <span className="text-gray-500">크기:</span>
                <p className="font-medium">
                  {uploadData.fileSize ? (uploadData.fileSize / 1024 / 1024).toFixed(2) : '2.5'} MB
                </p>
              </div>
              <div>
                <span className="text-gray-500">과목:</span>
                <p className="font-medium">{uploadData.subject}</p>
              </div>
              <div>
                <span className="text-gray-500">학년:</span>
                <p className="font-medium">{uploadData.grade}</p>
              </div>
            </div>
            
            {/* WebSocket 디버그 정보 */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h5 className="text-sm font-semibold text-gray-600 mb-2">연결 상태</h5>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  WebSocket: {wsConnected ? '연결됨' : '연결 끊김'}
                </div>
                {clientId && (
                  <div>
                    클라이언트 ID: {clientId.slice(0, 12)}...
                  </div>
                )}
                <div>
                  마지막 업데이트: {new Date().toLocaleTimeString()}
                </div>
                {connectionAttempts > 0 && (
                  <div className="text-yellow-600">
                    재연결 시도: {connectionAttempts}/3
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
