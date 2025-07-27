// ============================================
// src/pages/ExamUpload.jsx - 시험지 업로드 페이지
// ============================================
// 📝 주요 기능:
// - 라디오버튼 방식의 과목/학년 선택
// - JPG/PNG 형식만 지원하는 드래그 앤 드롭 파일 업로드
// - 실시간 업로드 진행률 표시
// - 폼 데이터 유효성 검사
// - 데이터베이스 스키마(exam_uploads)와 매핑되는 필드 구조
// ============================================

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { examAPI } from '../services/api';

export default function ExamUpload() {
  // 🧭 React Router 네비게이션 훅
  const navigate = useNavigate();

  // 🏠 홈 페이지로 돌아가기 함수
  const handleBackToHome = () => {
    navigate('/');
  };

  // 📋 폼 데이터 상태 관리 (DB exam_uploads 테이블과 매핑)
  const [formData, setFormData] = useState({
    uploadTitle: '',    // upload_title: 사용자가 입력한 제목
    subject: '',        // subject: 과목 (ENUM으로 제한)
    examType: '',       // exam_type: 시험 유형
    examDate: '',       // exam_date: 시험 날짜
    schoolName: '',     // school_name: 학교명
    grade: ''           // grade: 학년 (추가 필드)
  });
  
  // 📎 파일 업로드 관련 상태
  const [selectedFiles, setSelectedFiles] = useState([]);        // 선택된 파일들 배열로 변경
  const [dragActive, setDragActive] = useState(false);           // 드래그 상태 표시
  const [uploadProgress, setUploadProgress] = useState(0);       // 업로드 진행률 (0-100)
  const [isUploading, setIsUploading] = useState(false);         // 업로드 중 상태
  const [error, setError] = useState(null);                      // 에러 상태
  const fileInputRef = useRef(null);                             // 숨겨진 파일 input 참조

  // 📎 추가 파일 업로드 관련 상태 (토큰 절약용)
  const [answerSheetFile, setAnswerSheetFile] = useState(null);     // 답안지 파일
  const [listeningScriptFile, setListeningScriptFile] = useState(null); // 영어듣기 대본 파일
  const [answerSheetDragActive, setAnswerSheetDragActive] = useState(false);
  const [listeningScriptDragActive, setListeningScriptDragActive] = useState(false);
  const answerSheetInputRef = useRef(null);
  const listeningScriptInputRef = useRef(null);

  // 📚 과목 옵션들 (DB 스키마의 ENUM과 일치)
  const subjects = [
    { id: '국어', label: '국어', icon: '📚' },
    { id: '영어', label: '영어', icon: '🇺🇸' },
    { id: '과학', label: '과학', icon: '🔬' },
    { id: '사회', label: '사회', icon: '🌍' },
    { id: '한국사', label: '한국사', icon: '🏛️' },
    { id: '기타', label: '기타', icon: '📝' }
  ];

  // 🎓 학년 옵션들 
  const grades = [
    { id: '1학년', label: '1학년' },
    { id: '2학년', label: '2학년' },
    { id: '3학년', label: '3학년' }
  ];

  // 시험 유형 옵션들
  const examTypes = [
    '중간고사', '기말고사', '모의고사', '수능', '단원평가', '월말평가', '기타'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 📁 파일 선택 및 유효성 검사 함수
  const handleFileSelect = (files) => {
    if (!files || files.length === 0) return;

    const validFiles = [];
    const invalidFiles = [];

    // ✅ 파일 형식 체크 (JPG, PNG, PDF 허용)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // 파일 형식 검사
      if (!allowedTypes.includes(file.type)) {
        invalidFiles.push(file.name);
        continue;
      }

      // ✅ 파일 크기 체크 (10MB 제한 - 서버 부하 방지)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        invalidFiles.push(`${file.name} (크기 초과)`);
        continue;
      }

      validFiles.push(file);
    }

    // 잘못된 파일이 있으면 알림
    if (invalidFiles.length > 0) {
      alert(`다음 파일들은 업로드할 수 없습니다:\n${invalidFiles.join('\n')}\n\n지원 형식: JPG, PNG, PDF (최대 10MB)`);
    }

    // 유효한 파일들만 추가
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setError(null); // 에러 초기화
    }
  };

  // 🎯 드래그 앤 드롭 이벤트 처리
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);    // 드래그 중일 때 시각적 피드백
    } else if (e.type === 'dragleave') {
      setDragActive(false);   // 드래그 영역 벗어날 때
    }
  };

  // 📂 파일 드롭 이벤트 처리
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);  // 기존 유효성 검사 로직 재사용
    }
  };

  const handleFileInputChange = (e) => {
    handleFileSelect(e.target.files);
  };

  // 📁 답안지 파일 선택 및 유효성 검사 함수
  const handleAnswerSheetSelect = (files) => {
    const file = files[0];
    if (!file) return;

    // ✅ 파일 형식 체크 (JPG, PNG, PDF 허용)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('JPG, PNG, PDF 형식의 파일만 업로드 가능합니다.');
      return;
    }

    // ✅ 파일 크기 체크 (10MB 제한)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    setAnswerSheetFile(file);
  };

  // 🎯 답안지 드래그 앤 드롭 이벤트 처리
  const handleAnswerSheetDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setAnswerSheetDragActive(true);
    } else if (e.type === 'dragleave') {
      setAnswerSheetDragActive(false);
    }
  };

  const handleAnswerSheetDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAnswerSheetDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleAnswerSheetSelect(e.dataTransfer.files);
    }
  };

  const handleAnswerSheetInputChange = (e) => {
    handleAnswerSheetSelect(e.target.files);
  };

  // 📁 영어듣기 대본 파일 선택 및 유효성 검사 함수
  const handleListeningScriptSelect = (files) => {
    const file = files[0];
    if (!file) return;

    // ✅ 파일 형식 체크 (PDF, TXT, DOC, DOCX 허용)
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      alert('PDF, TXT, DOC, DOCX 형식의 파일만 업로드 가능합니다.');
      return;
    }

    // ✅ 파일 크기 체크 (5MB 제한)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    setListeningScriptFile(file);
  };

  // 🎯 영어듣기 대본 드래그 앤 드롭 이벤트 처리
  const handleListeningScriptDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setListeningScriptDragActive(true);
    } else if (e.type === 'dragleave') {
      setListeningScriptDragActive(false);
    }
  };

  const handleListeningScriptDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setListeningScriptDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleListeningScriptSelect(e.dataTransfer.files);
    }
  };

  const handleListeningScriptInputChange = (e) => {
    handleListeningScriptSelect(e.target.files);
  };

  // 🚀 폼 제출 및 업로드 처리 (간단한 FormData 방식)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ✅ 필수 필드 유효성 검사
    if (!selectedFiles.length) {
      setError('시험지 파일을 선택해주세요.');
      return;
    }

    if (!formData.subject) {
      setError('과목을 선택해주세요.');
      return;
    }

    if (!formData.grade) {
      setError('학년을 선택해주세요.');
      return;
    }

    setIsUploading(true);
    setError(null);
    
    try {
      // 🔧 FormData 방식 (토큰 절약을 위한 추가 파일 포함)
      const uploadFormData = new FormData();
      // 기존: uploadFormData.append('file', selectedFiles[0]);
      selectedFiles.forEach(file => uploadFormData.append('files', file));
      uploadFormData.append('uploadTitle', formData.uploadTitle || '테스트 업로드');
      uploadFormData.append('subject', formData.subject);
      uploadFormData.append('examType', formData.examType || '기타');
      uploadFormData.append('examDate', formData.examDate || new Date().toISOString().split('T')[0]);
      uploadFormData.append('schoolName', formData.schoolName || '테스트 학교');
      uploadFormData.append('grade', formData.grade);

      // 📎 토큰 절약용 추가 파일들 포함
      if (answerSheetFile) {
        uploadFormData.append('answer_sheet', answerSheetFile);
        console.log('✅ 답안지 파일 추가:', answerSheetFile.name);
      }
      if (listeningScriptFile) {
        uploadFormData.append('listening_script', listeningScriptFile);
        console.log('✅ 영어듣기 대본 파일 추가:', listeningScriptFile.name);
      }

      console.log('업로드 시작...');
      
      // 📊 시뮬레이션된 업로드 진행률
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // 🚀 API 호출
      const response = await examAPI.uploadExamImage(uploadFormData, (progress) => {
        setUploadProgress(Math.min(progress, 90));
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log('업로드 및 분석 결과:', response);

      // ✅ 업로드 성공 시 GradingProgress로 이동 (업로드 정보 state로 전달)
      if (response.files && response.files[0]) {
        navigate('/grading-progress', {
          state: {
            uploadData: {
              files: selectedFiles, // File 객체 배열로 전달!
              subject: formData.subject,
              grade: formData.grade,
              examType: formData.examType,
              uploadTitle: formData.uploadTitle,
              examDate: formData.examDate,
              schoolName: formData.schoolName,
              // 필요시 추가 정보 전달
              answerSheet: answerSheetFile,
              listeningScript: listeningScriptFile
            }
          }
        });
      } else {
        // 예외 처리: 파일 정보가 없는 경우
        console.error('결과 데이터에 파일 정보가 없습니다:', response);
        setError('결과를 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
      
    } catch (err) {
      console.error('업로드 실패:', err);
      setError(err.response?.data?.detail || '업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
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
              시험지 업로드
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 기본 정보 카드 */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">1</span>
                기본 정보
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    업로드 제목 (선택사항)
                  </label>
                  <input
                    type="text"
                    name="uploadTitle"
                    value={formData.uploadTitle}
                    onChange={handleInputChange}
                    placeholder="예: 2024년 1학기 중간고사"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    시험 날짜 (선택사항)
                  </label>
                  <input
                    type="date"
                    name="examDate"
                    value={formData.examDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    학교명 (선택사항)
                  </label>
                  <input
                    type="text"
                    name="schoolName"
                    value={formData.schoolName}
                    onChange={handleInputChange}
                    placeholder="예: 서울고등학교"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    시험 유형 (선택사항)
                  </label>
                  <select
                    name="examType"
                    value={formData.examType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">시험 유형 선택</option>
                    {examTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 과목 선택 카드 */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">2</span>
                과목 선택 <span className="text-red-500 ml-1">*</span>
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {subjects.map(subject => (
                  <label 
                    key={subject.id}
                    className={`relative cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                      formData.subject === subject.id
                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="subject"
                      value={subject.id}
                      checked={formData.subject === subject.id}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-2xl mb-2">{subject.icon}</div>
                      <div className="text-sm font-semibold text-gray-700">{subject.label}</div>
                    </div>
                    {formData.subject === subject.id && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* 학년 선택 카드 */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">3</span>
                학년 선택 <span className="text-red-500 ml-1">*</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-3">
                {grades.map(grade => (
                  <label 
                    key={grade.id}
                    className={`relative cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                      formData.grade === grade.id
                        ? 'border-green-500 bg-green-50 shadow-lg'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="grade"
                      value={grade.id}
                      checked={formData.grade === grade.id}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-sm font-semibold text-gray-700">{grade.label}</div>
                    </div>
                    {formData.grade === grade.id && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* 파일 업로드 카드 */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">4</span>
                시험지 파일 업로드 <span className="text-red-500 ml-1">*</span>
              </h2>
              
              {/* 📎 드래그 앤 드롭 파일 업로드 영역 */}
              <div 
                className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-200 ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50'     // 드래그 중
                    : selectedFiles.length > 0 
                      ? 'border-green-500 bg-green-50' // 파일 선택됨
                      : 'border-gray-300 hover:border-blue-400'  // 기본 상태
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {/* 숨겨진 파일 입력 필드 (JPG/PNG/PDF 허용, 다중 선택 가능) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  multiple
                  onChange={handleFileInputChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                <div className="text-center">
                  {selectedFiles.length > 0 ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-green-600">파일 선택됨</p>
                        <p className="text-gray-600 mt-1">{selectedFiles.length}개 파일</p>
                        <div className="text-sm text-gray-500 mt-1 max-h-20 overflow-y-auto">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="truncate">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                                className="ml-2 text-red-500 hover:text-red-700"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          총 {(selectedFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles([])}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        전체 파일 제거
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-700">
                          시험지 파일들을 드래그하거나 클릭해서 선택하세요
                        </p>
                        <p className="text-gray-500 mt-2">
                          JPG, PNG, PDF 형식 지원 • 최대 10MB • 여러 파일 선택 가능
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 hover:scale-105"
                      >
                        파일 선택하기
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 업로드 진행률 */}
              {isUploading && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>업로드 및 AI 분석 중...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* 추가 파일 업로드 카드 (선택사항) */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">5</span>
                추가 파일 업로드 <span className="text-gray-500 text-sm font-normal ml-2">(선택사항)</span>
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 답안지 업로드 영역 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                    📝 답안지 업로드
                    <span className="text-gray-500 text-sm font-normal ml-2">(선택사항)</span>
                  </h3>
                  
                  <div 
                    className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 ${
                      answerSheetDragActive 
                        ? 'border-blue-500 bg-blue-50'     
                        : answerSheetFile 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-300 hover:border-blue-400'  
                    }`}
                    onDragEnter={handleAnswerSheetDrag}
                    onDragLeave={handleAnswerSheetDrag}
                    onDragOver={handleAnswerSheetDrag}
                    onDrop={handleAnswerSheetDrop}
                  >
                    <input
                      ref={answerSheetInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleAnswerSheetInputChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    <div className="text-center">
                      {answerSheetFile ? (
                        <div className="space-y-3">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-green-600">파일 선택됨</p>
                            <p className="text-xs text-gray-600 mt-1 truncate">{answerSheetFile.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {(answerSheetFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAnswerSheetFile(null)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            파일 제거
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              답안지를 드래그하거나 클릭하세요
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              JPG, PNG, PDF • 최대 10MB
                            </p>
                            
                          </div>
                          <button
                            type="button"
                            onClick={() => answerSheetInputRef.current?.click()}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            파일 선택
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 영어듣기 대본 업로드 영역 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                    🎧 영어듣기 대본 업로드
                    <span className="text-gray-500 text-sm font-normal ml-2">(선택사항)</span>
                  </h3>
                  
                  <div 
                    className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 ${
                      listeningScriptDragActive 
                        ? 'border-blue-500 bg-blue-50'     
                        : listeningScriptFile 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-300 hover:border-blue-400'  
                    }`}
                    onDragEnter={handleListeningScriptDrag}
                    onDragLeave={handleListeningScriptDrag}
                    onDragOver={handleListeningScriptDrag}
                    onDrop={handleListeningScriptDrop}
                  >
                    <input
                      ref={listeningScriptInputRef}
                      type="file"
                      accept=".pdf,.txt,.doc,.docx"
                      onChange={handleListeningScriptInputChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    <div className="text-center">
                      {listeningScriptFile ? (
                        <div className="space-y-3">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-green-600">파일 선택됨</p>
                            <p className="text-xs text-gray-600 mt-1 truncate">{listeningScriptFile.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {(listeningScriptFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setListeningScriptFile(null)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            파일 제거
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M12 7a1 1 0 000 2h.01a1 1 0 000-2H12zM12 11a1 1 0 000 2h.01a1 1 0 000-2H12zM12 15a1 1 0 000 2h.01a1 1 0 000-2H12z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              대본을 드래그하거나 클릭하세요
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              PDF, TXT, DOC, DOCX • 최대 5MB
                            </p>
                            
                          </div>
                          <button
                            type="button"
                            onClick={() => listeningScriptInputRef.current?.click()}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            파일 선택
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700 font-medium">❌ {error}</span>
                </div>
              </div>
            )}

            {/* 제출 버튼 */}
            <div className="flex justify-center pt-6">
              <button
                type="submit"
                disabled={isUploading}
                className={`group relative px-12 py-4 font-bold text-lg rounded-2xl shadow-xl transition-all duration-300 ${
                  isUploading
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-2xl hover:scale-105'
                }`}
              >
                <span className="relative z-10 flex items-center justify-center">
                  {isUploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      AI 분석 중...
                    </>
                  ) : (
                    <>
                      🚀 AI 채점 시작하기
                      <svg className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
                {!isUploading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 rounded-2xl"></div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}