-- ============================================
-- LangCheck FastAPI MySQL 완전 스키마
-- 기존 데이터 삭제 후 처음부터 생성용
-- ============================================

-- 1. 기존 테이블 완전 삭제 (있다면)
DROP TABLE IF EXISTS similar_question_attempts;
DROP TABLE IF EXISTS similar_questions;
DROP TABLE IF EXISTS wrong_answer_notes;
DROP TABLE IF EXISTS question_answers;
DROP TABLE IF EXISTS exam_results;
DROP TABLE IF EXISTS exam_uploads;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS email_verification_tokens;
DROP TABLE IF EXISTS users;

-- 2. 테이블 생성
-- 사용자 테이블 (JWT 기반 인증)
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    birth_date DATE,
    school VARCHAR(100),
    grade VARCHAR(10),
    address VARCHAR(255),
    points INTEGER DEFAULT 0,
    tier VARCHAR(20) DEFAULT 'basic',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 이메일 인증 토큰
CREATE TABLE email_verification_tokens (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 비밀번호 재설정 토큰
CREATE TABLE password_reset_tokens (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 시험지 업로드 기록
CREATE TABLE exam_uploads (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    storage_path TEXT,
    exam_title TEXT,
    exam_year VARCHAR(10),
    exam_month VARCHAR(10),
    subject VARCHAR(50),
    exam_type VARCHAR(50),
    grade_level VARCHAR(10),
    total_questions INTEGER,
    processing_status VARCHAR(20) DEFAULT 'uploaded',
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 시험 결과 (채점 결과)
CREATE TABLE exam_results (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    exam_upload_id CHAR(36) NOT NULL,
    total_score INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    wrong_count INTEGER NOT NULL,
    grade_rank VARCHAR(10),
    percentile DECIMAL(5,2),
    analysis_method VARCHAR(50),
    processing_time_seconds DECIMAL(6,2),
    vision_result JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_upload_id) REFERENCES exam_uploads(id) ON DELETE CASCADE
);

-- 문제별 답안 (Vision + YOLO 결과)
CREATE TABLE question_answers (
    id CHAR(36) PRIMARY KEY,
    exam_result_id CHAR(36) NOT NULL,
    question_number INTEGER NOT NULL,
    user_answer VARCHAR(10),
    correct_answer VARCHAR(10),
    is_correct BOOLEAN NOT NULL,
    confidence DECIMAL(4,3),
    question_crop_path TEXT,
    detection_method VARCHAR(50),
    vision_text TEXT,
    yolo_box_coordinates JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_result_id) REFERENCES exam_results(id) ON DELETE CASCADE
);

-- 오답노트
CREATE TABLE wrong_answer_notes (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    question_answer_id CHAR(36) NOT NULL,
    question_crop_image TEXT,
    gemini_explanation TEXT,
    question_text TEXT,
    user_note TEXT,
    review_count INTEGER DEFAULT 0,
    is_mastered BOOLEAN DEFAULT FALSE,
    last_reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_answer_id) REFERENCES question_answers(id) ON DELETE CASCADE
);

-- 유사문제 (Gemini 생성)
CREATE TABLE similar_questions (
    id CHAR(36) PRIMARY KEY,
    wrong_answer_note_id CHAR(36) NOT NULL,
    question_text TEXT NOT NULL,
    options JSON NOT NULL,
    correct_answer VARCHAR(10) NOT NULL,
    explanation TEXT,
    difficulty VARCHAR(20) DEFAULT 'medium',
    generated_by VARCHAR(50) DEFAULT 'gemini',
    generation_prompt TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wrong_answer_note_id) REFERENCES wrong_answer_notes(id) ON DELETE CASCADE
);

-- 유사문제 풀이 기록
CREATE TABLE similar_question_attempts (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    similar_question_id CHAR(36) NOT NULL,
    user_answer VARCHAR(10) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (similar_question_id) REFERENCES similar_questions(id) ON DELETE CASCADE
);

-- 알림 테이블
CREATE TABLE notifications (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. 인덱스 생성
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_token ON users(verification_token);
CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_exam_uploads_user_id ON exam_uploads(user_id);
CREATE INDEX idx_exam_results_user_id ON exam_results(user_id);
CREATE INDEX idx_question_answers_exam_result_id ON question_answers(exam_result_id);
CREATE INDEX idx_wrong_answer_notes_user_id ON wrong_answer_notes(user_id);
CREATE INDEX idx_similar_questions_wrong_note_id ON similar_questions(wrong_answer_note_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- 4. 제약 조건 추가
ALTER TABLE users ADD CONSTRAINT check_email_format 
    CHECK (email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');

ALTER TABLE password_reset_tokens ADD CONSTRAINT check_expires_at_future 
    CHECK (expires_at > created_at);

ALTER TABLE email_verification_tokens ADD CONSTRAINT check_expires_at_future 
    CHECK (expires_at > created_at);

-- ============================================
-- 스키마 생성 완료
-- ============================================ 