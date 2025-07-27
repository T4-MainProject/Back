-- YOLO 분석 결과를 저장하기 위한 필드 추가
ALTER TABLE exam_results 
ADD COLUMN yolo_result JSON;

-- 기존 데이터에 대한 기본값 설정
UPDATE exam_results 
SET yolo_result = '{}'
WHERE yolo_result IS NULL; 