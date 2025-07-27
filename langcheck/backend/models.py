from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey, Date, DECIMAL, JSON
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid


class User(Base):
    __tablename__ = "users"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    phone = Column(String(20))
    birth_date = Column(Date)
    school = Column(String(100))
    grade = Column(String(10))
    address = Column(String(255))
    points = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 관계 정의
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user")
    email_verification_tokens = relationship("EmailVerificationToken", back_populates="user")
    exam_uploads = relationship("ExamUpload", back_populates="user")
    exam_results = relationship("ExamResult", back_populates="user")
    wrong_answer_notes = relationship("WrongAnswerNote", back_populates="user")
    similar_question_attempts = relationship("SimilarQuestionAttempt", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    similar_question_attempts = relationship("SimilarQuestionAttempt", back_populates="user")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계 정의
    user = relationship("User", back_populates="password_reset_tokens")


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계 정의
    user = relationship("User", back_populates="email_verification_tokens")


class ExamUpload(Base):
    __tablename__ = "exam_uploads"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(Text, nullable=False)
    stored_filename = Column(Text, nullable=False)
    storage_path = Column(Text)
    exam_title = Column(Text)
    exam_year = Column(String(10))
    exam_month = Column(String(10))
    subject = Column(String(50))
    exam_type = Column(String(50))
    grade_level = Column(String(10))
    total_questions = Column(Integer)
    processing_status = Column(String(30), default="uploaded")
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    error_message = Column(Text, nullable=True)
    
    # 관계 정의
    user = relationship("User", back_populates="exam_uploads")
    exam_results = relationship("ExamResult", back_populates="exam_upload")


class ExamResult(Base):
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "exam_upload_id": self.exam_upload_id,
            "total_score": self.total_score,
            "correct_count": self.correct_count,
            "wrong_count": self.wrong_count,
            "grade_rank": self.grade_rank,
            "percentile": float(self.percentile) if self.percentile is not None else None,
            "analysis_method": self.analysis_method,
            "processing_time_seconds": float(self.processing_time_seconds) if self.processing_time_seconds is not None else None,
            "yolo_result": self.yolo_result,
            "vision_result": self.vision_result,
            "vision_confidence_avg": float(self.vision_confidence_avg) if self.vision_confidence_avg is not None else None,
            "vision_questions_detected": self.vision_questions_detected,
            "vision_analysis_quality": self.vision_analysis_quality,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "question_answers": [qa.to_dict() for qa in self.question_answers]
        }

    __tablename__ = "exam_results"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exam_upload_id = Column(CHAR(36), ForeignKey("exam_uploads.id", ondelete="CASCADE"), nullable=False)
    total_score = Column(Integer, nullable=False)
    correct_count = Column(Integer, nullable=False)
    wrong_count = Column(Integer, nullable=False)
    grade_rank = Column(String(10))
    percentile = Column(DECIMAL(5, 2))
    analysis_method = Column(String(50))
    processing_time_seconds = Column(DECIMAL(6, 2))
    # Vision API 결과 저장 필드
    yolo_result = Column(JSON, nullable=True) # YOLO 분석 결과
    vision_result = Column(JSON, nullable=False, default={}) # Vision API 분석 결과
    vision_confidence_avg = Column(DECIMAL(4, 3), nullable=False, default=0.0)
    vision_questions_detected = Column(Integer, nullable=False, default=0)
    vision_analysis_quality = Column(String(20), nullable=False, default="unknown")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계 정의
    user = relationship("User", back_populates="exam_results")
    exam_upload = relationship("ExamUpload", back_populates="exam_results")
    question_answers = relationship("QuestionAnswer", back_populates="exam_result")


class QuestionAnswer(Base):
    def to_dict(self):
        return {
            "id": self.id,
            "exam_result_id": self.exam_result_id,
            "question_number": self.question_number,
            "user_answer": self.user_answer,
            "correct_answer": self.correct_answer,
            "is_correct": self.is_correct,
            "confidence": float(self.confidence) if self.confidence is not None else None,
            "question_crop_path": self.question_crop_path,
            "detection_method": self.detection_method,
            "vision_text": self.vision_text,
            "yolo_box_coordinates": self.yolo_box_coordinates,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    __tablename__ = "question_answers"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_result_id = Column(CHAR(36), ForeignKey("exam_results.id", ondelete="CASCADE"), nullable=False)
    question_number = Column(Integer, nullable=False)
    user_answer = Column(String(10))
    correct_answer = Column(String(10))
    is_correct = Column(Boolean, nullable=False)
    confidence = Column(DECIMAL(4, 3))
    question_crop_path = Column(Text)
    detection_method = Column(String(50))
    vision_text = Column(Text)
    yolo_box_coordinates = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계 정의
    exam_result = relationship("ExamResult", back_populates="question_answers")
    wrong_answer_notes = relationship("WrongAnswerNote", back_populates="question_answer")


class WrongAnswerNote(Base):
    __tablename__ = "wrong_answer_notes"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question_answer_id = Column(CHAR(36), ForeignKey("question_answers.id", ondelete="CASCADE"), nullable=False)
    question_crop_image = Column(Text)
    gemini_explanation = Column(Text)
    question_text = Column(Text)
    user_note = Column(Text)
    review_count = Column(Integer, default=0)
    is_mastered = Column(Boolean, default=False)
    last_reviewed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계 정의
    user = relationship("User", back_populates="wrong_answer_notes")
    question_answer = relationship("QuestionAnswer", back_populates="wrong_answer_notes")
    similar_questions = relationship("SimilarQuestion", back_populates="wrong_answer_note")


class SimilarQuestion(Base):
    __tablename__ = "similar_questions"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    wrong_answer_note_id = Column(CHAR(36), ForeignKey("wrong_answer_notes.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)
    correct_answer = Column(String(10), nullable=False)
    explanation = Column(Text)
    difficulty = Column(String(20), default="medium")
    generated_by = Column(String(50), default="gemini")
    generation_prompt = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계 정의
    wrong_answer_note = relationship("WrongAnswerNote", back_populates="similar_questions")
    similar_question_attempts = relationship("SimilarQuestionAttempt", back_populates="similar_question")


class SimilarQuestionAttempt(Base):
    __tablename__ = "similar_question_attempts"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    similar_question_id = Column(CHAR(36), ForeignKey("similar_questions.id", ondelete="CASCADE"), nullable=False)
    user_answer = Column(String(10), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    attempted_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계 정의
    user = relationship("User", back_populates="similar_question_attempts")
    similar_question = relationship("SimilarQuestion", back_populates="similar_question_attempts")


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계 정의
    user = relationship("User", back_populates="notifications") 