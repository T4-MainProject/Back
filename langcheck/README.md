# LangCheck - 언어 학습 검사 플랫폼

이 프로젝트는 React + Vite 프론트엔드와 FastAPI 백엔드를 사용하는 언어 학습 플랫폼입니다.

## 주요 기능

- 회원가입시 이메일 인증
- 비밀번호 재설정 및 임시 비밀번호 발송
- 시험 업로드 및 AI 분석
- 오답노트 생성 및 유사 문제 추천

## 설치 및 실행

### 백엔드 설정

1. Python 가상환경 생성 및 활성화:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. 종속성 설치:
```bash
pip install -r requirements.txt
```

3. 환경 변수 설정:
`.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# 데이터베이스 설정
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/database

# JWT 설정
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 이메일 설정 (Gmail 예시)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com

# Redis 설정
REDIS_URL=redis://localhost:6379

# 애플리케이션 설정
DEBUG=True
```

4. 데이터베이스 마이그레이션:
```bash
# 이메일 인증 테이블 생성
psql -d your_database -f migrations/add_email_verification.sql
```

5. 백엔드 서버 실행:
```bash
uvicorn main:app --reload
```

### 프론트엔드 설정

1. Node.js 종속성 설치:
```bash
npm install
```

2. 프론트엔드 서버 실행:
```bash
npm run dev
```

## 이메일 설정 방법

### Gmail 사용시

1. Gmail 계정에서 2단계 인증 활성화
2. 앱 비밀번호 생성:
   - Google 계정 설정 > 보안 > 앱 비밀번호
   - 앱 선택: 메일, 기기 선택: 사용자 지정
   - 생성된 16자리 비밀번호를 `SMTP_PASSWORD`에 입력

### 다른 이메일 제공업체

- **Outlook/Hotmail**: 
  - SMTP_SERVER: smtp.live.com
  - SMTP_PORT: 587
  
- **Yahoo Mail**:
  - SMTP_SERVER: smtp.mail.yahoo.com
  - SMTP_PORT: 587

- **네이버 메일**:
  - SMTP_SERVER: smtp.naver.com
  - SMTP_PORT: 587

## 이메일 인증 플로우

1. **회원가입**: 사용자가 회원가입하면 이메일 인증 링크가 발송됩니다.
2. **이메일 확인**: 사용자가 이메일의 인증 링크를 클릭합니다.
3. **인증 완료**: 이메일 인증이 완료되면 로그인이 가능합니다.
4. **재전송**: 인증 이메일을 받지 못한 경우 재전송이 가능합니다.

## 비밀번호 복구

1. **비밀번호 재설정**: 이메일로 재설정 링크를 받아 새 비밀번호를 설정합니다.
2. **임시 비밀번호**: 이메일로 임시 비밀번호를 받아 즉시 로그인할 수 있습니다.

## 기술 스택

### 프론트엔드
- React 18
- Vite
- Tailwind CSS
- React Router

### 백엔드
- FastAPI
- PostgreSQL
- SQLAlchemy
- JWT 인증
- SMTP 이메일 발송

## 개발 도구

- ESLint
- Prettier
- Hot Module Replacement (HMR)

## 라이선스

MIT License
