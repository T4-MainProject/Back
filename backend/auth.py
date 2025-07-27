from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import secrets
import string
import uuid

from config import settings
from database import get_db
from models import User, EmailVerificationToken
from schemas import TokenData

# 비밀번호 해싱
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT 토큰 베어러
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호 검증"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """비밀번호 해싱"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT 액세스 토큰 생성"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[TokenData]:
    """JWT 토큰 검증"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        if email is None:
            return None
        token_data = TokenData(email=email)
        return token_data
    except JWTError:
        return None


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """이메일로 사용자 조회"""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
    """사용자 인증"""
    user = await get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """현재 사용자 가져오기 (JWT 토큰 기반)"""
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보를 확인할 수 없습니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = verify_token(credentials.credentials)
    if token_data is None or token_data.email is None:
        raise credentials_exception
    
    user = await get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="비활성화된 계정입니다."
        )
    
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """현재 활성 사용자 가져오기"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="비활성화된 계정입니다."
        )
    return current_user


def generate_reset_token() -> str:
    """비밀번호 재설정 토큰 생성"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(32))


def generate_reset_code() -> str:
    """비밀번호 재설정 6자리 코드 생성"""
    return ''.join(secrets.choice(string.digits) for _ in range(6))


def generate_verification_token() -> str:
    """이메일 인증 토큰 생성"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(64))


async def get_verification_token(db: AsyncSession, token: str) -> Optional[EmailVerificationToken]:
    """인증 토큰 조회"""
    from datetime import timezone
    result = await db.execute(
        select(EmailVerificationToken).where(
            EmailVerificationToken.token == token,
            EmailVerificationToken.expires_at > datetime.now(timezone.utc),
            EmailVerificationToken.is_used == False
        )
    )
    return result.scalar_one_or_none()


async def verify_email_token(db: AsyncSession, token: str) -> Optional[User]:
    """이메일 인증 토큰 검증 및 사용자 인증 완료"""
    try:
        print(f"🔍 토큰 검증 시작: {token}")
        
        verification_token = await get_verification_token(db, token)
        if not verification_token:
            print(f"❌ 유효한 토큰을 찾을 수 없음: {token}")
            return None
        
        print(f"✅ 토큰 찾음: user_id={verification_token.user_id}")
        
        # 사용자 조회 (user_id로 직접 조회)
        result = await db.execute(
            select(User).where(User.id == verification_token.user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            print(f"❌ 사용자를 찾을 수 없음: user_id={verification_token.user_id}")
            return None
        
        print(f"✅ 사용자 찾음: {user.email}")
        
        # 사용자 인증 완료
        user.is_verified = True
        user.verification_token = None
        
        # 토큰 사용 처리
        verification_token.is_used = True
        
        await db.commit()
        print(f"✅ 인증 완료: {user.email}")
        return user
        
    except Exception as e:
        print(f"❌ 토큰 검증 중 오류: {str(e)}")
        await db.rollback()
        return None


async def get_current_user_from_token(token: str, db: AsyncSession) -> Optional[User]:
    """JWT 토큰으로부터 사용자 정보 추출 (WebSocket용)"""
    try:
        # JWT 토큰 검증
        token_data = verify_token(token)
        if token_data is None or token_data.email is None:
            return None
        
        # 사용자 조회
        user = await get_user_by_email(db, email=token_data.email)
        
        if user is None or not user.is_active:
            return None
        
        return user
    
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"토큰 검증 실패: {e}")
        return None 