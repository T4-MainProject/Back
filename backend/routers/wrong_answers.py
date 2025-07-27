"""
오답노트 관리 API 라우터
오답노트 CRUD, 복습 관리, 마스터 처리
"""

from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.orm import selectinload

from database import get_db
from models import User, WrongAnswerNote, ExamResult, QuestionAnswer
from auth import get_current_active_user

router = APIRouter(prefix="/wrong-answers", tags=["Wrong Answers"])

@router.get("/", response_model=Dict[str, Any])
async def get_wrong_answer_notes(
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    subject: Optional[str] = Query(None, description="과목 필터"),
    is_mastered: Optional[bool] = Query(None, description="마스터 여부 필터"),
    sort_by: str = Query("created_date", description="정렬 기준"),
    sort_order: str = Query("desc", description="정렬 순서"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    사용자의 오답노트 목록 조회 (페이징, 필터링, 정렬 지원)
    """
    try:
        # 기본 쿼리 (JOIN으로 시험 정보 포함)
        query = select(WrongAnswerNote).join(
            QuestionAnswer, WrongAnswerNote.question_answer_id == QuestionAnswer.id
        ).join(
            ExamResult, QuestionAnswer.exam_result_id == ExamResult.id
        ).where(ExamResult.user_id == current_user.id)
        
        # 필터링
        if subject:
            # ExamUpload와 추가 JOIN 필요할 수 있음 (현재는 간단히 처리)
            pass
        
        if is_mastered is not None:
            query = query.where(WrongAnswerNote.is_mastered == is_mastered)
        
        # 정렬
        sort_column = getattr(WrongAnswerNote, sort_by, WrongAnswerNote.created_at)
        if sort_order.lower() == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        
        # 총 개수 계산
        count_query = select(func.count()).select_from(
            query.subquery()
        )
        total_result = await db.execute(count_query)
        total_count = total_result.scalar()
        
        # 페이징
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        
        # 데이터 조회
        result = await db.execute(query)
        wrong_notes = result.scalars().all()
        
        # 응답 데이터 구성
        notes_data = []
        for note in wrong_notes:
            notes_data.append({
                "id": str(note.id),
                "question_text": note.question_text,
                "gemini_explanation": note.gemini_explanation,
                "question_crop_image": note.question_crop_image,
                "user_note": note.user_note,
                "review_count": note.review_count,
                "is_mastered": note.is_mastered,
                "created_at": note.created_at.isoformat(),
                "last_reviewed_at": note.last_reviewed_at.isoformat() if note.last_reviewed_at else None
            })
        
        # 통계 정보
        stats_query = select(
            func.count(WrongAnswerNote.id).label('total'),
            func.sum(func.cast(WrongAnswerNote.is_mastered, 'integer')).label('mastered'),
            func.avg(WrongAnswerNote.review_count).label('avg_reviews')
        ).join(
            QuestionAnswer, WrongAnswerNote.question_answer_id == QuestionAnswer.id
        ).join(
            ExamResult, QuestionAnswer.exam_result_id == ExamResult.id
        ).where(ExamResult.user_id == current_user.id)
        
        stats_result = await db.execute(stats_query)
        stats = stats_result.first()
        
        return {
            "success": True,
            "data": notes_data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "pages": (total_count + limit - 1) // limit
            },
            "statistics": {
                "total_notes": stats.total or 0,
                "mastered_notes": stats.mastered or 0,
                "average_reviews": round(float(stats.avg_reviews or 0), 1),
                "mastery_rate": round((stats.mastered or 0) / max(stats.total or 1, 1) * 100, 1)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"오답노트 조회 중 오류가 발생했습니다: {str(e)}")

@router.get("/{note_id}", response_model=Dict[str, Any])
async def get_wrong_answer_note(
    note_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    특정 오답노트 상세 조회
    """
    try:
        # 권한 확인과 함께 조회
        query = select(WrongAnswerNote).join(
            QuestionAnswer, WrongAnswerNote.question_answer_id == QuestionAnswer.id
        ).join(
            ExamResult, QuestionAnswer.exam_result_id == ExamResult.id
        ).where(
            WrongAnswerNote.id == note_id,
            ExamResult.user_id == current_user.id
        )
        
        result = await db.execute(query)
        note = result.scalar_one_or_none()
        
        if not note:
            raise HTTPException(status_code=404, detail="오답노트를 찾을 수 없습니다.")
        
        # 관련 문제 정보는 이미 JOIN으로 가져왔으므로 question_answer_id로 조회
        question_query = select(QuestionAnswer).where(QuestionAnswer.id == note.question_answer_id)
        question_result = await db.execute(question_query)
        question_answer = question_result.scalar_one_or_none()
        
        return {
            "success": True,
            "note": {
                "id": str(note.id),
                "question_text": note.question_text,
                "gemini_explanation": note.gemini_explanation,
                "question_crop_image": note.question_crop_image,
                "user_note": note.user_note,
                "review_count": note.review_count,
                "is_mastered": note.is_mastered,
                "created_at": note.created_at.isoformat(),
                "last_reviewed_at": note.last_reviewed_at.isoformat() if note.last_reviewed_at else None
            },
            "question_info": {
                "question_number": question_answer.question_number if question_answer else None,
                "user_answer": question_answer.user_answer if question_answer else None,
                "correct_answer": question_answer.correct_answer if question_answer else None,
                "is_correct": question_answer.is_correct if question_answer else None,
                "crop_path": question_answer.question_crop_path if question_answer else None,
                "confidence": float(question_answer.confidence) if question_answer and question_answer.confidence else None,
                "detection_method": question_answer.detection_method if question_answer else None
            } if question_answer else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"오답노트 조회 중 오류가 발생했습니다: {str(e)}")

@router.patch("/{note_id}", response_model=Dict[str, Any])
async def update_wrong_answer_note(
    note_id: str,
    user_notes: Optional[str] = None,
    is_mastered: Optional[bool] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    오답노트 수정 (사용자 노트, 마스터 상태)
    """
    try:
        # 권한 확인
        query = select(WrongAnswerNote).join(
            ExamResult, WrongAnswerNote.exam_result_id == ExamResult.id
        ).where(
            WrongAnswerNote.id == note_id,
            ExamResult.user_id == current_user.id
        )
        
        result = await db.execute(query)
        note = result.scalar_one_or_none()
        
        if not note:
            raise HTTPException(status_code=404, detail="오답노트를 찾을 수 없습니다.")
        
        # 업데이트할 필드 준비
        update_data = {}
        if user_notes is not None:
            update_data['user_notes'] = user_notes
        if is_mastered is not None:
            update_data['is_mastered'] = is_mastered
        
        if not update_data:
            raise HTTPException(status_code=400, detail="수정할 데이터가 없습니다.")
        
        # 업데이트 실행
        stmt = update(WrongAnswerNote).where(
            WrongAnswerNote.id == note_id
        ).values(**update_data)
        
        await db.execute(stmt)
        await db.commit()
        
        # 업데이트된 데이터 반환
        await db.refresh(note)
        
        return {
            "success": True,
            "message": "오답노트가 성공적으로 수정되었습니다.",
            "note": {
                "id": str(note.id),
                "user_notes": note.user_notes,
                "is_mastered": note.is_mastered,
                "updated_at": datetime.now().isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"오답노트 수정 중 오류가 발생했습니다: {str(e)}")

@router.post("/{note_id}/review", response_model=Dict[str, Any])
async def record_review(
    note_id: str,
    difficulty_rating: Optional[int] = Query(None, ge=1, le=5, description="복습 난이도 평가 (1-5)"),
    understanding_level: Optional[int] = Query(None, ge=1, le=5, description="이해도 평가 (1-5)"),
    notes: Optional[str] = Query(None, description="복습 메모"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    복습 기록 추가
    """
    try:
        # 권한 확인
        query = select(WrongAnswerNote).join(
            ExamResult, WrongAnswerNote.exam_result_id == ExamResult.id
        ).where(
            WrongAnswerNote.id == note_id,
            ExamResult.user_id == current_user.id
        )
        
        result = await db.execute(query)
        note = result.scalar_one_or_none()
        
        if not note:
            raise HTTPException(status_code=404, detail="오답노트를 찾을 수 없습니다.")
        
        # 복습 횟수 증가 및 복습 시간 업데이트
        note.review_count += 1
        note.last_reviewed_at = datetime.now()
        
        # 이해도가 높으면 자동으로 마스터 처리 (선택적)
        if understanding_level and understanding_level >= 4 and note.review_count >= 2:
            note.is_mastered = True
        
        await db.commit()
        
        return {
            "success": True,
            "message": "복습이 기록되었습니다.",
            "review_info": {
                "note_id": str(note.id),
                "review_count": note.review_count,
                "last_reviewed_at": note.last_reviewed_at.isoformat(),
                "is_mastered": note.is_mastered,
                "difficulty_rating": difficulty_rating,
                "understanding_level": understanding_level
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"복습 기록 중 오류가 발생했습니다: {str(e)}")

@router.delete("/{note_id}", response_model=Dict[str, Any])
async def delete_wrong_answer_note(
    note_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    오답노트 삭제
    """
    try:
        # 권한 확인
        query = select(WrongAnswerNote).join(
            ExamResult, WrongAnswerNote.exam_result_id == ExamResult.id
        ).where(
            WrongAnswerNote.id == note_id,
            ExamResult.user_id == current_user.id
        )
        
        result = await db.execute(query)
        note = result.scalar_one_or_none()
        
        if not note:
            raise HTTPException(status_code=404, detail="오답노트를 찾을 수 없습니다.")
        
        # 삭제 실행
        await db.delete(note)
        await db.commit()
        
        return {
            "success": True,
            "message": "오답노트가 삭제되었습니다.",
            "deleted_note_id": note_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"오답노트 삭제 중 오류가 발생했습니다: {str(e)}")

@router.get("/statistics/overview", response_model=Dict[str, Any])
async def get_wrong_answer_statistics(
    period: str = Query("all", description="통계 기간 (week, month, all)"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    오답노트 통계 개요
    """
    try:
        # 기본 통계 쿼리
        base_query = select(WrongAnswerNote).join(
            ExamResult, WrongAnswerNote.exam_result_id == ExamResult.id
        ).where(ExamResult.user_id == current_user.id)
        
        # 기간 필터링
        if period == "week":
            from datetime import timedelta
            week_ago = datetime.now() - timedelta(days=7)
            base_query = base_query.where(WrongAnswerNote.created_at >= week_ago)
        elif period == "month":
            from datetime import timedelta
            month_ago = datetime.now() - timedelta(days=30)
            base_query = base_query.where(WrongAnswerNote.created_at >= month_ago)
        
        # 전체 통계
        total_result = await db.execute(
            select(func.count(WrongAnswerNote.id)).select_from(base_query.subquery())
        )
        total_notes = total_result.scalar()
        
        # 마스터된 노트 수
        mastered_result = await db.execute(
            select(func.count(WrongAnswerNote.id)).select_from(
                base_query.where(WrongAnswerNote.is_mastered == True).subquery()
            )
        )
        mastered_notes = mastered_result.scalar()
        
        # 난이도별 분포
        difficulty_query = select(
            WrongAnswerNote.difficulty_level,
            func.count(WrongAnswerNote.id).label('count')
        ).select_from(base_query.subquery()).group_by(WrongAnswerNote.difficulty_level)
        
        difficulty_result = await db.execute(difficulty_query)
        difficulty_distribution = {row.difficulty_level: row.count for row in difficulty_result}
        
        # 복습 횟수 분포
        review_query = select(
            func.avg(WrongAnswerNote.review_count).label('avg_reviews'),
            func.max(WrongAnswerNote.review_count).label('max_reviews')
        ).select_from(base_query.subquery())
        
        review_result = await db.execute(review_query)
        review_stats = review_result.first()
        
        return {
            "success": True,
            "period": period,
            "statistics": {
                "total_notes": total_notes or 0,
                "mastered_notes": mastered_notes or 0,
                "pending_notes": (total_notes or 0) - (mastered_notes or 0),
                "mastery_rate": round((mastered_notes or 0) / max(total_notes or 1, 1) * 100, 1),
                "average_reviews": round(float(review_stats.avg_reviews or 0), 1),
                "max_reviews": review_stats.max_reviews or 0,
                "difficulty_distribution": difficulty_distribution,
                "improvement_trend": "상승"  # 실제로는 더 복잡한 계산 필요
            },
            "recommendations": [
                "복습 횟수가 낮은 문제들을 우선적으로 학습하세요.",
                "어려운 문제들에 더 많은 시간을 투자하세요.",
                "마스터된 문제들도 주기적으로 복습하세요."
            ] if total_notes else ["첫 번째 시험을 업로드하여 오답노트를 시작하세요!"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"통계 조회 중 오류가 발생했습니다: {str(e)}")

@router.post("/bulk-operations", response_model=Dict[str, Any])
async def bulk_operations(
    note_ids: List[str],
    operation: str = Query(..., description="작업 유형 (mark_mastered, mark_unmastered, delete)"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    오답노트 일괄 작업 (마스터 처리, 삭제 등)
    """
    try:
        if not note_ids:
            raise HTTPException(status_code=400, detail="선택된 노트가 없습니다.")
        
        # 권한 확인
        query = select(WrongAnswerNote).join(
            ExamResult, WrongAnswerNote.exam_result_id == ExamResult.id
        ).where(
            WrongAnswerNote.id.in_(note_ids),
            ExamResult.user_id == current_user.id
        )
        
        result = await db.execute(query)
        notes = result.scalars().all()
        
        if len(notes) != len(note_ids):
            raise HTTPException(status_code=404, detail="일부 오답노트를 찾을 수 없습니다.")
        
        # 작업 실행
        if operation == "mark_mastered":
            stmt = update(WrongAnswerNote).where(
                WrongAnswerNote.id.in_(note_ids)
            ).values(is_mastered=True)
            
        elif operation == "mark_unmastered":
            stmt = update(WrongAnswerNote).where(
                WrongAnswerNote.id.in_(note_ids)
            ).values(is_mastered=False)
            
        elif operation == "delete":
            stmt = delete(WrongAnswerNote).where(
                WrongAnswerNote.id.in_(note_ids)
            )
        else:
            raise HTTPException(status_code=400, detail="지원되지 않는 작업입니다.")
        
        await db.execute(stmt)
        await db.commit()
        
        return {
            "success": True,
            "message": f"{len(note_ids)}개의 오답노트에 대해 '{operation}' 작업이 완료되었습니다.",
            "processed_count": len(note_ids),
            "operation": operation
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"일괄 작업 중 오류가 발생했습니다: {str(e)}") 