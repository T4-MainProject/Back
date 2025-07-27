import os
from typing import List
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Database - Supabase (환경변수만 사용)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL 환경변수가 설정되지 않았습니다. .env 파일을 확인해주세요.")
    
    # JWT - Supabase JWT Secret
    SECRET_KEY: str = os.getenv("SECRET_KEY", "v2AJrVeEHW0Ls9w0D2w2R1tpKu0+7ljBpw4e1uLdArUuqbx2byjdQWO9OUqxAuxUZ")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Email (SMTP)
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "")
    
    # SendGrid 설정
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")
    
    # 네이버 SMTP 설정
    NAVER_SMTP_SERVER: str = os.getenv("NAVER_SMTP_SERVER", "smtp.naver.com")
    NAVER_SMTP_PORT: int = int(os.getenv("NAVER_SMTP_PORT", "587"))
    NAVER_SMTP_USERNAME: str = os.getenv("NAVER_SMTP_USERNAME", "wlstmddmswl@naver.com")
    NAVER_SMTP_PASSWORD: str = os.getenv("NAVER_SMTP_PASSWORD", "6HCR57G3JNKB")
    NAVER_FROM_EMAIL: str = os.getenv("NAVER_FROM_EMAIL", "wlstmddmswl@naver.com")
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Application
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    BASE_URL: str = os.getenv("BASE_URL", "http://localhost:5173")
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000", 
        "http://localhost:5173",
        "http://192.168.0.24:5173",
        "http://192.168.0.24:3000"
    ]
    
    # File Upload
    UPLOAD_DIR: str = "uploads" 
    CROPS_DIR: str = "crops"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # Google Vision API
    GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    GOOGLE_CLOUD_PROJECT: str = os.getenv("GOOGLE_CLOUD_PROJECT", "")
    
    # Gemini API
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")


settings = Settings() 