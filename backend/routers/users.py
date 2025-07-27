from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User
from schemas import UserResponse, UserUpdate, PasswordChange, MessageResponse
from auth import get_current_active_user, get_password_hash, verify_password

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """현재 사용자 정보 조회 (마이페이지)"""
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """현재 사용자 정보 수정"""
    
    try:
        print(f"🔍 프로필 업데이트 시작: 사용자 ID {current_user.id}")
        
        # 업데이트할 필드만 변경
        update_data = user_update.model_dump(exclude_unset=True)
        print(f"📝 업데이트할 데이터: {update_data}")
        
        # SQLAlchemy update 쿼리 사용
        from sqlalchemy import update
        stmt = update(User).where(User.id == current_user.id).values(**update_data)
        print(f"🔧 SQL 쿼리 실행: {stmt}")
        
        result = await db.execute(stmt)
        await db.commit()
        print(f"✅ 데이터베이스 업데이트 완료: {result.rowcount} 행 수정됨")
        
        # 업데이트된 사용자 정보 다시 조회
        result = await db.execute(select(User).where(User.id == current_user.id))
        updated_user = result.scalar_one_or_none()
        
        if not updated_user:
            print(f"❌ 사용자를 찾을 수 없음: ID {current_user.id}")
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        
        print(f"✅ 프로필 업데이트 성공: {updated_user.name}")
        return UserResponse.model_validate(updated_user)
        
    except Exception as e:
        print(f"❌ 프로필 업데이트 오류: {str(e)}")
        import traceback
        print(f"🔍 상세 오류: {traceback.format_exc()}")
        await db.rollback()  # 오류 시 롤백
        raise HTTPException(status_code=500, detail=f"프로필 업데이트 실패: {str(e)}")


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    password_change: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """비밀번호 변경"""
    
    # 현재 비밀번호 확인
    if not verify_password(password_change.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="현재 비밀번호가 올바르지 않습니다."
        )
    
    # 새 비밀번호와 현재 비밀번호가 같은지 확인
    if verify_password(password_change.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="새 비밀번호는 현재 비밀번호와 달라야 합니다."
        )
    
    # 비밀번호 업데이트
    current_user.password_hash = get_password_hash(password_change.new_password)
    
    await db.commit()
    
    return MessageResponse(message="비밀번호가 성공적으로 변경되었습니다.")


@router.delete("/me", response_model=MessageResponse)
async def delete_current_user(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """계정 삭제"""
    
    try:
        # 실제 삭제
        from sqlalchemy import delete
        stmt = delete(User).where(User.id == current_user.id)
        result = await db.execute(stmt)
        await db.commit()
        
        if result.rowcount > 0:
            return MessageResponse(message="계정이 완전히 삭제되었습니다.")
        else:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
            
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"계정 삭제 실패: {str(e)}")


@router.get("/stats", response_model=dict)
async def get_user_stats(current_user: User = Depends(get_current_active_user)):
    """사용자 통계 정보"""
    
    # TODO: 실제 통계 데이터 계산
    return {
        "total_exams": 0,
        "total_questions": 0,
        "correct_answers": 0,
        "accuracy_rate": 0.0,
        "points": current_user.points,
        "rank": "N/A"
    } 