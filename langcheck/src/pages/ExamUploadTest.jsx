import React, { useState, useRef } from 'react';
import { examAPI } from '../services/api';
import './ExamUploadTest.css';
import ReactMarkdown from 'react-markdown';

const ExamUploadTest = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('파일을 선택해주세요.');
      return;
    }
    setIsUploading(true);
    setError(null);
    setResults(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadTitle', '테스트 업로드');
      formData.append('subject', '테스트 과목');
      formData.append('examType', '테스트');
      formData.append('examDate', new Date().toISOString().split('T')[0]);
      formData.append('schoolName', '테스트 학교');
      formData.append('grade', '테스트 학년');
      const response = await examAPI.uploadExamImage(formData);
      setResults(response);
      console.log('업로드 결과:', response);
    } catch (err) {
      console.error('업로드 실패:', err);
      setError(err.response?.data?.detail || '업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
      };
      reader.readAsDataURL(droppedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 최종 결과 테이블
  const renderFinalTable = () => {
    if (!results?.questions) return null;
    return (
      <div className="final-table-section">
        <h3>📋 문제별 분석 결과</h3>
        <table className="final-table">
          <thead>
            <tr>
              <th>문제번호</th>
              <th>OCR 텍스트</th>
              <th>OCR 정답</th>
            </tr>
          </thead>
          <tbody>
            {results.questions.map((q, idx) => (
              <React.Fragment key={idx}>
                <tr>
                  <td>{q.number}</td>
                  <td style={{padding: 0, background: '#fafbfc'}}>
                    {q.ocr_text && q.ocr_text.includes('|') && q.ocr_text.includes('---') ? (
                      <div style={{maxWidth:340, overflowX:'auto'}}>
                        <ReactMarkdown>{q.ocr_text}</ReactMarkdown>
                      </div>
                    ) : q.ocr_text ? (
                      <pre style={{
                        fontFamily: "'D2Coding', 'Consolas', 'monospace', 'Malgun Gothic', 'sans-serif'",
                        fontSize: 15,
                        lineHeight: 1.7,
                        margin: 0,
                        background: 'none',
                        border: 'none',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'keep-all',
                        color: '#222',
                        padding: 0
                      }}>{q.ocr_text}</pre>
                    ) : '-'}
                  </td>
                  <td style={{fontWeight:'bold', color:'#1976d2'}}>{q.final_answer || '-'}</td>
                </tr>
                {q.gpt_feedback && (
                  <tr>
                    <td colSpan={3} style={{background:'#f6f8fa', borderTop:'1px solid #e3e7ef', padding:'12px 20px'}}>
                      <div style={{fontWeight:'bold', color:'#d32f2f', marginBottom:4}}>오답노트 & 유사문제 (GPT-4o)</div>
                      <pre style={{fontFamily:'inherit', fontSize:14, margin:0, background:'none', border:'none', whiteSpace:'pre-wrap', color:'#333'}}>{q.gpt_feedback}</pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // 헤더 정보
  const renderHeaderInfo = () => {
    if (!results?.header) return null;
    const h = results.header;
    return (
      <div className="header-info" style={{margin:'24px 0', padding:'12px 20px', background:'#f8fafd', borderRadius:8, border:'1px solid #e3e7ef', display:'inline-block'}}>
        <b>시험지 정보:</b>
        <span style={{marginLeft:16}}>연도: {h.year || '-'}</span>
        <span style={{marginLeft:16}}>과목: {h.subject || '-'}</span>
        <span style={{marginLeft:16}}>시험명: {h.exam_type || '-'}</span>
      </div>
    );
  };

  // 전체 OCR 텍스트
  const renderFullOcrText = () => {
    if (!results?.full_ocr_text) return null;
    return (
      <div style={{margin:'32px 0'}}>
        <h3>📝 전체 OCR 텍스트</h3>
        <div style={{background:'#f8f9fa', borderRadius:8, padding:16, fontSize:13, color:'#444', maxHeight:200, overflowY:'auto'}}>
          {results.full_ocr_text.split('\n').map((line, i) => <div key={i}>{line}</div>)}
        </div>
      </div>
    );
  };

  // 자동채점 결과 요약
  const renderAutoGradingSummary = () => {
    if (!results?.grade) return null;
    const grade = results.grade;
    return (
      <div className="auto-grading-summary" style={{margin:'32px 0', padding:'20px', background:'#f8fafd', border:'1px solid #e3e7ef', borderRadius:8}}>
        <h3>🎯 자동 채점 결과</h3>
        <div style={{marginBottom:12}}>
          <b>점수:</b> <span style={{fontSize:22, color:'#1976d2', fontWeight:'bold'}}>{grade.score} / {grade.total_questions}</span>
          <span style={{marginLeft:16, color:'#555'}}>({grade.percentage}%)</span>
        </div>
        <div style={{marginBottom:12}}>
          <b>오답 번호:</b> {grade.wrong_questions && grade.wrong_questions.length > 0 ? (
            grade.wrong_questions.map((w, i) => (
              <span key={i} style={{color:'#d32f2f', marginRight:8}}>{w.question}</span>
            ))
          ) : <span style={{color:'#388e3c'}}>없음</span>}
        </div>
        <div style={{marginBottom:12}}>
          <b>정답지:</b> {Array.isArray(results.answer_key) ? results.answer_key.join(', ') : '-'}
        </div>
        <div style={{marginBottom:12}}>
          <b>내 답안:</b> {Array.isArray(results.student_answers) ? results.student_answers.join(', ') : '-'}
        </div>
        <div>
          <b>답안 분포:</b> {grade.answer_distribution && Object.keys(grade.answer_distribution).length > 0 ? (
            Object.entries(grade.answer_distribution).map(([ans, cnt], i) => (
              <span key={i} style={{marginRight:10}}>{ans}: {cnt}개</span>
            ))
          ) : '-'}
        </div>
      </div>
    );
  };

  return (
    <div className="exam-upload-test">
      <div className="test-header">
        <h1>🧪 시험지 업로드 테스트</h1>
        <p>GPT-4o Vision + YOLO 통합 분석 결과</p>
      </div>
      <div className="upload-section">
        <div 
          className="upload-area"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="file-input"
          />
          {!preview ? (
            <div className="upload-placeholder">
              <div className="upload-icon">📁</div>
              <p>이미지를 드래그하거나 클릭하여 선택하세요</p>
              <p className="upload-hint">JPG, PNG 파일만 지원됩니다</p>
            </div>
          ) : (
            <div className="preview-container">
              <img src={preview} alt="미리보기" className="preview-image" />
              <div className="preview-overlay">
                <button onClick={resetForm} className="reset-btn">다시 선택</button>
              </div>
            </div>
          )}
        </div>
        <div className="upload-actions">
          <button 
            onClick={handleUpload} 
            disabled={!file || isUploading}
            className="upload-btn"
          >
            {isUploading ? '업로드 중...' : '분석 시작'}
          </button>
          {file && (
            <button onClick={resetForm} className="reset-btn">
              초기화
            </button>
          )}
        </div>
        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}
      </div>
      {results && (
        <div className="results-section">
          <div className="results-header">
            <h2>📊 분석 결과</h2>
            <div className="results-summary">
              <span>처리 시간: {results.processing_time || 0}초</span>
              <span>파일명: {results.filename}</span>
            </div>
          </div>
          {renderHeaderInfo()}
          {renderAutoGradingSummary()}
          {renderFinalTable()}
          {renderFullOcrText()}
          <div className="results-actions">
            <button onClick={() => window.print()} className="print-btn">
              🖨️ 결과 인쇄
            </button>
            <button onClick={resetForm} className="new-test-btn">
              🆕 새 테스트
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamUploadTest; 