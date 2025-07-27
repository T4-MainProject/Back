from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from database import get_db
from models import User, PasswordResetToken, EmailVerificationToken
from schemas import (
    UserCreate, UserLogin, UserResponse, Token, MessageResponse,
    PasswordResetRequest, PasswordResetConfirm, PasswordResetWithCode, TemporaryPasswordRequest,
    EmailVerificationRequest, EmailVerificationConfirm
)
from auth import (
    get_password_hash, authenticate_user, create_access_token,
    generate_reset_token, generate_reset_code, get_user_by_email, verify_password,
    generate_verification_token, verify_email_token
)
from config import settings
from email_utils import email_service
from email_utils_naver import naver_email_service, generate_temporary_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_create: UserCreate, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """회원가입"""
    
    print(f"🔍 회원가입 시도: {user_create.email}")
    
    # 이메일 중복 확인
    existing_user = await get_user_by_email(db, user_create.email)
    if existing_user:
        print(f"❌ 이미 등록된 이메일: {user_create.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 등록된 이메일입니다."
        )
    
    # 이메일 인증 토큰 생성
    verification_token = generate_verification_token()
    print(f"✅ 인증 토큰 생성: {verification_token[:10]}...")
    
    # 비밀번호 해싱
    hashed_password = get_password_hash(user_create.password)
    
    try:
        # 사용자 생성
        db_user = User(
            email=user_create.email,
            password_hash=hashed_password,
            name=user_create.name,
            phone=user_create.phone,
            birth_date=user_create.birth_date,
            school=user_create.school,
            grade=user_create.grade,
            address=user_create.address,
            is_active=True,
            is_verified=False,  # 🔧 개발용으로 True로 변경 가능
            verification_token=verification_token
        )
        
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        print(f"✅ 사용자 생성 완료: {db_user.id}")
        
        # 이메일 인증 토큰 저장
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)  # 24시간 후 만료
        email_verification_token = EmailVerificationToken(
            user_id=db_user.id,
            token=verification_token,
            expires_at=expires_at,
            is_used=False
        )
        
        db.add(email_verification_token)
        await db.commit()
        print(f"✅ 인증 토큰 저장 완료")
        
        # 백그라운드에서 이메일 발송
        print(f"📧 이메일 발송 준비: {db_user.email}")
        try:
            if naver_email_service:
                print("📧 네이버 이메일 서비스 사용")
                background_tasks.add_task(naver_email_service.send_verification_email, db_user.email, verification_token)
            else:
                print("📧 Gmail 이메일 서비스 사용")
                background_tasks.add_task(email_service.send_verification_email, db_user.email, verification_token)
            print("✅ 이메일 발송 태스크 등록 완료")
        except Exception as email_error:
            print(f"⚠️ 이메일 발송 오류: {email_error}")
            # 이메일 발송 실패해도 회원가입은 성공으로 처리
        
        return MessageResponse(
            message="회원가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요.",
            success=True
        )
        
    except Exception as e:
        print(f"❌ 회원가입 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"회원가입 처리 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/verify-email/{token}", response_model=Token)
async def verify_email_get(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """이메일 인증 확인 (URL 파라미터 방식) - 자동 로그인"""
    
    print(f"🔍 이메일 인증 요청: {token[:10]}...")
    
    try:
        user = await verify_email_token(db, token)
        if not user:
            print(f"❌ 인증 실패: 토큰 {token[:10]}...")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="유효하지 않거나 만료된 인증 토큰입니다."
            )
        
        print(f"✅ 인증 성공: {user.email}")
        
        # 사용자 데이터 새로고침 (모든 필드 로드)
        await db.refresh(user)
        
        # 인증 성공 시 자동으로 JWT 토큰 생성하여 로그인 처리
        access_token = create_access_token(data={"sub": user.email})
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 인증 처리 중 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="이메일 인증 처리 중 오류가 발생했습니다."
        )


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(
    verification: EmailVerificationConfirm,
    db: AsyncSession = Depends(get_db)
):
    """이메일 인증 확인 (기존 POST 방식)"""
    
    print(f"🔍 POST 이메일 인증 요청: {verification.token[:10]}...")
    
    user = await verify_email_token(db, verification.token)
    if not user:
        print(f"❌ POST 인증 실패: {verification.token[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="유효하지 않거나 만료된 인증 토큰입니다."
        )
    
    print(f"✅ POST 인증 성공: {user.email}")
    return MessageResponse(
        message="이메일 인증이 완료되었습니다. 이제 로그인하실 수 있습니다.",
        success=True
    )


@router.post("/login", response_model=Token)
async def login(user_login: UserLogin, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """로그인 - 강화된 디버깅"""
    try:
        print(f"🔍 로그인 시도: {user_login.email}")
        
        user = await authenticate_user(db, user_login.email, user_login.password)
        if not user:
            print(f"❌ 인증 실패: 사용자 정보 없음 또는 비밀번호 틀림")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="이메일 또는 비밀번호가 올바르지 않습니다.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        print(f"✅ 사용자 찾음: {user.email}")
        print(f"🔍 is_active: {user.is_active}")
        print(f"🔍 is_verified: {user.is_verified}")
        
        if not user.is_active:
            print(f"❌ 비활성화된 계정")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="비활성화된 계정입니다."
            )
            
        if not user.is_verified:
            print(f"⚠️ 이메일 미인증 계정, 인증 메일 재전송 시작...")
            
            try:
                # 기존 토큰 무효화
                result = await db.execute(
                    select(EmailVerificationToken).where(
                        EmailVerificationToken.user_id == user.id,
                        EmailVerificationToken.expires_at > datetime.now(timezone.utc),
                        EmailVerificationToken.is_used == False
                    )
                )
                existing_tokens = result.scalars().all()
                print(f"🔍 기존 토큰 개수: {len(existing_tokens)}")
                
                for token in existing_tokens:
                    token.is_used = True
                    print(f"🗑️ 기존 토큰 무효화: {token.token[:10]}...")
                
                # 새 토큰 생성
                verification_token = generate_verification_token()
                expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
                
                email_verification_token = EmailVerificationToken(
                    user_id=user.id,
                    token=verification_token,
                    expires_at=expires_at,
                    is_used=False
                )
                
                db.add(email_verification_token)
                await db.commit()
                
                print(f"✅ 새 인증 토큰 생성: {verification_token[:10]}...")
                print(f"📧 이메일 발송 준비: {user.email}")
                
                # 이메일 발송
                try:
                    if naver_email_service:
                        print("📧 네이버 이메일 서비스 사용")
                        # background_tasks.add_task(naver_email_service.send_verification_email, user.email, verification_token)
                        naver_email_service.send_verification_email(user.email, verification_token)
                    else:
                        print("📧 Gmail 이메일 서비스 사용")
                        # background_tasks.add_task(email_service.send_verification_email, user.email, verification_token)
                        email_service.send_verification_email(user.email, verification_token)
                    print("✅ 동기 호출로 이메일 발송 시도 완료")
                except Exception as email_error:
                    print(f"❌ 이메일 발송 태스크 등록 실패: {email_error}")
                
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="이메일 인증이 완료되지 않았습니다. 인증 메일을 재전송했습니다. 이메일을 확인해주세요."
                )
                
            except HTTPException:
                raise
            except Exception as verify_error:
                print(f"❌ 인증 메일 재전송 중 오류: {verify_error}")
                import traceback
                traceback.print_exc()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="인증 메일 재전송 중 오류가 발생했습니다."
                )
        
        # JWT 토큰 생성
        access_token = create_access_token(data={"sub": user.email})
        print(f"✅ 로그인 성공: {user.email}")
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 로그인 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="로그인 처리 중 오류가 발생했습니다."
        )


# 🔧 개발용 임시 인증 건너뛰기 엔드포인트
@router.post("/dev-verify/{email}", response_model=MessageResponse)
async def dev_verify_user(email: str, db: AsyncSession = Depends(get_db)):
    """개발용: 사용자 강제 인증 (운영 환경에서는 제거 필요)"""
    
    print(f"🔧 개발용 강제 인증: {email}")
    
    user = await get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="등록되지 않은 이메일입니다."
        )
    
    # 강제로 인증 완료 처리
    user.is_verified = True
    await db.commit()
    
    print(f"✅ 강제 인증 완료: {email}")
    
    return MessageResponse(
        message=f"{email} 계정이 강제로 인증되었습니다.",
        success=True
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    request: PasswordResetRequest, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """비밀번호 재설정 요청"""
    
    print(f"🔍 비밀번호 재설정 요청: {request.email}")
    
    user = await get_user_by_email(db, request.email)
    if not user:
        print(f"⚠️ 존재하지 않는 이메일이지만 보안상 성공 메시지 반환")
        return MessageResponse(message="비밀번호 재설정 이메일을 발송했습니다.")
    
    try:
        # 기존 토큰 무효화 (만료되지 않은 토큰들)
        result = await db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.expires_at > datetime.now(timezone.utc),
                PasswordResetToken.is_used == False
            )
        )
        existing_tokens = result.scalars().all()
        print(f"🗑️ 기존 비밀번호 재설정 토큰 {len(existing_tokens)}개 무효화")
        
        for token in existing_tokens:
            token.is_used = True
        
        # 새 6자리 코드 생성
        reset_code = generate_reset_code()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)  # 10분 후 만료
        
        db_token = PasswordResetToken(
            user_id=user.id,
            token=reset_code,  # 6자리 코드를 token 필드에 저장
            expires_at=expires_at,
            is_used=False
        )
        
        db.add(db_token)
        await db.commit()
        
        print(f"✅ 새 재설정 코드 생성: {reset_code}")
        
        # 이메일 발송 (백그라운드 태스크)
        try:
            if naver_email_service:
                print("📧 네이버 이메일로 재설정 코드 발송")
                background_tasks.add_task(naver_email_service.send_password_reset_code_email, user.email, reset_code)
            else:
                print("📧 Gmail로 재설정 코드 발송")
                background_tasks.add_task(email_service.send_password_reset_code_email, user.email, reset_code)
            print("✅ 재설정 코드 이메일 발송 태스크 등록 완료")
        except Exception as email_error:
            print(f"❌ 재설정 코드 이메일 발송 실패: {email_error}")
        
        return MessageResponse(message="비밀번호 재설정 이메일을 발송했습니다.")
        
    except Exception as e:
        print(f"❌ 비밀번호 재설정 요청 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="비밀번호 재설정 요청 처리 중 오류가 발생했습니다."
        )


@router.post("/send-temporary-password", response_model=MessageResponse)
async def send_temporary_password(
    request: TemporaryPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """임시 비밀번호 발송"""
    
    print(f"🔍 임시 비밀번호 요청: {request.email}")
    
    user = await get_user_by_email(db, request.email)
    if not user:
        print(f"⚠️ 존재하지 않는 이메일이지만 보안상 성공 메시지 반환")
        return MessageResponse(message="임시 비밀번호를 이메일로 발송했습니다.")

    try:
        # 임시 비밀번호 생성
        temp_password = generate_temporary_password()
        print(f"✅ 임시 비밀번호 생성: {temp_password}")
        
        # 비밀번호 업데이트
        user.password_hash = get_password_hash(temp_password)
        await db.commit()
        
        print(f"✅ 임시 비밀번호로 업데이트 완료")
        
        # 이메일 발송 (백그라운드 태스크)
        try:
            background_tasks.add_task(email_service.send_temporary_password_email, user.email, temp_password)
            print("✅ 임시 비밀번호 이메일 발송 태스크 등록 완료")
        except Exception as email_error:
            print(f"❌ 임시 비밀번호 이메일 발송 실패: {email_error}")
        
        return MessageResponse(message="임시 비밀번호를 이메일로 발송했습니다.")
        
    except Exception as e:
        print(f"❌ 임시 비밀번호 생성 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="임시 비밀번호 생성 중 오류가 발생했습니다."
        )


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(
    request: EmailVerificationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """이메일 인증 재발송"""
    
    print(f"🔍 인증 이메일 재발송 요청: {request.email}")
    
    user = await get_user_by_email(db, request.email)
    if not user:
        print(f"❌ 등록되지 않은 이메일: {request.email}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="등록되지 않은 이메일입니다."
        )
    
    if user.is_verified:
        print(f"✅ 이미 인증된 계정: {request.email}")
        return MessageResponse(
            message="이미 인증된 계정입니다.",
            success=True
        )
    
    try:
        # 기존 토큰 무효화
        result = await db.execute(
            select(EmailVerificationToken).where(
                EmailVerificationToken.user_id == user.id,
                EmailVerificationToken.expires_at > datetime.now(timezone.utc),
                EmailVerificationToken.is_used == False
            )
        )
        existing_tokens = result.scalars().all()
        print(f"🗑️ 기존 인증 토큰 {len(existing_tokens)}개 무효화")
        
        for token in existing_tokens:
            token.is_used = True
        
        # 새 토큰 생성
        verification_token = generate_verification_token()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)  # 24시간 후 만료
        
        email_verification_token = EmailVerificationToken(
            user_id=user.id,
            token=verification_token,
            expires_at=expires_at,
            is_used=False
        )
        
        db.add(email_verification_token)
        
        # 사용자 토큰 업데이트
        user.verification_token = verification_token
        await db.commit()
        
        print(f"✅ 새 인증 토큰 생성: {verification_token[:10]}...")
        
        # 이메일 발송 (백그라운드 태스크)
        try:
            if naver_email_service:
                print("📧 네이버 이메일로 인증 메일 재발송")
                background_tasks.add_task(naver_email_service.send_verification_email, user.email, verification_token)
            else:
                print("📧 Gmail로 인증 메일 재발송")
                background_tasks.add_task(email_service.send_verification_email, user.email, verification_token)
            print("✅ 인증 메일 재발송 태스크 등록 완료")
        except Exception as email_error:
            print(f"❌ 인증 메일 재발송 실패: {email_error}")
        
        return MessageResponse(
            message="인증 이메일을 재발송했습니다. 이메일을 확인해주세요.",
            success=True
        )
        
    except Exception as e:
        print(f"❌ 인증 메일 재발송 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="인증 메일 재발송 중 오류가 발생했습니다."
        )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    request: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db)
):
    """비밀번호 재설정 확인"""
    
    print(f"🔍 비밀번호 재설정 확인: {request.token[:10]}...")
    
    try:
        # 토큰 검증
        result = await db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.token == request.token,
                PasswordResetToken.expires_at > datetime.now(timezone.utc),
                PasswordResetToken.is_used == False
            )
        )
        db_token = result.scalar_one_or_none()
        
        if not db_token:
            print(f"❌ 유효하지 않은 재설정 토큰: {request.token[:10]}...")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="유효하지 않거나 만료된 토큰입니다."
            )
        
        # 사용자 조회
        result = await db.execute(select(User).where(User.id == db_token.user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"❌ 사용자를 찾을 수 없음: user_id {db_token.user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다."
            )
        
        # 비밀번호 업데이트
        user.password_hash = get_password_hash(request.new_password)
        
        # 토큰 사용 처리
        db_token.is_used = True
        
        await db.commit()
        
        print(f"✅ 비밀번호 재설정 완료: {user.email}")
        
        return MessageResponse(message="비밀번호가 성공적으로 변경되었습니다.")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 비밀번호 재설정 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="비밀번호 재설정 중 오류가 발생했습니다."
        )


@router.post("/verify-reset-token", response_model=MessageResponse)
async def verify_reset_token(token: str, db: AsyncSession = Depends(get_db)):
    """비밀번호 재설정 토큰 검증"""
    
    print(f"🔍 재설정 토큰 검증: {token[:10]}...")
    
    try:
        result = await db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.token == token,
                PasswordResetToken.expires_at > datetime.now(timezone.utc),
                PasswordResetToken.is_used == False
            )
        )
        db_token = result.scalar_one_or_none()
        
        if not db_token:
            print(f"❌ 유효하지 않은 토큰: {token[:10]}...")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="유효하지 않거나 만료된 토큰입니다."
            )
        
        print(f"✅ 토큰 검증 성공: {token[:10]}...")
        return MessageResponse(message="유효한 토큰입니다.")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 토큰 검증 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="토큰 검증 중 오류가 발생했습니다."
        )


@router.post("/reset-password-with-code", response_model=MessageResponse)
async def reset_password_with_code(
    request: PasswordResetWithCode,
    db: AsyncSession = Depends(get_db)
):
    """비밀번호 재설정 (6자리 코드 방식)"""
    
    print(f"🔍 코드를 이용한 비밀번호 재설정: {request.email}, 코드: {request.code}")
    
    try:
        # 사용자 조회
        user = await get_user_by_email(db, request.email)
        if not user:
            print(f"❌ 등록되지 않은 이메일: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="등록되지 않은 이메일입니다."
            )
        
        # 코드 검증
        result = await db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.token == request.code,
                PasswordResetToken.expires_at > datetime.now(timezone.utc),
                PasswordResetToken.is_used == False
            )
        )
        db_token = result.scalar_one_or_none()
        
        if not db_token:
            print(f"❌ 유효하지 않은 코드: {request.code}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="유효하지 않거나 만료된 인증 코드입니다."
            )
        
        # 비밀번호 업데이트
        user.password_hash = get_password_hash(request.new_password)
        
        # 토큰 사용 처리
        db_token.is_used = True
        
        await db.commit()
        
        print(f"✅ 코드를 이용한 비밀번호 재설정 완료: {user.email}")
        
        return MessageResponse(message="비밀번호가 성공적으로 변경되었습니다.")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 코드를 이용한 비밀번호 재설정 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="비밀번호 재설정 중 오류가 발생했습니다."
        )