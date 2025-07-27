import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function GradingResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const resultData = location.state;

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

  // 결과 데이터가 없으면 홈으로 리다이렉트
  if (!resultData) {
    navigate('/');
    return null;
  }

  // 🔍 디버깅용 useEffect (한 번만 실행)
  useEffect(() => {
    console.log('GradingResult에서 받은 데이터:', resultData);
    console.log('examImage 데이터:', resultData.examImage);
    console.log('uploadData 존재 여부:', !!resultData.uploadData);
  }, []); // 빈 의존성 배열로 한 번만 실행

  // 📧 메모리 정리를 위한 useEffect - 더 이상 필요 없음 (base64 데이터 사용)
  useEffect(() => {
    return () => {
      // base64 데이터를 사용하므로 특별한 정리 작업이 필요하지 않음
      console.log('GradingResult 컴포넌트 언마운트');
    };
  }, []); // 빈 의존성 배열로 한 번만 실행

  // 📄 PDF 안전 뷰어 컴포넌트 - 개선된 방식
  const SafePdfViewer = ({ pdfUrl, alt, className }) => {
    const [showIframe, setShowIframe] = useState(false);
    const [debugInfo, setDebugInfo] = useState({});
    
    // PDF URL 분석 및 디버그 정보 생성
    useEffect(() => {
      if (pdfUrl) {
        console.log('PDF URL 분석:', {
          url: pdfUrl,
          length: pdfUrl.length,
          startsWithData: pdfUrl.startsWith('data:'),
          type: pdfUrl.split(',')[0],
          preview: pdfUrl.substring(0, 100) + '...',
          alt: alt
        });
        
        setDebugInfo({
          url: pdfUrl,
          length: pdfUrl.length,
          startsWithData: pdfUrl.startsWith('data:'),
          type: pdfUrl.split(',')[0],
          preview: pdfUrl.substring(0, 100) + '...'
        });
      }
    }, [pdfUrl, alt]);
    
    const handleOpenNewWindow = () => {
      console.log('새 창에서 PDF 열기 시도:', { url: pdfUrl?.substring(0, 100) + '...' });
      
      if (pdfUrl) {
        try {
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>${alt || 'PDF 파일'}</title>
                  <meta charset="UTF-8">
                  <style>
                    body { 
                      margin: 0; 
                      padding: 20px; 
                      font-family: Arial, sans-serif; 
                      background-color: #f5f5f5;
                    }
                    .container {
                      max-width: 100%;
                      margin: 0 auto;
                      background: white;
                      padding: 20px;
                      border-radius: 8px;
                      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .pdf-viewer {
                      width: 100%;
                      height: 80vh;
                      border: 1px solid #ddd;
                      border-radius: 4px;
                    }
                    .error-message {
                      color: #d32f2f;
                      text-align: center;
                      padding: 20px;
                    }
                    .download-button {
                      background: #1976d2;
                      color: white;
                      padding: 10px 20px;
                      border: none;
                      border-radius: 4px;
                      cursor: pointer;
                      margin: 10px;
                    }
                    .download-button:hover {
                      background: #1565c0;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>${alt || 'PDF 파일'}</h1>
                    
                    <div style="margin-bottom: 20px;">
                      <button class="download-button" onclick="downloadPdf()">파일 다운로드</button>
                    </div>
                    
                    <div id="pdf-container">
                      <iframe 
                        src="${pdfUrl}" 
                        class="pdf-viewer"
                        frameborder="0"
                        onload="console.log('PDF 로드 성공')"
                        onerror="showError()"
                      ></iframe>
                    </div>
                    
                    <div id="error-fallback" style="display: none;" class="error-message">
                      <p>PDF를 표시할 수 없습니다.</p>
                      <p>브라우저가 PDF 미리보기를 지원하지 않거나 파일에 문제가 있을 수 있습니다.</p>
                      <button class="download-button" onclick="downloadPdf()">파일 다운로드</button>
                    </div>
                  </div>
                  
                  <script>
                    function showError() {
                      document.getElementById('pdf-container').style.display = 'none';
                      document.getElementById('error-fallback').style.display = 'block';
                    }
                    
                    function downloadPdf() {
                      const link = document.createElement('a');
                      link.href = '${pdfUrl}';
                      link.download = '${alt || 'document.pdf'}';
                      link.click();
                    }
                    
                    // 5초 후 PDF가 로드되지 않으면 에러 메시지 표시
                    setTimeout(() => {
                      const iframe = document.querySelector('iframe');
                      if (iframe && !iframe.contentDocument) {
                        showError();
                      }
                    }, 5000);
                  </script>
                </body>
              </html>
            `);
            newWindow.document.close();
          }
        } catch (error) {
          console.error('새 창 열기 실패:', error);
          alert('새 창을 열 수 없습니다. 브라우저의 팝업 차단 설정을 확인해주세요.');
        }
      }
    };
    
    const handleDownload = () => {
      if (pdfUrl) {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = alt || 'document.pdf';
        link.click();
      }
    };
    
    if (!pdfUrl) {
      return (
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">파일을 찾을 수 없음</h3>
          <p className="text-gray-600">PDF 파일 데이터를 불러올 수 없습니다.</p>
        </div>
      );
    }
    
    return (
      <div className="text-center p-8">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">PDF 파일</h3>
        <p className="text-gray-600 mb-4">{alt}</p>
        
        {/* 디버그 정보 표시 */}
        <div className="bg-gray-100 p-4 rounded-lg mb-4 text-sm text-left">
          <h4 className="font-bold mb-2">파일 정보:</h4>
          <div>• 파일 크기: {debugInfo.length ? `${(debugInfo.length / 1024).toFixed(1)}KB` : '알 수 없음'}</div>
          <div>• 데이터 형식: {debugInfo.startsWithData ? 'Base64 Data URL' : '일반 URL'}</div>
          <div>• MIME 타입: {debugInfo.type || '알 수 없음'}</div>
          <div>• 미리보기: {debugInfo.preview || '없음'}</div>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={handleOpenNewWindow}
            className="bg-red-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-red-600 transition-colors duration-200 mr-2"
          >
            새 창에서 열기
          </button>
          
          <button
            onClick={() => setShowIframe(!showIframe)}
            className="bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors duration-200"
          >
            {showIframe ? '미리보기 숨기기' : '미리보기 보기'}
          </button>
          
          <div className="mt-2">
            <button
              onClick={handleDownload}
              className="bg-green-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-600 transition-colors duration-200"
            >
              다운로드
            </button>
          </div>
        </div>
        
        {showIframe && (
          <div className="mt-6 border rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-3 text-sm text-gray-700 border-b">
              <strong>PDF 미리보기</strong> - 제대로 표시되지 않으면 '새 창에서 열기' 또는 '다운로드'를 사용하세요
            </div>
            
                         <div className="relative bg-white" style={{ height: '600px' }}>
               <iframe
                 src={pdfUrl}
                 className="w-full h-full border-0"
                 title={alt}
                 onLoad={() => console.log('PDF iframe 로드 성공')}
                 onError={() => console.log('PDF iframe 로드 실패')}
               />
             </div>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-bold text-blue-800 mb-2">💡 PDF 보기 방법</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <div>• <strong>새 창에서 열기:</strong> 전체 화면으로 PDF 보기</div>
            <div>• <strong>다운로드:</strong> 컴퓨터에 저장하여 PDF 프로그램으로 열기</div>
            <div>• <strong>미리보기:</strong> 현재 페이지에서 바로 보기 (브라우저 지원 필요)</div>
                  </div>
      </div>

      {/* 🖼️ 이미지 확대/축소 모달 */}
      {isImageModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* 모달 헤더 */}
            <div className="absolute top-4 left-4 right-4 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h3 className="text-white text-lg font-bold">{modalImageAlt}</h3>
                  <div className="text-white text-sm">
                    확대/축소: {Math.round(imageScale * 100)}%
                  </div>
                </div>
                <button
                  onClick={closeImageModal}
                  className="text-white hover:text-gray-300 transition-colors duration-200"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 모달 컨트롤 버튼 */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
              <div className="flex items-center space-x-2 bg-black bg-opacity-60 rounded-full px-4 py-2">
                <button
                  onClick={handleZoomOut}
                  className="text-white hover:text-gray-300 transition-colors duration-200 p-2"
                  title="축소 (Ctrl + -)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                  </svg>
                </button>
                <button
                  onClick={handleResetZoom}
                  className="text-white hover:text-gray-300 transition-colors duration-200 p-2"
                  title="원본 크기"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
                <button
                  onClick={handleZoomIn}
                  className="text-white hover:text-gray-300 transition-colors duration-200 p-2"
                  title="확대 (Ctrl + +)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 이미지 컨테이너 */}
            <div 
              className="w-full h-full flex items-center justify-center overflow-hidden"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              onDoubleClick={handleDoubleClick}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              <img
                src={modalImageUrl}
                alt={modalImageAlt}
                className="max-w-none select-none"
                style={{
                  transform: `scale(${imageScale}) translate(${imagePosition.x / imageScale}px, ${imagePosition.y / imageScale}px)`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                }}
                onError={(e) => {
                  e.target.src = '/image.png';
                  console.warn('모달 이미지 로딩 실패:', modalImageUrl);
                }}
                draggable={false} // HTML 기본 드래그 방지
              />
            </div>

            {/* 배경 클릭 시 모달 닫기 */}
            <div 
              className="absolute inset-0 -z-10"
              onClick={closeImageModal}
            />

            {/* 사용법 안내 */}
            <div className="absolute top-20 left-4">
              <div className="bg-black bg-opacity-60 text-white px-3 py-2 rounded-lg text-sm">
                <div className="space-y-1 text-xs">
                  <div>🖱️ 드래그: 이미지 이동</div>
                  <div>🔍 휠: 확대/축소</div>
                  <div>👆 더블클릭: 위치 리셋</div>
                </div>
              </div>
            </div>

            {/* ESC 키 안내 버튼 */}
            <div className="absolute top-4 right-20">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg border border-white/20 backdrop-blur-sm hover:from-blue-600 hover:to-purple-700 transition-all duration-200 cursor-pointer"
                   onClick={closeImageModal}
                   title="모달 닫기">
                <div className="flex items-center space-x-2">
                  <kbd className="bg-white/20 px-2 py-1 rounded text-xs font-mono">ESC</kbd>
                  <span>닫기</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

  // 🏠 홈으로 돌아가기
  const handleBackToHome = () => {
    navigate('/');
  };

  // 📝 새 모의고사 시작
  const handleNewExam = () => {
    navigate('/upload');
  };

  // 📚 오답노트 보기
  const handleWrongAnswers = () => {
    navigate('/wrong-answer-note');
  };

  // 📊 학습 분석
  const handleAnalysis = () => {
    navigate('/learning-analysis');
  };

  // 📷 시험지 이미지 결정 함수 (업로드된 이미지 우선, 없으면 더미 이미지)
  function getExamImages() {
    console.log('getExamImages 실행 - resultData:', resultData);
    
    // 첫 번째 우선순위: GradingProgress에서 spread된 examImage (base64 변환된 데이터)
    if (resultData && resultData.examImage && Array.isArray(resultData.examImage) && resultData.examImage.length > 0) {
      console.log('✅ examImage 배열 발견:', resultData.examImage.length, '개');
      return resultData.examImage.map((image, index) => ({
        id: index + 1,
        url: image.url, // 이미 base64 데이터 URL
        alt: `채점된 시험지 ${index + 1}페이지 - ${image.name}`,
        isUploaded: true,
        fileName: image.name,
        fileSize: image.size,
        fileType: image.name.split('.').pop().toLowerCase()
      }));
    }
    
    // 두 번째 우선순위: uploadData 내부의 examImage (이전 구조 호환)
    if (resultData && resultData.uploadData && resultData.uploadData.examImage && Array.isArray(resultData.uploadData.examImage) && resultData.uploadData.examImage.length > 0) {
      console.log('✅ uploadData.examImage 배열 발견:', resultData.uploadData.examImage.length, '개');
      return resultData.uploadData.examImage.map((image, index) => ({
        id: index + 1,
        url: image.url, // 이미 base64 데이터 URL
        alt: `채점된 시험지 ${index + 1}페이지 - ${image.name}`,
        isUploaded: true,
        fileName: image.name,
        fileSize: image.size,
        fileType: image.name.split('.').pop().toLowerCase()
      }));
    }
    
    // 마지막: 업로드된 이미지가 없으면 더미 이미지 사용
    console.log('⚠️ 업로드된 이미지가 없어 더미 이미지 사용');
    return [
      { id: 1, url: '/check.png', alt: '시험지 1페이지', isUploaded: false, fileType: 'png' },
      { id: 2, url: '/image.png', alt: '시험지 2페이지', isUploaded: false, fileType: 'png' },
      { id: 3, url: '/start.png', alt: '시험지 3페이지', isUploaded: false, fileType: 'png' }
    ];
  }

  // 📊 한국 고등학교 표준 점수 분배 함수
  const getQuestionScore = (questionNumber) => {
    if (questionNumber >= 1 && questionNumber <= 30) {
      return 2; // 1~30번: 각 2점 (60점)
    } else if (questionNumber >= 31 && questionNumber <= 40) {
      return 3; // 31~40번: 각 3점 (30점)
    } else if (questionNumber >= 41 && questionNumber <= 45) {
      return 2; // 41~45번: 각 2점 (10점)
    }
    return 0; // 총 100점 만점
  };

  // 📊 고정된 더미 데이터 생성 함수 (한 번만 실행되어 일관성 보장)
  const createFixedUserData = () => {
    // 고정된 더미 데이터 (Math.random() 대신 고정된 패턴 사용)
    const fixedAnswers = [
      // 1-15번 문항 (각 2점)
      { user: 1, correct: 1 }, { user: 2, correct: 3 }, { user: 3, correct: 3 }, { user: 4, correct: 4 }, { user: 5, correct: 1 },
      { user: 1, correct: 2 }, { user: 2, correct: 2 }, { user: 3, correct: 4 }, { user: 4, correct: 5 }, { user: 5, correct: 5 },
      { user: 1, correct: 1 }, { user: 2, correct: 3 }, { user: 3, correct: 3 }, { user: 4, correct: 2 }, { user: 5, correct: 5 },
      
      // 16-30번 문항 (각 2점)
      { user: 1, correct: 1 }, { user: 2, correct: 2 }, { user: 3, correct: 1 }, { user: 4, correct: 4 }, { user: 5, correct: 5 },
      { user: 1, correct: 3 }, { user: 2, correct: 2 }, { user: 3, correct: 3 }, { user: 4, correct: 4 }, { user: 5, correct: 2 },
      { user: 1, correct: 1 }, { user: 2, correct: 2 }, { user: 3, correct: 4 }, { user: 4, correct: 4 }, { user: 5, correct: 5 },
      
      // 31-40번 문항 (각 3점)
      { user: 1, correct: 2 }, { user: 2, correct: 2 }, { user: 3, correct: 1 }, { user: 4, correct: 4 }, { user: 5, correct: 3 },
      { user: 1, correct: 1 }, { user: 2, correct: 4 }, { user: 3, correct: 3 }, { user: 4, correct: 4 }, { user: 5, correct: 5 },
      
      // 41-45번 문항 (각 2점)
      { user: 1, correct: 1 }, { user: 2, correct: 3 }, { user: 3, correct: 3 }, { user: 4, correct: 2 }, { user: 5, correct: 5 }
    ];

    return {
      name: '김학생',
      examCount: 5,
      currentScore: resultData.score || 87,
      improvement: '+12',
      streak: 7,
      // 📝 시험 정보
      examInfo: {
        name: '2024년 3월 전국연합학력평가',
        date: '2024년 3월 25일',
        subject: '수학'
      },
      // 📝 문항별 채점 결과 (총 45문항, 15개씩 3줄) - 고정된 데이터 사용
      questions: Array.from({ length: 45 }, (_, i) => {
        const questionNumber = i + 1;
        const answerData = fixedAnswers[i];
        const userAnswer = answerData.user;
        const correctAnswer = answerData.correct;
        const isCorrect = userAnswer === correctAnswer;
        const score = getQuestionScore(questionNumber);
        return {
          id: questionNumber,
          isCorrect: isCorrect,
          userAnswer: userAnswer,
          correctAnswer: correctAnswer,
          score: score, // 문항별 배점
          earnedScore: isCorrect ? score : 0 // 획득 점수
        };
      }),
      // 📷 채점된 시험지 이미지들 - 업로드된 이미지를 우선 사용
      examImages: getExamImages(),
      subjectScores: [
        { subject: '국어', score: 92, color: 'from-blue-500 to-blue-600' },
        { subject: '영어', score: 85, color: 'from-green-500 to-green-600' },
        { subject: '수학', score: 78, color: 'from-purple-500 to-purple-600' }
      ],
      recentExams: [
        { subject: '국어', title: '2024 수능 모의고사 3회', date: '2024-03-25', score: 94, percent: 91 },
        { subject: '영어', title: '2024 3월 전국연합', date: '2024-03-22', score: 88, percent: 83 },
        { subject: '수학', title: '실전 모의고사 1회', date: '2024-03-20', score: 82, percent: 76 }
      ],
      recommendations: [
        { title: '취약점 집중 모의고사', desc: '작품과 문학 영역을 특별 집중', level: '수능' },
        { title: '실전 어법 모의고사', desc: '어법 문법 영역을 특별 집중', level: '70분' }
      ]
    };
  };

  // userData 초기화 (컴포넌트 마운트 시 한 번만 실행)
  useEffect(() => {
    // userData가 없거나 resultData가 변경되었을 때만 실행
    setUserData(createFixedUserData());
  }, [resultData]); // resultData가 변경될 때만 재실행

  // 📊 채점 통계 계산 (userData가 로드된 후에만 계산)
  const totalQuestions = userData?.questions?.length || 0;
  const correctAnswers = userData?.questions?.filter(q => q.isCorrect).length || 0;
  const wrongAnswers = totalQuestions - correctAnswers;
  
  // 📊 점수 통계 계산 
  const totalPossibleScore = userData?.questions?.reduce((sum, q) => sum + q.score, 0) || 0;
  const earnedScore = userData?.questions?.reduce((sum, q) => sum + q.earnedScore, 0) || 0;
  const scorePercentage = totalPossibleScore > 0 ? Math.round((earnedScore / totalPossibleScore) * 100) : 0;

  // 📄 페이지 내비게이션 함수
  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min((userData?.examImages?.length || 1) - 1, prev + 1));
  };

  // 🖼️ 이미지 모달 관련 함수들
  const openImageModal = (imageUrl, imageAlt) => {
    setModalImageUrl(imageUrl);
    setModalImageAlt(imageAlt);
    setIsImageModalOpen(true);
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setModalImageUrl('');
    setModalImageAlt('');
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
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
    // 확대 상태와 관계없이 항상 드래그 가능하도록 변경
    setIsDragging(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    });
    e.preventDefault(); // 기본 드래그 동작 방지
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // 부드러운 이동을 위한 경계 제한 (선택적)
      // 너무 멀리 나가지 않도록 제한 (화면 크기의 절반 정도)
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

  // 터치 디바이스 지원을 위한 핸들러
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
      
      // 부드러운 이동을 위한 경계 제한
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

  // 더블 클릭으로 이미지 위치와 크기 리셋
  const handleDoubleClick = () => {
    setImagePosition({ x: 0, y: 0 });
    setImageScale(1);
  };

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
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto'; // 스크롤 복원
    };
  }, [isImageModalOpen]);

  // 휠 줌 기능
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setImageScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  // userData가 로드되지 않았을 때 로딩 상태 표시
  if (!userData) {
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
                      <span className="text-white font-bold text-lg">{userData.examInfo.subject.charAt(0)}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-lg">{userData.examInfo.name}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span>📅 {userData.examInfo.date}</span>
                        <span>📚 {userData.examInfo.subject}</span>
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
                  {/* 15개 문항을 정확히 한 줄에 배치 */}
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

          {/* 채점된 시험지 이미지 뷰어 */}
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">📄 채점된 시험지</h3>
              <div className="flex items-center space-x-4">
                {/* 업로드된 이미지 정보 표시 */}
                {userData.examImages[currentPage]?.isUploaded && (
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">업로드됨</span>
                      {userData.examImages[currentPage].fileName && (
                        <span className="truncate max-w-32">{userData.examImages[currentPage].fileName}</span>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>{currentPage + 1}</span>
                  <span>/</span>
                  <span>{userData.examImages.length}</span>
                </div>
              </div>
            </div>

            {/* 이미지 뷰어 */}
            <div className="relative">
              <div className="flex items-center justify-center bg-gray-50 rounded-2xl overflow-hidden min-h-96">
                {userData.examImages[currentPage] ? (
                  userData.examImages[currentPage].fileType === 'pdf' ? (
                    // PDF 파일 표시
                    <SafePdfViewer
                      pdfUrl={userData.examImages[currentPage].url}
                      alt={userData.examImages[currentPage].alt}
                      className="max-w-full h-auto max-h-96 object-contain"
                    />
                  ) : (
                    // 이미지 파일 표시 (클릭 시 모달 열기)
                    <div 
                      className="cursor-pointer relative group"
                      onClick={() => openImageModal(userData.examImages[currentPage].url, userData.examImages[currentPage].alt)}
                    >
                      <img
                        src={userData.examImages[currentPage].url}
                        alt={userData.examImages[currentPage].alt}
                        className="max-w-full h-auto max-h-96 object-contain transition-transform duration-200 group-hover:scale-105"
                        onError={(e) => {
                          // 이미지 로딩 실패 시 대체 이미지 표시
                          e.target.src = '/image.png';
                          console.warn('이미지 로딩 실패:', userData.examImages[currentPage].url);
                        }}
                      />
                      {/* 확대 아이콘 오버레이 */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200">
                        <div className="bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-gray-400 text-center">
                    <div className="text-6xl mb-4">📄</div>
                    <div>시험지를 불러오는 중...</div>
                  </div>
                )}
              </div>

              {/* 업로드된 이미지 정보 */}
              {userData.examImages[currentPage]?.isUploaded && userData.examImages[currentPage].fileSize && (
                <div className="mt-4 text-sm text-gray-600 text-center">
                  파일 크기: {(userData.examImages[currentPage].fileSize / 1024 / 1024).toFixed(2)} MB
                </div>
              )}

              {/* 이전/다음 버튼 */}
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 0}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                    currentPage === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                  <span>이전 페이지</span>
                </button>

                <div className="flex items-center space-x-2">
                  {userData.examImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPage(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${
                        index === currentPage
                          ? 'bg-blue-500'
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage === userData.examImages.length - 1}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                    currentPage === userData.examImages.length - 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  <span>다음 페이지</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* 주요 통계 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{userData.examCount}회</div>
              <div className="text-sm text-gray-600">모의고사 횟수</div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{userData.currentScore}점</div>
              <div className="text-sm text-gray-600">AI 채점 점수</div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">
                <span className="text-green-500">{userData.improvement}</span>점
              </div>
              <div className="text-sm text-gray-600">향상도</div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{userData.streak}일</div>
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
                {userData.subjectScores.map((subject, index) => (
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
                {userData.recentExams.map((exam, index) => (
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
                {userData.recommendations.map((rec, index) => (
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

      {/* 🖼️ 이미지 확대/축소 모달 */}
      {isImageModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* 모달 헤더 */}
            <div className="absolute top-4 left-4 z-10">
              <div className="flex items-center space-x-4">
                <h3 className="text-white text-lg font-bold">{modalImageAlt}</h3>
                <div className="text-white text-sm">
                  확대/축소: {Math.round(imageScale * 100)}%
                </div>
              </div>
            </div>

            {/* 모달 컨트롤 버튼 */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
              <div className="flex items-center space-x-2 bg-black bg-opacity-60 rounded-full px-4 py-2">
                <button
                  onClick={handleZoomOut}
                  className="text-white hover:text-gray-300 transition-colors duration-200 p-2"
                  title="축소"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                  </svg>
                </button>
                <button
                  onClick={handleResetZoom}
                  className="text-white hover:text-gray-300 transition-colors duration-200 p-2"
                  title="원본 크기"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
                <button
                  onClick={handleZoomIn}
                  className="text-white hover:text-gray-300 transition-colors duration-200 p-2"
                  title="확대"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 이미지 컨테이너 */}
            <div 
              className="w-full h-full flex items-center justify-center overflow-hidden"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              onDoubleClick={handleDoubleClick}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              <img
                src={modalImageUrl}
                alt={modalImageAlt}
                className="max-w-none select-none"
                style={{
                  transform: `scale(${imageScale}) translate(${imagePosition.x / imageScale}px, ${imagePosition.y / imageScale}px)`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                }}
                onError={(e) => {
                  e.target.src = '/image.png';
                  console.warn('모달 이미지 로딩 실패:', modalImageUrl);
                }}
                draggable={false} // HTML 기본 드래그 방지
              />
            </div>

            {/* 배경 클릭 시 모달 닫기 */}
            <div 
              className="absolute inset-0 -z-10"
              onClick={closeImageModal}
            />

            {/* 사용법 안내 */}
            <div className="absolute top-20 left-4">
              <div className="bg-black bg-opacity-60 text-white px-3 py-2 rounded-lg text-sm">
                <div className="space-y-1 text-xs">
                  <div>🖱️ 드래그: 이미지 이동</div>
                  <div>🔍 휠: 확대/축소</div>
                  <div>👆 더블클릭: 위치 리셋</div>
                </div>
              </div>
            </div>

            {/* ESC 키 안내 버튼 */}
            <div className="absolute top-4 right-20">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg border border-white/20 backdrop-blur-sm hover:from-blue-600 hover:to-purple-700 transition-all duration-200 cursor-pointer"
                   onClick={closeImageModal}
                   title="모달 닫기">
                <div className="flex items-center space-x-2">
                  <kbd className="bg-white/20 px-2 py-1 rounded text-xs font-mono">ESC</kbd>
                  <span>닫기</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 