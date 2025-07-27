-- 알림 테이블에 read_at 컬럼 추가
-- 2025-01-20: 알림 읽음 시간 추적을 위한 컬럼 추가

ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 기존 읽음 처리된 알림들에 대해 created_at을 read_at으로 설정 (임시 데이터)
UPDATE public.notifications 
SET read_at = created_at 
WHERE is_read = true AND read_at IS NULL; 