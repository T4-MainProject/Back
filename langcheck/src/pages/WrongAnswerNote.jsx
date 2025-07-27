import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examAPI } from '../services/api';

export default function WrongAnswerNote() {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState('전체');
  const [sortBy, setSortBy] = useState('최신순');
  const [viewMode, setViewMode] = useState('list');
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🏠 뒤로가기
  const handleBackToResult = () => {
    navigate('/grading-result');
  };

  // 문제 선택
  const handleProblemSelect = (problem) => {
    setSelectedProblem(problem);
  };

  // 오답 데이터 가져오기
  useEffect(() => {
    const fetchWrongAnswers = async () => {
      try {
        setLoading(true);
        const response = await examAPI.getWrongAnswers();
        console.log('📊 API 응답:', response);
        
        if (response.success) {
          // 날짜별 그룹핑된 데이터를 평면 배열로 변환
          const allWrongAnswers = [];
          if (response.wrong_answers_by_date) {
            Object.entries(response.wrong_answers_by_date).forEach(([date, problems]) => {
              problems.forEach(problem => {
                allWrongAnswers.push({
                  ...problem,
                  attempt_date: date // 날짜 정보 추가
                });
              });
            });
          } else if (response.wrong_answers) {
            // 기존 형식 지원 (하위 호환성)
            allWrongAnswers.push(...response.wrong_answers);
          }
          
          console.log('📚 변환된 오답 데이터:', allWrongAnswers);
          setWrongAnswers(allWrongAnswers);
          
          // 첫 번째 문제를 기본 선택
          if (allWrongAnswers.length > 0) {
            setSelectedProblem(allWrongAnswers[0]);
            console.log('🎯 선택된 첫 번째 문제:', allWrongAnswers[0]);
          }
        } else {
          setError('오답 데이터를 가져오는데 실패했습니다.');
        }
      } catch (err) {
        console.error('오답 데이터 조회 실패:', err);
        setError('오답 데이터를 가져오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchWrongAnswers();
  }, []);

  // 과목별 필터링 (백엔드에서 이미 틀린 문제만 필터링됨)
  const subjects = ['전체', '국어', '영어', '수학'];
  const filteredProblems = selectedSubject === '전체' 
    ? wrongAnswers 
    : wrongAnswers.filter(problem => problem.subject === selectedSubject);

  // 날짜별로 그룹핑된 문제 목록
  const groupedProblems = filteredProblems.reduce((groups, problem) => {
    const date = problem.attempt_date || (problem.created_at ? new Date(problem.created_at).toLocaleDateString('ko-KR') : '미분류');
    
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(problem);
    return groups;
  }, {});

  // 날짜별로 정렬 (최신순)
  const sortedDates = Object.keys(groupedProblems).sort((a, b) => {
    if (a === '미분류') return 1;
    if (b === '미분류') return -1;
    return new Date(b) - new Date(a);
  });

  // 각 날짜 그룹 내에서 정렬
  sortedDates.forEach(date => {
    groupedProblems[date].sort((a, b) => {
      switch (sortBy) {
        case '최신순':
          return new Date(b.created_at) - new Date(a.created_at);
        case '과목순':
          return a.subject.localeCompare(b.subject);
        case '신뢰도순':
          return (b.confidence || 0) - (a.confidence || 0);
        default:
          return 0;
      }
    });
  });

  // 통계 계산
  const stats = {
    total: filteredProblems.length,
    bySubject: subjects.slice(1).reduce((acc, subject) => {
      acc[subject] = filteredProblems.filter(p => p.subject === subject).length;
      return acc;
    }, {}),
    avgConfidence: filteredProblems.length > 0 
      ? (filteredProblems.reduce((sum, p) => sum + (p.confidence || 0), 0) / filteredProblems.length * 100).toFixed(1)
      : 0
  };

  // 문제 데이터 생성 (실제 데이터 기반)
  const getProblemData = (problem) => {
    // 실제 문제 텍스트가 있으면 사용, 없으면 기본 텍스트
    let questionText = problem.vision_text || "문제 텍스트를 불러올 수 없습니다.";
    
    // 지문이 너무 길면 자르기 (500자 제한)
    if (questionText.length > 500) {
      questionText = questionText.substring(0, 500) + "...";
    }
    
    // 선택지 생성 (실제로는 API에서 받아와야 함)
    const options = [
      { id: 1, text: "①", isCorrect: false, isSelected: problem.user_answer === "1" },
      { id: 2, text: "②", isCorrect: false, isSelected: problem.user_answer === "2" },
      { id: 3, text: "③", isCorrect: false, isSelected: problem.user_answer === "3" },
      { id: 4, text: "④", isCorrect: false, isSelected: problem.user_answer === "4" },
      { id: 5, text: "⑤", isCorrect: false, isSelected: problem.user_answer === "5" }
    ];

    // 정답 선택지 설정
    const correctIndex = parseInt(problem.correct_answer) - 1;
    if (correctIndex >= 0 && correctIndex < options.length) {
      options[correctIndex].isCorrect = true;
    }

    // 사용자가 선택한 답도 설정
    const userIndex = parseInt(problem.user_answer) - 1;
    if (userIndex >= 0 && userIndex < options.length) {
      options[userIndex].isSelected = true;
    }

    return {
      passage: questionText,
      question: `${problem.question_number}번 문제`,
      options: options,
      explanation: "이 문제에 대한 상세한 해설이 여기에 표시됩니다. 정답과 오답의 차이점을 명확히 설명하여 학습에 도움이 됩니다."
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={handleBackToResult}
                className="text-gray-600 hover:text-gray-800 mr-4 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                📚 오답노트
              </h1>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>1/{filteredProblems.length}</span>
              <span>3분</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          
          {/* 통계 카드 */}
          {!loading && !error && filteredProblems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-red-500">
                <div className="flex items-center">
                  <div className="p-3 bg-red-100 rounded-full">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">총 오답</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}개</p>
                  </div>
                </div>
              </div>
              
              {subjects.slice(1).map(subject => (
                <div key={subject} className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <span className="text-blue-600 font-bold">{subject.charAt(0)}</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{subject}</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.bySubject[subject] || 0}개</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 필터 및 정렬 */}
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* 과목 필터 */}
              <div className="flex flex-wrap gap-3">
                {subjects.map((subject) => (
                  <button
                    key={subject}
                    onClick={() => setSelectedSubject(subject)}
                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                      selectedSubject === subject
                        ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {subject}
                  </button>
                ))}
              </div>

              {/* 정렬 및 뷰 모드 */}
              <div className="flex items-center gap-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="최신순">최신순</option>
                  <option value="과목순">과목순</option>
                  <option value="신뢰도순">신뢰도순</option>
                </select>

                <div className="flex bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('card')}
                    className={`px-3 py-2 rounded-lg transition-all duration-200 ${
                      viewMode === 'card' ? 'bg-white shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 rounded-lg transition-all duration-200 ${
                      viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 로딩 상태 */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
              <p className="text-gray-600">오답 데이터를 불러오는 중...</p>
            </div>
          )}

          {/* 에러 상태 */}
          {error && (
            <div className="text-center py-12">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                <p className="text-red-600">{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-4 bg-red-500 text-white px-6 py-2 rounded-xl hover:bg-red-600"
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}

          {/* 메인 콘텐츠 영역 */}
          {!loading && !error && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 왼쪽: 문제 목록 */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">오답 목록</h3>
                  <div className="space-y-3">
                    {filteredProblems.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <p className="text-green-600 text-lg font-medium">🎉 축하합니다!</p>
                          <p className="text-green-700 mt-2">아직 틀린 문제가 없습니다.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto">
                        {sortedDates.map((date) => (
                          <div key={date} className="mb-4">
                            {/* 날짜 헤더 */}
                            <div className="flex items-center justify-between mb-2 px-2">
                              <h4 className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                                📅 {date}
                              </h4>
                              <span className="text-xs text-gray-500">
                                {groupedProblems[date].length}개 문제
                              </span>
                            </div>
                            
                            {/* 해당 날짜의 문제들 */}
                            {groupedProblems[date].map((problem, index) => (
                              <div 
                                key={problem.id} 
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 mb-3 ${
                                  selectedProblem?.id === problem.id 
                                    ? 'border-red-500 bg-red-50' 
                                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                                }`}
                                onClick={() => handleProblemSelect(problem)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                                      {problem.subject}
                                    </span>
                                    <span className="text-sm font-medium text-gray-700">
                                      {problem.exam_title} {problem.question_number}번
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">
                                      신뢰도: {((problem.confidence || 0) * 100).toFixed(1)}%
                                    </span>
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </div>
                                <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                                  <div className="flex items-center justify-between text-sm">
                                    <div>
                                      <span className="text-red-600 font-medium">내 답: </span>
                                      <span className="font-bold text-red-700">{problem.user_answer || 'N/A'}</span>
                                    </div>
                                    <div className="text-gray-400">→</div>
                                    <div>
                                      <span className="text-green-600 font-medium">정답: </span>
                                      <span className="font-bold text-green-700">{problem.correct_answer || 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 오른쪽: 상세 문제 보기 */}
              <div className="lg:col-span-2">
                {selectedProblem ? (
                  <div className="bg-white rounded-2xl shadow-lg p-8">
                    {/* 문제 헤더 */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                          {selectedProblem.subject}
                        </span>
                        <span className="text-gray-600 text-sm font-medium">
                          {selectedProblem.exam_title} {selectedProblem.question_number}번
                        </span>
                        <span className="text-gray-500 text-xs">
                          ({selectedProblem.attempt_date || (selectedProblem.created_at ? new Date(selectedProblem.created_at).toLocaleDateString('ko-KR') : '날짜 없음')})
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        신뢰도: {((selectedProblem.confidence || 0) * 100).toFixed(1)}%
                      </div>
                    </div>



                    {/* 지문 */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <span className="mr-2">📖</span>
                        지문
                      </h4>
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                        {/* 문제 이미지가 있으면 먼저 표시 */}
                        {selectedProblem.question_crop_path && (
                          <div className="mb-4">
                            <img 
                              src={`/api/exams/crops/${selectedProblem.question_crop_path.split('/').pop()}`}
                              alt={`문제 ${selectedProblem.question_number}번`}
                              className="max-w-full h-auto rounded-lg shadow-md mx-auto"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        {/* qna 이미지도 시도 */}
                        <div className="mb-4">
                          <img 
                            src={`/api/exams/crops/crop_1753579152_0_1_qna_${selectedProblem.question_number}.jpg`}
                            alt={`문제 ${selectedProblem.question_number}번`}
                            className="max-w-full h-auto rounded-lg shadow-md mx-auto"
                            onError={(e) => {
                              console.log('이미지 로드 실패:', e.target.src);
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                            {getProblemData(selectedProblem).passage}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 문제 */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-800 mb-3">문제</h4>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="text-gray-700 font-medium">
                          {getProblemData(selectedProblem).question}
                        </p>
                      </div>
                    </div>

                    {/* 선택지 */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-800 mb-3">선택지</h4>
                      <div className="space-y-3">
                        {getProblemData(selectedProblem).options.map((option) => (
                          <div 
                            key={option.id}
                            className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                              option.isSelected && !option.isCorrect
                                ? 'border-red-500 bg-red-50'
                                : option.isCorrect
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700 font-medium">
                                {option.id}. {option.text}
                              </span>
                              <div className="flex items-center space-x-2">
                                {option.isSelected && !option.isCorrect && (
                                  <span className="text-red-600 font-bold text-sm">오답</span>
                                )}
                                {option.isCorrect && (
                                  <span className="text-green-600 font-bold text-sm">정답</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 답안 비교 */}
                    <div className="mb-6">
                      <div className="bg-gradient-to-r from-red-50 to-green-50 border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div>
                              <span className="text-red-600 font-medium text-sm">내가 선택한 답: </span>
                              <span className="font-bold text-red-700">{selectedProblem.user_answer || 'N/A'}</span>
                            </div>
                            <div className="text-gray-400">→</div>
                            <div>
                              <span className="text-green-600 font-medium text-sm">정답: </span>
                              <span className="font-bold text-green-700">{selectedProblem.correct_answer || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 해설 */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">해설</h4>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <p className="text-gray-700 leading-relaxed">
                          {getProblemData(selectedProblem).explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-lg p-8 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-gray-400 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-600 text-lg">왼쪽에서 문제를 선택해주세요</p>
                      <p className="text-gray-500 text-sm mt-2">상세한 문제 내용과 해설을 확인할 수 있습니다</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 하단 액션 버튼 */}
          <div className="mt-12 text-center">
            <button
              onClick={() => navigate('/upload')}
              className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              📝 새로운 시험지로 연습하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 