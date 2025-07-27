// 🚀 완전히 수정된 API 연결 코드 - 백엔드와 100% 동기화

// 🌐 API URL 동적 설정
const getAPIBaseURL = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  console.log('🔍 현재 호스트:', hostname, '포트:', port);
  
  if (hostname === '192.168.0.24') {
    console.log('📡 네트워크 API URL 사용');
    return 'http://192.168.0.24:8000';
  }
  console.log('🏠 로컬호스트 API URL 사용');
  return 'http://localhost:8000';
};

const API_BASE_URL = getAPIBaseURL();
console.log('🎯 최종 API URL:', API_BASE_URL);

// 🔧 강화된 HTTP 요청 헬퍼 함수
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('authToken');
  
  console.log('📤 API 요청:', {
    url,
    method: options.method || 'GET',
    hasToken: !!token,
    endpoint
  });
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  try {
    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    });

    console.log('📥 응답 상태:', response.status, response.statusText);

    if (!response.ok) {
      let errorMessage;
      const contentType = response.headers.get('content-type');
      
      try {
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          console.log('❌ JSON 에러 응답:', errorData);
          errorMessage = errorData.detail || errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        } else {
          const errorText = await response.text();
          console.log('❌ 텍스트 에러 응답:', errorText);
          errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (parseError) {
        console.log('❌ 에러 파싱 실패:', parseError);
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    let result;
    
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      result = await response.text();
    }
    
    console.log('✅ 성공 응답:', result);
    return result;
    
  } catch (error) {
    console.error('🚨 API 요청 실패:', {
      url,
      endpoint,
      error: error.message,
      name: error.name
    });
    
    // 401 인증 오류 처리 - 토큰 만료 시 자동 로그아웃
    if (error.message.includes('401') || error.message.includes('인증 정보를 확인할 수 없습니다')) {
      console.log('🔐 토큰 만료 감지, 자동 로그아웃');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      // 로그인 페이지로 리다이렉트
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // 네트워크 연결 오류 처리
    if (error.name === 'TypeError' || 
        error.message.includes('fetch') || 
        error.message.includes('NetworkError') ||
        error.message.includes('Failed to fetch')) {
      throw new Error(`서버 연결 실패: ${API_BASE_URL}\n백엔드 서버가 실행 중인지 확인해주세요.`);
    }
    
    throw error;
  }
};

// 🗂️ FormData 요청 헬퍼 (파일 업로드용)
const apiFormDataRequest = async (endpoint, formData, onProgress = null) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('authToken');
  
  console.log('📤 FormData 요청:', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // Content-Type은 FormData 사용 시 브라우저가 자동 설정
      },
    });

    console.log('📥 FormData 응답 상태:', response.status);

    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        console.log('❌ FormData 에러:', errorData);
        errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}`;
      } catch {
        const errorText = await response.text();
        console.log('❌ FormData 에러 텍스트:', errorText);
        errorMessage = errorText || `HTTP ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
    
  } catch (error) {
    console.error('🚨 FormData 요청 실패:', error);
    
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      throw new Error(`서버 연결 실패: ${API_BASE_URL}\n백엔드 서버가 실행 중인지 확인해주세요.`);
    }
    throw error;
  }
};

// 🔐 인증 관련 API (auth.py 라우터와 완전 동기화)
export const authAPI = {
  // 회원가입 ✅
  register: async (userData) => {
    console.log('👤 회원가입 요청:', userData.email);
    return await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // 로그인 ✅
  login: async (email, password) => {
    console.log('🔑 로그인 시도:', email);
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // 토큰과 사용자 정보 저장
    if (response.access_token) {
      localStorage.setItem('authToken', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      console.log('✅ 로그인 성공, 토큰 저장됨');
    }
    
    return response;
  },

  // 이메일 인증 (GET 방식) ✅
  verifyEmail: async (token) => {
    console.log('📧 이메일 인증 확인:', token);
    return await apiRequest(`/auth/verify-email/${token}`, {
      method: 'GET',
    });
  },

  // 이메일 인증 (POST 방식) ✅
  verifyEmailPost: async (token) => {
    console.log('📧 이메일 인증 POST:', token);
    return await apiRequest('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  // 이메일 인증 재전송 ✅
  resendVerification: async (email) => {
    console.log('📧 인증 이메일 재전송:', email);
    return await apiRequest('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // 임시 비밀번호 발송 ✅
  sendTemporaryPassword: async (email) => {
    console.log('🔐 임시 비밀번호 발송:', email);
    return await apiRequest('/auth/send-temporary-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // 비밀번호 찾기 (6자리 코드 발송) ✅
  forgotPassword: async (email) => {
    console.log('🔐 비밀번호 찾기:', email);
    return await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // 비밀번호 재설정 (토큰 방식) ✅
  resetPassword: async (token, newPassword) => {
    console.log('🔐 비밀번호 재설정 (토큰):', token);
    return await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  },

  // 비밀번호 재설정 (6자리 코드 방식) ✅
  resetPasswordWithCode: async (email, code, newPassword, confirmPassword) => {
    console.log('🔐 비밀번호 재설정 (코드):', email, code);
    return await apiRequest('/auth/reset-password-with-code', {
      method: 'POST',
      body: JSON.stringify({ 
        email, 
        code, 
        new_password: newPassword,
        new_password_confirm: confirmPassword
      }),
    });
  },

  // 비밀번호 재설정 토큰 검증 ✅
  verifyResetToken: async (token) => {
    console.log('🔐 재설정 토큰 검증:', token);
    return await apiRequest('/auth/verify-reset-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  // 로그아웃 ✅
  logout: () => {
    console.log('🚪 로그아웃');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },
};

// 👤 사용자 관련 API (users.py 라우터와 동기화 필요)
export const userAPI = {
  // 프로필 조회
  getProfile: async () => {
    console.log('👤 프로필 조회');
    return await apiRequest('/users/me');
  },

  // 프로필 업데이트
  updateProfile: async (userData) => {
    console.log('👤 프로필 업데이트');
    return await apiRequest('/users/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  // 비밀번호 변경
  changePassword: async (currentPassword, newPassword) => {
    console.log('🔐 비밀번호 변경');
    return await apiRequest('/users/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirm: newPassword,
      }),
    });
  },

  // 계정 삭제
  deleteAccount: async () => {
    console.log('🗑️ 계정 삭제');
    return await apiRequest('/users/me', {
      method: 'DELETE',
    });
  },
};

// 📄 시험지 관련 API
export const examAPI = {
  // WebSocket 기반 채점 (main.py의 새로운 엔드포인트) ✅
  gradeExamWithWebSocket: async (formData, clientId = null) => {
    console.log('📊 WebSocket 채점 요청');
    if (clientId) {
      formData.append('client_id', clientId);
    }
    return await apiFormDataRequest('/api/grade-exam', formData);
  },

  // 기존 시험지 업로드 (호환성 유지) ✅
  uploadExamImage: async (formData, onProgress = null) => {
    console.log('📄 시험지 업로드');
    return await apiFormDataRequest('/api/exam-uploads', formData, onProgress);
  },

  // 채점 상태 확인 ✅
  getGradingStatus: async (clientId) => {
    console.log('📊 채점 상태 확인:', clientId);
    return await apiRequest(`/api/grading-status/${clientId}`);
  },

  // 서버 상태 확인 ✅
  checkServerHealth: async () => {
    console.log('🏥 서버 상태 확인');
    return await apiRequest('/health');
  },

  // 서버 정보 ✅
  getServerInfo: async () => {
    console.log('ℹ️ 서버 정보 조회');
    return await apiRequest('/');
  },

  // 백엔드에서 분석 결과 조회 ✅
  getAnalysisResult: async (uploadId) => {
    console.log('📊 분석 결과 조회:', uploadId);
    return await apiRequest(`/exams/${uploadId}/results`);
  },

  // 시각화 이미지 URL
  getVisualizationImage: (filename) => {
    return `${API_BASE_URL}/api/exams/visualization/${filename}`;
  },

  // 크롭 이미지 URL
  getCropImage: (filename) => {
    return `${API_BASE_URL}/api/exams/crops/${filename}`;
  },

  // 분석 결과 임시 저장 (sessionStorage)
  saveAnalysisResultToStorage: (result) => {
    sessionStorage.setItem('lastAnalysisResult', JSON.stringify(result));
    console.log('💾 분석 결과 저장됨');
  },

  // 분석 결과 조회 (sessionStorage)
  getAnalysisResultFromStorage: () => {
    const resultStr = sessionStorage.getItem('lastAnalysisResult');
    return resultStr ? JSON.parse(resultStr) : null;
  },

  // 분석 결과 삭제 (sessionStorage)
  removeAnalysisResultFromStorage: () => {
    sessionStorage.removeItem('lastAnalysisResult');
    console.log('🗑️ 분석 결과 삭제됨');
  },

  // 오답노트 - 전체 틀린 문제 조회
  getWrongAnswers: async () => {
    console.log('📚 오답노트 조회');
    return await apiRequest('/exams/wrong-answers');
  },

  // 오답노트 - 과목별 틀린 문제 조회
  getWrongAnswersBySubject: async (subject) => {
    console.log('📚 과목별 오답노트 조회:', subject);
    return await apiRequest(`/exams/wrong-answers/${subject}`);
  },
};

// 🔌 WebSocket 관리 (채점 진행률용)
export const websocketAPI = {
  connection: null,
  
  // WebSocket 연결 (채점 진행률용) ✅
  connectGrading: (clientId, onMessage, onError = null, onClose = null) => {
    const wsUrl = API_BASE_URL.replace('http', 'ws') + `/ws/grading/${clientId}`;
    console.log('🔌 WebSocket 연결 시도:', wsUrl);
    
    try {
      websocketAPI.connection = new WebSocket(wsUrl);
      
      websocketAPI.connection.onopen = () => {
        console.log('✅ WebSocket 연결 성공');
      };
      
      websocketAPI.connection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket 메시지:', data);
          if (onMessage) onMessage(data);
        } catch (error) {
          console.error('❌ WebSocket 메시지 파싱 오류:', error);
        }
      };
      
      websocketAPI.connection.onerror = (error) => {
        console.error('❌ WebSocket 오류:', error);
        if (onError) onError(error);
      };
      
      websocketAPI.connection.onclose = (event) => {
        console.log('🔌 WebSocket 연결 종료:', event.code, event.reason);
        if (onClose) onClose(event);
      };
      
      return websocketAPI.connection;
      
    } catch (error) {
      console.error('❌ WebSocket 연결 실패:', error);
      if (onError) onError(error);
      throw error;
    }
  },
  
  // WebSocket 연결 해제
  disconnect: () => {
    if (websocketAPI.connection) {
      console.log('🔌 WebSocket 연결 해제');
      websocketAPI.connection.close();
      websocketAPI.connection = null;
    }
  },
  
  // 메시지 전송 (연결 유지용)
  sendMessage: (message) => {
    if (websocketAPI.connection && websocketAPI.connection.readyState === WebSocket.OPEN) {
      websocketAPI.connection.send(message);
      console.log('📤 WebSocket 메시지 전송:', message);
    } else {
      console.warn('⚠️ WebSocket이 연결되지 않음');
    }
  },
  
  // Ping 전송 (연결 유지)
  ping: () => {
    websocketAPI.sendMessage('ping');
  },
};

// 🔔 알림 관련 API
export const notificationAPI = {
  // 알림 목록 조회
  getNotifications: async (page = 1, limit = 20) => {
    return await apiRequest(`/notifications?page=${page}&limit=${limit}`);
  },
  // 알림 읽음 처리
  markAsRead: async (notificationId) => {
    return await apiRequest(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },
  // 알림 삭제
  deleteNotification: async (notificationId) => {
    return await apiRequest(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },
  // 필요에 따라 추가 구현 가능
};

// 🔍 디버깅 및 진단 API
export const debugAPI = {
  // 서버 헬스 체크
  checkServerHealth: async () => {
    try {
      console.log('🏥 서버 헬스 체크...');
      const response = await fetch(`${API_BASE_URL}/health`);
      const result = await response.json();
      console.log('✅ 서버 상태:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ 서버 헬스 체크 실패:', error);
      return { success: false, error: error.message };
    }
  },

  // 서버 루트 확인
  checkServerRoot: async () => {
    try {
      console.log('🏠 서버 루트 확인...');
      const response = await fetch(`${API_BASE_URL}/`);
      const result = await response.json();
      console.log('✅ 서버 루트:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ 서버 루트 확인 실패:', error);
      return { success: false, error: error.message };
    }
  },

  // FastAPI 문서 확인
  checkDocs: async () => {
    try {
      console.log('📚 FastAPI 문서 확인...');
      const response = await fetch(`${API_BASE_URL}/docs`);
      console.log('✅ FastAPI 문서 상태:', response.status);
      return { success: response.ok, status: response.status };
    } catch (error) {
      console.error('❌ FastAPI 문서 확인 실패:', error);
      return { success: false, error: error.message };
    }
  },

  // CORS 확인
  checkCORS: async () => {
    try {
      console.log('🌐 CORS 확인...');
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'OPTIONS',
      });
      console.log('✅ CORS 상태:', response.status);
      return { success: response.ok, status: response.status };
    } catch (error) {
      console.error('❌ CORS 확인 실패:', error);
      return { success: false, error: error.message };
    }
  },

  // 전체 연결 진단
  diagnoseConnection: async () => {
    console.log('🔍 백엔드 연결 진단 시작...');
    console.log('🌐 API URL:', API_BASE_URL);
    
    const results = {
      apiUrl: API_BASE_URL,
      serverHealth: null,
      serverRoot: null,
      fastApiDocs: null,
      corsEnabled: null,
      timestamp: new Date().toISOString()
    };

    // 병렬로 모든 체크 실행
    const [healthCheck, rootCheck, docsCheck, corsCheck] = await Promise.allSettled([
      debugAPI.checkServerHealth(),
      debugAPI.checkServerRoot(),
      debugAPI.checkDocs(),
      debugAPI.checkCORS()
    ]);

    results.serverHealth = healthCheck.status === 'fulfilled' ? healthCheck.value : { success: false, error: healthCheck.reason };
    results.serverRoot = rootCheck.status === 'fulfilled' ? rootCheck.value : { success: false, error: rootCheck.reason };
    results.fastApiDocs = docsCheck.status === 'fulfilled' ? docsCheck.value : { success: false, error: docsCheck.reason };
    results.corsEnabled = corsCheck.status === 'fulfilled' ? corsCheck.value : { success: false, error: corsCheck.reason };

    console.log('🔍 진단 결과:', results);
    
    // 문제 분석 및 해결책 제시
    const issues = [];
    const solutions = [];

    if (!results.serverHealth?.success) {
      issues.push('서버가 응답하지 않음');
      solutions.push('백엔드 서버 실행: uvicorn main:app --reload --host 0.0.0.0 --port 8000');
    }

    if (!results.corsEnabled?.success) {
      issues.push('CORS 설정 문제');
      solutions.push('main.py의 CORS 설정 확인');
    }

    if (issues.length > 0) {
      console.error('🚨 발견된 문제들:', issues);
      console.log('💡 해결 방법들:', solutions);
    } else {
      console.log('✅ 모든 연결 상태가 정상입니다!');
    }

    return {
      ...results,
      issues,
      solutions,
      overallStatus: issues.length === 0 ? 'healthy' : 'unhealthy'
    };
  },

  // 네트워크 상태 확인
  checkNetworkStatus: () => {
    const status = {
      online: navigator.onLine,
      connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection,
      timestamp: new Date().toISOString()
    };
    
    console.log('🌐 네트워크 상태:', status);
    return status;
  }
};

// 💾 로컬 저장소 유틸리티
export const storageUtils = {
  // 사용자 정보 저장
  saveUserToStorage: (user, token) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    console.log('💾 사용자 정보 저장됨');
  },

  // 사용자 정보 조회
  getUserFromStorage: () => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    console.log('📖 저장된 사용자 정보:', user?.email || '없음');
    return user;
  },

  // 사용자 정보 삭제
  removeUserFromStorage: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    console.log('🗑️ 사용자 정보 삭제됨');
  },

  // 인증 토큰 확인
  getAuthToken: () => {
    const token = localStorage.getItem('authToken');
    console.log('🔑 인증 토큰:', token ? '존재함' : '없음');
    return token;
  },

  // 인증 상태 확인
  isAuthenticated: () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    const isAuth = !!(token && user);
    console.log('🔐 인증 상태:', isAuth ? '로그인됨' : '로그아웃됨');
    return isAuth;
  },

  // 분석 결과 임시 저장
  saveAnalysisResult: (result) => {
    sessionStorage.setItem('lastAnalysisResult', JSON.stringify(result));
    console.log('💾 분석 결과 저장됨');
  },

  // 분석 결과 조회
  getAnalysisResult: () => {
    const resultStr = sessionStorage.getItem('lastAnalysisResult');
    return resultStr ? JSON.parse(resultStr) : null;
  },

  // 분석 결과 삭제
  removeAnalysisResult: () => {
    sessionStorage.removeItem('lastAnalysisResult');
    console.log('🗑️ 분석 결과 삭제됨');
  },
};

// 🎯 빠른 테스트 함수들
export const quickTest = {
  // 서버 연결 테스트
  testConnection: async () => {
    console.log('🧪 서버 연결 테스트...');
    try {
      const health = await examAPI.checkServerHealth();
      console.log('✅ 연결 성공:', health);
      return true;
    } catch (error) {
      console.error('❌ 연결 실패:', error.message);
      return false;
    }
  },

  // 로그인 테스트 (테스트 계정)
  testLogin: async (email = 'test@test.com', password = 'test123') => {
    console.log('🧪 로그인 테스트...');
    try {
      const result = await authAPI.login(email, password);
      console.log('✅ 로그인 성공:', result);
      return result;
    } catch (error) {
      console.error('❌ 로그인 실패:', error.message);
      throw error;
    }
  },

  // 회원가입 테스트
  testRegister: async () => {
    const testUser = {
      email: `test_${Date.now()}@example.com`,
      password: 'test123456',
      name: '테스트 사용자',
      phone: '010-1234-5678',
      birth_date: '2000-01-01',
      school: '테스트 학교',
      grade: '고등학교 3학년',
      address: '테스트 주소'
    };

    console.log('🧪 회원가입 테스트...');
    try {
      const result = await authAPI.register(testUser);
      console.log('✅ 회원가입 성공:', result);
      return result;
    } catch (error) {
      console.error('❌ 회원가입 실패:', error.message);
      throw error;
    }
  }
};

// 📤 기본 내보내기
export default {
  authAPI,
  userAPI,
  examAPI,
  websocketAPI,
  debugAPI,
  storageUtils,
  quickTest,
  API_BASE_URL,
  notificationAPI // ← 이 줄 추가!
};