# LangCheck 백엔드 설정 가이드

## 필수 설정

### 1. 환경변수 설정

백엔드 폴더에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# 데이터베이스 설정
DATABASE_URL=postgresql+asyncpg://username:password@localhost:5432/langcheck

# JWT 설정
SECRET_KEY=your-secret-key-here-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google Vision API 설정 (선택사항 - 없어도 목업으로 동작)
# Google Cloud Console에서 서비스 계정 키 JSON 파일을 생성하고 
# 해당 파일의 절대 경로를 여기에 설정하세요
GOOGLE_APPLICATION_CREDENTIALS=C:/path/to/your/service-account-key.json
GOOGLE_CLOUD_PROJECT=your-project-id

# Gemini API 설정 (선택사항 - 없어도 목업으로 동작)
# Google AI Studio에서 API 키를 생성하여 설정하세요
GEMINI_API_KEY=your-gemini-api-key

# 개발 모드
DEBUG=True
```

### 2. YOLO 모델 파일

YOLO 모델 파일이 다음 경로에 있는지 확인하세요:
```
backend/weights/yolov8/best.pt
```

### 3. 가상환경 활성화 및 의존성 설치

```bash
cd backend
# 가상환경 활성화 (Windows)
venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt
```

### 4. 서버 실행

```bash
python main.py
```

## API 키 없이 테스트

Google Vision API와 Gemini API 키가 없어도 서비스가 목업 데이터로 동작합니다:

- **Vision API 없음**: 목업 문제번호 인식 결과 반환
- **Gemini API 없음**: 목업 채점 결과 및 해설 반환
- **YOLO 모델 오류**: 목업 체크마크 감지 결과 반환

## 오류 해결

### PyTorch YOLO 모델 로드 오류
PyTorch 2.6의 `weights_only` 문제는 자동으로 처리됩니다. 
여전히 오류가 발생하면 PyTorch를 다운그레이드하세요:

```bash
pip install torch==2.0.1 torchvision==0.15.2
```

### Google Vision API 인증 오류
API 키 없이도 동작하므로 무시하셔도 됩니다. 
실제 사용을 위해서는 Google Cloud Console에서 서비스 계정을 생성하세요.

### 데이터베이스 연결 오류
현재 Supabase 데이터베이스로 설정되어 있습니다. 
로컬 PostgreSQL을 사용하려면 `.env` 파일의 `DATABASE_URL`을 수정하세요.

## API 문서

서버 실행 후 다음 주소에서 API 문서를 확인할 수 있습니다:
- http://localhost:8000/docs (Swagger UI)
- http://localhost:8000/redoc (ReDoc) 