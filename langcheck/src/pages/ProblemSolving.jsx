import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ProblemSolving() {
  const navigate = useNavigate();
  const location = useLocation();
  const problemData = location.state?.problemData;
  
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 뒤로가기
  const handleBackToNote = () => {
    navigate('/wrong-answer-note');
  };

  // 더미 문제 데이터 (실제로는 props로 받아올 데이터)
  const problems = problemData?.problems || [
    {
      id: 101,
      year: '2023',
      exam: '수능',
      subject: '국어',
      category: '독해',
      passage: `다음 글을 읽고 물음에 답하시오.

      문화는 인간이 자연환경과 상호 작용하며 형성한 생활 양식의 총체이다. 문화는 물질적 요소와 정신적 요소로 구분할 수 있는데, 물질적 요소에는 의식주와 관련된 도구나 기술 등이 포함되며, 정신적 요소에는 언어, 종교, 예술, 철학 등이 포함된다.

      문화의 가장 중요한 특징 중 하나는 다양성이다. 지구상에는 수많은 민족과 집단이 있으며, 각각은 고유한 문화를 발달시켜 왔다. 이러한 문화의 다양성은 인류 전체의 소중한 자산이다. 서로 다른 문화 간의 접촉과 교류를 통해 새로운 문화가 창조되기도 하고, 기존 문화가 더욱 풍부해지기도 한다.

      또한 문화는 학습을 통해 전승된다. 인간은 태어날 때부터 특정한 문화 속에서 성장하며, 그 문화의 가치관과 행동 양식을 학습한다. 이러한 문화의 전승 과정에서 언어는 매우 중요한 역할을 한다. 언어는 단순히 의사소통의 도구가 아니라 그 민족의 사고방식과 세계관을 담고 있는 그릇이기 때문이다.

      현대 사회에서는 교통과 통신의 발달로 인해 문화 간의 접촉이 빈번해지고 있다. 이로 인해 문화의 세계화 현상이 나타나고 있으며, 일부에서는 문화의 획일화를 우려하는 목소리도 높아지고 있다. 하지만 진정한 의미의 문화 교류는 서로의 문화를 존중하고 이해하는 바탕 위에서 이루어져야 한다.`,
      question: '다음 글에서 필자가 강조하고자 하는 바는?',
      options: [
        '① 문화의 획일성이 가져오는 장점',
        '② 전통문화의 보존과 계승',
        '③ 문화의 다양성과 그 가치',
        '④ 현대 사회의 문화적 문제점'
      ],
      answer: 3,
      explanation: '이 글에서 필자는 문화의 다양성이 인류 전체의 소중한 자산임을 강조하고 있습니다. 특히 "문화의 가장 중요한 특징 중 하나는 다양성이다"라고 명시하며, 서로 다른 문화 간의 교류를 통해 새로운 문화가 창조되고 기존 문화가 풍부해진다고 설명하고 있습니다.',
      points: 3,
      difficulty: '중'
    },
    {
      id: 102,
      year: '2022',
      exam: '6월 모의평가',
      subject: '국어',
      category: '독해',
      passage: `다음 글을 읽고 물음에 답하시오.

      우리나라의 전통 정원은 자연과의 조화를 중시하는 특징을 보인다. 서양의 기하학적이고 인위적인 정원과는 달리, 우리의 전통 정원은 자연의 아름다움을 있는 그대로 살리면서도 인간의 손길을 은은하게 가미한 것이 특징이다.

      창덕궁의 후원은 이러한 우리 전통 정원의 대표적인 예이다. 후원에는 인위적으로 조성된 부분과 자연 그대로의 모습이 절묘하게 어우러져 있다. 연못과 정자, 그리고 다양한 수목들이 자연스럽게 배치되어 있어 사계절 내내 서로 다른 아름다움을 선사한다.

      특히 우리 전통 정원에서는 '차경(借景)'이라는 기법을 자주 사용했다. 차경이란 정원 밖의 자연 경관을 정원의 일부로 끌어들여 활용하는 기법으로, 정원의 공간을 무한히 확장시키는 효과를 가져온다. 이는 자연을 정복의 대상이 아닌 조화의 상대로 바라보는 우리 조상들의 자연관을 잘 보여준다.`,
      question: '글의 화제로 가장 적절한 것은?',
      options: [
        '① 서양 정원과 동양 정원의 차이점',
        '② 창덕궁 후원의 역사적 가치',
        '③ 우리나라 전통 정원의 특징',
        '④ 차경 기법의 활용 방안'
      ],
      answer: 3,
      explanation: '이 글은 우리나라 전통 정원의 특징에 대해 설명하고 있습니다. 자연과의 조화, 창덕궁 후원의 예, 차경 기법 등을 통해 우리 전통 정원의 고유한 특성을 종합적으로 다루고 있습니다.',
      points: 2,
      difficulty: '하'
    },
    {
      id: 201,
      year: '2023',
      exam: '수능',
      subject: '영어',
      category: '독해',
      passage: `Read the following passage and answer the question.

      Climate change is one of the most pressing issues of our time. While the Earth's climate has always experienced natural variations, the current rate of change is unprecedented and largely attributed to human activities. The burning of fossil fuels, deforestation, and industrial processes have significantly increased the concentration of greenhouse gases in the atmosphere.

      The consequences of climate change are already visible around the world. Rising sea levels threaten coastal communities, extreme weather events are becoming more frequent and severe, and ecosystems are being disrupted. Arctic ice is melting at an alarming rate, and many species are struggling to adapt to rapidly changing conditions.

      However, there is still hope. Governments, businesses, and individuals are taking action to reduce greenhouse gas emissions. Renewable energy sources like solar and wind power are becoming more affordable and widespread. Electric vehicles are gaining popularity, and energy-efficient technologies are being developed at an unprecedented pace.

      The transition to a sustainable future requires collective effort. Every individual can contribute by making environmentally conscious choices in their daily lives. Small actions, when multiplied by millions of people, can have a significant impact on our planet's future.`,
      question: 'What is the main purpose of this passage?',
      options: [
        '① To explain the natural causes of climate change',
        '② To describe the current state of renewable energy',
        '③ To discuss climate change and potential solutions',
        '④ To compare different types of greenhouse gases'
      ],
      answer: 3,
      explanation: 'The passage provides a comprehensive overview of climate change, discussing both its causes and consequences, while also highlighting potential solutions and the need for collective action.',
      points: 3,
      difficulty: '중'
    }
  ];

  const currentProblem = problems[currentProblemIndex];

  // 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 답안 선택
  const handleAnswerSelect = (optionIndex) => {
    setUserAnswers(prev => ({
      ...prev,
      [currentProblem.id]: optionIndex
    }));
  };

  // 정답 확인
  const handleSubmitAnswer = () => {
    setShowResults(prev => ({
      ...prev,
      [currentProblem.id]: true
    }));
  };

  // 다음 문제
  const handleNextProblem = () => {
    if (currentProblemIndex < problems.length - 1) {
      setCurrentProblemIndex(prev => prev + 1);
    }
  };

  // 이전 문제
  const handlePrevProblem = () => {
    if (currentProblemIndex > 0) {
      setCurrentProblemIndex(prev => prev - 1);
    }
  };

  // 전체 제출
  const handleSubmitAll = () => {
    setIsSubmitted(true);
    // 모든 문제에 대해 결과 표시
    const allResults = {};
    problems.forEach(problem => {
      allResults[problem.id] = true;
    });
    setShowResults(allResults);
  };

  // 시간 포맷팅
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 난이도 색상
  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case '하': return 'bg-green-100 text-green-700';
      case '중': return 'bg-yellow-100 text-yellow-700';
      case '상': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // 점수 계산
  const calculateScore = () => {
    let correct = 0;
    let total = 0;
    
    problems.forEach(problem => {
      if (userAnswers[problem.id] !== undefined) {
        total += problem.points;
        if (userAnswers[problem.id] === problem.answer - 1) {
          correct += problem.points;
        }
      }
    });
    
    return { correct, total };
  };

  const { correct, total } = calculateScore();

  if (!problemData) {
    navigate('/wrong-answer-note');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={handleBackToNote}
                className="text-gray-600 hover:text-gray-800 mr-4 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                📝 기출문제 풀이
              </h1>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-sm text-gray-600">
                소요시간: <span className="font-bold text-indigo-600">{formatTime(timeElapsed)}</span>
              </div>
              <div className="text-sm text-gray-600">
                문제: <span className="font-bold text-purple-600">{currentProblemIndex + 1}/{problems.length}</span>
              </div>
              {isSubmitted && (
                <div className="text-sm text-gray-600">
                  점수: <span className="font-bold text-green-600">{correct}/{total}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* 문제 정보 */}
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <span className="bg-indigo-500 text-white px-4 py-2 rounded-full font-bold">
                  {currentProblem.subject}
                </span>
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                  {currentProblem.year}년 {currentProblem.exam}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(currentProblem.difficulty)}`}>
                  난이도: {currentProblem.difficulty}
                </span>
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                  {currentProblem.category}
                </span>
                <span className="text-gray-600 text-sm font-medium">
                  {currentProblem.points}점
                </span>
              </div>
            </div>
          </div>

          {/* 지문 */}
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
            <div className="prose max-w-none">
              <div className="text-gray-800 leading-8 whitespace-pre-line text-lg">
                {currentProblem.passage}
              </div>
            </div>
          </div>

          {/* 문제 */}
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6">{currentProblem.question}</h3>
            
            <div className="space-y-4">
              {currentProblem.options.map((option, index) => (
                <label 
                  key={index} 
                  className={`flex items-center space-x-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                    userAnswers[currentProblem.id] === index 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  } ${
                    showResults[currentProblem.id] && index === currentProblem.answer - 1
                      ? 'border-green-500 bg-green-50'
                      : showResults[currentProblem.id] && userAnswers[currentProblem.id] === index && index !== currentProblem.answer - 1
                      ? 'border-red-500 bg-red-50'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name={`problem-${currentProblem.id}`}
                    value={index}
                    checked={userAnswers[currentProblem.id] === index}
                    onChange={() => handleAnswerSelect(index)}
                    disabled={showResults[currentProblem.id]}
                    className="w-5 h-5 text-indigo-600"
                  />
                  <span className={`flex-1 text-lg ${
                    showResults[currentProblem.id] && index === currentProblem.answer - 1
                      ? 'text-green-700 font-semibold'
                      : showResults[currentProblem.id] && userAnswers[currentProblem.id] === index && index !== currentProblem.answer - 1
                      ? 'text-red-700'
                      : 'text-gray-700'
                  }`}>
                    {option}
                  </span>
                  {showResults[currentProblem.id] && index === currentProblem.answer - 1 && (
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {showResults[currentProblem.id] && userAnswers[currentProblem.id] === index && index !== currentProblem.answer - 1 && (
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </label>
              ))}
            </div>

            {!showResults[currentProblem.id] && userAnswers[currentProblem.id] !== undefined && (
              <div className="mt-6">
                <button
                  onClick={handleSubmitAnswer}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-2xl font-medium hover:from-indigo-600 hover:to-purple-600 transition-all duration-300"
                >
                  정답 확인
                </button>
              </div>
            )}

            {/* 해설 */}
            {showResults[currentProblem.id] && (
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <h4 className="font-bold text-blue-800 mb-3">💡 해설</h4>
                <p className="text-blue-700 leading-7">{currentProblem.explanation}</p>
              </div>
            )}
          </div>

          {/* 네비게이션 */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevProblem}
              disabled={currentProblemIndex === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>이전 문제</span>
            </button>

            <div className="flex space-x-4">
              {!isSubmitted && (
                <button
                  onClick={handleSubmitAll}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl font-medium hover:from-green-600 hover:to-teal-600 transition-all duration-300"
                >
                  전체 제출
                </button>
              )}
              {isSubmitted && (
                <button
                  onClick={() => navigate('/wrong-answer-note')}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-2xl font-medium hover:from-purple-600 hover:to-indigo-600 transition-all duration-300"
                >
                  오답노트로 돌아가기
                </button>
              )}
            </div>

            <button
              onClick={handleNextProblem}
              disabled={currentProblemIndex === problems.length - 1}
              className="flex items-center space-x-2 px-6 py-3 bg-indigo-500 text-white rounded-2xl font-medium hover:bg-indigo-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>다음 문제</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 문제 진행 표시 */}
          <div className="mt-8 bg-white rounded-3xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-800">문제 진행 상황</h4>
              <span className="text-sm text-gray-600">
                완료: {Object.keys(showResults).length}/{problems.length}
              </span>
            </div>
            <div className="flex space-x-2">
              {problems.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentProblemIndex(index)}
                  className={`w-10 h-10 rounded-full font-medium text-sm transition-all duration-200 ${
                    index === currentProblemIndex
                      ? 'bg-indigo-500 text-white'
                      : showResults[problems[index].id]
                      ? userAnswers[problems[index].id] === problems[index].answer - 1
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                      : userAnswers[problems[index].id] !== undefined
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 