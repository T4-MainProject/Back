# main.py - 완전히 수정된 FastAPI 서버 시작 코드

from fastapi import FastAPI, HTTPException, Request, File, UploadFile, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from typing import Dict, List, Optional
import asyncio
import json
import uuid
import time
import uvicorn
import os
import shutil
from pathlib import Path

# 🔧 기본 설정 로드
print("🚀 FastAPI 서버 시작 중...")

try:
    from config import settings
    print("✅ Config 로드 성공")
except ImportError as e:
    print(f"⚠️ Config 로드 실패: {e}")
    class Settings:
        def __init__(self):
            self.database_url = "sqlite:///./test.db"
    settings = Settings()

try:
    from database import create_tables, engine, Base, get_db
    print("✅ Database 모듈 로드 성공")
except ImportError as e:
    print(f"⚠️ Database 모듈 로드 실패: {e}")
    async def create_tables():
        print("⚠️ Database 테이블 생성 건너뛰기")
        pass
    get_db = None

try:
    from routers import auth, users, exams
    print("✅ 라우터 모듈 로드 성공")
except ImportError as e:
    print(f"⚠️ 라우터 모듈 로드 실패: {e}")
    auth = None
    users = None
    exams = None

# 🔧 서비스 모듈 로드 (선택적)
print("🔧 서비스 모듈 로딩 중...")

try:
    from services.auto_grading import AutoGradingSystem
    print("✅ AutoGradingSystem 로드 성공")
except ImportError as e:
    print(f"⚠️ AutoGradingSystem 로드 실패: {e}")
    AutoGradingSystem = None

try:
    from services.yolo_service import YOLOService
    print("✅ YOLOService 로드 성공")
except ImportError as e:
    print(f"⚠️ YOLOService 로드 실패: {e}")
    YOLOService = None

try:
    from services.vision_service import vision_service
    print("✅ VisionService 로드 성공")
except ImportError as e:
    print(f"⚠️ VisionService 로드 실패: {e}")
    vision_service = None

# 🔗 WebSocket 연결 관리자
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.active_grading: Dict[str, bool] = {}  # 진행 중인 채점 작업 추적
        self.completed_grading: Dict[str, bool] = {}  # 완료된 채점 작업 추적
        self.connection_attempts: Dict[str, int] = {}  # 재연결 시도 횟수
        print("🔗 ConnectionManager 초기화됨")

    async def connect(self, websocket: WebSocket, client_id: str):
        try:
            await websocket.accept()
            self.active_connections[client_id] = websocket
            self.connection_attempts[client_id] = 0  # 연결 성공시 시도 횟수 초기화
            print(f"🔗 클라이언트 {client_id} 연결됨")
        except Exception as e:
            print(f"❌ WebSocket 연결 실패: {e}")
            raise e

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.active_grading:
            del self.active_grading[client_id]
        if client_id in self.connection_attempts:
            del self.connection_attempts[client_id]
        print(f"❌ 클라이언트 {client_id} 연결 해제됨")

    def is_grading_active(self, client_id: str) -> bool:
        """채점 작업이 진행 중인지 확인"""
        return self.active_grading.get(client_id, False)

    def is_grading_completed(self, client_id: str) -> bool:
        """채점 작업이 완료되었는지 확인"""
        return self.completed_grading.get(client_id, False)

    def start_grading(self, client_id: str):
        """채점 작업 시작 표시"""
        self.active_grading[client_id] = True
        # 완료 상태 제거 (재시작 시)
        if client_id in self.completed_grading:
            del self.completed_grading[client_id]
        print(f"🚀 채점 시작 표시: {client_id}")

    def finish_grading(self, client_id: str):
        """채점 작업 완료 표시"""
        if client_id in self.active_grading:
            del self.active_grading[client_id]
        # 완료 상태 추가
        self.completed_grading[client_id] = True
        print(f"✅ 채점 완료 표시: {client_id}")

    def is_connected(self, client_id: str) -> bool:
        """클라이언트가 연결되어 있는지 확인"""
        return client_id in self.active_connections

    async def send_progress(self, client_id: str, data: dict):
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(json.dumps(data, ensure_ascii=False))
                print(f"📊 {client_id}에게 진행률 전송: {data.get('progress', 0)}% - {data.get('message', '')}")
            except Exception as e:
                print(f"❌ 전송 실패: {e}")
                self.disconnect(client_id)
        else:
            print(f"⚠️ 클라이언트 {client_id}가 연결되어 있지 않음")
            
    async def send_progress_safe(self, client_id: str, data: dict):
        """안전한 진행률 전송 - 연결 상태 확인 후 전송"""
        if not self.is_connected(client_id):
            print(f"⚠️ 클라이언트 {client_id}가 연결되어 있지 않음")
            return False
            
        try:
            await self.send_progress(client_id, data)
            return True
        except Exception as e:
            print(f"❌ 진행률 전송 실패: {e}")
            return False

# 전역 연결 매니저 인스턴스
manager = ConnectionManager()

# 🚀 FastAPI 앱 생성 및 라이프사이클 관리
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 🚀 서버 시작 시 실행
    print("🚀 서버 시작 중...")
    
    try:
        # 데이터베이스 테이블 생성
        await create_tables()
        print("✅ 데이터베이스 테이블 생성 완료")
    except Exception as e:
        print(f"⚠️ 데이터베이스 초기화 실패: {e}")
    
    # uploads 디렉토리 생성
    os.makedirs("uploads", exist_ok=True)
    print("✅ uploads 디렉토리 준비 완료")
    
    print("🎉 서버 시작 완료!")
    
    yield
    
    # 🛑 서버 종료 시 실행
    print("🛑 서버 종료 중...")
    
    # WebSocket 연결 정리
    for client_id in list(manager.active_connections.keys()):
        manager.disconnect(client_id)
    
    print("👋 서버 종료 완료")

# FastAPI 앱 생성
app = FastAPI(
    title="채점 시스템 API",
    description="AI 기반 시험지 채점 시스템",
    version="1.0.0",
    lifespan=lifespan
)

# 🌐 CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 환경에서만 사용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
print("✅ CORS 설정 완료")

# 🔗 라우터 등록
if auth:
    app.include_router(auth.router)
    print("✅ Auth 라우터 등록됨")
else:
    print("⚠️ Auth 라우터 건너뛰기")

if users:
    app.include_router(users.router)
    print("✅ Users 라우터 등록됨")
else:
    print("⚠️ Users 라우터 건너뛰기")

if exams:
    app.include_router(exams.router)
    print("✅ Exams 라우터 등록됨")
else:
    print("⚠️ Exams 라우터 건너뛰기")

# 🌐 WebSocket 엔드포인트
@app.websocket("/ws/grading/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    try:
        await manager.connect(websocket, client_id)
        
        # 완료된 채점 작업인 경우 알림
        if manager.is_grading_completed(client_id):
            await websocket.send_text(json.dumps({
                "status": "채점 완료",
                "message": "이미 완료된 채점 작업입니다.",
                "progress": 100,
                "completed": True
            }, ensure_ascii=False))
            print(f"✅ 완료된 채점 작업 알림: {client_id}")
        
        while True:
            try:
                # 클라이언트로부터 메시지 대기 (연결 유지)
                data = await websocket.receive_text()
                print(f"📨 {client_id}에서 메시지: {data}")
                
                # ping-pong 메시지 처리 (연결 유지)
                if data.strip().lower() == "ping":
                    await websocket.send_text("pong")
                    
            except WebSocketDisconnect:
                print(f"🔌 {client_id} WebSocket 연결 끊어짐")
                break
            except Exception as e:
                print(f"❌ WebSocket 메시지 처리 오류: {e}")
                break
    except Exception as e:
        print(f"❌ WebSocket 연결 오류: {e}")
    finally:
        manager.disconnect(client_id)

# 🎯 WebSocket 지원 채점 API
@app.post("/api/grade-exam")
async def grade_exam_with_websocket(
    files: List[UploadFile] = File(...),
    subject: str = Form(...),
    grade: str = Form(...),
    exam_type: str = Form("기본"),
    answer_sheet: Optional[UploadFile] = File(None),
    listening_script: Optional[UploadFile] = File(None),
    client_id: Optional[str] = Form(None)
):
    """WebSocket 기반 실시간 채점 API"""
    if not client_id:
        client_id = f"{int(time.time() * 1000)}{uuid.uuid4().hex[:8]}"
    
    # 🔒 중복 실행 방지
    if manager.is_grading_active(client_id) or manager.is_grading_completed(client_id):
        error_msg = "이미 진행 중이거나 완료된 채점 작업이 있습니다. 잠시 후 다시 시도해주세요."
        print(f"❌ 중복 실행 방지: {client_id}")
        raise HTTPException(status_code=409, detail=error_msg)
    
    # 채점 작업 시작 표시
    manager.start_grading(client_id)
    
    # 시작 시간 기록
    start_time = time.time()
    
    print(f"🚀 채점 시작: {client_id}")
    print(f"📄 파일 수: {len(files)}")
    print(f"📚 과목: {subject}, 학년: {grade}, 유형: {exam_type}")
    
    try:
        # vision_service 체크
        if vision_service is None:
            error_msg = "Vision 서비스를 사용할 수 없습니다. 서비스 모듈을 확인해주세요."
            await manager.send_progress(client_id, {
                "progress": 0,
                "status": "오류",
                "message": error_msg,
                "error": True
            })
            manager.finish_grading(client_id)
            raise HTTPException(status_code=500, detail=error_msg)

        # 📊 진행률 0% - 시작
        await manager.send_progress_safe(client_id, {
            "progress": 0,
            "status": "대기중",
            "message": "채점을 시작합니다...",
            "estimated_time": 120
        })

        # 📁 파일 저장
        crop_images = []
        answer_sheet_path = None
        listening_script_path = None
        
        # 📊 진행률 5% - 파일 처리 시작
        await manager.send_progress_safe(client_id, {
            "progress": 5,
            "status": "처리중",
            "message": "파일을 처리하고 있습니다...",
            "estimated_time": 115
        })

        # uploads 디렉토리 생성
        os.makedirs("uploads", exist_ok=True)

        # 메인 시험지 파일들 저장
        for i, file in enumerate(files):
            if not file.filename:
                continue
                
            # 안전한 파일명 생성
            safe_filename = f"crop_{int(time.time())}_{i}_{file.filename}"
            file_path = os.path.join("uploads", safe_filename)
            
            try:
                # 파일 내용 읽기
                content = await file.read()
                
                # 파일 저장
                with open(file_path, "wb") as buffer:
                    buffer.write(content)
                
                crop_images.append(file_path)
                
                # 파일별 진행률 업데이트 (5% ~ 15% 구간)
                file_progress = 5 + (i + 1) * (10 / len(files))
                await manager.send_progress(client_id, {
                    "progress": int(file_progress),
                    "status": "처리중",
                    "message": f"시험지 파일 {i+1}/{len(files)} 처리 완료",
                    "estimated_time": 115 - (i * 2)
                })
                
                # 파일 스트림 리셋
                await file.seek(0)
                
            except Exception as e:
                print(f"❌ 파일 처리 오류 ({file.filename}): {e}")
                continue

        # 📊 진행률 20% - 추가 파일 처리
        await manager.send_progress_safe(client_id, {
            "progress": 20,
            "status": "처리중",
            "message": "답안지와 대본을 확인하고 있습니다...",
            "estimated_time": 100
        })

        # 답안지 처리
        if answer_sheet and answer_sheet.filename:
            try:
                safe_filename = f"answer_{int(time.time())}_{answer_sheet.filename}"
                answer_sheet_path = os.path.join("uploads", safe_filename)
                
                content = await answer_sheet.read()
                with open(answer_sheet_path, "wb") as buffer:
                    buffer.write(content)
                print(f"✅ 답안지 저장됨: {answer_sheet_path}")
            except Exception as e:
                print(f"❌ 답안지 처리 오류: {e}")

        # 대본 처리
        if listening_script and listening_script.filename:
            try:
                safe_filename = f"script_{int(time.time())}_{listening_script.filename}"
                listening_script_path = os.path.join("uploads", safe_filename)
                
                content = await listening_script.read()
                with open(listening_script_path, "wb") as buffer:
                    buffer.write(content)
                print(f"✅ 듣기 대본 저장됨: {listening_script_path}")
            except Exception as e:
                print(f"❌ 대본 처리 오류: {e}")

        if not crop_images:
            error_msg = "처리할 수 있는 시험지 파일이 없습니다."
            await manager.send_progress(client_id, {
                "progress": 0,
                "status": "오류",
                "message": error_msg,
                "error": True
            })
            manager.finish_grading(client_id)
            raise HTTPException(status_code=400, detail=error_msg)

        # 📊 진행률 25% - AI 분석 시작
        await manager.send_progress_safe(client_id, {
            "progress": 25,
            "status": "처리중",
            "message": "AI가 시험지를 분석하고 있습니다...",
            "estimated_time": 90
        })

        # 🎯 토큰 절약 정보 로깅
        print(f"💰 토큰 절약 정보:")
        print(f"   - 답안지 제공: {'✅' if answer_sheet_path else '❌'}")
        print(f"   - 듣기 대본 제공: {'✅' if listening_script_path else '❌'}")

        # 📊 진행률 25% - 분석 시작
        await manager.send_progress_safe(client_id, {
            "progress": 25,
            "status": "처리중",
            "message": "분석을 시작합니다...",
            "estimated_time": 90
        })

        # YOLO 분석으로 문제 영역 감지 (GPT 분석 포함)
        yolo_results = []
        if YOLOService and crop_images:
            yolo_service = YOLOService()
            for i, image_path in enumerate(crop_images):
                print(f"🔍 YOLO + GPT 분석 중: {os.path.basename(image_path)}")
                
                # YOLO 진행률 업데이트 (더 긴 시간)
                yolo_progress = 25 + int(((i + 1) / len(crop_images)) * 20)
                await manager.send_progress_safe(client_id, {
                    "progress": yolo_progress,
                    "status": "처리중",
                    "message": f"문제 영역 감지 및 분석 중... ({i+1}/{len(crop_images)})",
                    "estimated_time": 120 - (i * 10)  # 더 긴 시간
                })
                
                # YOLO 분석 (GPT 분석 포함)
                yolo_result = await yolo_service.analyze_exam_paper(image_path)
                yolo_results.append(yolo_result)
                
                print(f"✅ YOLO + GPT 분석 완료: {os.path.basename(image_path)}")

        # YOLO 결과에서 이미 분석된 문제 데이터 추출
        vision_results = []
        for i, (image_path, yolo_result) in enumerate(zip(crop_images, yolo_results)):
            print(f"🔍 YOLO 분석 결과 처리 중: {os.path.basename(image_path)}")
            
            # YOLO 결과에서 이미 분석된 문제 데이터 추출 (crop_results만 사용)
            crop_results = yolo_result.get('crop_results', [])
            print(f"📋 YOLO에서 분석된 문제: crop_results={len(crop_results)}개")
            
            # 문제번호 기반으로 정렬 (중요!)
            if crop_results:
                crop_results.sort(key=lambda x: x.get('question_number', 999))
                print(f"📊 crop_results 정렬: {[c.get('question_number', 'N/A') for c in crop_results]}")
            
            # crop_results에서 직접 데이터 추출 (이미 GPT 분석 완료됨)
            for crop_data in crop_results:
                if crop_data.get('question_number') and crop_data.get('detected_answer'):
                    question_result = {
                        'question_number': crop_data.get('question_number'),
                        'detected_answer': crop_data.get('detected_answer'),
                        'crop_path': crop_data.get('crop_path', ''),
                        'confidence': crop_data.get('confidence', 0.8),
                        'bbox': crop_data.get('bbox', {}),
                        'analysis_method': 'YOLO + GPT'
                    }
                    vision_results.append(question_result)
                    print(f"✅ 문제 {question_result['question_number']}번: 답안 '{question_result['detected_answer']}'")
            
            # 진행률 업데이트
            vision_progress = 45 + int(((i + 1) / len(crop_images)) * 45)
            await manager.send_progress(client_id, {
                "progress": vision_progress,
                "status": "처리중",
                "message": f"문제 분석 중... ({i+1}/{len(crop_images)})",
                "estimated_time": max(5, 90 - (i * 10))
            })

        # 📊 진행률 90% - 답안지 분석 및 채점
        await manager.send_progress_safe(client_id, {
            "progress": 90,
            "status": "처리중",
            "message": "답안지를 분석하고 채점하고 있습니다...",
            "estimated_time": 10
        })

        # 답안지에서 정답 추출
        correct_answers = {}
        if answer_sheet_path:
            try:
                print(f"📋 답안지 분석 중: {os.path.basename(answer_sheet_path)}")
                answer_sheet_result = await vision_service.analyze_answer_sheet(answer_sheet_path)
                
                if 'answers' in answer_sheet_result and isinstance(answer_sheet_result['answers'], list):
                    for i, answer in enumerate(answer_sheet_result['answers']):
                        correct_answers[i + 1] = str(answer)
                    print(f"✅ 답안지에서 {len(correct_answers)}개 정답 추출 완료")
                else:
                    print(f"⚠️ 답안지 분석 실패")
            except Exception as e:
                print(f"❌ 답안지 분석 오류: {e}")

        # 채점 로직: 학생 답안 vs 정답 비교 (문제번호 기반 매칭)
        graded_results = []
        print(f"🔍 채점 시작: {len(vision_results)}개 문제, {len(correct_answers)}개 정답")
        print(f"📋 정답 목록: {correct_answers}")
        
        for result in vision_results:
            question_num = result.get('question_number', 1)
            student_answer = result.get('detected_answer', '')
            correct_answer = correct_answers.get(question_num, '')
            
            print(f"📝 문제 {question_num}번: 학생답안='{student_answer}' vs 정답='{correct_answer}'")
            
            # 정답 여부 판단 (더 정확한 비교)
            is_correct = False
            if student_answer and correct_answer:
                # 숫자 형태로 정규화
                student_clean = str(student_answer).strip().lower()
                correct_clean = str(correct_answer).strip().lower()
                
                # 다양한 형태 지원 (1, 2, 3, 4, 5 또는 ①, ②, ③, ④, ⑤)
                if student_clean in ['1', '①', '1번', '1번째']:
                    student_clean = '1'
                elif student_clean in ['2', '②', '2번', '2번째']:
                    student_clean = '2'
                elif student_clean in ['3', '③', '3번', '3번째']:
                    student_clean = '3'
                elif student_clean in ['4', '④', '4번', '4번째']:
                    student_clean = '4'
                elif student_clean in ['5', '⑤', '5번', '5번째']:
                    student_clean = '5'
                
                is_correct = student_clean == correct_clean
            
            # 결과에 채점 정보 추가
            graded_result = {
                **result,
                'correct_answer': correct_answer,
                'is_correct': is_correct,
                'student_answer': student_answer
            }
            graded_results.append(graded_result)
            
            print(f"📝 문제 {question_num}: 학생답안='{student_answer}' vs 정답='{correct_answer}' → {'✅' if is_correct else '❌'}")

        # 최종 결과를 graded_results로 교체
        vision_results = graded_results

        # 📊 진행률 95% - 결과 정리
        await manager.send_progress_safe(client_id, {
            "progress": 95,
            "status": "거의 완료",
            "message": "결과를 정리하고 있습니다...",
            "estimated_time": 5
        })

        # 데이터베이스에 결과 저장
        try:
            from database import AsyncSessionLocal
            from models import User, ExamUpload, ExamResult, QuestionAnswer
            from sqlalchemy import select
            import uuid
            
            async with AsyncSessionLocal() as db:
                # 임시 사용자 생성 또는 기존 사용자 조회
                user_stmt = select(User).where(User.email == "temp@example.com").limit(1)
                user_result = await db.execute(user_stmt)
                user = user_result.scalar_one_or_none()
                
                if not user:
                    # 임시 사용자 생성
                    user = User(
                        email="temp@example.com",
                        password_hash="temp_hash",
                        name="임시 사용자",
                        is_active=True
                    )
                    db.add(user)
                    await db.flush()
                    print(f"✅ 임시 사용자 생성: {user.id}")
                
                # ExamUpload 생성
                upload_id = str(uuid.uuid4())
                exam_upload = ExamUpload(
                    id=upload_id,
                    user_id=user.id,  # 실제 사용자 ID 사용
                    original_filename=files[0].filename if files else "unknown",
                    stored_filename=f"exam_{int(time.time())}.jpg",
                    storage_path=crop_images[0] if crop_images else "",
                    subject=subject,
                    exam_type=exam_type,
                    grade_level=grade,
                    processing_status="completed"
                )
                db.add(exam_upload)
                await db.flush()
                
                # ExamResult 생성
                exam_result = ExamResult(
                    exam_upload_id=upload_id,
                    user_id=user.id,  # 실제 사용자 ID 사용
                    total_score=len(vision_results) if vision_results else 0,
                    correct_count=len([r for r in vision_results if r.get('is_correct', False)]) if vision_results else 0,
                    wrong_count=len([r for r in vision_results if not r.get('is_correct', True)]) if vision_results else 0,
                    analysis_method="Vision API",
                    processing_time_seconds=time.time() - start_time
                    # yolo_result, vision_result 등 추가 필드는 제거 (스키마 불일치)
                )
                db.add(exam_result)
                await db.flush()
                
                # QuestionAnswer 생성
                if vision_results:
                    for result in vision_results:
                        question_answer = QuestionAnswer(
                            exam_result_id=exam_result.id,
                            question_number=result.get('question_number', 1),
                            user_answer=result.get('detected_answer', ''),
                            correct_answer=result.get('correct_answer', ''),
                            is_correct=result.get('is_correct', False),
                            confidence=0.8,  # 기본값
                            question_crop_path=result.get('crop_path', '')
                        )
                        db.add(question_answer)
                
                await db.commit()
                print(f"✅ 데이터베이스에 결과 저장 완료: upload_id={upload_id}, user_id={user.id}")
                
        except Exception as db_error:
            print(f"⚠️ 데이터베이스 저장 실패: {db_error}")
            upload_id = None

        # 최종 응답 준비
        response_data = {
            "client_id": client_id,
            "upload_id": upload_id,  # 데이터베이스 저장된 upload_id
            "subject": subject,
            "grade": grade,
            "exam_type": exam_type,
            "vision_results": vision_results,
            "upload_info": {
                "files_count": len(files),
                "has_answer_sheet": answer_sheet is not None,
                "has_listening_script": listening_script is not None
            },
            "processing_summary": {
                "total_questions": len(vision_results) if vision_results else 0,
                "success_rate": "100%",
                "token_optimization": {
                    "answer_sheet_provided": answer_sheet is not None,
                    "listening_script_provided": listening_script is not None,
                    "estimated_savings": "50-70%" if answer_sheet else "0%"
                }
            },
            "uploadData": {
                "files": [f.filename for f in files],
                "subject": subject,
                "grade": grade,
                "examType": exam_type,
                "uploadTitle": f"{subject} {exam_type}"
            },
            "processingTime": round(time.time() - start_time, 2),
            # 사용자 정보 추가
            "user_name": user.name if user else "김학생",
            "user_email": user.email if user else "temp@example.com",
            "user_id": str(user.id) if user else None
        }

        # 📊 진행률 100% - 완료
        await manager.send_progress_safe(client_id, {
            "progress": 100,
            "status": "채점 완료",
            "message": "모든 채점이 완료되었습니다!",
            "estimated_time": 0,
            "results": response_data
        })
        manager.finish_grading(client_id) # 채점 완료 후 상태 초기화

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        # 오류 발생시 WebSocket으로 알림
        error_message = f"채점 중 오류가 발생했습니다: {str(e)}"
        await manager.send_progress_safe(client_id, {
            "progress": 0,
            "status": "오류",
            "message": error_message,
            "estimated_time": 0,
            "error": True
        })
        manager.finish_grading(client_id) # 오류 발생 시 상태 초기화
        print(f"❌ 채점 오류: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=error_message)

# 📊 진행률 조회 엔드포인트
@app.get("/api/grading-status/{client_id}")
async def get_grading_status(client_id: str):
    """특정 클라이언트의 채점 상태 조회"""
    is_connected = client_id in manager.active_connections
    return {
        "client_id": client_id,
        "connected": is_connected,
        "status": "연결됨" if is_connected else "연결 끊김",
        "active_connections": len(manager.active_connections)
    }

# 🏥 헬스 체크
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "server": "FastAPI",
        "version": "1.0.0",
        "services": {
            "yolo_service": YOLOService is not None,
            "vision_service": vision_service is not None,
            "auto_grading": AutoGradingSystem is not None
        },
        "active_websockets": len(manager.active_connections)
    }

# 🐛 디버그용 엔드포인트 - 최근 데이터베이스 결과 확인
@app.get("/debug/exam-results")
async def debug_exam_results():
    """최근 ExamUpload, ExamResult, QuestionAnswer 데이터를 조회합니다."""
    try:
        from database import AsyncSessionLocal
        from models import ExamUpload, ExamResult, QuestionAnswer
        from sqlalchemy import select
        
        async with AsyncSessionLocal() as db:
            # 최근 ExamUpload 5개
            uploads = await db.execute(
                select(ExamUpload).order_by(ExamUpload.upload_date.desc()).limit(5)
            )
            uploads = uploads.scalars().all()
            
            # 최근 ExamResult 5개
            results = await db.execute(
                select(
                    ExamResult.id,
                    ExamResult.exam_upload_id,
                    ExamResult.user_id,
                    ExamResult.total_score,
                    ExamResult.correct_count,
                    ExamResult.wrong_count,
                    ExamResult.processing_time_seconds,
                    ExamResult.created_at
                ).order_by(ExamResult.created_at.desc()).limit(5)
            )
            results = results.all()
            
            # 최근 QuestionAnswer 10개
            questions = await db.execute(
                select(QuestionAnswer).order_by(QuestionAnswer.created_at.desc()).limit(10)
            )
            questions = questions.scalars().all()
            
            return {
                "uploads": [
                    {
                        "id": str(upload.id),
                        "user_id": str(upload.user_id),
                        "subject": upload.subject,
                        "exam_type": upload.exam_type,
                        "grade_level": upload.grade_level,
                        "processing_status": upload.processing_status,
                        "upload_date": str(upload.upload_date)
                    } for upload in uploads
                ],
                "results": [
                    {
                        "id": str(result[0]),
                        "exam_upload_id": str(result[1]),
                        "user_id": str(result[2]),
                        "total_score": result[3],
                        "correct_count": result[4],
                        "wrong_count": result[5],
                        "processing_time_seconds": result[6],
                        "created_at": str(result[7])
                    } for result in results
                ],
                "questions": [
                    {
                        "id": str(q.id),
                        "exam_result_id": str(q.exam_result_id),
                        "question_number": q.question_number,
                        "user_answer": q.user_answer,
                        "correct_answer": q.correct_answer,
                        "is_correct": q.is_correct,
                        "confidence": q.confidence,
                        "created_at": str(q.created_at)
                    } for q in questions
                ]
            }
    except Exception as e:
        return {"error": str(e)}

# 🏠 루트 엔드포인트
@app.get("/")
async def root():
    return {
        "message": "AI 기반 채점 시스템 API",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "websocket_endpoint": "/ws/grading/{client_id}",
        "main_api": "/api/grade-exam"
    }

# 🧪 테스트용 간단한 엔드포인트
@app.get("/test")
async def test_endpoint():
    return {
        "message": "테스트 성공!",
        "timestamp": time.time(),
        "server_running": True
    }

# 📄 기존 호환성을 위한 엔드포인트 (선택적)
@app.post("/api/exam-uploads")
async def upload_exam_compatibility(
    files: List[UploadFile] = File(...),
    subject: str = Form("기본"),
    grade: str = Form("기본")
):
    """기존 호환성을 위한 간단한 업로드 엔드포인트"""
    try:
        uploaded_files = []
        for i, file in enumerate(files):
            if file.filename:
                file_path = f"uploads/compat_{int(time.time())}_{i}_{file.filename}"
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                
                content = await file.read()
                with open(file_path, "wb") as buffer:
                    buffer.write(content)
                
                uploaded_files.append({
                    "filename": file.filename,
                    "path": file_path,
                    "size": len(content)
                })
        
        return {
            "message": "파일 업로드 성공",
            "files": uploaded_files,
            "subject": subject,
            "grade": grade,
            "note": "WebSocket 지원 채점을 위해서는 /api/grade-exam 사용을 권장합니다."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 🚀 서버 실행 함수
def start_server():
    """서버 시작 함수"""
    print("🚀 FastAPI 서버를 시작합니다...")
    print(f"📍 주소: http://0.0.0.0:8000")
    print(f"📚 API 문서: http://0.0.0.0:8000/docs")
    print(f"🏥 헬스 체크: http://0.0.0.0:8000/health")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

# 📝 메인 실행 구문 수정
if __name__ == "__main__":
    print("="*50)
    print("🎯 AI 기반 채점 시스템 백엔드 서버")
    print("="*50)
    
    try:
        start_server()
    except KeyboardInterrupt:
        print("\n🛑 서버가 사용자에 의해 중단되었습니다.")
    except Exception as e:
        print(f"\n❌ 서버 시작 오류: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("👋 서버를 종료합니다.")