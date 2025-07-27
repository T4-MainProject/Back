"""
유사문제 생성 및 관리 API 라우터
Gemini AI 기반 유사문제 생성, 풀이, 채점
"""

from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update, delete, func
from sqlalchemy.orm import selectinload

from database import get_db
from models import User, WrongAnswerNote, SimilarQuestion, SimilarQuestionAttempt, ExamResult, QuestionAnswer
from auth import get_current_active_user
from services.gemini_service import gemini_service

router = APIRouter(prefix="/similar-questions", tags=["Similar Questions"])

@router.post("/generate", response_model=Dict[str, Any])
async def generate_similar_questions(
    wrong_answer_note_ids: List[str] = Body(..., description="오답노트 ID 목록"),
    difficulty_level: str = Body("similar", description="난이도 (easier, similar, harder)"),
    count_per_note: int = Body(1, ge=1, le=3, description="노트당 생성할 문제 수"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    오답노트 기반 유사문제 생성
    """
    try:
        if not wrong_answer_note_ids:
            raise HTTPException(status_code=400, detail="오답노트 ID가 필요합니다.")
        
        # 권한 확인 및 오답노트 조회
        query = select(WrongAnswerNote).join(
            ExamResult, WrongAnswerNote.exam_result_id == ExamResult.id
        ).where(
            WrongAnswerNote.id.in_(wrong_answer_note_ids),
            ExamResult.user_id == current_user.id
        )
        
        result = await db.execute(query)
        wrong_notes = result.scalars().all()
        
        if len(wrong_notes) != len(wrong_answer_note_ids):
            raise HTTPException(status_code=404, detail="일부 오답노트를 찾을 수 없습니다.")
        
        # 각 오답노트에 대해 유사문제 생성
        generated_questions = []
        
        for wrong_note in wrong_notes:
            # 오답 정보 구성
            wrong_answer_data = {
                'question_number': wrong_note.question_number,
                'original_answer': wrong_note.original_answer,
                'correct_answer': wrong_note.correct_answer,
                'key_concepts': wrong_note.key_concepts,
                'difficulty_level': wrong_note.difficulty_level
            }
            
            # Gemini로 유사문제 생성
            similar_questions = await gemini_service.generate_similar_questions(
                [wrong_answer_data], 
                difficulty_level
            )
            
            for i in range(count_per_note):
                if i < len(similar_questions):
                    question_data = similar_questions[i]
                    
                    # 데이터베이스에 저장
                    similar_question = SimilarQuestion(
                        wrong_answer_note_id=wrong_note.id,
                        question_text=question_data.get('question_text', ''),
                        choices=question_data.get('choices', {}),
                        correct_answer=question_data.get('correct_answer', '1'),
                        explanation=question_data.get('explanation', ''),
                        difficulty_level=question_data.get('difficulty_level', 'medium'),
                        concept=question_data.get('concept', ''),
                        estimated_time=question_data.get('estimated_time', '2분'),
                        is_active=True
                    )
                    
                    db.add(similar_question)
                    await db.flush()  # ID 생성을 위해 flush
                    
                    generated_questions.append({
                        "id": str(similar_question.id),
                        "question_text": similar_question.question_text,
                        "choices": similar_question.choices,
                        "difficulty_level": similar_question.difficulty_level,
                        "concept": similar_question.concept,
                        "estimated_time": similar_question.estimated_time,
                        "based_on_note": str(wrong_note.id)
                    })
        
        await db.commit()
        
        return {
            "success": True,
            "message": f"{len(generated_questions)}개의 유사문제가 생성되었습니다.",
            "generated_questions": generated_questions,
            "total_count": len(generated_questions)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"유사문제 생성 중 오류가 발생했습니다: {str(e)}")

@router.get("/", response_model=Dict[str, Any])
async def get_similar_questions(
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    difficulty: Optional[str] = Query(None, description="난이도 필터"),
    is_solved: Optional[bool] = Query(None, description="풀이 여부 필터"),
    concept: Optional[str] = Query(None, description="개념 필터"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    사용자의 유사문제 목록 조회
    """
    try:
        # 기본 쿼리 (사용자의 오답노트에서 생성된 문제들)
        query = select(SimilarQuestion).join(
            WrongAnswerNote, SimilarQuestion.wrong_answer_note_id == WrongAnswerNote.id
        ).join(
            ExamResult, WrongAnswerNote.exam_result_id == ExamResult.id
        ).where(
            ExamResult.user_id == current_user.id,
            SimilarQuestion.is_active == True
        )
        
        # 필터링
        if difficulty:
            query = query.where(SimilarQuestion.difficulty_level == difficulty)
        
        if concept:
            query = query.where(SimilarQuestion.concept.contains(concept))
        
        # 풀이 여부 필터링 (SimilarQuestionAttempt와 LEFT JOIN)
        if is_solved is not None:
            from sqlalchemy import exists
            
            attempt_exists = exists().where(
                SimilarQuestionAttempt.similar_question_id == SimilarQuestion.id
            )
            
            if is_solved:
                query = query.where(attempt_exists)
            else:
                query = query.where(~attempt_exists)
        
        # 총 개수 계산
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total_count = total_result.scalar()
        
        # 정렬 및 페이징
        query = query.order_by(SimilarQuestion.created_at.desc())
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        
        # 데이터 조회
        result = await db.execute(query)
        questions = result.scalars().all()
        
        # 각 문제의 풀이 정보 조회
        questions_data = []
        for question in questions:
            # 최근 풀이 기록 조회
            attempt_query = select(SimilarQuestionAttempt).where(
                SimilarQuestionAttempt.similar_question_id == question.id
            ).order_by(SimilarQuestionAttempt.attempted_at.desc()).limit(1)
            
            attempt_result = await db.execute(attempt_query)
            latest_attempt = attempt_result.scalar_one_or_none()
            
            questions_data.append({
                "id": str(question.id),
                "question_text": question.question_text,
                "choices": question.choices,
                "difficulty_level": question.difficulty_level,
                "concept": question.concept,
                "estimated_time": question.estimated_time,
                "created_at": question.created_at.isoformat(),
                "attempt_info": {
                    "is_solved": latest_attempt is not None,
                    "is_correct": latest_attempt.is_correct if latest_attempt else None,
                    "user_answer": latest_attempt.user_answer if latest_attempt else None,
                    "attempted_at": latest_attempt.attempted_at.isoformat() if latest_attempt else None,
                    "attempt_count": len([a for a in question.attempts]) if hasattr(question, 'attempts') else 0
                } if latest_attempt else {
                    "is_solved": False,
                    "is_correct": None,
                    "user_answer": None,
                    "attempted_at": None,
                    "attempt_count": 0
                }
            })
        
        return {
            "success": True,
            "data": questions_data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "pages": (total_count + limit - 1) // limit
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"유사문제 조회 중 오류가 발생했습니다: {str(e)}")

@router.get("/note/{note_id}", response_model=Dict[str, Any])
async def get_similar_questions_by_note(
    note_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    특정 오답노트에 대한 유사문제 목록 조회
    """
    try:
        # 오답노트 권한 확인 (QuestionAnswer를 통해 ExamResult에 연결)
        note_query = select(WrongAnswerNote).join(
            QuestionAnswer, WrongAnswerNote.question_answer_id == QuestionAnswer.id
        ).join(
            ExamResult, QuestionAnswer.exam_result_id == ExamResult.id
        ).where(
            WrongAnswerNote.id == note_id,
            ExamResult.user_id == current_user.id
        )
        
        note_result = await db.execute(note_query)
        wrong_note = note_result.scalar_one_or_none()
        
        if not wrong_note:
            raise HTTPException(status_code=404, detail="오답노트를 찾을 수 없습니다.")
        
        # 해당 오답노트로 생성된 유사문제들 조회
        query = select(SimilarQuestion).where(
            SimilarQuestion.wrong_answer_note_id == note_id
        ).order_by(SimilarQuestion.created_at.desc())
        
        result = await db.execute(query)
        questions = result.scalars().all()
        
        # 각 문제의 풀이 정보 조회
        questions_data = []
        for question in questions:
            # 최근 풀이 기록 조회
            attempt_query = select(SimilarQuestionAttempt).where(
                SimilarQuestionAttempt.similar_question_id == question.id,
                SimilarQuestionAttempt.user_id == current_user.id
            ).order_by(SimilarQuestionAttempt.attempted_at.desc()).limit(1)
            
            attempt_result = await db.execute(attempt_query)
            latest_attempt = attempt_result.scalar_one_or_none()
            
            questions_data.append({
                "id": str(question.id),
                "question_text": question.question_text,
                "options": question.options,
                "difficulty": question.difficulty,
                "generated_by": question.generated_by,
                "created_at": question.created_at.isoformat(),
                "attempt_info": {
                    "is_solved": latest_attempt is not None,
                    "is_correct": latest_attempt.is_correct if latest_attempt else None,
                    "user_answer": latest_attempt.user_answer if latest_attempt else None,
                    "attempted_at": latest_attempt.attempted_at.isoformat() if latest_attempt else None
                } if latest_attempt else {
                    "is_solved": False,
                    "is_correct": None,
                    "user_answer": None,
                    "attempted_at": None
                }
            })
        
        return {
            "success": True,
            "data": questions_data,
            "total_count": len(questions_data),
            "note_info": {
                "id": str(wrong_note.id),
                "question_text": wrong_note.question_text,
                "is_mastered": wrong_note.is_mastered,
                "review_count": wrong_note.review_count
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"유사문제 조회 중 오류가 발생했습니다: {str(e)}")

@router.get("/{question_id}", response_model=Dict[str, Any])
async def get_similar_question(
    question_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    특정 유사문제 상세 조회
    """
    try:
        # 권한 확인과 함께 조회
        query = select(SimilarQuestion).join(
            WrongAnswerNote, SimilarQuestion.wrong_answer_note_id == WrongAnswerNote.id
        ).join(
            ExamResult, WrongAnswerNote.exam_result_id == ExamResult.id
        ).where(
            SimilarQuestion.id == question_id,
            ExamResult.user_id == current_user.id,
            SimilarQuestion.is_active == True
        )
        
        result = await db.execute(query)
        question = result.scalar_one_or_none()
        
        if not question:
            raise HTTPException(status_code=404, detail="유사문제를 찾을 수 없습니다.")
        
        # 풀이 기록 조회
        attempts_query = select(SimilarQuestionAttempt).where(
            SimilarQuestionAttempt.similar_question_id == question.id
        ).order_by(SimilarQuestionAttempt.attempted_at.desc())
        
        attempts_result = await db.execute(attempts_query)
        attempts = attempts_result.scalars().all()
        
        return {
            "success": True,
            "question": {
                "id": str(question.id),
                "question_text": question.question_text,
                "choices": question.choices,
                "difficulty_level": question.difficulty_level,
                "concept": question.concept,
                "estimated_time": question.estimated_time,
                "created_at": question.created_at.isoformat()
            },
            "attempts": [
                {
                    "id": str(attempt.id),
                    "user_answer": attempt.user_answer,
                    "is_correct": attempt.is_correct,
                    "attempted_at": attempt.attempted_at.isoformat(),
                    "time_taken": attempt.time_taken
                } for attempt in attempts
            ],
            "total_attempts": len(attempts),
            "best_score": max([a.is_correct for a in attempts], default=False),
            "show_explanation": len(attempts) > 0  # 한 번이라도 풀었으면 해설 표시
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"유사문제 조회 중 오류가 발생했습니다: {str(e)}")

@router.post("/{question_id}/submit", response_model=Dict[str, Any])
async def submit_answer(
    question_id: str,
    user_answer: str = Body(..., description="사용자 답안 (1-5)"),
    time_taken: Optional[int] = Body(None, description="풀이 시간 (초)"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    유사문제 답안 제출 및 자동 채점
    """
    try:
        # 권한 확인과 함께 문제 조회
        query = select(SimilarQuestion).join(
            WrongAnswerNote, SimilarQuestion.wrong_answer_note_id == WrongAnswerNote.id
        ).join(
            ExamResult, WrongAnswerNote.exam_result_id == ExamResult.id
        ).where(
            SimilarQuestion.id == question_id,
            ExamResult.user_id == current_user.id,
            SimilarQuestion.is_active == True
        )
        
        result = await db.execute(query)
        question = result.scalar_one_or_none()
        
        if not question:
            raise HTTPException(status_code=404, detail="유사문제를 찾을 수 없습니다.")
        
        # 답안 유효성 검사
        if user_answer not in ['1', '2', '3', '4', '5']:
            raise HTTPException(status_code=400, detail="답안은 1-5 사이의 숫자여야 합니다.")
        
        # 정답 확인
        is_correct = user_answer == question.correct_answer
        
        # 풀이 기록 저장
        attempt = SimilarQuestionAttempt(
            user_id=current_user.id,
            similar_question_id=question.id,
            user_answer=user_answer,
            is_correct=is_correct,
            time_taken=time_taken,
            attempted_at=datetime.now()
        )
        
        db.add(attempt)
        await db.commit()
        
        # 결과 응답
        response = {
            "success": True,
            "result": {
                "is_correct": is_correct,
                "user_answer": user_answer,
                "correct_answer": question.correct_answer,
                "explanation": question.explanation,
                "time_taken": time_taken,
                "attempted_at": attempt.attempted_at.isoformat()
            },
            "question_info": {
                "concept": question.concept,
                "difficulty_level": question.difficulty_level,
                "estimated_time": question.estimated_time
            }
        }
        
        # 격려 메시지
        if is_correct:
            response["message"] = "정답입니다! 🎉"
            if time_taken and "분" in question.estimated_time:
                try:
                    estimated_seconds = int(question.estimated_time.replace("분", "")) * 60
                    if time_taken <= estimated_seconds:
                        response["message"] += " 예상 시간보다 빠르게 풀었어요!"
                except:
                    pass
        else:
            response["message"] = "틀렸습니다. 해설을 확인하고 다시 도전해보세요! 💪"
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"답안 제출 중 오류가 발생했습니다: {str(e)}")

@router.get("/{question_id}/explanation", response_model=Dict[str, Any])
async def get_explanation(
    question_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    유사문제 해설 조회 (풀이 후에만 가능)
    """
    try:
        # 권한 확인과 함께 문제 조회
        query = select(SimilarQuestion).join(
            WrongAnswerNote, SimilarQuestion.wrong_answer_note_id == WrongAnswerNote.id
        ).join(
            ExamResult, WrongAnswerNote.exam_result_id == ExamResult.id
        ).where(
            SimilarQuestion.id == question_id,
            ExamResult.user_id == current_user.id,
            SimilarQuestion.is_active == True
        )
        
        result = await db.execute(query)
        question = result.scalar_one_or_none()
        
        if not question:
            raise HTTPException(status_code=404, detail="유사문제를 찾을 수 없습니다.")
        
        # 풀이 기록 확인
        attempt_query = select(SimilarQuestionAttempt).where(
            SimilarQuestionAttempt.similar_question_id == question.id,
            SimilarQuestionAttempt.user_id == current_user.id
        ).limit(1)
        
        attempt_result = await db.execute(attempt_query)
        attempt = attempt_result.scalar_one_or_none()
        
        if not attempt:
            raise HTTPException(
                status_code=403, 
                detail="문제를 먼저 풀어야 해설을 볼 수 있습니다."
            )
        
        return {
            "success": True,
            "explanation": {
                "question_text": question.question_text,
                "choices": question.choices,
                "correct_answer": question.correct_answer,
                "explanation": question.explanation,
                "concept": question.concept,
                "difficulty_level": question.difficulty_level
            },
            "user_attempt": {
                "answer": attempt.user_answer,
                "is_correct": attempt.is_correct,
                "attempted_at": attempt.attempted_at.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"해설 조회 중 오류가 발생했습니다: {str(e)}")

@router.delete("/{question_id}", response_model=Dict[str, Any])
async def delete_similar_question(
    question_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    유사문제 삭제 (비활성화)
    """
    try:
        # 권한 확인
        query = select(SimilarQuestion).join(
            WrongAnswerNote, SimilarQuestion.wrong_answer_note_id == WrongAnswerNote.id
        ).join(
            ExamResult, WrongAnswerNote.exam_result_id == ExamResult.id
        ).where(
            SimilarQuestion.id == question_id,
            ExamResult.user_id == current_user.id
        )
        
        result = await db.execute(query)
        question = result.scalar_one_or_none()
        
        if not question:
            raise HTTPException(status_code=404, detail="유사문제를 찾을 수 없습니다.")
        
        # 비활성화 (실제 삭제 대신)
        question.is_active = False
        await db.commit()
        
        return {
            "success": True,
            "message": "유사문제가 삭제되었습니다.",
            "deleted_question_id": question_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"유사문제 삭제 중 오류가 발생했습니다: {str(e)}")

@router.get("/statistics/overview", response_model=Dict[str, Any])
async def get_similar_question_statistics(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    유사문제 풀이 통계
    """
    try:
        # 기본 통계 쿼리
        base_query = select(SimilarQuestion).join(
            WrongAnswerNote, SimilarQuestion.wrong_answer_note_id == WrongAnswerNote.id
        ).join(
            ExamResult, WrongAnswerNote.exam_result_id == ExamResult.id
        ).where(
            ExamResult.user_id == current_user.id,
            SimilarQuestion.is_active == True
        )
        
        # 전체 문제 수
        total_result = await db.execute(
            select(func.count(SimilarQuestion.id)).select_from(base_query.subquery())
        )
        total_questions = total_result.scalar()
        
        # 풀이한 문제 수
        solved_query = select(func.count(func.distinct(SimilarQuestionAttempt.similar_question_id))).where(
            SimilarQuestionAttempt.user_id == current_user.id
        )
        solved_result = await db.execute(solved_query)
        solved_questions = solved_result.scalar()
        
        # 정답률
        correct_query = select(func.count(SimilarQuestionAttempt.id)).where(
            SimilarQuestionAttempt.user_id == current_user.id,
            SimilarQuestionAttempt.is_correct == True
        )
        correct_result = await db.execute(correct_query)
        correct_attempts = correct_result.scalar()
        
        total_attempts_query = select(func.count(SimilarQuestionAttempt.id)).where(
            SimilarQuestionAttempt.user_id == current_user.id
        )
        total_attempts_result = await db.execute(total_attempts_query)
        total_attempts = total_attempts_result.scalar()
        
        # 난이도별 정답률
        difficulty_stats_query = select(
            SimilarQuestion.difficulty_level,
            func.count(SimilarQuestionAttempt.id).label('total'),
            func.sum(func.cast(SimilarQuestionAttempt.is_correct, 'integer')).label('correct')
        ).join(
            SimilarQuestionAttempt, SimilarQuestion.id == SimilarQuestionAttempt.similar_question_id
        ).where(
            SimilarQuestionAttempt.user_id == current_user.id
        ).group_by(SimilarQuestion.difficulty_level)
        
        difficulty_result = await db.execute(difficulty_stats_query)
        difficulty_stats = {}
        
        for row in difficulty_result:
            difficulty_stats[row.difficulty_level] = {
                "total_attempts": row.total,
                "correct_attempts": row.correct or 0,
                "accuracy": round((row.correct or 0) / max(row.total, 1) * 100, 1)
            }
        
        return {
            "success": True,
            "statistics": {
                "total_questions": total_questions or 0,
                "solved_questions": solved_questions or 0,
                "unsolved_questions": (total_questions or 0) - (solved_questions or 0),
                "solve_rate": round((solved_questions or 0) / max(total_questions or 1, 1) * 100, 1),
                "total_attempts": total_attempts or 0,
                "correct_attempts": correct_attempts or 0,
                "overall_accuracy": round((correct_attempts or 0) / max(total_attempts or 1, 1) * 100, 1),
                "difficulty_breakdown": difficulty_stats
            },
            "recommendations": [
                "더 많은 문제를 풀어보세요!" if (solved_questions or 0) < 5 else "꾸준히 문제를 풀고 있네요!",
                f"현재 정답률이 {round((correct_attempts or 0) / max(total_attempts or 1, 1) * 100, 1)}%입니다.",
                "틀린 문제들을 다시 한번 복습해보세요."
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"통계 조회 중 오류가 발생했습니다: {str(e)}") 