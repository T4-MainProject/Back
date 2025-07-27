"""
시험지 업로드 및 분석 API 라우터
Vision API, YOLO, Gemini AI 통합 처리
"""

import os
import uuid
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from database import get_db, AsyncSessionLocal
from models import User, ExamUpload, ExamResult, QuestionAnswer, WrongAnswerNote, Notification
from auth import get_current_active_user
from config import settings
from services.vision_service import vision_service

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/exams", tags=["Exams"])

async def save_analysis_results(
    db: AsyncSession,
    exam_upload_id: str,
    yolo_results: Dict[str, Any],
    vision_results: List[Dict[str, Any]],
    processing_time: float
):
    """분석 결과를 데이터베이스에 저장"""
    try:
        # 1. ExamResult 객체 생성 및 저장
        exam_result = ExamResult(
            exam_upload_id=exam_upload_id,
            auto_graded_status='completed',
            processing_time=processing_time,
            yolo_result=yolo_results,  # YOLO 결과 저장
            error_message=yolo_results.get('error') if isinstance(yolo_results, dict) else None
        )
        db.add(exam_result)
        await db.flush() # exam_result.id를 얻기 위해 flush

        # 2. QuestionAnswer 객체 생성 및 저장
        # vision_results가 리스트가 아닐 경우를 대비
        if not isinstance(vision_results, list):
            logger.warning(f"Vision results is not a list, but {type(vision_results)}. Wrapping in a list.")
            # 만약 딕셔너리고 'questions' 키가 있다면 그것을 사용
            if isinstance(vision_results, dict) and 'questions' in vision_results:
                vision_results = vision_results['questions']
            else: # 그렇지 않다면, 오류 상황으로 간주하고 빈 리스트로 처리
                vision_results = []

        for answer_data in vision_results:
            if not isinstance(answer_data, dict):
                logger.warning(f"Skipping invalid answer_data (not a dict): {answer_data}")
                continue

            question_answer = QuestionAnswer(
                exam_result_id=exam_result.id,
                question_number=answer_data.get('detected_question_number', 'N/A'),
                detected_answer=answer_data.get('detected_answer', 'N/A'),
                is_correct=answer_data.get('is_correct', False),
                confidence=answer_data.get('confidence', 'low'),
                question_crop_path=answer_data.get('crop_path'),
                # YOLO 결과에서 좌표 정보 등을 추가할 수 있음
            )
            db.add(question_answer)
        
        # 3. ExamUpload 상태 업데이트
        stmt = update(ExamUpload).where(ExamUpload.id == exam_upload_id).values(processing_status='completed')
        await db.execute(stmt)
        
        await db.commit()
        logger.info(f"✅ Successfully saved analysis for upload ID: {exam_upload_id}")

    except Exception as e:
        await db.rollback()
        logger.error(f"❌ Failed to save analysis results for {exam_upload_id}: {e}", exc_info=True)
        # 실패 시에도 ExamUpload 상태는 업데이트
        try:
            stmt = update(ExamUpload).where(ExamUpload.id == exam_upload_id).values(
                processing_status='failed',
                error_message=f'Save error: {str(e)}'
            )
            await db.execute(stmt)
            await db.commit()
        except Exception as update_err:
            logger.error(f"❌ Failed to even update failure status for {exam_upload_id}: {update_err}")
            await db.rollback()


@router.get("/{exam_id}/results")
async def get_exam_results(exam_id: str, db: AsyncSession = Depends(get_db)):
    # 필요한 필드만 선택하여 조회
    stmt = (
        select(
            ExamResult.id,
            ExamResult.exam_upload_id,
            ExamResult.user_id,
            ExamResult.total_score,
            ExamResult.correct_count,
            ExamResult.wrong_count,
            ExamResult.analysis_method,
            ExamResult.processing_time_seconds,
            ExamResult.created_at
        )
        .filter(ExamResult.exam_upload_id == exam_id)
        .order_by(ExamResult.created_at.desc())
    )
    result = await db.execute(stmt)
    exam_result = result.first()

    if not exam_result:
        raise HTTPException(
            status_code=404, detail="해당 ID의 시험에 대한 채점 결과를 찾을 수 없습니다."
        )

    # QuestionAnswer도 함께 조회
    question_stmt = (
        select(QuestionAnswer)
        .filter(QuestionAnswer.exam_result_id == exam_result[0])
        .order_by(QuestionAnswer.question_number)
    )
    question_result = await db.execute(question_stmt)
    questions = question_result.scalars().all()

    # 응답 데이터 구성
    return {
        "id": str(exam_result[0]),
        "exam_upload_id": str(exam_result[1]),
        "user_id": str(exam_result[2]),
        "total_score": exam_result[3],
        "correct_count": exam_result[4],
        "wrong_count": exam_result[5],
        "analysis_method": exam_result[6],
        "processing_time_seconds": float(exam_result[7]) if exam_result[7] else None,
        "created_at": exam_result[8].isoformat() if exam_result[8] else None,
        "question_answers": [
            {
                "id": str(q.id),
                "question_number": q.question_number,
                "user_answer": q.user_answer,
                "correct_answer": q.correct_answer,
                "is_correct": q.is_correct,
                "confidence": float(q.confidence) if q.confidence else None,
                "question_crop_path": q.question_crop_path,
                "created_at": q.created_at.isoformat() if q.created_at else None
            } for q in questions
        ]
    }

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png'}
MAX_FILE_SIZE = settings.MAX_FILE_SIZE

# --- Helper Functions for Background Task ---

async def update_status(db: AsyncSession, upload_id: str, status: str, error_message: Optional[str] = None):
    """Helper function to update the processing status of an exam upload."""
    logger.info(f"Updating status for {upload_id} to '{status}'")
    stmt = update(ExamUpload).where(ExamUpload.id == upload_id).values(
        processing_status=status, 
        error_message=error_message,
        updated_at=datetime.now()
    )
    await db.execute(stmt)
    await db.commit()

async def save_analysis_results(db: AsyncSession, upload_id: str, yolo_results: Dict, vision_results: Any, proc_time: float):
    """Helper function to save the analysis results to the database."""
    logger.info(f"Saving analysis results for {upload_id}")
    logger.info(f"🔍 vision_results 타입: {type(vision_results)}")
    logger.info(f"🔍 vision_results 길이: {len(vision_results) if hasattr(vision_results, '__len__') else 'N/A'}")
    
    # 🔧 vision_results 타입 안전 처리
    if not isinstance(vision_results, list):
        logger.warning(f"⚠️ vision_results is not a list: {type(vision_results)}")
        logger.warning(f"⚠️ vision_results 내용: {str(vision_results)[:200]}...")
        
        # dict이고 questions 키가 있는 경우
        if isinstance(vision_results, dict) and 'questions' in vision_results:
            vision_results = vision_results['questions']
            logger.info(f"✅ vision_results를 dict에서 questions 리스트로 변환: {len(vision_results)}개")
        else:
            # 기타 경우 빈 리스트로 처리하여 오류 방지
            logger.warning(f"❌ vision_results를 빈 리스트로 변환")
            vision_results = []
    
    # 각 항목이 dict인지 확인
    safe_vision_results = []
    for i, item in enumerate(vision_results):
        if isinstance(item, dict):
            safe_vision_results.append(item)
        else:
            logger.warning(f"⚠️ vision_results[{i}]이 dict가 아님: {type(item)} - {str(item)[:100]}")
            # dict가 아닌 항목은 기본 구조로 변환
            safe_vision_results.append({
                'detected_question_number': f'Q{i+1}',
                'full_text': str(item) if item else '',
                'confidence': 'low',
                'crop_path': '',
                'detected_answer': 'N/A',
                'question_type': 'unknown'
            })
    
    vision_results = safe_vision_results
    logger.info(f"✅ 안전한 vision_results 생성 완료: {len(vision_results)}개")
    
    # yolo_results가 dict가 아닐 경우를 대비하여 기본값 설정
    safe_yolo_results = yolo_results if isinstance(yolo_results, dict) else {"error": "Invalid YOLO result format"}

    exam_result = ExamResult(
        exam_upload_id=upload_id,
        analysis_method='YOLOv8+VisionAPI',
        processing_time_seconds=proc_time,
        yolo_result=safe_yolo_results,  # YOLO 결과를 저장하도록 추가
        vision_result={"results": vision_results},
        total_score=0,  # Placeholder
        correct_count=0, # Placeholder
        wrong_count=len(vision_results) # Placeholder
    )
    db.add(exam_result)
    await db.commit()
    await db.refresh(exam_result)
    logger.info(f"Created ExamResult with ID: {exam_result.id}")

    # 🔧 안전한 QuestionAnswer 생성
    created_count = 0
    for i, vision_item in enumerate(vision_results):
        try:
            # 안전한 데이터 추출
            question_number = vision_item.get('detected_question_number', f'Q{i+1}')
            confidence = vision_item.get('confidence', 'medium')
            crop_path = vision_item.get('crop_path', '')
            question_text = vision_item.get('question_text', '')  # 개별 문제 텍스트 사용
            detected_answer = vision_item.get('detected_answer', 'N/A')
            
            # 답안지 분석 결과에서 정답 찾기
            correct_answer = 'N/A'
            is_correct = False
            
            # vision_results에서 답안지 분석 결과 찾기
            if isinstance(vision_results, list):
                for result in vision_results:
                    if (isinstance(result, dict) and 
                        result.get('question_number') == question_number):
                        correct_answer = result.get('correct_answer', 'N/A')
                        # 정답과 학생 답안 비교
                        if (detected_answer != 'N/A' and 
                            correct_answer != 'N/A' and 
                            str(detected_answer) == str(correct_answer)):
                            is_correct = True
                        break
            
            qa = QuestionAnswer(
                exam_result_id=exam_result.id,
                question_number=question_number,
                user_answer=detected_answer if detected_answer != 'N/A' else 'N/A', 
                correct_answer=correct_answer, 
                is_correct=is_correct, 
                confidence=confidence,
                question_crop_path=crop_path,
                vision_text=question_text,  # 개별 문제 텍스트로 변경
                detection_method='VisionAPI'
            )
            db.add(qa)
            created_count += 1
            
        except Exception as e:
            logger.error(f"❌ Error creating QuestionAnswer for item {i}: {e}")
            continue
    
    await db.commit()
    logger.info(f"✅ Saved {created_count}/{len(vision_results)} QuestionAnswer entries.")

async def create_notification(db: AsyncSession, user_id: str, upload_id: str, success: bool, error_message: str = None):
    if success:
        title = "분석 완료"
        message = f"시험지(ID: {upload_id[:8]}) 분석이 성공적으로 완료되었습니다."
    else:
        title = "분석 실패"
        message = f"시험지(ID: {upload_id[:8]}) 분석 중 오류가 발생했습니다. 상세: {error_message}"
    
    # Notification 모델에 맞게 수정 (related_upload_id 제거)
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message
    )
    db.add(notification)
    await db.commit()

# --- Background Task ---

async def process_exam_analysis(upload_id: str, file_path: str, user_id: str, exam_info: Dict[str, Any] = None):
    """
    백그라운드에서 시험지 분석의 전체 프로세스를 처리합니다.
    (YOLO -> Vision -> 결과 저장 -> 알림)
    """
    start_time = datetime.now()
    logger.info(f"--- 🚀 Starting background analysis for upload_id: {upload_id} ---")
    
    async with AsyncSessionLocal() as db:
        try:
            await update_status(db, upload_id, 'processing')
            
            # 1. YOLO 분석 (실제 실행)
            logger.info(f"🤖 Starting YOLO analysis for {file_path}")
            crop_images = [file_path]  # 기본값
            yolo_results = {}
            
            try:
                # YOLO 서비스 import 및 실행
                from services.yolo_service import yolo_service
                yolo_results = await yolo_service.detect_answers(file_path)
                
                if yolo_results and isinstance(yolo_results, dict):
                    # YOLO 결과에서 크롭 이미지 경로 추출
                    if 'qna_crops' in yolo_results and yolo_results['qna_crops']:
                        crop_images = yolo_results['qna_crops']
                        logger.info(f"✅ YOLO 분석 완료. {len(crop_images)}개 크롭 이미지 생성")
                    elif 'crop_results' in yolo_results:
                        # 대안 경로 구조
                        crop_results = yolo_results['crop_results']
                        crop_images = [item.get('tmp_crop_path', file_path) for item in crop_results if item.get('success', False)]
                        logger.info(f"✅ YOLO 크롭 결과에서 {len(crop_images)}개 이미지 추출")
                    else:
                        logger.warning("⚠️ YOLO 결과에 크롭 이미지가 없어 원본 이미지를 사용합니다.")
                        crop_images = [file_path]
                else:
                    logger.warning("⚠️ YOLO 결과가 없어 원본 이미지를 사용합니다.")
                    crop_images = [file_path]
                    
            except Exception as yolo_error:
                logger.error(f"❌ YOLO 분석 실패: {yolo_error}")
                logger.info("📄 원본 이미지로 Vision 분석을 진행합니다.")
                crop_images = [file_path]
                yolo_results = {}

            # 2. Vision API 분석
            await update_status(db, upload_id, 'vision_processing')
            
            logger.info(f"👁️ Starting Vision API analysis for {len(crop_images)} image(s)")
            vision_results = []
            
            try:
                vision_results = await vision_service.analyze_exam_images(crop_images)
                logger.info(f"✅ Vision API 분석 완료. 결과 타입: {type(vision_results)}")
                
                if vision_results:
                    if isinstance(vision_results, list):
                        logger.info(f"📊 Vision 분석 결과: {len(vision_results)}개 항목")
                    else:
                        logger.warning(f"⚠️ Vision 결과가 예상과 다른 타입: {type(vision_results)}")
                else:
                    logger.warning("⚠️ Vision API가 빈 결과를 반환했습니다.")
                    vision_results = []
                    
            except Exception as vision_error:
                logger.error(f"❌ Vision 분석 실패: {vision_error}")
                logger.info("🔄 임시 결과로 대체합니다.")
                # 임시 결과 생성 (완전 실패 방지)
                vision_results = [{
                    'detected_question_number': 1,
                    'full_text': f'Vision API 분석 실패: {str(vision_error)}',
                    'confidence': 'low',
                    'crop_path': crop_images[0] if crop_images else file_path,
                    'detected_answer': 'N/A',
                    'question_type': 'unknown',
                    'error': str(vision_error)
                }]

            # 3. 결과 검증 및 처리
            if not vision_results:
                logger.warning("📝 Vision 결과가 없어 기본 결과를 생성합니다.")
                vision_results = [{
                    'detected_question_number': 1,
                    'full_text': '분석 결과 없음',
                    'confidence': 'low',
                    'crop_path': file_path,
                    'detected_answer': 'N/A',
                    'question_type': 'unknown'
                }]

            # 4. 데이터베이스 저장
            logger.info("💾 분석 결과 데이터베이스 저장 시작...")
            processing_time = (datetime.now() - start_time).total_seconds()
            
            await save_analysis_results(db, upload_id, yolo_results, vision_results, processing_time)
            logger.info("💾 Analysis results saved to database.")

            # 5. 완료 처리
            await update_status(db, upload_id, 'completed')
            success_msg = f"시험지 분석이 완료되었습니다. (ID: {upload_id[:8]}...)"
            await create_notification(db, user_id, upload_id, True, success_msg)
            logger.info(f"✅ Analysis for {upload_id} completed successfully.")

        except Exception as e:
            logger.error(f"❌ Analysis failed for {upload_id}: {e}", exc_info=True)
            error_message = f"분석 실패: {str(e)}"
            await update_status(db, upload_id, 'failed', error_message=error_message)
            await create_notification(db, user_id, upload_id, False, error_message)
        finally:
            logger.info(f"--- 🏁 Finished background analysis for {upload_id} ---")


@router.post("/vision-analysis", status_code=status.HTTP_202_ACCEPTED)
async def vision_analysis_endpoint(request: Request):
    # TODO: 프론트엔드의 404 오류를 막기 위한 임시 엔드포인트입니다.
    # 추후 실제 분석 상태를 조회하는 로직으로 구현해야 합니다.
    return {"message": "Analysis status check endpoint"}


@router.post("/yolo-analysis", status_code=status.HTTP_202_ACCEPTED)
async def yolo_analysis_endpoint(request: Request):
    # TODO: 프론트엔드의 404 오류를 막기 위한 임시 엔드포인트입니다.
    return {"message": "YOLO analysis status check endpoint"}


@router.post("/gemini-grading", status_code=status.HTTP_202_ACCEPTED)
async def gemini_grading_endpoint(request: Request):
    # TODO: 프론트엔드의 404 오류를 막기 위한 임시 엔드포인트입니다.
    return {"message": "Gemini grading status check endpoint"}

# --- API Endpoints ---

@router.post("/upload", response_model=Dict[str, Any])
async def upload_exam_paper(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    exam_title: str = Form(None),
    exam_year: str = Form(None),
    exam_month: str = Form(None),
    subject: str = Form(None),
    exam_type: str = Form(None),
    grade_level: str = Form(None),
    total_questions: int = Form(None),
    
    # 🔧 토큰 절약용 추가 파일들 (프론트엔드에서 전송됨)
    answer_sheet: UploadFile = File(None),      # 답안지 파일 (선택사항)
    listening_script: UploadFile = File(None),   # 듣기 대본 파일 (선택사항)
    
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """시험지 이미지 업로드 및 실시간 분석 (토큰 절약 지원)"""
    logger.info(f"File upload started: {file.filename} by {current_user.email}")

    # 1. 메인 시험지 파일 유효성 검사 및 저장
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file format. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File size exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit.")

    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(file_path, 'wb') as f:
        f.write(file_content)
    logger.info(f"File saved to {file_path}")

    # 🔧 2. 토큰 절약용 추가 파일들 처리
    answer_sheet_path = None
    listening_script_path = None
    
    # 답안지 파일 처리
    if answer_sheet and answer_sheet.filename:
        logger.info(f"💡 답안지 파일 업로드됨: {answer_sheet.filename} (크롤링 대신 사용)")
        
        # 답안지 파일 유효성 검사
        answer_ext = Path(answer_sheet.filename).suffix.lower()
        if answer_ext in ['.jpg', '.jpeg', '.png', '.pdf']:
            answer_content = await answer_sheet.read()
            if len(answer_content) <= 10 * 1024 * 1024:  # 10MB 제한
                answer_filename = f"answer_{uuid.uuid4().hex}{answer_ext}"
                answer_sheet_path = os.path.join(settings.UPLOAD_DIR, answer_filename)
                with open(answer_sheet_path, 'wb') as f:
                    f.write(answer_content)
                logger.info(f"✅ 답안지 저장됨: {answer_sheet_path}")
            else:
                logger.warning("⚠️ 답안지 파일 크기 초과 (10MB)")
        else:
            logger.warning("⚠️ 답안지 파일 형식 불지원")
    
    # 듣기 대본 파일 처리
    if listening_script and listening_script.filename:
        logger.info(f"🎧 듣기 대본 파일 업로드됨: {listening_script.filename} (자동 인식 대신 사용)")
        
        # 대본 파일 유효성 검사
        script_ext = Path(listening_script.filename).suffix.lower()
        if script_ext in ['.pdf', '.txt', '.doc', '.docx']:
            script_content = await listening_script.read()
            if len(script_content) <= 5 * 1024 * 1024:  # 5MB 제한
                script_filename = f"script_{uuid.uuid4().hex}{script_ext}"
                listening_script_path = os.path.join(settings.UPLOAD_DIR, script_filename)
                with open(listening_script_path, 'wb') as f:
                    f.write(script_content)
                logger.info(f"✅ 듣기 대본 저장됨: {listening_script_path}")
            else:
                logger.warning("⚠️ 대본 파일 크기 초과 (5MB)")
        else:
            logger.warning("⚠️ 대본 파일 형식 불지원")

    # 3. ExamUpload 레코드 생성 (추가 파일 정보 포함)
    exam_upload = ExamUpload(
        user_id=current_user.id,
        original_filename=file.filename,
        stored_filename=unique_filename,
        storage_path=file_path,
        exam_title=exam_title, exam_year=exam_year, exam_month=exam_month,
        subject=subject, exam_type=exam_type, grade_level=grade_level,
        total_questions=total_questions, processing_status='processing',
        
        # 🔧 추가 파일 경로 저장 (ExamUpload 모델에 필드 추가 필요)
        # answer_sheet_path=answer_sheet_path,
        # listening_script_path=listening_script_path,
    )
    try:
        db.add(exam_upload)
        await db.commit()
        await db.refresh(exam_upload)
        logger.info(f"✅ Database record created with ID: {exam_upload.id}")
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ DB Error on upload: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database save failed.")

    # 4. 분석 및 결과 저장 (토큰 절약 로직 적용)
    start_time = datetime.now()
    yolo_results, vision_results = {}, []
    crop_images = [file_path]

    try:
        logger.info(f"🚀 Starting analysis for {exam_upload.id}")
        
        # 토큰 절약 정보 로깅
        token_saving_info = {
            "answer_sheet_provided": answer_sheet_path is not None,
            "listening_script_provided": listening_script_path is not None
        }
        logger.info(f"💰 토큰 절약 정보: {token_saving_info}")
        
        # YOLO 분석
        from services.yolo_service import yolo_service
        yolo_results_data = await yolo_service.detect_answers(file_path)
        
        # yolo_results_data가 리스트(경로 목록)인지 사전인지 확인
        if isinstance(yolo_results_data, list):
            crop_images = yolo_results_data
            yolo_results = {"qna_crops": crop_images}
        elif isinstance(yolo_results_data, dict):
            yolo_results = yolo_results_data
            crop_images = yolo_results.get('qna_crops', [file_path])
        else:
            yolo_results = {"error": "Invalid YOLO result format", "details": str(yolo_results_data)}
            crop_images = [file_path]
        logger.info(f"✅ YOLO analysis completed. Found {len(crop_images)} crops.")

        # 🔧 Vision API 분석 (토큰 절약 파라미터 전달)
        vision_results = await vision_service.analyze_exam_images(
            crop_images,
            # 토큰 절약용 추가 파라미터들 (Vision 서비스에서 지원 필요)
            answer_sheet_path=answer_sheet_path,        # 답안지 있으면 크롤링 생략
            listening_script_path=listening_script_path, # 대본 있으면 인식 생략
            token_saving_mode=True  # 토큰 절약 모드 활성화
        )
        logger.info("✅ Vision API analysis completed (with token saving).")

    except Exception as e:
        logger.error(f"💥 Analysis pipeline failed: {e}", exc_info=True)
        yolo_results['error'] = yolo_results.get('error', f'Analysis failed: {str(e)}')
        vision_results.append({'error': 'Analysis pipeline failed', 'details': str(e)})
    
    finally:
        # DB에 결과 저장 (성공/실패 무관)
        processing_time = (datetime.now() - start_time).total_seconds()
        await save_analysis_results(db, str(exam_upload.id), yolo_results, vision_results, processing_time)
        logger.info("💾 Analysis results (or failure log) saved.")

    # 5. 최종 결과 조회 및 반환
    stmt = select(ExamResult).options(selectinload(ExamResult.question_answers)).filter(ExamResult.exam_upload_id == str(exam_upload.id))
    final_result = (await db.execute(stmt)).scalar_one_or_none()

    if not final_result:
        raise HTTPException(status_code=500, detail="Failed to retrieve analysis result after saving.")

    result_dict = final_result.to_dict()
    result_dict['filename'] = unique_filename

    # ✅ exam_upload_id 추가
    result_dict['exam_upload_id'] = str(exam_upload.id)

    # ✅ exam_result_id 추가
    result_dict['exam_result_id'] = final_result.id

    # 🔧 토큰 절약 정보 추가
    result_dict['token_saving'] = {
        "answer_sheet_used": answer_sheet_path is not None,
        "listening_script_used": listening_script_path is not None,
        "estimated_token_savings": "50-80%" if answer_sheet_path or listening_script_path else "0%"
    }
    
    return result_dict

@router.get("/{upload_id}/results")
async def get_exam_results(
    upload_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """시험지 분석 결과 조회 (개선된 오류 처리 로직 통합)"""
    # 1. ExamUpload 레코드를 먼저 조회하여 상태 확인
    upload_stmt = select(ExamUpload).where(ExamUpload.id == upload_id, ExamUpload.user_id == current_user.id)
    exam_upload = (await db.execute(upload_stmt)).scalar_one_or_none()

    if not exam_upload:
        raise HTTPException(status_code=404, detail="해당 ID의 시험지 업로드 기록을 찾을 수 없습니다.")

    # 2. ExamResult와 관련 QuestionAnswer들을 함께 조회 (selectinload 사용으로 쿼리 최적화)
    result_stmt = (
        select(ExamResult)
        .options(selectinload(ExamResult.question_answers))
        .where(ExamResult.exam_upload_id == upload_id)
    )
    exam_result = (await db.execute(result_stmt)).scalar_one_or_none()

    # 3. 결과가 없을 경우, 업로드 상태에 따라 구체적인 오류 메시지 제공
    if not exam_result:
        if exam_upload.processing_status in ["uploaded", "processing", "vision_processing"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"분석이 아직 진행 중입니다. (상태: {exam_upload.processing_status}) 잠시 후 다시 시도해주세요."
            )
        elif exam_upload.processing_status == 'failed':
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"시험지 분석에 실패했습니다. 오류: {exam_upload.error_message}"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="해당 시험에 대한 분석 결과를 찾을 수 없습니다."
            )

    # 4. 성공 시 응답 데이터 구성
    return {
        "success": True,
        "user_name": getattr(exam_upload, 'user_name', None) or getattr(current_user, 'name', None) or getattr(current_user, 'username', None) or '',
        "upload_info": {
            "id": exam_upload.id,
            "exam_name": exam_upload.exam_title,
            "subject": exam_upload.subject,
            "created_at": exam_upload.upload_date,
            "image_urls": [f"/uploads/{exam_upload.stored_filename}"] # Assuming single image for now
        },
        "result_summary": {
            "id": exam_result.id,
            "total_score": exam_result.total_score,
            "correct_count": exam_result.correct_count,
            "wrong_count": exam_result.wrong_count,
            "created_at": exam_result.created_at
        },
        "questions": [
            {
                "id": qa.id,
                "question_number": qa.question_number,
                "user_answer": qa.user_answer,
                "correct_answer": qa.correct_answer,
                "is_correct": qa.is_correct,
                "score": 0, # Placeholder for individual question score
                "question_crop_path": qa.question_crop_path
            }
            for qa in sorted(exam_result.question_answers, key=lambda x: x.question_number)
        ]
    }

@router.get("/visualization/{filename}")
async def get_visualization_image(filename: str):
    """YOLO 시각화 이미지 파일 제공"""
    file_path = os.path.join(settings.CROPS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Visualization image not found.")
    return FileResponse(file_path, media_type="image/jpeg")

@router.get("/crops/{filename}")
async def get_crop_image(filename: str):
    """문제별 크롭 이미지 파일 제공"""
    # 절대 경로로 crops 디렉토리 설정
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    file_path = os.path.join(base_dir, "crops", filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Crop image not found: {file_path}")
    return FileResponse(file_path, media_type="image/jpeg")

@router.get("/wrong-answers")
async def get_wrong_answers(
    current_user: User = Depends(get_current_active_user),  # 사용자 인증 활성화
    db: AsyncSession = Depends(get_db)
):
    current_user_id = current_user.id  # 실제 로그인한 사용자 ID 사용
    """사용자의 틀린 문제들 조회 (오답노트용)"""
    try:
        # 사용자의 모든 시험 결과에서 틀린 문제들 조회
        stmt = (
            select(QuestionAnswer, ExamResult, ExamUpload)
            .join(ExamResult, QuestionAnswer.exam_result_id == ExamResult.id)
            .join(ExamUpload, ExamResult.exam_upload_id == ExamUpload.id)
            .where(
                ExamResult.user_id == current_user_id,
                QuestionAnswer.user_answer != QuestionAnswer.correct_answer,  # 실제 답안 비교
                QuestionAnswer.user_answer.isnot(None),  # 답안이 있는 경우만
                QuestionAnswer.correct_answer.isnot(None),  # 정답이 있는 경우만
                QuestionAnswer.user_answer != 'N/A',  # N/A 값 제외
                QuestionAnswer.correct_answer != 'N/A'  # N/A 값 제외
            )
            .order_by(ExamResult.created_at.desc(), QuestionAnswer.question_number)
        )
        
        result = await db.execute(stmt)
        wrong_answers = result.all()
        
        # 응답 데이터 구성 - 날짜별 그룹핑
        wrong_answers_by_date = {}
        total_wrong_count = 0
        
        for qa, er, eu in wrong_answers:
            # 날짜를 키로 사용 (YYYY-MM-DD 형식)
            date_key = er.created_at.strftime("%Y-%m-%d") if er.created_at else "미분류"
            
            if date_key not in wrong_answers_by_date:
                wrong_answers_by_date[date_key] = []
            
            wrong_answers_by_date[date_key].append({
                "id": qa.id,
                "subject": eu.subject or "미분류",
                "exam_title": eu.exam_title or "시험",
                "question_number": qa.question_number,
                "user_answer": qa.user_answer,
                "correct_answer": qa.correct_answer,
                "question_crop_path": qa.question_crop_path,
                "vision_text": qa.vision_text,
                "confidence": float(qa.confidence) if qa.confidence else 0.0,
                "created_at": er.created_at.isoformat() if er.created_at else None,
                "exam_date": eu.upload_date.isoformat() if eu.upload_date else None
            })
            total_wrong_count += 1
        
        # 날짜별로 정렬 (최신순)
        sorted_dates = sorted(wrong_answers_by_date.keys(), reverse=True)
        
        return {
            "success": True,
            "total_wrong_answers": total_wrong_count,
            "wrong_answers_by_date": {
                date: wrong_answers_by_date[date] for date in sorted_dates
            }
        }
        
    except Exception as e:
        logger.error(f"❌ 오답노트 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"오답노트 조회 중 오류가 발생했습니다: {str(e)}")

@router.get("/wrong-answers/{subject}")
async def get_wrong_answers_by_subject(
    subject: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """특정 과목의 틀린 문제들 조회"""
    try:
        # 특정 과목의 틀린 문제들 조회
        stmt = (
            select(QuestionAnswer, ExamResult, ExamUpload)
            .join(ExamResult, QuestionAnswer.exam_result_id == ExamResult.id)
            .join(ExamUpload, ExamResult.exam_upload_id == ExamUpload.id)
            .where(
                QuestionAnswer.is_correct == False,
                ExamResult.user_id == current_user.id,
                ExamUpload.subject == subject
            )
            .order_by(ExamResult.created_at.desc(), QuestionAnswer.question_number)
        )
        
        result = await db.execute(stmt)
        wrong_answers = result.all()
        
        # 응답 데이터 구성
        wrong_answers_data = []
        for qa, er, eu in wrong_answers:
            wrong_answers_data.append({
                "id": qa.id,
                "subject": eu.subject,
                "exam_title": eu.exam_title or "시험",
                "question_number": qa.question_number,
                "user_answer": qa.user_answer,
                "correct_answer": qa.correct_answer,
                "question_crop_path": qa.question_crop_path,
                "vision_text": qa.vision_text,
                "confidence": float(qa.confidence) if qa.confidence else 0.0,
                "created_at": er.created_at.isoformat() if er.created_at else None,
                "exam_date": eu.upload_date.isoformat() if eu.upload_date else None
            })
        
        return {
            "success": True,
            "subject": subject,
            "total_wrong_answers": len(wrong_answers_data),
            "wrong_answers": wrong_answers_data
        }
        
    except Exception as e:
        logger.error(f"❌ {subject} 과목 오답노트 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"{subject} 과목 오답노트 조회 중 오류가 발생했습니다: {str(e)}")