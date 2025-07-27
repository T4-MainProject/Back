-- 답안 컬럼 크기 확장 마이그레이션
-- 2025-01-20: user_answer, correct_answer 컬럼 크기를 VARCHAR(10)에서 VARCHAR(50)으로 확장

-- question_answers 테이블의 답안 컬럼 크기 확장
ALTER TABLE public.question_answers 
    ALTER COLUMN user_answer TYPE VARCHAR(50),
    ALTER COLUMN correct_answer TYPE VARCHAR(50);

-- 인덱스 재생성 (필요시)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_answers_user_answer ON public.question_answers(user_answer);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_answers_correct_answer ON public.question_answers(correct_answer);

-- 확인 쿼리 (실행 후 확인용)
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'question_answers' 
-- AND column_name IN ('user_answer', 'correct_answer'); 