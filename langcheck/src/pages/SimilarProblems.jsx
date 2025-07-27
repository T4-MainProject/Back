import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function SimilarProblems() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState({});
  const [selectedProblem, setSelectedProblem] = useState(null);

  // URL 파라미터에서 문제 ID 가져오기
  const problemId = location.state?.problemId || 1;
  const originalProblem = location.state?.originalProblem || {};

  // 🏠 뒤로가기
  const handleBackToNote = () => {
    navigate('/wrong-answer-note');
  };

  // 유사 기출문제 더미 데이터 (지문 포함)
  const similarProblems = {
    1: [
      {
        id: 101,
        year: '2023',
        exam: '수능',
        passage: `문화는 인간이 자연 환경에 적응하며 만들어낸 생활 양식의 총체이다. 각 지역과 민족은 그들만의 독특한 자연환경과 역사적 경험을 바탕으로 고유한 문화를 형성해 왔다. 이러한 문화의 다양성은 인류의 소중한 자산이다.

오늘날 세계화의 물결 속에서 서로 다른 문화들이 만나고 있다. 이때 중요한 것은 한 문화가 다른 문화를 일방적으로 흡수하거나 동화시키는 것이 아니라, 서로의 차이를 인정하고 존중하며 조화롭게 공존하는 것이다. 문화의 획일화는 인류의 창조적 잠재력을 제한할 수 있기 때문이다.

따라서 우리는 문화의 다양성을 보호하고 증진시키기 위해 노력해야 한다. 이는 곧 인류 문명의 지속 가능한 발전을 위한 필수 조건이기도 하다.`,
        question: '다음 글에서 필자가 강조하고자 하는 바는?',
        options: [
          '① 문화의 획일성이 세계화에 미치는 긍정적 영향',
          '② 전통문화의 보존이 현대 사회에서 갖는 의미',
          '③ 문화의 다양성이 인류 발전에 갖는 중요성',
          '④ 현대 문명의 발전이 문화 변화에 미치는 영향'
        ],
        answer: 3,
        explanation: '글 전체에서 문화의 다양성이 인류의 소중한 자산이며, 인류 문명의 지속 가능한 발전을 위한 필수 조건임을 강조하고 있습니다. 특히 마지막 문단에서 이를 명확히 드러내고 있습니다.'
      },
      {
        id: 102,
        year: '2022',
        exam: '6월 모의평가',
        passage: `현대 사회에서 문화 간 교류가 활발해지면서 새로운 형태의 문화 융합 현상이 나타나고 있다. 이는 단순히 서로 다른 문화 요소들이 섞이는 것을 넘어서, 완전히 새로운 문화적 가치와 형태를 창출하는 과정이다.

예를 들어, 한국의 K-pop은 서양의 팝 음악과 동양의 전통적 정서가 만나 탄생한 독특한 문화 장르이다. 이처럼 문화 융합은 기존의 문화적 경계를 허물고 새로운 창조적 에너지를 발생시킨다.

중요한 것은 이러한 융합 과정에서 각 문화의 고유성을 잃지 않으면서도 새로운 가치를 만들어내는 것이다.`,
        question: '글의 화제로 가장 적절한 것은?',
        options: [
          '① 문화 간 충돌과 그 해결 방안',
          '② 현대 사회의 문화 융합 현상',
          '③ 전통문화의 보존 필요성',
          '④ 세계화가 문화에 미치는 부정적 영향'
        ],
        answer: 2,
        explanation: '글 전체에서 현대 사회에서 나타나는 문화 융합 현상에 대해 설명하고 있으며, K-pop을 구체적인 사례로 제시하면서 이 현상의 특징과 의미를 다루고 있습니다.'
      },
      {
        id: 103,
        year: '2021',
        exam: '9월 모의평가',
        passage: `문화적 정체성은 개인이나 집단이 특정한 문화에 소속감을 느끼며 형성하는 자아 인식이다. 이는 태어나면서부터 자연스럽게 습득되는 것이 아니라, 사회적 상호작용을 통해 점진적으로 구성되는 것이다.

현대의 다문화 사회에서 개인은 여러 문화에 동시에 노출되며, 이로 인해 복합적인 문화적 정체성을 형성하게 된다. 이는 과거의 단일한 문화적 정체성과는 다른 새로운 형태의 정체성이라고 할 수 있다.

이러한 변화는 개인에게 더 풍부하고 유연한 사고를 가능하게 하지만, 동시에 정체성의 혼란이라는 과제도 안겨준다. 따라서 현대인은 다양한 문화적 요소들을 조화롭게 통합하여 자신만의 고유한 정체성을 형성해 나가야 한다.`,
        question: '다음 글의 주제문은?',
        options: [
          '① 첫 번째 문단의 첫 번째 문장',
          '② 두 번째 문단의 두 번째 문장',
          '③ 세 번째 문단의 첫 번째 문장',
          '④ 마지막 문단의 마지막 문장'
        ],
        answer: 4,
        explanation: '마지막 문장에서 글 전체의 핵심 메시지인 "현대인이 다양한 문화적 요소들을 조화롭게 통합하여 자신만의 고유한 정체성을 형성해야 한다"는 주제를 요약하여 제시하고 있습니다.'
      }
    ],
    2: [
      {
        id: 201,
        year: '2023',
        exam: '수능',
        passage: `Technology has dramatically changed the way we communicate. Social media platforms have made it easier than ever to stay connected with friends and family around the world. However, this convenience comes with certain drawbacks.

Many people now prefer digital communication over face-to-face interaction. While this may seem efficient, it can lead to a lack of genuine human connection. The nuances of body language and tone of voice are often lost in digital messages.

Furthermore, the constant availability of digital communication can create pressure to respond immediately to messages. This can lead to stress and anxiety, particularly among young people who feel obligated to maintain their online presence constantly.`,
        question: 'The word "however" in the passage can be replaced by:',
        options: [
          '① therefore',
          '② moreover',
          '③ nevertheless',
          '④ consequently'
        ],
        answer: 3,
        explanation: '"However"는 앞의 내용과 대조되는 내용을 이어갈 때 사용하는 역접 접속부사로, "nevertheless"와 같은 의미입니다.'
      },
      {
        id: 202,
        year: '2022',
        exam: '6월 모의평가',
        passage: `Climate change is one of the most pressing issues of our time. The Earth\'s temperature has been rising steadily due to increased greenhouse gas emissions. This warming trend is causing significant changes to weather patterns around the globe.

Scientists have been studying this phenomenon for decades. They have collected extensive data showing that human activities are the primary cause of recent climate change. The burning of fossil fuels releases carbon dioxide into the atmosphere, which traps heat and causes global warming.

The effects of climate change are already visible. We can see melting ice caps, rising sea levels, and more frequent extreme weather events. If we don\'t take action soon, these problems will only get worse.`,
        question: 'Which conjunction best fits the blank in "Scientists have been studying this phenomenon for decades, _____ they have strong evidence."?',
        options: [
          '① although',
          '② because',
          '③ and',
          '④ since'
        ],
        answer: 3,
        explanation: '문맥상 과학자들이 수십 년간 연구해왔다는 내용과 강력한 증거를 가지고 있다는 내용을 자연스럽게 연결하는 접속사 "and"가 적절합니다.'
      }
    ],
    3: [
      {
        id: 301,
        year: '2023',
        exam: '수능',
        passage: `이차함수는 y = ax² + bx + c (a ≠ 0) 형태로 나타낼 수 있으며, 그래프는 포물선 모양을 이룬다. 이차함수의 최댓값이나 최솟값은 포물선의 꼭짓점에서 나타난다.

이차함수 f(x) = ax² + bx + c에서 a > 0이면 아래로 볼록한 포물선이 되어 최솟값을 가지고, a < 0이면 위로 볼록한 포물선이 되어 최댓값을 가진다.

꼭짓점의 x좌표는 x = -b/2a로 구할 수 있으며, 이 값을 함수에 대입하면 최댓값 또는 최솟값을 구할 수 있다.`,
        question: 'f(x) = -3x² + 12x - 5의 최댓값은?',
        options: [
          '① 5',
          '② 7',
          '③ 9',
          '④ 11'
        ],
        answer: 2,
        explanation: 'a = -3 < 0이므로 최댓값을 가집니다. 꼭짓점의 x좌표는 x = -12/(2×(-3)) = 2입니다. f(2) = -3(4) + 12(2) - 5 = -12 + 24 - 5 = 7입니다.'
      },
      {
        id: 302,
        year: '2022',
        exam: '6월 모의평가',
        passage: `이차함수의 그래프를 이용하면 이차부등식을 쉽게 해결할 수 있다. 이차함수 y = ax² + bx + c의 그래프와 x축의 교점을 구하면, 이것이 이차방정식 ax² + bx + c = 0의 해가 된다.

판별식 D = b² - 4ac의 값에 따라 교점의 개수가 결정된다. D > 0이면 두 개의 서로 다른 실근을 가지고, D = 0이면 중근을 가지며, D < 0이면 실근이 없다.

이차부등식을 풀 때는 이차함수의 그래프를 그려서 x축보다 위에 있는 부분과 아래에 있는 부분을 구분하여 해를 구한다.`,
        question: '이차함수 y = -x² + 6x - 2의 꼭짓점의 y좌표는?',
        options: [
          '① 5',
          '② 6',
          '③ 7',
          '④ 8'
        ],
        answer: 3,
        explanation: '꼭짓점의 x좌표는 x = -6/(2×(-1)) = 3입니다. y = -(3)² + 6(3) - 2 = -9 + 18 - 2 = 7입니다.'
      }
    ]
  };

  const currentProblems = similarProblems[problemId] || [];

  const handleAnswerSelect = (problemId, optionIndex) => {
    setUserAnswers(prev => ({
      ...prev,
      [problemId]: optionIndex
    }));
  };

  const handleSubmitAnswer = (problemId) => {
    setShowResults(prev => ({
      ...prev,
      [problemId]: true
    }));
  };

  const handleShowProblem = (problemId) => {
    setSelectedProblem(selectedProblem === problemId ? null : problemId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                🔍 유사한 역대 기출문제
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          
          {/* 원본 문제 정보 */}
          {originalProblem.question && (
            <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4">📝 원본 오답 문제</h2>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-gray-700 font-medium">{originalProblem.question}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-red-600">내 답: <strong>{originalProblem.userAnswer}</strong></span>
                  <span className="text-green-600">정답: <strong>{originalProblem.correctAnswer}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* 유사 기출문제 목록 */}
          <div className="space-y-8">
            {currentProblems.map((problem) => (
              <div key={problem.id} className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                
                {/* 문제 헤더 */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <span className="bg-purple-500 text-white px-4 py-2 rounded-full font-bold">
                      {problem.year}년 {problem.exam}
                    </span>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                      기출문제
                    </span>
                  </div>
                  <button
                    onClick={() => handleShowProblem(problem.id)}
                    className={`px-6 py-3 rounded-2xl font-medium transition-all duration-300 ${
                      selectedProblem === problem.id
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {selectedProblem === problem.id ? '문제 접기' : '문제 풀어보기'}
                  </button>
                </div>

                {/* 지문 (있는 경우) */}
                {problem.passage && (
                  <div className="mb-6">
                    <h4 className="font-bold text-gray-800 mb-3">📄 지문</h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {problem.passage}
                      </p>
                    </div>
                  </div>
                )}

                {/* 문제 */}
                <div className="mb-6">
                  <h4 className="font-bold text-gray-800 mb-3">❓ 문제</h4>
                  <p className="text-lg font-semibold text-gray-800 mb-4">{problem.question}</p>
                </div>

                {/* 선택지 및 풀이 */}
                {selectedProblem === problem.id && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                      <h5 className="font-bold text-blue-800 mb-4">선택지</h5>
                      <div className="space-y-3">
                        {problem.options.map((option, optionIndex) => (
                          <label key={optionIndex} className="flex items-center space-x-3 cursor-pointer hover:bg-blue-100 p-2 rounded-xl transition-colors duration-200">
                            <input
                              type="radio"
                              name={`problem-${problem.id}`}
                              value={optionIndex}
                              onChange={() => handleAnswerSelect(problem.id, optionIndex)}
                              className="w-4 h-4 text-purple-600"
                            />
                            <span className={`text-lg ${
                              showResults[problem.id] && optionIndex === problem.answer - 1
                                ? 'text-green-600 font-bold'
                                : showResults[problem.id] && userAnswers[problem.id] === optionIndex && optionIndex !== problem.answer - 1
                                ? 'text-red-600 font-semibold'
                                : 'text-gray-700'
                            }`}>
                              {option}
                            </span>
                          </label>
                        ))}
                      </div>

                      <div className="flex space-x-3 mt-6">
                        <button
                          onClick={() => handleSubmitAnswer(problem.id)}
                          disabled={userAnswers[problem.id] === undefined}
                          className="bg-purple-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-600 transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          정답 확인
                        </button>
                        {showResults[problem.id] && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">정답:</span>
                            <span className="font-bold text-green-600">{problem.answer}번</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 해설 */}
                    {showResults[problem.id] && (
                      <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                        <h6 className="font-bold text-green-800 mb-3">💡 해설</h6>
                        <p className="text-green-700 leading-relaxed">{problem.explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 하단 액션 버튼 */}
          <div className="mt-12 flex justify-center space-x-4">
            <button
              onClick={() => navigate('/wrong-answer-note')}
              className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              📚 오답노트로 돌아가기
            </button>
            <button
              onClick={() => navigate('/upload')}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              📝 새로운 시험지 풀기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 