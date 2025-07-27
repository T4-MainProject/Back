-- --------------------------------------------------------------------------------
-- 데이터베이스 스키마 수정 스크립트 (MySQL 구버전 호환)
-- 이 스크립트를 MySQL Workbench나 다른 DB 도구에서 실행해주세요.
-- --------------------------------------------------------------------------------

-- 대상 데이터베이스를 선택합니다.
USE langcheck_db;

-- 'exam_uploads' 테이블 구조를 확인합니다. (실행 전 확인용)
-- DESC exam_uploads;

-- 1. 'updated_at' 컬럼 추가
-- 참고: 만약 이 쿼리 실행 시 'Duplicate column name' 오류가 발생하면,
-- 컬럼이 이미 존재한다는 의미이므로 정상입니다. 무시하고 다음 쿼리를 실행하세요.
ALTER TABLE exam_uploads ADD COLUMN updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6);

-- 2. 'error_message' 컬럼 추가
-- 참고: 만약 이 쿼리 실행 시 'Duplicate column name' 오류가 발생하면,
-- 컬럼이 이미 존재한다는 의미이므로 정상입니다. 무시하고 다음 쿼리를 실행하세요.
ALTER TABLE exam_uploads ADD COLUMN error_message TEXT NULL;

-- 스크립트 실행 후, 테이블 구조를 다시 확인하여 변경 사항을 검증할 수 있습니다.
-- DESC exam_uploads;

SELECT '스키마 수정이 최종 완료되었습니다. 이제 애플리케이션을 다시 테스트해주세요.' AS message;
