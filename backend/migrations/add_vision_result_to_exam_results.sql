-- Vision API 결과를 저장하기 위한 필드 추가
ALTER TABLE public.exam_results 
ADD COLUMN vision_result JSONB,
ADD COLUMN vision_confidence_avg DECIMAL(4,3),
ADD COLUMN vision_questions_detected INTEGER,
ADD COLUMN vision_analysis_quality VARCHAR(20);

-- 기존 데이터에 대한 기본값 설정
UPDATE public.exam_results 
SET 
    vision_result = '{}',
    vision_confidence_avg = 0.0,
    vision_questions_detected = 0,
    vision_analysis_quality = 'unknown'
WHERE vision_result IS NULL;

-- NOT NULL 제약 조건 추가 (새로운 레코드에 대해서만)
ALTER TABLE public.exam_results 
ALTER COLUMN vision_result SET NOT NULL,
ALTER COLUMN vision_confidence_avg SET NOT NULL,
ALTER COLUMN vision_questions_detected SET NOT NULL,
ALTER COLUMN vision_analysis_quality SET NOT NULL; 