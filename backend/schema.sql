-- ============================================
-- LangCheck FastAPI PostgreSQL 완전 스키마
-- 기존 데이터 삭제 후 처음부터 생성용
-- ============================================

-- 1. 기존 테이블 완전 삭제 (있다면)
DROP TABLE IF EXISTS public.similar_question_attempts CASCADE;
DROP TABLE IF EXISTS public.similar_questions CASCADE;
DROP TABLE IF EXISTS public.wrong_answer_notes CASCADE;
DROP TABLE IF EXISTS public.question_answers CASCADE;
DROP TABLE IF EXISTS public.exam_results CASCADE;
DROP TABLE IF EXISTS public.exam_uploads CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.password_reset_tokens CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS update_updated_at_column();

-- 2. 테이블 생성
-- 사용자 테이블 (JWT 기반 인증)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    birth_date DATE,
    school VARCHAR(100),
    grade VARCHAR(10),
    address VARCHAR(255),
    points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 비밀번호 재설정 토큰
CREATE TABLE public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 시험지 업로드 기록
CREATE TABLE public.exam_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 시험 결과 (채점 결과)
CREATE TABLE public.exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    exam_upload_id UUID NOT NULL REFERENCES public.exam_uploads(id) ON DELETE CASCADE,
    total_score INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    wrong_count INTEGER NOT NULL,
    grade_rank VARCHAR(10),
    percentile DECIMAL(5,2),
    analysis_method VARCHAR(50),
    processing_time_seconds DECIMAL(6,2),
    yolo_result JSON,
    vision_result JSON,
    vision_confidence_avg DECIMAL(4,3),
    vision_questions_detected INTEGER,
    vision_analysis_quality VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 문제별 답안 (Vision + YOLO 결과)
CREATE TABLE public.question_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_result_id UUID NOT NULL REFERENCES public.exam_results(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    user_answer VARCHAR(10),
    correct_answer VARCHAR(10),
    is_correct BOOLEAN NOT NULL,
    confidence DECIMAL(4,3),
    question_crop_path TEXT,
    detection_method VARCHAR(50),
    vision_text TEXT,
    yolo_box_coordinates JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 오답노트
CREATE TABLE public.wrong_answer_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    question_answer_id UUID NOT NULL REFERENCES public.question_answers(id) ON DELETE CASCADE,
    question_crop_image TEXT,
    gemini_explanation TEXT,
    question_text TEXT,
    user_note TEXT,
    review_count INTEGER DEFAULT 0,
    is_mastered BOOLEAN DEFAULT FALSE,
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 유사문제 (Gemini 생성)
CREATE TABLE public.similar_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wrong_answer_note_id UUID NOT NULL REFERENCES public.wrong_answer_notes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer VARCHAR(10) NOT NULL,
    explanation TEXT,
    difficulty VARCHAR(20) DEFAULT 'medium',
    generated_by VARCHAR(50) DEFAULT 'gemini',
    generation_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 유사문제 풀이 기록
CREATE TABLE public.similar_question_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    similar_question_id UUID NOT NULL REFERENCES public.similar_questions(id) ON DELETE CASCADE,
    user_answer VARCHAR(10) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 알림 테이블
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 인덱스 생성
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_verification_token ON public.users(verification_token);
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX idx_exam_uploads_user_id ON public.exam_uploads(user_id);
CREATE INDEX idx_exam_results_user_id ON public.exam_results(user_id);
CREATE INDEX idx_question_answers_exam_result_id ON public.question_answers(exam_result_id);
CREATE INDEX idx_wrong_answer_notes_user_id ON public.wrong_answer_notes(user_id);
CREATE INDEX idx_similar_questions_wrong_note_id ON public.similar_questions(wrong_answer_note_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);

-- 4. 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. 트리거 생성
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. 제약 조건 추가
ALTER TABLE public.users ADD CONSTRAINT check_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.password_reset_tokens ADD CONSTRAINT check_expires_at_future 
    CHECK (expires_at > created_at);

-- ============================================
-- 스키마 생성 완료
-- ============================================ 